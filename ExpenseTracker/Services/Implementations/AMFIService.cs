using Microsoft.Extensions.Caching.Memory;

namespace ExpenseTracker.Services.Implementations;

public class AMFIService
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AMFIService> _logger;
    private const string CacheKey = "AMFI_NAV_DICT";

    public AMFIService(HttpClient http, IMemoryCache cache, ILogger<AMFIService> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Returns the NAV for a given scheme code from the cached AMFI dictionary.
    /// Standardized format: SchemeCode => NAV.
    /// </summary>
    public async Task<decimal?> GetNavAsync(string schemeCode)
    {
        var dict = await GetOrFetchNavDictionaryAsync();
        if (dict.TryGetValue(schemeCode, out var nav))
        {
            return nav;
        }
        return null;
    }

    private async Task<Dictionary<string, decimal>> GetOrFetchNavDictionaryAsync()
    {
        if (_cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cachedDict) && cachedDict != null)
        {
            return cachedDict;
        }

        try
        {
            _logger.LogInformation("[AMFI] Downloading daily NAVAll.txt...");
            var url = "https://www.amfiindia.com/spages/NAVAll.txt";
            var response = await _http.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var text = await response.Content.ReadAsStringAsync();
            var dict = ParseAmfiText(text);

            _logger.LogInformation("[AMFI] Successfully parsed {Count} scheme NAVs.", dict.Count);

            // Cache until the next 8:30 PM IST (when AMFI typically updates)
            var nowUtc = DateTime.UtcNow;
            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, istZone);
            
            var nextUpdateIst = nowIst.Date.AddHours(20).AddMinutes(30); // 8:30 PM IST today
            if (nowIst >= nextUpdateIst)
            {
                nextUpdateIst = nextUpdateIst.AddDays(1);
            }

            var nextUpdateUtc = TimeZoneInfo.ConvertTimeToUtc(nextUpdateIst, istZone);
            var ttl = nextUpdateUtc - nowUtc;

            _cache.Set(CacheKey, dict, ttl);
            return dict;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AMFI] Failed to fetch and parse AMFI NAV file.");
            return new Dictionary<string, decimal>();
        }
    }

    private static Dictionary<string, decimal> ParseAmfiText(string text)
    {
        var dict = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines)
        {
            // Format: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
            var parts = line.Split(';');
            if (parts.Length >= 5)
            {
                var schemeCode = parts[0].Trim();
                var navStr = parts[4].Trim();

                if (decimal.TryParse(navStr, out var nav))
                {
                    dict[schemeCode] = nav;
                }
            }
        }
        return dict;
    }
}
