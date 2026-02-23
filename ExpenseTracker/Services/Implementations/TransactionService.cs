using ExpenseTracker.DTOs.Transaction;
using ExpenseTracker.Models;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ExpenseTracker.Data;

namespace ExpenseTracker.Services.Implementations;

public class TransactionService : ITransactionService
{
    private readonly ITransactionRepository _transactionRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly ICategoryRepository _categoryRepo;
    private readonly IEmailService _emailService;
    private readonly AppDbContext _context;
    private readonly ILogger<TransactionService> _logger;

    public TransactionService(
        ITransactionRepository transactionRepo,
        IAccountRepository accountRepo,
        ICategoryRepository categoryRepo,
        IEmailService emailService,
        AppDbContext context,
        ILogger<TransactionService> logger)
    {
        _transactionRepo = transactionRepo;
        _accountRepo = accountRepo;
        _categoryRepo = categoryRepo;
        _emailService = emailService;
        _context = context;
        _logger = logger;
    }

    public async Task<TransactionResponseDto> CreateAsync(Guid userId, CreateTransactionDto dto)
    {
        // ── Validation ──

        // Online transactions require BankMode
        if (dto.OnlineOffline == OnlineOffline.Online && dto.BankMode == null)
            throw new InvalidOperationException("BankMode is required for Online transactions.");

        // Transfer requires TransferAccountId
        if (dto.Type == TransactionType.Transfer && dto.TransferAccountId == null)
            throw new InvalidOperationException("TransferAccountId is required for Transfer transactions.");

        var account = await _accountRepo.GetByIdAsync(dto.AccountId);
        if (account == null || account.UserId != userId)
            throw new InvalidOperationException("Account not found.");

        var category = await _categoryRepo.GetByIdAsync(dto.CategoryId);
        if (category == null || category.UserId != userId)
            throw new InvalidOperationException("Category not found.");

        // ── Build transaction ──
        var transaction = new Transaction
        {
            UserId = userId,
            AccountId = dto.AccountId,
            CategoryId = dto.CategoryId,
            Amount = dto.Amount,
            Type = dto.Type,
            OnlineOffline = dto.OnlineOffline,
            BankMode = dto.BankMode,
            Description = dto.Description,
            Date = dto.Date ?? DateTime.UtcNow,
            IsMonitor = dto.IsMonitor,
            IsAutoDebit = dto.IsAutoDebit,
            TransferAccountId = dto.TransferAccountId,
            TagId = dto.TagId
        };

        // ── Business rules: adjust account balances ──
        switch (dto.Type)
        {
            case TransactionType.Transfer:
                // Transfer: debit source, credit destination — not income or expense
                var transferAccount = await _accountRepo.GetByIdAsync(dto.TransferAccountId!.Value);
                if (transferAccount == null || transferAccount.UserId != userId)
                    throw new InvalidOperationException("Transfer account not found.");

                account.Balance -= dto.Amount;
                transferAccount.Balance += dto.Amount;
                await _accountRepo.UpdateAsync(account);
                await _accountRepo.UpdateAsync(transferAccount);
                break;

            case TransactionType.Income:
                account.Balance += dto.Amount;
                await _accountRepo.UpdateAsync(account);
                break;

            case TransactionType.Expense:
                // If IsAutoDebit = true AND CategoryType = Investment → count as investment, NOT expense
                if (dto.IsAutoDebit && category.Type == CategoryType.Investment)
                {
                    // Treated as investment — deduct from account but do NOT count as expense
                    account.Balance -= dto.Amount;
                    await _accountRepo.UpdateAsync(account);
                    // Override the transaction type to Investment
                    transaction.Type = TransactionType.Investment;
                }
                else
                {
                    account.Balance -= dto.Amount;
                    await _accountRepo.UpdateAsync(account);
                }
                break;

            case TransactionType.Investment:
                account.Balance -= dto.Amount;
                await _accountRepo.UpdateAsync(account);
                break;
        }

        await _transactionRepo.AddAsync(transaction);

        // ── Budget alert check ──
        await CheckBudgetAndNotifyAsync(userId, transaction.CategoryId, transaction.Date);

        // Reload with navigation properties
        var created = await _transactionRepo.GetByIdWithDetailsAsync(transaction.Id);
        return MapToDto(created!);
    }

