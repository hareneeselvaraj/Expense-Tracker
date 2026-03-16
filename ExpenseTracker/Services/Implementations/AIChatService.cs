using System.Text;
using System.Text.Json;
using ExpenseTracker.Data;
using ExpenseTracker.DTOs.AIChat;
using ExpenseTracker.Models;
using ExpenseTracker.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Services.Implementations;

public class AIChatService : IAIChatService
{
    private readonly AppDbContext        _context;
    private readonly IConfiguration     _config;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<AIChatService> _logger;

    public AIChatService(
        AppDbContext context,
        IConfiguration config,
        IHttpClientFactory httpFactory,
        ILogger<AIChatService> logger)
    {
        _context     = context;
        _config      = config;
        _httpFactory = httpFactory;
        _logger      = logger;
    }

    public async Task<AIChatResponseDto> ChatAsync(Guid userId, AIChatRequestDto request)
    {
        var systemPrompt = await BuildSystemPromptAsync(userId);
        var reply        = await CallGeminiAsync(systemPrompt, request);
        return new AIChatResponseDto { Reply = reply };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build a rich system prompt from the user's real financial data
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<string> BuildSystemPromptAsync(Guid userId)
    {
        var now          = DateTime.UtcNow;
        var monthStart   = new DateTime(now.Year, now.Month, 1);
        var threeMonAgo  = now.AddDays(-90);

        // ── Fetch data in parallel ──
        var accountsTask      = _context.Accounts
                                    .Where(a => a.UserId == userId)
                                    .ToListAsync();

        var recentTxTask      = _context.Transactions
                                    .Include(t => t.Category)
                                    .Where(t => t.UserId == userId && t.Date >= threeMonAgo)
                                    .OrderByDescending(t => t.Date)
                                    .Take(150)
                                    .ToListAsync();

        var budgetsTask       = _context.Budgets
                                    .Include(b => b.Category)
                                    .Where(b => b.UserId == userId
                                             && b.Month == now.Month
                                             && b.Year  == now.Year)
                                    .ToListAsync();

        var investmentsTask   = _context.Investments
                                    .Where(i => i.UserId == userId)
                                    .ToListAsync();

        var remindersTask     = _context.Reminders
                                    .Where(r => r.UserId == userId && r.Status == "upcoming")
                                    .ToListAsync();

        await Task.WhenAll(accountsTask, recentTxTask, budgetsTask, investmentsTask, remindersTask);

        var accounts    = accountsTask.Result;
        var recentTx    = recentTxTask.Result;
        var budgets     = budgetsTask.Result;
        var investments = investmentsTask.Result;
        var reminders   = remindersTask.Result;

        // ── Format sections ──
        var sb = new StringBuilder();

        sb.AppendLine("You are a personal financial assistant embedded inside ExpenseTracker, an Indian personal finance app.");
        sb.AppendLine("All amounts are in Indian Rupees (₹). Use Indian number formatting (lakhs/crores where appropriate).");
        sb.AppendLine("Answer conversationally, be specific with numbers from the data, and give concise actionable advice.");
        sb.AppendLine("If you don't have enough data to answer confidently, say so rather than guessing.");
        sb.AppendLine();
        sb.AppendLine($"Today's date: {now:dd MMMM yyyy}");
        sb.AppendLine();

        // Accounts
        sb.AppendLine("## ACCOUNTS");
        if (accounts.Any())
        {
            foreach (var a in accounts)
                sb.AppendLine($"- {a.Name} ({a.Type}): ₹{a.Balance:N0}");
        }
        else sb.AppendLine("No accounts found.");
        sb.AppendLine();

        // Budgets this month
        sb.AppendLine($"## BUDGETS ({now:MMMM yyyy})");
        if (budgets.Any())
        {
            foreach (var b in budgets)
            {
                // Calculate spent from transactions
                var spent = recentTx
                    .Where(t => t.CategoryId == b.CategoryId
                             && t.Type == TransactionType.Expense
                             && t.Date >= monthStart)
                    .Sum(t => t.Amount);
                var pct = b.Amount > 0 ? (spent / b.Amount * 100) : 0;
                sb.AppendLine($"- {b.Category?.Name}: spent ₹{spent:N0} / ₹{b.Amount:N0} ({pct:F0}%)");
            }
        }
        else sb.AppendLine("No budgets set for this month.");
        sb.AppendLine();

        // Recent transactions (last 90 days) — summarised by month/category
        sb.AppendLine("## RECENT TRANSACTIONS (last 90 days)");
        var txGroups = recentTx
            .GroupBy(t => new { Year = t.Date.Year, Month = t.Date.Month, t.Type })
            .OrderByDescending(g => g.Key.Year).ThenByDescending(g => g.Key.Month);

        foreach (var g in txGroups)
        {
            var label    = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy");
            var total    = g.Sum(t => t.Amount);
            var count    = g.Count();
            var typeStr  = g.Key.Type.ToString();
            sb.AppendLine($"- {label} {typeStr}: ₹{total:N0} across {count} transactions");
        }
        sb.AppendLine();

        // Top spending categories this month
        var thisMonthExpenses = recentTx
            .Where(t => t.Type == TransactionType.Expense && t.Date >= monthStart)
            .GroupBy(t => t.Category?.Name ?? "Unknown")
            .Select(g => new { Category = g.Key, Total = g.Sum(t => t.Amount) })
            .OrderByDescending(x => x.Total)
            .Take(8);

        sb.AppendLine($"## TOP SPENDING THIS MONTH ({now:MMMM yyyy})");
        foreach (var c in thisMonthExpenses)
            sb.AppendLine($"- {c.Category}: ₹{c.Total:N0}");
        sb.AppendLine();

        // Investments
        sb.AppendLine("## INVESTMENTS");
        if (investments.Any())
        {
            var totalInvested = investments.Sum(i => i.InvestedAmount);
            var totalCurrent  = investments.Sum(i => i.CurrentValue);
            var pnl           = totalCurrent - totalInvested;
            sb.AppendLine($"Total invested: ₹{totalInvested:N0} | Current value: ₹{totalCurrent:N0} | P&L: ₹{pnl:N0} ({(totalInvested > 0 ? pnl / totalInvested * 100 : 0):F1}%)");
            foreach (var inv in investments.Take(10))
            {
                var cur    = inv.CurrentValue;
                var ret    = inv.InvestedAmount > 0 ? (cur - inv.InvestedAmount) / inv.InvestedAmount * 100 : 0;
                sb.AppendLine($"- {inv.Name} ({inv.AssetType}): invested ₹{inv.InvestedAmount:N0}, current ₹{cur:N0} ({ret:F1}%)");
            }
        }
        else sb.AppendLine("No investments recorded.");
        sb.AppendLine();

        // Reminders
        sb.AppendLine("## UPCOMING REMINDERS");
        if (reminders.Any())
        {
            foreach (var r in reminders)
            {
                var daysLeft = (r.Date - DateTime.UtcNow).Days;
                sb.AppendLine($"- {r.Title}: ₹{r.Amount?.ToString("N0") ?? "0"} due on {r.Date:dd MMM yyyy} ({daysLeft} days left)");
            }
        }
        else sb.AppendLine("No upcoming reminders.");

        return sb.ToString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Call the Gemini API
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<string> CallGeminiAsync(string systemPrompt, AIChatRequestDto request)
    {
        var apiKey = _config["Google:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return "⚠️ Gemini API key is not configured. Please add `Google:ApiKey` to appsettings.json.";

        // Build messages array
        var contents = new List<object>();

        foreach (var msg in request.History)
        {
            contents.Add(new
            {
                role = msg.Role == "user" ? "user" : "model",
                parts = new[] { new { text = msg.Content } }
            });
        }

        contents.Add(new
        {
            role = "user",
            parts = new[] { new { text = request.Message } }
        });

        var payload = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemPrompt } }
            },
            contents = contents
        };

        var json    = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var client = _httpFactory.CreateClient("google");

        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
            var response = await client.PostAsync(url, content);
            var body     = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[AI CHAT] Gemini API error {Status}: {Body}", response.StatusCode, body);
                return "Sorry, I couldn't reach the AI service right now. Please try again in a moment.";
            }

            using var doc  = JsonDocument.Parse(body);
            var textBlock  = doc.RootElement
                               .GetProperty("candidates")[0]
                               .GetProperty("content")
                               .GetProperty("parts")[0]
                               .GetProperty("text")
                               .GetString();

            return textBlock ?? "No response from AI.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI CHAT] Exception calling Gemini API");
            return "Something went wrong while talking to the AI. Please try again.";
        }
    }
}
