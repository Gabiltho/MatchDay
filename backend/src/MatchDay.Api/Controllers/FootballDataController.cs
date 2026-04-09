using Microsoft.AspNetCore.Mvc;
using MatchDay.Api.Services;

namespace MatchDay.Api.Controllers;

[ApiController]
[Route("api/football")]
public class FootballDataController : ControllerBase
{
    private readonly IFootballDataProxyService _proxy;

    public FootballDataController(IFootballDataProxyService proxy) => _proxy = proxy;

    [HttpGet("competitions")]
    public async Task<IActionResult> GetCompetitions()
        => Content(await _proxy.GetCompetitionsAsync(), "application/json");

    [HttpGet("competitions/{code}")]
    public async Task<IActionResult> GetCompetition(string code)
        => Content(await _proxy.GetCompetitionAsync(code), "application/json");

    [HttpGet("competitions/{code}/matches")]
    public async Task<IActionResult> GetMatches(string code, [FromQuery] string? season = null, [FromQuery] int? matchday = null)
        => Content(await _proxy.GetMatchesAsync(code, season, matchday), "application/json");

    [HttpGet("competitions/{code}/standings")]
    public async Task<IActionResult> GetStandings(string code, [FromQuery] string? season = null)
        => Content(await _proxy.GetStandingsAsync(code, season), "application/json");

    [HttpGet("competitions/{code}/teams")]
    public async Task<IActionResult> GetTeams(string code, [FromQuery] string? season = null)
        => Content(await _proxy.GetTeamsAsync(code, season), "application/json");

    [HttpGet("competitions/{code}/scorers")]
    public async Task<IActionResult> GetScorers(string code, [FromQuery] string? season = null)
        => Content(await _proxy.GetScorersAsync(code, season), "application/json");

    [HttpGet("matches/today")]
    public async Task<IActionResult> GetTodayMatches()
        => Content(await _proxy.GetTodayMatchesAsync(), "application/json");
}