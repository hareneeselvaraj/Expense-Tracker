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
    private readonly AppDbContext            _context;
    private readonly IConfiguration         _config;
    private readonly IHttpClientFactory     _httpFactory;
    private readonly IBudgetService         _budgetService;
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

        // Average monthly spending per category
        var spendingHistory = categories.Select(c =>
        {
            var txns       = recentTx.Where(t => t.CategoryId == c.Id).ToList();
            var avgMonthly = txns.Count > 0 ? txns.Sum(t => t.Amount) / 3m : 0m;
            return new { c.Id, c.Name, AvgMonthly = avgMonthly, TxCount = txns.Count };
        }).OrderByDescending(x => x.AvgMonthly).ToList();

        var historyLines  = string.Join("\n",
            spendingHistory.Select(s =>
                $"- {s.Name}: avg ₹{s.AvgMonthly:N0}/month ({s.TxCount} transactions in 90 days)"));

        var categoryNames = string.Join(", ", categories.Select(c => $"\"{c.Name}\""));

        // ── Prompt: ask Gemini to return ONLY a JSON object, nothing else ──
        var prompt = $@"You are a personal finance advisor. A user says: ""{request.Prompt}""

Their expense categories: [{categoryNames}]

Their 3-month average spending:
{historyLines}

Return a JSON object with this EXACT structure, no other text:
{{""summary"":""one sentence budget strategy"",""suggestions"":[{{""categoryName"":""Food"",""suggestedAmount"":8000,""reasoning"":""reason under 10 words""}}]}}

