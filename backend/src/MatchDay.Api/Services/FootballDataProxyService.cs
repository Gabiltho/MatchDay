using Microsoft.Extensions.Caching.Memory;

namespace MatchDay.Api.Services;

public class FootballDataProxyService : IFootballDataProxyService
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FootballDataProxyService> _logger;

    public FootballDataProxyService(HttpClient http, IMemoryCache cache, ILogger<FootballDataProxyService> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    public Task<string> GetCompetitionsAsync()
        => CachedGet("/v4/competitions?areas=2077,2088,2081,2114,2187", TimeSpan.FromHours(6));

    public Task<string> GetCompetitionAsync(string code)
        => CachedGet($"/v4/competitions/{code}", TimeSpan.FromHours(6));

    public Task<string> GetMatchesAsync(string code, string? season = null, int? matchday = null)
    {
        var url = $"/v4/competitions/{code}/matches";
        var qs = new List<string>();
        if (season != null) qs.Add($"season={season}");
        if (matchday.HasValue) qs.Add($"matchday={matchday}");
        if (qs.Count > 0) url += "?" + string.Join("&", qs);
        return CachedGet(url, TimeSpan.FromMinutes(2));
    }

    public Task<string> GetStandingsAsync(string code, string? season = null)
    {
        var url = $"/v4/competitions/{code}/standings";
        if (season != null) url += $"?season={season}";
        return CachedGet(url, TimeSpan.FromMinutes(5));
    }

    public Task<string> GetTeamsAsync(string code, string? season = null)
    {
        var url = $"/v4/competitions/{code}/teams";
        if (season != null) url += $"?season={season}";
        return CachedGet(url, TimeSpan.FromHours(6));
    }

    public Task<string> GetTodayMatchesAsync()
        => CachedGet("/v4/matches", TimeSpan.FromMinutes(1));

    public Task<string> GetScorersAsync(string code, string? season = null)
    {
        var url = $"/v4/competitions/{code}/scorers";
        if (season != null) url += $"?season={season}";
        return CachedGet(url, TimeSpan.FromMinutes(10));
    }

    private async Task<string> CachedGet(string url, TimeSpan ttl)
    {
        var cacheKey = $"footballdata:{url}";
        if (_cache.TryGetValue(cacheKey, out string? cached) && cached != null)
            return cached;

        _logger.LogInformation("Fetching football-data.org: {Url}", url);
        var response = await _http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();

        _cache.Set(cacheKey, content, ttl);
        return content;
    }
}