    public async Task<IEnumerable<TransactionResponseDto>> GetAllAsync(Guid userId)
    {
        var transactions = await _transactionRepo.GetByUserIdAsync(userId);
        return transactions.Select(MapToDto);
    }

    public async Task<IEnumerable<TransactionResponseDto>> GetFilteredAsync(
        Guid userId, DateTime? startDate, DateTime? endDate,
        TransactionType? type, Guid? categoryId, Guid? accountId)
    {
        var transactions = await _transactionRepo.GetByUserIdFilteredAsync(
            userId, startDate, endDate, type, categoryId, accountId);
        return transactions.Select(MapToDto);
    }

    public async Task<TransactionResponseDto?> GetByIdAsync(Guid userId, Guid id)
    {
        var transaction = await _transactionRepo.GetByIdWithDetailsAsync(id);
        if (transaction == null || transaction.UserId != userId) return null;
        return MapToDto(transaction);
    }

    public async Task<TransactionResponseDto?> UpdateAsync(Guid userId, Guid id, UpdateTransactionDto dto)
    {
        var transaction = await _transactionRepo.GetByIdWithDetailsAsync(id);
        if (transaction == null || transaction.UserId != userId) return null;

        if (dto.AccountId.HasValue) transaction.AccountId = dto.AccountId.Value;
        if (dto.CategoryId.HasValue) transaction.CategoryId = dto.CategoryId.Value;
        if (dto.Amount.HasValue) transaction.Amount = dto.Amount.Value;
        if (dto.Type.HasValue) transaction.Type = dto.Type.Value;
        if (dto.OnlineOffline.HasValue) transaction.OnlineOffline = dto.OnlineOffline.Value;
        if (dto.BankMode.HasValue) transaction.BankMode = dto.BankMode.Value;
        if (dto.Description != null) transaction.Description = dto.Description;
        if (dto.Date.HasValue) transaction.Date = dto.Date.Value;
        if (dto.IsMonitor.HasValue) transaction.IsMonitor = dto.IsMonitor.Value;
        if (dto.IsAutoDebit.HasValue) transaction.IsAutoDebit = dto.IsAutoDebit.Value;
        if (dto.TransferAccountId.HasValue) transaction.TransferAccountId = dto.TransferAccountId.Value;
        if (dto.TagId.HasValue) transaction.TagId = dto.TagId.Value;

        await _transactionRepo.UpdateAsync(transaction);

        var updated = await _transactionRepo.GetByIdWithDetailsAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id)
    {
        var transaction = await _transactionRepo.GetByIdWithDetailsAsync(id);
        if (transaction == null || transaction.UserId != userId) return false;

        // ── Reverse the account balance adjustment that was applied on creation ──
        var account = await _accountRepo.GetByIdAsync(transaction.AccountId);
        if (account != null)
        {
            switch (transaction.Type)
            {
                case TransactionType.Income:
                    account.Balance -= transaction.Amount;
                    await _accountRepo.UpdateAsync(account);
                    break;

                case TransactionType.Expense:
                case TransactionType.Investment:
                    account.Balance += transaction.Amount;
                    await _accountRepo.UpdateAsync(account);
                    break;

                case TransactionType.Transfer:
                    account.Balance += transaction.Amount; // Reverse debit on source
                    await _accountRepo.UpdateAsync(account);

                    if (transaction.TransferAccountId.HasValue)
                    {
                        var transferAccount = await _accountRepo.GetByIdAsync(transaction.TransferAccountId.Value);
                        if (transferAccount != null)
                        {
                            transferAccount.Balance -= transaction.Amount; // Reverse credit on destination
                            await _accountRepo.UpdateAsync(transferAccount);
                        }
                    }
                    break;
            }
        }

        await _transactionRepo.DeleteAsync(transaction);
        return true;
    }

