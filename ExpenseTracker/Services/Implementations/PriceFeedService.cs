using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Services.Implementations;

public class PriceFeedService : IPriceFeedService
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PriceFeedService> _logger;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public PriceFeedService(HttpClient http, IMemoryCache cache, ILogger<PriceFeedService> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    // ─── Stocks & ETFs (Yahoo Finance) ───────────────────────────────────

    public async Task<PriceResult> GetStockPriceAsync(string ticker)
    {
        return await GetCachedOrFetch(ticker, "yahoo", async () =>
        {
            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(ticker)}?interval=1d&range=1d";
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

            var response = await _http.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var result = doc.RootElement
                .GetProperty("chart")
                .GetProperty("result")[0];

            var meta = result.GetProperty("meta");
            var price = meta.GetProperty("regularMarketPrice").GetDecimal();

            return price;
        });
    }

    // ─── Mutual Funds (mfapi.in — free, no key) ─────────────────────────

    public async Task<PriceResult> GetMutualFundNavAsync(string schemeCode)
    {
        return await GetCachedOrFetch($"mf:{schemeCode}", "mfapi", async () =>
        {
            var url = $"https://api.mfapi.in/mf/{schemeCode}/latest";
            var response = await _http.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            // Response: { "data": [{ "nav": "25.1234" }] }
            var navStr = doc.RootElement
                .GetProperty("data")[0]
                .GetProperty("nav")
                .GetString();

            return decimal.Parse(navStr ?? "0");
        });
    }

    // ─── Crypto (Yahoo Finance — symbol-USD) ────────────────────────────

    public async Task<PriceResult> GetCryptoPriceAsync(string symbol)
    {
        var ticker = symbol.ToUpperInvariant().EndsWith("-USD")
            ? symbol
            : $"{symbol.ToUpperInvariant()}-USD";

        return await GetStockPriceAsync(ticker); // Same Yahoo API
    }

    // ─── Auto-Router ────────────────────────────────────────────────────

    public async Task<PriceResult> GetPriceAsync(string ticker, string priceSource)
    {
        return priceSource.ToLowerInvariant() switch
        {
            "yahoo" => await GetStockPriceAsync(ticker),
            "mfapi" => await GetMutualFundNavAsync(ticker),
            "crypto" => await GetCryptoPriceAsync(ticker),
            _ => new PriceResult
            {
                Ticker = ticker,
                Source = "manual",
                Error = "Unknown price source",
                FetchedAt = DateTime.UtcNow
            }
        };
    }

    // ─── Batch Fetch ────────────────────────────────────────────────────

    public async Task<List<PriceResult>> GetPricesBatchAsync(IEnumerable<(string ticker, string source)> requests)
    {
        var tasks = requests.Select(r => GetPriceAsync(r.ticker, r.source));
        var results = await Task.WhenAll(tasks);
        return results.ToList();
    }

    // ─── Cache Control ──────────────────────────────────────────────────

    public void ClearCache()
    {
        // IMemoryCache doesn't have a ClearAll — we use a compact instead
        if (_cache is MemoryCache mc)
        {
            mc.Compact(1.0); // Remove 100% of entries
        }
        _logger.LogInformation("[PriceFeed] Cache cleared");
    }

    // ─── Internal: cache-through helper ─────────────────────────────────

    private async Task<PriceResult> GetCachedOrFetch(string cacheKey, string source, Func<Task<decimal>> fetcher)
    {
        var fullKey = $"price:{cacheKey}";

        if (_cache.TryGetValue(fullKey, out PriceResult? cached) && cached != null)
        {
            cached.IsLive = false; // It's from cache
            return cached;
        }

        try
        {
            var price = await fetcher();
            var result = new PriceResult
            {
                Ticker = cacheKey,
                Price = price,
                Source = source,
                IsLive = true,
                FetchedAt = DateTime.UtcNow
            };

            _cache.Set(fullKey, result, CacheDuration);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[PriceFeed] Failed to fetch price for {Ticker}", cacheKey);
            return new PriceResult
            {
                Ticker = cacheKey,
                Source = source,
                Error = ex.Message,
                FetchedAt = DateTime.UtcNow
            };
        }
    }
}
