using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ExpenseTracker.Data;
using ExpenseTracker.DTOs.AIFeatures;
using ExpenseTracker.DTOs.Budget;
using ExpenseTracker.Models;
using ExpenseTracker.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Services.Implementations;

public class AIFeaturesService : IAIFeaturesService
{
    private readonly AppDbContext               _context;
    private readonly IConfiguration            _config;
    private readonly IHttpClientFactory        _httpFactory;
    private readonly IBudgetService            _budgetService;
    private readonly ILogger<AIFeaturesService> _logger;

    public AIFeaturesService(
        AppDbContext context,
        IConfiguration config,
        IHttpClientFactory httpFactory,
        IBudgetService budgetService,
        ILogger<AIFeaturesService> logger)
    {
        _context       = context;
        _config        = config;
        _httpFactory   = httpFactory;
        _budgetService = budgetService;
        _logger        = logger;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FEATURE 1 — Natural Language Budget Setup
    // ═══════════════════════════════════════════════════════════════════

    public async Task<AIBudgetResponseDto> GenerateBudgetAsync(Guid userId, AIBudgetRequestDto request)
    {
        var now         = DateTime.UtcNow;
        var threeMonAgo = now.AddDays(-90);

        var categories = await _context.Categories
            .Where(c => c.UserId == userId && c.Type == CategoryType.Expense)
            .ToListAsync();

        if (!categories.Any())
            return new AIBudgetResponseDto
            {
                Summary     = "No expense categories found. Please create some categories first.",
                Suggestions = new()
            };

        var recentTx = await _context.Transactions
            .Where(t => t.UserId == userId
                     && t.Type   == TransactionType.Expense
                     && t.Date   >= threeMonAgo)
            .ToListAsync();

        // ── Build numbered category list — Gemini returns numbers, not names ──
        // This completely eliminates name-matching problems
        var numberedCategories = categories
            .Select((c, idx) => new
            {
                Number     = idx + 1,
                c.Id,
                c.Name,
                AvgMonthly = recentTx.Where(t => t.CategoryId == c.Id).Sum(t => t.Amount) / 3m
            })
            .ToList();

        var categoryLines = string.Join("\n", numberedCategories.Select(c =>
            $"{c.Number}. {c.Name} (avg ₹{c.AvgMonthly:N0}/month)"));

        // ── Simple, unambiguous prompt ──
        var prompt =
$@"The user says: ""{request.Prompt}""

Their expense categories (numbered):
{categoryLines}

Respond with ONLY a JSON object. No explanation. No markdown. Just the JSON.
Use this exact format:
{{
  ""summary"": ""one sentence here"",
  ""budgets"": [
    {{ ""num"": 1, ""amount"": 5000 }},
    {{ ""num"": 2, ""amount"": 3000 }}
  ]
}}

Include a budget for every category number listed above.
Amounts must be whole numbers in Indian Rupees.
The amounts should match the user's stated income and savings goal.";

        var raw = await CallGeminiRawAsync(prompt);
        _logger.LogInformation("[AI BUDGET] Raw response: {Raw}", raw);

        try
        {
            var json = StripToJson(raw);
            _logger.LogInformation("[AI BUDGET] Stripped JSON: {Json}", json);

            using var doc = JsonDocument.Parse(json);

            var summary = doc.RootElement.TryGetProperty("summary", out var s)
                ? s.GetString() ?? "AI-generated budget" : "AI-generated budget";

            var suggestions = new List<AIBudgetSuggestionDto>();

            // Try "budgets" key first, fall back to "suggestions"
            JsonElement arr;
            bool hasArr = doc.RootElement.TryGetProperty("budgets", out arr)
                       || doc.RootElement.TryGetProperty("suggestions", out arr);

            if (hasArr)
            {
                foreach (var item in arr.EnumerateArray())
                {
                    // Get the number
                    int num = 0;
                    if (item.TryGetProperty("num", out var numEl))
                        num = numEl.ValueKind == JsonValueKind.Number ? numEl.GetInt32() : 0;
                    else if (item.TryGetProperty("number", out var numEl2))
                        num = numEl2.ValueKind == JsonValueKind.Number ? numEl2.GetInt32() : 0;

                    // Get the amount
                    decimal amount = 0;
                    if (item.TryGetProperty("amount", out var amtEl))
                    {
                        if (amtEl.ValueKind == JsonValueKind.Number)
                            amount = amtEl.GetDecimal();
                        else if (decimal.TryParse(amtEl.GetString()?.Replace(",",""), out var p))
                            amount = p;
                    }

                    // Get reasoning (optional)
                    var reason = item.TryGetProperty("reasoning", out var r) ? r.GetString() ?? "" : "";
                    if (string.IsNullOrEmpty(reason) && item.TryGetProperty("reason", out var r2))
                        reason = r2.GetString() ?? "";

                    // Match by number to the real category
                    var cat = numberedCategories.FirstOrDefault(c => c.Number == num);
                    if (cat != null && amount > 0)
                    {
                        suggestions.Add(new AIBudgetSuggestionDto
                        {
                            CategoryId      = cat.Id,
                            CategoryName    = cat.Name,
                            SuggestedAmount = amount,
                            Reasoning       = reason
                        });
                    }
                }
            }

            // If still empty, something unexpected — build fallback from 20/80 rule
            if (suggestions.Count == 0)
            {
                _logger.LogWarning("[AI BUDGET] No suggestions parsed, using rule-based fallback");
                suggestions = BuildFallbackBudget(request.Prompt, numberedCategories
                    .Select(c => (c.Id, c.Name, c.AvgMonthly)).ToList());
                summary = "Budget generated using spending history (AI response could not be parsed).";
            }

            return new AIBudgetResponseDto { Summary = summary, Suggestions = suggestions };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI BUDGET] Parse failed. Raw: {Raw}", raw);

            // Fallback: rule-based budget from spending history
            var fallback = BuildFallbackBudget(request.Prompt, numberedCategories
                .Select(c => (c.Id, c.Name, c.AvgMonthly)).ToList());

            return new AIBudgetResponseDto
            {
                Summary     = "Budget based on your spending history (AI service unavailable).",
                Suggestions = fallback
            };
        }
    }