    private static TransactionResponseDto MapToDto(Transaction t) => new()
    {
        Id = t.Id,
        AccountId = t.AccountId,
        AccountName = t.Account?.Name ?? string.Empty,
        CategoryId = t.CategoryId,
        CategoryName = t.Category?.Name ?? string.Empty,
        Amount = t.Amount,
        Type = t.Type.ToString(),
        OnlineOffline = t.OnlineOffline.ToString(),
        BankMode = t.BankMode?.ToString(),
        Description = t.Description,
        Date = t.Date,
        IsMonitor = t.IsMonitor,
        IsAutoDebit = t.IsAutoDebit,
        TransferAccountId = t.TransferAccountId,
        TransferAccountName = t.TransferAccount?.Name,
        TagId = t.TagId,
        TagName = t.Tag?.Name
    };

    private async Task CheckBudgetAndNotifyAsync(Guid userId, Guid categoryId, DateTime transactionDate)
    {
        var traceFile = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "budget_trace.log");
        void Trace(string msg) => File.AppendAllText(traceFile, $"[{DateTime.Now:HH:mm:ss}] {msg}\n");
        try
        {
            var month = transactionDate.Month;
            var year = transactionDate.Year;

            Trace($"START: userId={userId}, catId={categoryId}, month={month}, year={year}");
            _logger.LogInformation("[BUDGET CHECK] userId={UserId}, categoryId={CategoryId}, txDate={TxDate}, month={Month}, year={Year}",
                userId, categoryId, transactionDate.ToString("O"), month, year);

            // Find a budget for this category + month
            var budget = await _context.Budgets
                .FirstOrDefaultAsync(b => b.UserId == userId
                    && b.CategoryId == categoryId
                    && b.Month == month
                    && b.Year == year);

            if (budget == null)
            {
                Trace($"NO BUDGET for catId={categoryId}, month={month}/{year}");
                _logger.LogWarning("[BUDGET CHECK] No matching budget found for categoryId={CategoryId}, month={Month}/{Year} — skipping.",
                    categoryId, month, year);
                return;
            }

            _logger.LogInformation("[BUDGET CHECK] Found budget: id={BudgetId}, amount={Amount}, alertSentAt={AlertSentAt}",
                budget.Id, budget.Amount, budget.AlertSentAt);

            // Already sent an alert for this budget period — reset so re-alert can fire
            if (budget.AlertSentAt.HasValue)
            {
                _logger.LogInformation("[BUDGET CHECK] AlertSentAt is already set — resetting to allow re-alert.");
                budget.AlertSentAt = null;
                _context.Budgets.Update(budget);
                await _context.SaveChangesAsync();
            }

            // Calculate total spent — use unspecified kind for SQLite compatibility
            var startOfMonth = new DateTime(year, month, 1);
            var endOfMonth = startOfMonth.AddMonths(1);

            var expenses = await _context.Transactions
                .Where(t => t.UserId == userId
                    && t.CategoryId == categoryId
                    && t.Type == TransactionType.Expense
                    && t.Date >= startOfMonth
                    && t.Date < endOfMonth)
                .ToListAsync();
            var totalSpent = expenses.Sum(t => t.Amount);
            Trace($"TOTAL SPENT: {totalSpent} from {expenses.Count} txns, budget={budget.Amount}");

            _logger.LogInformation("[BUDGET CHECK] Total spent this month: {TotalSpent}, budget limit: {BudgetAmount}",
                totalSpent, budget.Amount);

            // Only alert when the budget is exceeded
            if (totalSpent <= budget.Amount)
            {
                Trace($"WITHIN BUDGET — no alert. {totalSpent} <= {budget.Amount}");
                _logger.LogInformation("[BUDGET CHECK] Spending within budget — no alert needed.");
                return;
            }

            // Get the user's email
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("[BUDGET CHECK] User {UserId} not found — skipping.", userId);
                return;
            }