Rules:
- Include every category in the list above
- Amounts must be whole numbers
- The amounts should reflect the user's stated income and savings goal
- Do not add any text, explanation, or markdown before or after the JSON";

        var rawResponse = await CallGeminiJsonAsync(prompt);

        _logger.LogInformation("[AI BUDGET] Raw Gemini response: {Raw}", rawResponse);

        try
        {
            var jsonStr = ExtractJson(rawResponse);
            _logger.LogInformation("[AI BUDGET] Extracted JSON: {Json}", jsonStr);

            using var doc = JsonDocument.Parse(jsonStr);

            var summary     = doc.RootElement.TryGetProperty("summary", out var s)
                ? s.GetString() ?? "" : "";

            var suggestions = new List<AIBudgetSuggestionDto>();

            if (doc.RootElement.TryGetProperty("suggestions", out var arr))
            {
                foreach (var item in arr.EnumerateArray())
                {
                    var catName = item.TryGetProperty("categoryName", out var cn) ? cn.GetString() ?? "" : "";
                    var amount  = 0m;

                    if (item.TryGetProperty("suggestedAmount", out var amtEl))
                    {
                        if (amtEl.ValueKind == JsonValueKind.Number)
                            amount = amtEl.GetDecimal();
                        else if (decimal.TryParse(amtEl.GetString(), out var parsed))
                            amount = parsed;
                    }

                    var reasoning = item.TryGetProperty("reasoning", out var r) ? r.GetString() ?? "" : "";

                    // Match to real category (case-insensitive)
                    var cat = categories.FirstOrDefault(c =>
                        c.Name.Equals(catName, StringComparison.OrdinalIgnoreCase));

                    if (cat != null && amount > 0)
                    {
                        suggestions.Add(new AIBudgetSuggestionDto
                        {
                            CategoryId      = cat.Id,
                            CategoryName    = cat.Name,
                            SuggestedAmount = amount,
                            Reasoning       = reasoning
                        });
                    }
                }
            }

            // If Gemini returned categories that don't exactly match names, try partial match
            if (suggestions.Count == 0 && doc.RootElement.TryGetProperty("suggestions", out var arr2))
            {
                foreach (var item in arr2.EnumerateArray())
                {
                    var catName = item.TryGetProperty("categoryName", out var cn) ? cn.GetString() ?? "" : "";
                    var amount  = 0m;
                    if (item.TryGetProperty("suggestedAmount", out var amtEl))
                    {
                        if (amtEl.ValueKind == JsonValueKind.Number)
                            amount = amtEl.GetDecimal();
                        else if (decimal.TryParse(amtEl.GetString(), out var parsed))
                            amount = parsed;
                    }
                    var reasoning = item.TryGetProperty("reasoning", out var r) ? r.GetString() ?? "" : "";

                    // Partial / fuzzy name match
                    var cat = categories.FirstOrDefault(c =>
                        c.Name.Contains(catName, StringComparison.OrdinalIgnoreCase) ||
                        catName.Contains(c.Name, StringComparison.OrdinalIgnoreCase));

                    if (cat != null && amount > 0)
                    {
                        suggestions.Add(new AIBudgetSuggestionDto
                        {
                            CategoryId      = cat.Id,
                            CategoryName    = cat.Name,
                            SuggestedAmount = amount,
                            Reasoning       = reasoning
                        });
                    }
                }
            }

            return new AIBudgetResponseDto
            {
                Summary     = string.IsNullOrWhiteSpace(summary) ? "AI-generated budget based on your spending history." : summary,
                Suggestions = suggestions
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI BUDGET] Parse failed. Raw: {Raw}", rawResponse);
            return new AIBudgetResponseDto
            {
                Summary     = "Could not parse AI response. Please try again.",
                Suggestions = new()
            };
        }
    }

    public async Task<int> ApplyBudgetsAsync(Guid userId, AIBudgetApplyDto dto)
    {
        int applied = 0;
        foreach (var suggestion in dto.Budgets)
        {
            try
            {
                var existing = await _context.Budgets
                    .FirstOrDefaultAsync(b => b.UserId     == userId
                                           && b.CategoryId == suggestion.CategoryId
                                           && b.Month      == dto.Month
                                           && b.Year       == dto.Year);
                if (existing != null)
                {
                    existing.Amount = suggestion.SuggestedAmount;
                    _context.Budgets.Update(existing);
                }
                else
                {
                    await _budgetService.CreateAsync(userId, new CreateBudgetDto
                    {
                        CategoryId = suggestion.CategoryId,
                        Amount     = suggestion.SuggestedAmount,
                        Month      = dto.Month,
                        Year       = dto.Year
                    });
                }
                applied++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AI BUDGET APPLY] Failed for categoryId={CatId}", suggestion.CategoryId);
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

        var vehicleContexts = new StringBuilder();
        foreach (var v in vehicles)
        {
            var vEntries = allEntries
                .Where(e => e.VehicleId == v.Id)
                .OrderBy(e => e.Date)
                .ToList();

            vehicleContexts.AppendLine($"Vehicle: {v.Name} ({v.VehicleType}, {v.FuelType})");

            if (vEntries.Count < 2)
            {
                vehicleContexts.AppendLine("  Not enough data (need at least 2 fuel entries)");
                vehicleContexts.AppendLine();
                continue;
            }

            decimal totalDist  = vEntries.Last().OdometerReading - vEntries.First().OdometerReading;
            decimal totalFuel  = vEntries.Skip(1).Sum(e => e.FuelQuantity);
            decimal totalCost  = vEntries.Skip(1).Sum(e => e.FuelCost);
            decimal avgMileage = totalFuel > 0 ? totalDist / totalFuel : 0;
            decimal avgPPL     = vEntries.Where(e => e.PricePerLiter.HasValue)
                                          .Select(e => e.PricePerLiter!.Value)
                                          .DefaultIfEmpty(0)
                                          .Average();

            vehicleContexts.AppendLine($"  Total distance: {totalDist:N0} km over {vEntries.Count} fill-ups");
            vehicleContexts.AppendLine($"  Avg mileage: {avgMileage:F1} km/L");
            vehicleContexts.AppendLine($"  Avg price/liter: ₹{avgPPL:F1}");
            vehicleContexts.AppendLine($"  Total fuel cost: ₹{totalCost:N0}");

            var now = DateTime.UtcNow;
            vehicleContexts.AppendLine("  Monthly trend:");
            for (int i = 2; i >= 0; i--)
            {
                var mDate    = now.AddMonths(-i);
                var mStart   = new DateTime(mDate.Year, mDate.Month, 1);
                var mEnd     = mStart.AddMonths(1);
                var mEntries = vEntries.Where(e => e.Date >= mStart && e.Date < mEnd).ToList();
                if (mEntries.Count > 1)
                {
                    var mDist    = mEntries.Last().OdometerReading - mEntries.First().OdometerReading;
                    var mFuel    = mEntries.Skip(1).Sum(e => e.FuelQuantity);
                    var mMileage = mFuel > 0 ? mDist / mFuel : 0;
                    vehicleContexts.AppendLine($"    {mDate:MMM yyyy}: {mMileage:F1} km/L, ₹{mEntries.Skip(1).Sum(e => e.FuelCost):N0} spent");
                }
                else
                {
                    vehicleContexts.AppendLine($"    {mDate:MMM yyyy}: insufficient data");
                }
            }

            if (v.ServiceIntervalKm.HasValue)
                vehicleContexts.AppendLine($"  Service interval: every {v.ServiceIntervalKm} km, current odometer: {vEntries.Last().OdometerReading:N0} km");

            vehicleContexts.AppendLine();
        }

        var prompt = $@"You are a fuel efficiency expert for Indian roads and vehicles.

Vehicle data:
{vehicleContexts}

Return a JSON object with this EXACT structure, no other text:
{{""overallSummary"":""one sentence about fleet health"",""vehicles"":[{{""vehicleName"":""Honda Activa"",""statusEmoji"":""✅"",""tips"":[""tip 1"",""tip 2"",""tip 3""]}}]}}

Rules:
- statusEmoji must be one of: ✅ (good), ⚠️ (needs attention), 🔴 (urgent)
- Include only vehicles with enough data
- 3-4 tips per vehicle, specific to the data
- Do not add any text before or after the JSON";

        var rawResponse = await CallGeminiJsonAsync(prompt);
        _logger.LogInformation("[FUEL COACH] Raw Gemini response: {Raw}", rawResponse);

        try
        {
            var jsonStr = ExtractJson(rawResponse);
            using var doc = JsonDocument.Parse(jsonStr);

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

                    var realVehicle = vehicles.FirstOrDefault(v =>
                        v.Name.Contains(name, StringComparison.OrdinalIgnoreCase) ||
                        name.Contains(v.Name, StringComparison.OrdinalIgnoreCase));

                    vehicleDtos.Add(new VehicleCoachDto
                    {
                        VehicleName = name,
                        VehicleType = realVehicle?.VehicleType ?? "",
                        FuelType    = realVehicle?.FuelType ?? "",
                        Tips        = tips,
                        StatusEmoji = emoji
                    });
                }
            }

            return new FuelCoachResponseDto { OverallSummary = overallSummary, Vehicles = vehicleDtos };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FUEL COACH] Parse failed. Raw: {Raw}", rawResponse);
            return new FuelCoachResponseDto
            {
                OverallSummary = "Could not generate tips right now. Please try again.",
                Vehicles       = new()
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Gemini helper — forces JSON mime type so no markdown wrapping
    // ═══════════════════════════════════════════════════════════════════

    private async Task<string> CallGeminiJsonAsync(string prompt)
    {
        var apiKey = _config["Google:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return @"{""error"":""API key not configured""}";

        // responseMimeType = "application/json" forces Gemini to return raw JSON
        var payload = new
        {
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                temperature      = 0.3,
                maxOutputTokens  = 2048,
                responseMimeType = "application/json"   // ← KEY FIX: forces raw JSON output
            }
        };

        var json    = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var url     = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
        var client  = _httpFactory.CreateClient("google");

        try
        {
            var response = await client.PostAsync(url, content);
            var body     = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[AI FEATURES] Gemini error {Status}: {Body}", response.StatusCode, body);
                return @"{""error"":""API call failed""}";
            }

            using var doc = JsonDocument.Parse(body);
            return doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI FEATURES] Gemini exception");
            return @"{""error"":""Exception calling Gemini""}";
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Robust JSON extractor — handles markdown fences and extra text
    // ═══════════════════════════════════════════════════════════════════

    private static string ExtractJson(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "{}";

        // 1. Strip markdown code fences
        var cleaned = Regex.Replace(raw, @"```json\s*", "", RegexOptions.IgnoreCase);
        cleaned     = Regex.Replace(cleaned, @"```\s*", "");
        cleaned     = cleaned.Trim();

        // 2. If it starts with { it's already clean JSON
        if (cleaned.StartsWith("{")) return cleaned;

        // 3. Extract the first {...} block from any surrounding text
        var match = Regex.Match(cleaned, @"\{[\s\S]*\}", RegexOptions.Singleline);
        if (match.Success) return match.Value;

        // 4. Nothing worked — return the cleaned string and let the caller handle the exception
        return cleaned;
    }
}