    // ── Rule-based fallback: extract income from prompt, distribute using averages ──
    private static List<AIBudgetSuggestionDto> BuildFallbackBudget(
        string prompt,
        List<(Guid Id, string Name, decimal AvgMonthly)> categories)
    {
        // Try to extract income from prompt (e.g. "80,000" or "80000")
        var incomeMatch = Regex.Match(prompt, @"[\₹]?\s*([\d,]+)");
        decimal income  = 0;
        if (incomeMatch.Success)
            decimal.TryParse(incomeMatch.Groups[1].Value.Replace(",", ""), out income);

        // Try to extract savings % (e.g. "20%")
        var savePctMatch = Regex.Match(prompt, @"(\d+)\s*%");
        decimal savePct  = savePctMatch.Success
            ? decimal.Parse(savePctMatch.Groups[1].Value) / 100m : 0.20m;

        var spendable = income > 0 ? income * (1 - savePct) : 0;
        var totalAvg  = categories.Sum(c => c.AvgMonthly);

        return categories.Select(c =>
        {
            // Scale proportionally to spendable, or use 110% of average if no income given
            var suggested = spendable > 0 && totalAvg > 0
                ? Math.Round(spendable * (c.AvgMonthly / totalAvg) / 100) * 100
                : Math.Round(c.AvgMonthly * 1.1m / 100) * 100;

            return new AIBudgetSuggestionDto
            {
                CategoryId      = c.Id,
                CategoryName    = c.Name,
                SuggestedAmount = Math.Max(suggested, 500), // minimum ₹500
                Reasoning       = c.AvgMonthly > 0
                    ? $"Based on avg ₹{c.AvgMonthly:N0}/month"
                    : "Suggested minimum"
            };
        }).ToList();
    }