            var category = await _context.Categories.FindAsync(categoryId);

            Trace($"SENDING EMAIL to {user.Email} for {category?.Name}: spent {totalSpent} / {budget.Amount}");
            _logger.LogInformation("[BUDGET ALERT] Sending email to {Email} — {Category}: spent {Spent} / budget {BudgetAmount}",
                user.Email, category?.Name, totalSpent, budget.Amount);

            await _emailService.SendBudgetAlertAsync(
                user.Email,
                user.Name,
                category?.Name ?? "Unknown",
                budget.Amount,
                totalSpent,
                month,
                year);

            // Mark alert as sent
            budget.AlertSentAt = DateTime.UtcNow;
            _context.Budgets.Update(budget);
            await _context.SaveChangesAsync();

            Trace("EMAIL SENT SUCCESSFULLY ✅");
            _logger.LogInformation("[BUDGET ALERT] ✅ Email sent successfully!");
        }
        catch (Exception ex)
        {
            // Email failure must not break the transaction — but log the full error
            Trace($"EXCEPTION: {ex.Message}");
            _logger.LogError(ex, "[BUDGET ALERT ERROR] Failed during budget check/email for userId={UserId}, categoryId={CategoryId}",
                userId, categoryId);
            // Write to a debug file so we can easily read the full error
            var errorLog = $"[{DateTime.Now:O}] BUDGET ALERT ERROR for userId={userId}, categoryId={categoryId}\n{ex}\n\n";
            File.AppendAllText(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "budget_error.log"), errorLog);
        }
    }

    /// <summary>Diagnostic: manually trigger a budget check for a category in the current month.</summary>
    public async Task<BudgetCheckResultDto> TestBudgetCheckAsync(Guid userId, Guid categoryId)
    {
        var now = DateTime.UtcNow;
        var month = now.Month;
        var year = now.Year;
        var result = new BudgetCheckResultDto();

        try
        {
            var budget = await _context.Budgets
                .FirstOrDefaultAsync(b => b.UserId == userId
                    && b.CategoryId == categoryId
                    && b.Month == month
                    && b.Year == year);

            if (budget == null)
            {
                result.Error = $"No budget found for categoryId={categoryId}, month={month}/{year}";
                return result;
            }

            result.BudgetFound = true;
            result.BudgetId = budget.Id;
            result.BudgetAmount = budget.Amount;

            var startOfMonth = new DateTime(year, month, 1);
            var endOfMonth = startOfMonth.AddMonths(1);

            var expenses2 = await _context.Transactions
                .Where(t => t.UserId == userId
                    && t.CategoryId == categoryId
                    && t.Type == TransactionType.Expense
                    && t.Date >= startOfMonth
                    && t.Date < endOfMonth)
                .ToListAsync();
            result.TotalSpent = expenses2.Sum(t => t.Amount);

            result.Exceeded = result.TotalSpent > result.BudgetAmount;

            if (!result.Exceeded)
            {
                result.Error = $"Spending {result.TotalSpent} is within budget {result.BudgetAmount} — no email sent";
                return result;
            }

            // Actually send the email
            var user = await _context.Users.FindAsync(userId);
            var category = await _context.Categories.FindAsync(categoryId);

            if (user == null)
            {
                result.Error = "User not found";
                return result;
            }

            await _emailService.SendBudgetAlertAsync(
                user.Email, user.Name,
                category?.Name ?? "Unknown",
                budget.Amount, result.TotalSpent,
                month, year);

            result.EmailSent = true;
        }
        catch (Exception ex)
        {
            result.Error = ex.ToString();
            _logger.LogError(ex, "[BUDGET TEST] Failed for userId={UserId}, categoryId={CategoryId}", userId, categoryId);
        }

        return result;
    }
}
