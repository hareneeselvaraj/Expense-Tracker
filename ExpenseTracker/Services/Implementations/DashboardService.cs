using ExpenseTracker.DTOs.Dashboard;
using ExpenseTracker.Models;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Services.Implementations;

public class DashboardService : IDashboardService
{
    private readonly ITransactionRepository _transactionRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IInvestmentRepository _investmentRepo;
    private readonly IBudgetRepository _budgetRepo;

    public DashboardService(
        ITransactionRepository transactionRepo,
        IAccountRepository accountRepo,
        IInvestmentRepository investmentRepo,
        IBudgetRepository budgetRepo)
    {
        _transactionRepo = transactionRepo;
        _accountRepo = accountRepo;
        _investmentRepo = investmentRepo;
        _budgetRepo = budgetRepo;
    }

    public async Task<DashboardResponseDto> GetDashboardAsync(Guid userId)
    {
        var transactions = (await _transactionRepo.GetByUserIdAsync(userId)).ToList();
        var accounts = (await _accountRepo.GetByUserIdAsync(userId)).ToList();
        var investments = (await _investmentRepo.GetByUserIdAsync(userId)).ToList();
        var budgets = (await _budgetRepo.GetByUserIdAsync(userId)).ToList();

        // ── Exclude Transfers from totals ──
        var nonTransferTx = transactions
            .Where(t => t.Type != TransactionType.Transfer)
            .ToList();

        // ── Totals ──
        var totalIncome = nonTransferTx
            .Where(t => t.Type == TransactionType.Income)
            .Sum(t => t.Amount);

        var totalExpense = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        var totalInvestment = investments.Sum(i => i.CurrentValue);

        var currentBalance = accounts.Sum(a => a.Balance);

        // ── Monthly Summary ──
        // Group investment-table entries by month (fallback to current month if no date)
        var now = DateTime.UtcNow;
        var investmentsByMonth = investments
            .GroupBy(i => new {
                Year = (i.DateInvested ?? now).Year,
                Month = (i.DateInvested ?? now).Month
            })
            .ToDictionary(g => g.Key, g => g.Sum(i => i.InvestedAmount));

        var txMonthlyGroups = nonTransferTx
            .GroupBy(t => new { t.Date.Year, t.Date.Month })
            .ToList();

        // Collect all unique months from both sources
        var allMonths = txMonthlyGroups
            .Select(g => g.Key)
            .Union(investmentsByMonth.Keys)
            .Distinct()
            .ToList();

        var monthlySummary = allMonths.Select(key =>
            {
                var txGroup = txMonthlyGroups.FirstOrDefault(g => g.Key.Year == key.Year && g.Key.Month == key.Month);
                var income = txGroup?.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount) ?? 0;
                var expense = txGroup?.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount) ?? 0;
                var txInvestment = txGroup?.Where(t => t.Type == TransactionType.Investment).Sum(t => t.Amount) ?? 0;
                investmentsByMonth.TryGetValue(key, out var portfolioInvestment);
                var investment = txInvestment + portfolioInvestment;
                return new MonthlySummaryDto
                {
                    Year = key.Year,
                    Month = key.Month,
                    Income = income,
                    Expense = expense,
                    Investment = investment,
                    Net = income - expense - investment
                };
            })
            .OrderByDescending(m => m.Year).ThenByDescending(m => m.Month)
            .ToList();

        // ── Yearly Trend ──
        var yearlyTrend = nonTransferTx
            .GroupBy(t => t.Date.Year)
            .Select(g =>
            {
                var income = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
                var expense = g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
                var investment = g.Where(t => t.Type == TransactionType.Investment).Sum(t => t.Amount);
                return new YearlyTrendDto
                {
                    Year = g.Key,
                    Income = income,
                    Expense = expense,
                    Investment = investment,
                    Net = income - expense - investment
                };
            })
            .OrderByDescending(y => y.Year)
            .ToList();

        // ── Category-Wise Spending ──
        var totalSpend = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        var categoryWiseSpending = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense)
            .GroupBy(t => new { t.CategoryId, t.Category.Name, Type = t.Category.Type.ToString() })
            .Select(g => new CategoryWiseSpendingDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                CategoryType = g.Key.Type,
                Total = g.Sum(t => t.Amount),
                Percentage = totalSpend > 0
                    ? Math.Round(g.Sum(t => t.Amount) / totalSpend * 100, 2)
                    : 0
            })
            .OrderByDescending(c => c.Total)
            .ToList();

        // ── Bank-Wise Spending (by BankMode) ──
        var bankWiseSpending = nonTransferTx
            .Where(t => t.BankMode != null)
            .GroupBy(t => t.BankMode!.Value.ToString())
            .Select(g => new BankWiseSpendingDto
            {
                BankMode = g.Key,
                Total = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderByDescending(b => b.Total)
            .ToList();

        // ── Online vs Offline Summary ──
        var onlineTx = nonTransferTx.Where(t => t.OnlineOffline == OnlineOffline.Online).ToList();
        var offlineTx = nonTransferTx.Where(t => t.OnlineOffline == OnlineOffline.Offline).ToList();

        var onlineVsOffline = new OnlineVsOfflineSummaryDto
        {
            OnlineTotal = onlineTx.Sum(t => t.Amount),
            OnlineCount = onlineTx.Count,
            OfflineTotal = offlineTx.Sum(t => t.Amount),
            OfflineCount = offlineTx.Count
        };

        // ── Budget vs Actual ──
        var budgetVsActual = budgets.Select(b =>
        {
            var startDate = new DateTime(b.Year, b.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endDate = startDate.AddMonths(1).AddTicks(-1);

            var actualSpent = nonTransferTx
                .Where(t => t.Type == TransactionType.Expense
                         && t.CategoryId == b.CategoryId
                         && t.Date >= startDate
                         && t.Date <= endDate)
                .Sum(t => t.Amount);

            return new BudgetVsActualDto
            {
                CategoryId = b.CategoryId,
                CategoryName = b.Category?.Name ?? string.Empty,
                Year = b.Year,
                Month = b.Month,
                BudgetAmount = b.Amount,
                ActualSpent = actualSpent,
                Remaining = b.Amount - actualSpent,
                UtilizationPercent = b.Amount > 0
                    ? Math.Round(actualSpent / b.Amount * 100, 2)
                    : 0
            };
        })
        .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month)
        .ToList();

        // ── Account Summary ──
        var accountSummaries = accounts.Select(a => new AccountSummaryDto
        {
            Id = a.Id,
            Name = a.Name,
            Type = a.Type.ToString(),
            Balance = a.Balance
        }).ToList();

        return new DashboardResponseDto
        {
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            TotalInvestment = totalInvestment,
            CurrentBalance = currentBalance,
            MonthlySummary = monthlySummary,
            YearlyTrend = yearlyTrend,
            CategoryWiseSpending = categoryWiseSpending,
            BankWiseSpending = bankWiseSpending,
            OnlineVsOfflineSummary = onlineVsOffline,
            BudgetVsActual = budgetVsActual,
            Accounts = accountSummaries
        };
    }
}