    public async Task<int> ApplyBudgetsAsync(Guid userId, AIBudgetApplyDto dto)
    {
        int applied = 0;
        foreach (var s in dto.Budgets)
        {
            try
            {
                var existing = await _context.Budgets
                    .FirstOrDefaultAsync(b => b.UserId     == userId
                                           && b.CategoryId == s.CategoryId
                                           && b.Month      == dto.Month
                                           && b.Year       == dto.Year);
                if (existing != null)
                {
                    existing.Amount = s.SuggestedAmount;
                    _context.Budgets.Update(existing);
                }
                else
                {
                    await _budgetService.CreateAsync(userId, new CreateBudgetDto
                    {
                        CategoryId = s.CategoryId,
                        Amount     = s.SuggestedAmount,
                        Month      = dto.Month,
                        Year       = dto.Year
                    });
                }
                applied++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AI BUDGET APPLY] categoryId={CatId}", s.CategoryId);
            }
        }
        await _context.SaveChangesAsync();
        return applied;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FEATURE 2 — Fuel Efficiency AI Coach
    // ═══════════════════════════════════════════════════════════════════

    public async Task<FuelCoachResponseDto> GetFuelCoachAsync(Guid userId)
    {
        var vehicles = await _context.Vehicles
            .Where(v => v.UserId == userId)
            .ToListAsync();

        if (!vehicles.Any())
            return new FuelCoachResponseDto
            {
                OverallSummary = "No vehicles found. Add a vehicle to get fuel efficiency tips.",
                Vehicles       = new()
            };

        var allEntries = await _context.FuelEntries
            .Where(f => f.UserId == userId)
            .OrderBy(f => f.Date)
            .ToListAsync();

        var vehicleCtx = new StringBuilder();
        foreach (var v in vehicles)
        {
            var vEntries = allEntries.Where(e => e.VehicleId == v.Id)
                                     .OrderBy(e => e.Date).ToList();
            vehicleCtx.AppendLine($"Vehicle: {v.Name} ({v.VehicleType}, {v.FuelType})");
            if (vEntries.Count < 2) { vehicleCtx.AppendLine("  Insufficient data"); vehicleCtx.AppendLine(); continue; }

            decimal dist    = vEntries.Last().OdometerReading - vEntries.First().OdometerReading;
            decimal fuel    = vEntries.Skip(1).Sum(e => e.FuelQuantity);
            decimal cost    = vEntries.Skip(1).Sum(e => e.FuelCost);
            decimal mileage = fuel > 0 ? dist / fuel : 0;
            vehicleCtx.AppendLine($"  Avg mileage: {mileage:F1} km/L, Total cost: ₹{cost:N0}, Distance: {dist:N0} km");
            vehicleCtx.AppendLine();
        }

        var prompt =
$@"Fuel efficiency data for Indian vehicles:
{vehicleCtx}

Respond with ONLY a JSON object. No explanation. No markdown. Just JSON.
Format:
{{
  ""overallSummary"": ""one sentence"",
  ""vehicles"": [
    {{
      ""vehicleName"": ""exact name from data"",
      ""statusEmoji"": ""✅"",
      ""tips"": [""tip 1"", ""tip 2"", ""tip 3""]
    }}
  ]
}}";

        var raw = await CallGeminiRawAsync(prompt);
        _logger.LogInformation("[FUEL COACH] Raw: {Raw}", raw);

        try
        {
            var json = StripToJson(raw);
            using var doc = JsonDocument.Parse(json);

            var overallSummary = doc.RootElement.TryGetProperty("overallSummary", out var os)
                ? os.GetString() ?? "" : "";

            var vehicleDtos = new List<VehicleCoachDto>();
            if (doc.RootElement.TryGetProperty("vehicles", out var vArr))
            {
                foreach (var item in vArr.EnumerateArray())
                {
                    var name  = item.TryGetProperty("vehicleName",  out var n) ? n.GetString() ?? "" : "";
                    var emoji = item.TryGetProperty("statusEmoji",  out var e) ? e.GetString() ?? "✅" : "✅";
                    var tips  = new List<string>();
                    if (item.TryGetProperty("tips", out var tArr))
                        foreach (var t in tArr.EnumerateArray())
                            if (t.GetString() is string tip) tips.Add(tip);

                    var real = vehicles.FirstOrDefault(v =>
                        v.Name.Contains(name, StringComparison.OrdinalIgnoreCase) ||
                        name.Contains(v.Name, StringComparison.OrdinalIgnoreCase));

                    vehicleDtos.Add(new VehicleCoachDto
                    {
                        VehicleName = string.IsNullOrEmpty(name) ? (real?.Name ?? "Vehicle") : name,
                        VehicleType = real?.VehicleType ?? "",
                        FuelType    = real?.FuelType ?? "",
                        Tips        = tips,
                        StatusEmoji = emoji
                    });
                }
            }

            return new FuelCoachResponseDto { OverallSummary = overallSummary, Vehicles = vehicleDtos };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FUEL COACH] Parse failed. Raw: {Raw}", raw);
            return new FuelCoachResponseDto
            {
                OverallSummary = "Could not generate tips. Please try again.",
                Vehicles       = new()
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Gemini call — tries responseMimeType first, falls back without it
    // ═══════════════════════════════════════════════════════════════════

    private async Task<string> CallGeminiRawAsync(string prompt)
    {
        var apiKey = _config["Google:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return @"{""error"":""Google:ApiKey not configured in appsettings.json""}";

        // Try with responseMimeType (forces JSON on supported models)
        var result = await PostToGeminiAsync(apiKey, prompt, useJsonMime: true);

        // If it returned an error body (non-JSON or API error), retry without the mime type
        if (result.TrimStart().StartsWith("{\"error\"") || result.TrimStart().StartsWith("{\"candidates\""))
        {
            // Already parsed as Gemini API error — return as-is
        }
        else if (!result.TrimStart().StartsWith("{") && !result.TrimStart().StartsWith("["))
        {
            _logger.LogWarning("[AI FEATURES] responseMimeType may not be supported, retrying without it");
            result = await PostToGeminiAsync(apiKey, prompt, useJsonMime: false);
        }

        return result;
    }

    private async Task<string> PostToGeminiAsync(string apiKey, string prompt, bool useJsonMime)
    {
        object genConfig = useJsonMime
            ? new { temperature = 0.3, maxOutputTokens = 2048, responseMimeType = "application/json" }
            : (object)new { temperature = 0.3, maxOutputTokens = 2048 };

        var payload = new
        {
            contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
            generationConfig = genConfig
        };

        var json    = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var url     = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";
        var client  = _httpFactory.CreateClient("google");

        try
        {
            var response = await client.PostAsync(url, content);
            var body     = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[AI FEATURES] Gemini {Status}: {Body}", response.StatusCode, body);
                return $"{{\"error\":\"Gemini API returned {(int)response.StatusCode}\"}}";
            }

            using var doc = JsonDocument.Parse(body);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? "{}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI FEATURES] PostToGemini exception");
            return "{\"error\":\"Exception calling Gemini\"}";
        }
    }

    // ── Strip everything outside the outermost { } ──
    private static string StripToJson(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "{}";

        // Remove markdown fences
        var s = Regex.Replace(raw, @"```json", "", RegexOptions.IgnoreCase);
        s     = Regex.Replace(s,   @"```",     "");
        s     = s.Trim();

        if (s.StartsWith("{")) return s;

        // Find first { and last } and extract
        var start = s.IndexOf('{');
        var end   = s.LastIndexOf('}');
        if (start >= 0 && end > start)
            return s[start..(end + 1)];

        return s; // let caller throw
    }
}
