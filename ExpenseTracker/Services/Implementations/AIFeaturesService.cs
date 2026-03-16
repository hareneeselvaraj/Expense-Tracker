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

        // ── Step 1: Filter categories (now including backend-side exclusion filter) ──
        var categories = await _context.Categories
            .Where(c => c.UserId == userId && c.Type == CategoryType.Expense)
            .ToListAsync();

        if (request.ExcludedCategoryIds.Any())
        {
            categories = categories.Where(c => !request.ExcludedCategoryIds.Contains(c.Id)).ToList();
        }

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

        // ── Simplified JSON keys for Gemini accuracy ──
        var prompt =
$@"The user says: ""{request.Prompt}""

Expense categories:
{categoryLines}

Respond with ONLY a JSON object. No explanation.
{{
  ""summary"": ""one sentence"",
  ""b"": [
    {{ ""n"": 1, ""a"": 5000, ""r"": ""Reason"" }},
    {{ ""n"": 2, ""a"": 3000, ""r"": ""Reason"" }}
  ]
}}";

        var raw = await CallGeminiRawAsync(prompt);
        _logger.LogInformation("[AI BUDGET] Raw response: {Raw}", raw);

        try
        {
            var json = StripToJson(raw);
            using var doc = JsonDocument.Parse(json);

            var summary = doc.RootElement.TryGetProperty("summary", out var s)
                ? s.GetString() ?? "" : "";

            var suggestions = new List<AIBudgetSuggestionDto>();

            // Handle both legacy "budgets" and new simplified "b" keys
            JsonElement arr;
            bool hasArr = doc.RootElement.TryGetProperty("b", out arr)
                       || doc.RootElement.TryGetProperty("budgets", out arr);

            if (hasArr)
            {
                foreach (var item in arr.EnumerateArray())
                {
                    int num = 0;
                    if (item.TryGetProperty("n", out var nEl)) num = nEl.GetInt32();
                    else if (item.TryGetProperty("num", out var numEl)) num = numEl.GetInt32();

                    decimal amount = 0;
                    if (item.TryGetProperty("a", out var aEl)) amount = aEl.GetDecimal();
                    else if (item.TryGetProperty("amount", out var amtEl)) amount = amtEl.GetDecimal();

                    var reason = "";
                    if (item.TryGetProperty("r", out var rEl)) reason = rEl.GetString() ?? "";
                    else if (item.TryGetProperty("reasoning", out var rsEl)) reason = rsEl.GetString() ?? "";

                    var cat = numberedCategories.FirstOrDefault(c => c.Number == num);
                    if (cat != null)
                    {
                        suggestions.Add(new AIBudgetSuggestionDto
                        {
                            CategoryId      = cat.Id,
                            CategoryName    = cat.Name,
                            SuggestedAmount = Math.Round(amount),
                            Reasoning       = reason
                        });
                    }
                }
            }

            if (suggestions.Count == 0)
            {
                suggestions = BuildFallbackBudget(request.Prompt, numberedCategories
                    .Select(c => (c.Id, c.Name, c.AvgMonthly)).ToList());
                summary = "Budget generated using history/patterns (AI response was unparseable).";
            }

            return new AIBudgetResponseDto { Summary = summary, Suggestions = suggestions };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI BUDGET] Fail");
            var fallback = BuildFallbackBudget(request.Prompt, numberedCategories
                .Select(c => (c.Id, c.Name, c.AvgMonthly)).ToList());

            return new AIBudgetResponseDto
            {
                Summary     = "Budget based on history/patterns (AI unavailable).",
                Suggestions = fallback
            };
        }
    }

    private static List<AIBudgetSuggestionDto> BuildFallbackBudget(
        string prompt,
        List<(Guid Id, string Name, decimal AvgMonthly)> categories)
    {
        var incomeMatch = Regex.Match(prompt, @"[\₹]?\s*([\d,]+)");
        decimal income  = 0;
        if (incomeMatch.Success)
            decimal.TryParse(incomeMatch.Groups[1].Value.Replace(",", ""), out income);

        var savePctMatch = Regex.Match(prompt, @"(\d+)\s*%");
        decimal savePct  = savePctMatch.Success
            ? decimal.Parse(savePctMatch.Groups[1].Value) / 100m : 0.20m;

        var spendable = income > 0 ? income * (1 - savePct) : 0;
        var totalAvg  = categories.Sum(c => c.AvgMonthly);

        return categories.Select(c =>
        {
            decimal weight = 0;
            // ── Keyword-based weights for zero-history categories ──
            var lower = c.Name.ToLower();
            if (lower.Contains("grocer")) weight = 0.15m;
            else if (lower.Contains("house") || lower.Contains("rent")) weight = 0.25m;
            else if (lower.Contains("food")  || lower.Contains("dining")) weight = 0.10m;
            else if (lower.Contains("transport") || lower.Contains("fuel") || lower.Contains("auto")) weight = 0.08m;
            else if (lower.Contains("bill")  || lower.Contains("utilit") || lower.Contains("phone")) weight = 0.07m;
            else weight = 0.05m;

            decimal suggested;
            if (spendable > 0)
            {
                // If history exists, use history proportion. Otherwise use keyword weight.
                var proportion = totalAvg > 0 ? (c.AvgMonthly / totalAvg) : weight;
                suggested = Math.Round(spendable * proportion / 100) * 100;
            }
            else
            {
                suggested = Math.Round(c.AvgMonthly * 1.1m / 100) * 100;
            }

            return new AIBudgetSuggestionDto
            {
                CategoryId      = c.Id,
                CategoryName    = c.Name,
                SuggestedAmount = Math.Max(suggested, 500),
                Reasoning       = c.AvgMonthly > 0 ? "Based on your spending history" : "Based on typical monthly patterns"
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
