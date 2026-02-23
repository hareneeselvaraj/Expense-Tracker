using ExpenseTracker.DTOs.Budget;
using ExpenseTracker.Models;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Services.Implementations;

public class BudgetService : IBudgetService
{
    private readonly IBudgetRepository _budgetRepo;
    private readonly ITransactionRepository _transactionRepo;

    public BudgetService(IBudgetRepository budgetRepo, ITransactionRepository transactionRepo)
    {
        _budgetRepo = budgetRepo;
        _transactionRepo = transactionRepo;
    }

    public async Task<BudgetResponseDto> CreateAsync(Guid userId, CreateBudgetDto dto)
    {
        var budget = new Budget
        {
            UserId = userId,
            Year = dto.Year,
            Month = dto.Month,
            CategoryId = dto.CategoryId,
            Amount = dto.Amount,
            AlertSentAt = null // Fresh budget — allow alert to fire
        };

        await _budgetRepo.AddAsync(budget);

        // Reload with category
        var budgets = await _budgetRepo.GetByUserIdAsync(userId);
        var created = budgets.First(b => b.Id == budget.Id);
        return await MapToDtoAsync(userId, created);
    }

    public async Task<IEnumerable<BudgetResponseDto>> GetAllAsync(Guid userId)
    {
        var budgets = await _budgetRepo.GetByUserIdAsync(userId);
        var result = new List<BudgetResponseDto>();
        foreach (var b in budgets)
            result.Add(await MapToDtoAsync(userId, b));
        return result;
    }

    public async Task<IEnumerable<BudgetResponseDto>> GetByMonthAsync(Guid userId, int year, int month)
    {
        var budgets = await _budgetRepo.GetByUserIdAndMonthAsync(userId, year, month);
        var result = new List<BudgetResponseDto>();
        foreach (var b in budgets)
            result.Add(await MapToDtoAsync(userId, b));
        return result;
    }

    public async Task<BudgetResponseDto?> GetByIdAsync(Guid userId, Guid id)
    {
        var budget = await _budgetRepo.GetByIdAsync(id);
        if (budget == null || budget.UserId != userId) return null;

        var budgets = await _budgetRepo.GetByUserIdAsync(userId);
        var full = budgets.First(b => b.Id == id);
        return await MapToDtoAsync(userId, full);
    }

    public async Task<BudgetResponseDto?> UpdateAsync(Guid userId, Guid id, UpdateBudgetDto dto)
    {
        var budget = await _budgetRepo.GetByIdAsync(id);
        if (budget == null || budget.UserId != userId) return null;

        if (dto.Year.HasValue) budget.Year = dto.Year.Value;
        if (dto.Month.HasValue) budget.Month = dto.Month.Value;
        if (dto.CategoryId.HasValue) budget.CategoryId = dto.CategoryId.Value;
        if (dto.Amount.HasValue) budget.Amount = dto.Amount.Value;

        // Reset alert flag so a new alert can fire after budget changes
        budget.AlertSentAt = null;

        await _budgetRepo.UpdateAsync(budget);

        var budgets = await _budgetRepo.GetByUserIdAsync(userId);
        var updated = budgets.First(b => b.Id == id);
        return await MapToDtoAsync(userId, updated);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id)
    {
        var budget = await _budgetRepo.GetByIdAsync(id);
        if (budget == null || budget.UserId != userId) return false;

        await _budgetRepo.DeleteAsync(budget);
        return true;
    }

    private async Task<BudgetResponseDto> MapToDtoAsync(Guid userId, Budget b)
    {
        // Calculate actual spend for the budget's month/category
        var startDate = new DateTime(b.Year, b.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1).AddTicks(-1);

        var transactions = await _transactionRepo.GetByUserIdFilteredAsync(
            userId, startDate, endDate, TransactionType.Expense, b.CategoryId, null);

        var spent = transactions
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        return new BudgetResponseDto
        {
            Id = b.Id,
            Year = b.Year,
            Month = b.Month,
            CategoryId = b.CategoryId,
            CategoryName = b.Category?.Name ?? string.Empty,
            Amount = b.Amount,
            Spent = spent,
            Remaining = b.Amount - spent
        };
    }
}
