namespace MatchDay.Api.Services;

public interface IFootballDataProxyService
{
    Task<string> GetCompetitionsAsync();
    Task<string> GetCompetitionAsync(string code);
    Task<string> GetMatchesAsync(string code, string? season = null, int? matchday = null);
    Task<string> GetStandingsAsync(string code, string? season = null);
    Task<string> GetTeamsAsync(string code, string? season = null);
    Task<string> GetTodayMatchesAsync();
    Task<string> GetScorersAsync(string code, string? season = null);
}