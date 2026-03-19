using ExpenseTracker.Data;
using ExpenseTracker.Models;
using ExpenseTracker.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Services.Implementations;

public class SIPService
{
    private readonly AppDbContext _context;
    private readonly IPriceFeedService _priceFeed;
    private readonly ILogger<SIPService> _logger;

    public SIPService(AppDbContext context, IPriceFeedService priceFeed, ILogger<SIPService> logger)
    {
        _context = context;
        _priceFeed = priceFeed;
        _logger = logger;
    }

    public async Task<SIP> CreateAsync(Guid userId, CreateSIPDto dto)
    {
        var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == dto.InvestmentId && i.UserId == userId);
        if (investment == null) throw new KeyNotFoundException("Investment not found.");

        var sip = new SIP
        {
            UserId = userId,
            InvestmentId = dto.InvestmentId,
            MonthlyAmount = dto.MonthlyAmount,
            ExecutionDay = Math.Clamp(dto.ExecutionDay, 1, 28),
            Status = "Active",
            NextExecutionDate = CalculateNextExecution(dto.ExecutionDay)
        };

        _context.SIPs.Add(sip);
        await _context.SaveChangesAsync();
        return sip;
    }

    public async Task<List<SIP>> GetAllAsync(Guid userId)
    {
        return await _context.SIPs
            .Include(s => s.Investment)
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<SIP?> UpdateAsync(Guid userId, Guid sipId, UpdateSIPDto dto)
    {
        var sip = await _context.SIPs.FirstOrDefaultAsync(s => s.Id == sipId && s.UserId == userId);
        if (sip == null) return null;

        if (dto.MonthlyAmount.HasValue) sip.MonthlyAmount = dto.MonthlyAmount.Value;
        if (dto.ExecutionDay.HasValue) sip.ExecutionDay = Math.Clamp(dto.ExecutionDay.Value, 1, 28);
        if (!string.IsNullOrWhiteSpace(dto.Status)) sip.Status = dto.Status;

        sip.NextExecutionDate = CalculateNextExecution(sip.ExecutionDay);
        await _context.SaveChangesAsync();
        return sip;
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid sipId)
    {
        var sip = await _context.SIPs.FirstOrDefaultAsync(s => s.Id == sipId && s.UserId == userId);
        if (sip == null) return false;
        _context.SIPs.Remove(sip);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SIPHistory>> GetHistoryAsync(Guid userId, Guid sipId)
    {
        return await _context.SIPHistories
            .Include(h => h.SIP)
            .Where(h => h.SIP.UserId == userId && h.SIPId == sipId)
            .OrderByDescending(h => h.ExecutedAt)
            .ToListAsync();
    }

    /// <summary>Execute all active SIPs that are due today or overdue</summary>
    public async Task<int> ExecuteDueSIPsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var dueSIPs = await _context.SIPs
            .Include(s => s.Investment)
            .Where(s => s.Status == "Active" && s.NextExecutionDate <= today)
            .ToListAsync();

        var executed = 0;
        foreach (var sip in dueSIPs)
        {
            try
            {
                // Fetch live price if ticker is available
                decimal? nav = null;
                if (!string.IsNullOrEmpty(sip.Investment.Ticker) && !string.IsNullOrEmpty(sip.Investment.PriceSource))
                {
                    var priceResult = await _priceFeed.GetPriceAsync(sip.Investment.Ticker, sip.Investment.PriceSource);
                    if (priceResult.Price > 0) nav = priceResult.Price;
                }

                // Update the investment's InvestedAmount
                sip.Investment.InvestedAmount += sip.MonthlyAmount;

                // If we have a live price and quantity, update current value
                if (nav.HasValue && sip.Investment.Quantity.HasValue && nav.Value > 0)
                {
                    var additionalUnits = sip.MonthlyAmount / nav.Value;
                    sip.Investment.Quantity += additionalUnits;
                    sip.Investment.CurrentValue = sip.Investment.Quantity.Value * nav.Value;
                    sip.Investment.LastPriceUpdate = DateTime.UtcNow;
                }

                // Log the history
                _context.SIPHistories.Add(new SIPHistory
                {
                    SIPId = sip.Id,
                    Amount = sip.MonthlyAmount,
                    NavAtExecution = nav,
                    Status = "Success"
                });

                // Move to next execution date
                sip.NextExecutionDate = CalculateNextExecution(sip.ExecutionDay);
                executed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SIP] Failed to execute SIP {SIPId}", sip.Id);
                _context.SIPHistories.Add(new SIPHistory
                {
                    SIPId = sip.Id,
                    Amount = sip.MonthlyAmount,
                    Status = "Failed",
                    Notes = ex.Message
                });
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("[SIP] Executed {Count} SIPs", executed);
        return executed;
    }

    private static DateTime CalculateNextExecution(int executionDay)
    {
        var now = DateTime.UtcNow;
        var thisMonth = new DateTime(now.Year, now.Month, Math.Min(executionDay, DateTime.DaysInMonth(now.Year, now.Month)));
        return thisMonth > now ? thisMonth : thisMonth.AddMonths(1);
    }
}

// ── DTOs ──
public class CreateSIPDto
{
    public Guid InvestmentId { get; set; }
    public decimal MonthlyAmount { get; set; }
    public int ExecutionDay { get; set; } = 1;
}

public class UpdateSIPDto
{
    public decimal? MonthlyAmount { get; set; }
    public int? ExecutionDay { get; set; }
    public string? Status { get; set; }
}
