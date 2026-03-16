using ExpenseTracker.DTOs.Dashboard;
using ExpenseTracker.Models;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Interfaces;
using ExpenseTracker.Data;
using ExpenseTracker.DTOs.Reminder;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Services.Implementations;

public class DashboardService : IDashboardService
{
    private readonly ITransactionRepository _transactionRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IInvestmentRepository _investmentRepo;
    private readonly IBudgetRepository _budgetRepo;
    private readonly AppDbContext _context;

    public DashboardService(
        ITransactionRepository transactionRepo,
        IAccountRepository accountRepo,
        IInvestmentRepository investmentRepo,
        IBudgetRepository budgetRepo,
        AppDbContext context)
    {
        _transactionRepo = transactionRepo;
        _accountRepo = accountRepo;
        _investmentRepo = investmentRepo;
        _budgetRepo = budgetRepo;
        _context = context;
    }

    public async Task<DashboardResponseDto> GetDashboardAsync(Guid userId, int? month = null, int? year = null, Guid? accountId = null)
    {
        var transactions = (await _transactionRepo.GetByUserIdAsync(userId)).ToList();
        var accounts = (await _accountRepo.GetByUserIdAsync(userId)).ToList();
        var investments = (await _investmentRepo.GetByUserIdAsync(userId)).ToList();
        var budgets = (await _budgetRepo.GetByUserIdAsync(userId)).ToList();

        // ── Filter for Account ──
        if (accountId.HasValue)
        {
            transactions = transactions.Where(t => t.AccountId == accountId.Value || t.TransferAccountId == accountId.Value).ToList();
        }

        // ── Filter for the selected period ──
        var filteredTx = transactions.AsEnumerable();
        if (year.HasValue)
        {
            filteredTx = filteredTx.Where(t => t.Date.Year == year.Value);
        }
        if (month.HasValue)
        {
            filteredTx = filteredTx.Where(t => t.Date.Month == month.Value);
        }
        var periodTx = filteredTx.ToList();
        var nonTransferTx = periodTx.Where(t => t.Type != TransactionType.Transfer).ToList();
        var allNonTransferTx = transactions.Where(t => t.Type != TransactionType.Transfer).ToList();

        // ── Totals (Period specific) ──
        var totalIncome = nonTransferTx
            .Where(t => t.Type == TransactionType.Income)
            .Sum(t => t.Amount);

        var totalExpense = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        var totalInvestmentPortfolio = investments
            .Where(i => (!year.HasValue || (i.DateInvested ?? DateTime.UtcNow).Year == year.Value)
                     && (!month.HasValue || (i.DateInvested ?? DateTime.UtcNow).Month == month.Value))
            .Sum(i => i.CurrentValue);

        var totalInvestmentTx = nonTransferTx
            .Where(t => t.Type == TransactionType.Investment)
            .Sum(t => t.Amount);

        var totalInvestment = totalInvestmentPortfolio + totalInvestmentTx;

        var currentBalance = accounts.Where(a => a.Type != AccountType.CreditCard).Sum(a => a.Balance) 
                             - accounts.Where(a => a.Type == AccountType.CreditCard).Sum(a => a.Balance);

        // ── Monthly Summary (Keep all history for trend charts) ──
        var now = DateTime.UtcNow;
        var investmentsByMonth = investments
            .GroupBy(i => new {
                Year = (i.DateInvested ?? now).Year,
                Month = (i.DateInvested ?? now).Month
            })
            .ToDictionary(g => g.Key, g => g.Sum(i => i.InvestedAmount));

        var txMonthlyGroups = allNonTransferTx
            .GroupBy(t => new { t.Date.Year, t.Date.Month })
            .ToList();

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
        var yearlyTrend = allNonTransferTx
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

        // ── Category-Wise Spending (Selected Period) ──
        var totalExpenseSpend = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        var totalIncomeSpend = nonTransferTx
            .Where(t => t.Type == TransactionType.Income)
            .Sum(t => t.Amount);

        var totalInvestmentSpend = nonTransferTx
            .Where(t => t.Type == TransactionType.Investment)
            .Sum(t => t.Amount);

        var categoryWiseSpending = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense || t.Type == TransactionType.Income || t.Type == TransactionType.Investment)
            .GroupBy(t => new { t.CategoryId, t.Category.Name, Type = t.Type.ToString(), t.Category.Icon })
            .Select(g => new CategoryWiseSpendingDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                CategoryType = g.Key.Type,
                Icon = g.Key.Icon,
                Total = g.Sum(t => t.Amount),
                Percentage = g.Key.Type == "Expense"
                    ? (totalExpenseSpend > 0 ? Math.Round(g.Sum(t => t.Amount) / totalExpenseSpend * 100, 2) : 0)
                    : g.Key.Type == "Income"
                        ? (totalIncomeSpend > 0 ? Math.Round(g.Sum(t => t.Amount) / totalIncomeSpend * 100, 2) : 0)
                        : (totalInvestmentTx > 0 ? Math.Round(g.Sum(t => t.Amount) / totalInvestmentTx * 100, 2) : 0)
            })
            .OrderByDescending(c => c.Total)
            .ToList();

        // ── Weekly Trend (For the selected period or current month) ──
        var weeklyTrend = CalculateWeeklyTrend(nonTransferTx);

        // ── Bank-Wise Spending ──
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

        // ── Budget vs Actual (Selected Period) ──
        var budgetVsActual = budgets
            .Where(b => (!month.HasValue || b.Month == month.Value) && (!year.HasValue || b.Year == year.Value))
            .Select(b =>
            {
                var startDate = new DateTime(b.Year, b.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var endDate = startDate.AddMonths(1).AddTicks(-1);

                var actualSpent = allNonTransferTx
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
                        : 0,
                    Icon = b.Category?.Icon
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

        var recentTransactions = periodTx
            .OrderByDescending(t => t.Date)
            .Take(10)
            .Select(t => new RecentTransactionDto
            {
                Id = t.Id,
                Title = !string.IsNullOrWhiteSpace(t.Description) ? t.Description : t.Category.Name,
                Description = t.Description,
                Type = t.Type.ToString(),
                Amount = t.Amount,
                Date = t.Date,
                CategoryName = t.Category?.Name ?? "General",
                Icon = t.Category?.Icon
            })
            .ToList();

        var upcomingReminders = await _context.Reminders
            .Where(r => r.UserId == userId && r.Status == "upcoming")
            .OrderBy(r => r.Date)
            .Take(5)
            .Select(r => new ReminderDto
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description,
                Date = r.Date,
                Amount = r.Amount,
                Category = r.Category,
                Priority = r.Priority,
                Status = r.Status,
                Type = "Expense"
            })
            .ToListAsync();

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
            Accounts = accountSummaries,
            RecentTransactions = recentTransactions,
            UpcomingReminders = upcomingReminders,
            WeeklyTrend = weeklyTrend,
            MonthlyTrend = CalculateMonthlyTrend(nonTransferTx, year, month),
            IncomeCount = nonTransferTx.Count(t => t.Type == TransactionType.Income),
            ExpenseCount = nonTransferTx.Count(t => t.Type == TransactionType.Expense),
            InvestmentCount = nonTransferTx.Count(t => t.Type == TransactionType.Investment),
            TotalTransactionCount = periodTx.Count
        };
    }

    public async Task<DashboardResponseDto> GetYearlyDashboardAsync(Guid userId, int year, Guid? accountId = null)
    {
        var transactions = (await _transactionRepo.GetByUserIdAsync(userId)).ToList();
        var accounts = (await _accountRepo.GetByUserIdAsync(userId)).ToList();
        var investments = (await _investmentRepo.GetByUserIdAsync(userId)).ToList();
        var budgets = (await _budgetRepo.GetByUserIdAsync(userId)).ToList();

        // ── Filter for Account ──
        if (accountId.HasValue)
        {
            transactions = transactions.Where(t => t.AccountId == accountId.Value || t.TransferAccountId == accountId.Value).ToList();
        }

        // ── Filter for the selected year ──
        var periodTx = transactions.Where(t => t.Date.Year == year).ToList();
        var nonTransferTx = periodTx.Where(t => t.Type != TransactionType.Transfer).ToList();

        // ── Totals (Yearly) ──
        var totalIncome = nonTransferTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalExpense = nonTransferTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        
        var totalInvestmentPortfolio = investments
            .Where(i => (i.DateInvested ?? DateTime.UtcNow).Year == year)
            .Sum(i => i.CurrentValue);

        var totalInvestmentTx = nonTransferTx
            .Where(t => t.Type == TransactionType.Investment)
            .Sum(t => t.Amount);

        var totalInvestment = totalInvestmentPortfolio + totalInvestmentTx;

        var currentBalance = accounts.Where(a => a.Type != AccountType.CreditCard).Sum(a => a.Balance) 
                             - accounts.Where(a => a.Type == AccountType.CreditCard).Sum(a => a.Balance);

        // ── 12-Month Trend (Jan - Dec) ──
        var monthlySummary = new List<MonthlySummaryDto>();
        for (int m = 1; m <= 12; m++)
        {
            var monthTx = nonTransferTx.Where(t => t.Date.Month == m).ToList();
            var mIncome = monthTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
            var mExpense = monthTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
            var mInvestTx = monthTx.Where(t => t.Type == TransactionType.Investment).Sum(t => t.Amount);
            var mPortfolioInvest = investments.Where(i => (i.DateInvested ?? DateTime.UtcNow).Year == year && (i.DateInvested ?? DateTime.UtcNow).Month == m).Sum(i => i.InvestedAmount);
            
            monthlySummary.Add(new MonthlySummaryDto
            {
                Year = year,
                Month = m,
                Income = mIncome,
                Expense = mExpense,
                Investment = mInvestTx + mPortfolioInvest,
                Net = mIncome - mExpense - (mInvestTx + mPortfolioInvest)
            });
        }

        // ── Category-Wise Spending (Yearly) ──
        var categoryWiseSpending = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense || t.Type == TransactionType.Income || t.Type == TransactionType.Investment)
            .GroupBy(t => new { t.CategoryId, t.Category.Name, Type = t.Type.ToString(), t.Category.Icon })
            .Select(g => new CategoryWiseSpendingDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                CategoryType = g.Key.Type,
                Icon = g.Key.Icon,
                Total = g.Sum(t => t.Amount),
                Percentage = g.Key.Type == "Expense"
                    ? (totalExpense > 0 ? Math.Round(g.Sum(t => t.Amount) / totalExpense * 100, 2) : 0)
                    : g.Key.Type == "Income"
                        ? (totalIncome > 0 ? Math.Round(g.Sum(t => t.Amount) / totalIncome * 100, 2) : 0)
                        : (totalInvestment > 0 ? Math.Round(g.Sum(t => t.Amount) / totalInvestment * 100, 2) : 0)
            })
            .OrderByDescending(c => c.Total)
            .ToList();

        // ── Bank-Wise Spending (Yearly) - Expenses Only ──
        var bankWiseSpending = nonTransferTx
            .Where(t => t.Type == TransactionType.Expense && t.BankMode != null)
            .GroupBy(t => t.BankMode!.Value.ToString())
            .Select(g => new BankWiseSpendingDto
            {
                BankMode = g.Key,
                Total = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderByDescending(b => b.Total)
            .ToList();

        // ── Online vs Offline Summary (Yearly) - Expenses Only ──
        var onlineTx = nonTransferTx.Where(t => t.Type == TransactionType.Expense && t.OnlineOffline == OnlineOffline.Online).ToList();
        var offlineTx = nonTransferTx.Where(t => t.Type == TransactionType.Expense && t.OnlineOffline == OnlineOffline.Offline).ToList();
        var onlineVsOffline = new OnlineVsOfflineSummaryDto
        {
            OnlineTotal = onlineTx.Sum(t => t.Amount),
            OnlineCount = onlineTx.Count,
            OfflineTotal = offlineTx.Sum(t => t.Amount),
            OfflineCount = offlineTx.Count
        };

        return new DashboardResponseDto
        {
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            TotalInvestment = totalInvestment,
            CurrentBalance = currentBalance,
            MonthlySummary = monthlySummary,
            YearlyTrend = new List<YearlyTrendDto>(),
            CategoryWiseSpending = categoryWiseSpending,
            BankWiseSpending = bankWiseSpending,
            OnlineVsOfflineSummary = onlineVsOffline,
            BudgetVsActual = new List<BudgetVsActualDto>(),
            Accounts = accounts.Select(a => new AccountSummaryDto { Id = a.Id, Name = a.Name, Type = a.Type.ToString(), Balance = a.Balance }).ToList(),
            RecentTransactions = new List<RecentTransactionDto>(),
            UpcomingReminders = new List<ReminderDto>(),
            WeeklyTrend = new List<WeeklyTrendDto>(),
            MonthlyTrend = new List<DailyTrendDto>(),
            IncomeCount = nonTransferTx.Count(t => t.Type == TransactionType.Income),
            ExpenseCount = nonTransferTx.Count(t => t.Type == TransactionType.Expense),
            InvestmentCount = nonTransferTx.Count(t => t.Type == TransactionType.Investment),
            TotalTransactionCount = periodTx.Count
        };
    }

    private List<DailyTrendDto> CalculateMonthlyTrend(List<Transaction> transactions, int? year, int? month)
    {
        var trend = new List<DailyTrendDto>();
        var currentYear = year ?? DateTime.UtcNow.Year;
        var currentMonth = month ?? DateTime.UtcNow.Month;
        var daysInMonth = DateTime.DaysInMonth(currentYear, currentMonth);

        for (int i = 1; i <= daysInMonth; i++)
        {
            var dayTx = transactions.Where(t => t.Date.Year == currentYear && t.Date.Month == currentMonth && t.Date.Day == i);
            trend.Add(new DailyTrendDto
            {
                Day = i,
                Income = dayTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                Expense = dayTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
            });
        }
        return trend;
    }

    private List<WeeklyTrendDto> CalculateWeeklyTrend(List<Transaction> transactions)
    {
        var days = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
        var trend = new List<WeeklyTrendDto>();

        foreach (var day in days)
        {
            var dayTx = transactions.Where(t => t.Date.ToString("ddd") == day);
            trend.Add(new WeeklyTrendDto
            {
                Day = day,
                Income = dayTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                Expense = dayTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
            });
        }
        return trend;
    }
}
