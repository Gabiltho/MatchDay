using Microsoft.AspNetCore.Mvc;
using MatchDay.Api.Models.Dtos;
using MatchDay.Api.Services;

namespace MatchDay.Api.Controllers;

[ApiController]
[Route("api/standings")]
public class StandingController : ControllerBase
{
    private readonly IStandingService _service;

    public StandingController(IStandingService service) => _service = service;

    [HttpGet("{competitionCode}")]
    public async Task<ActionResult<IEnumerable<StandingDto>>> GetByCompetition(
        string competitionCode,
        [FromQuery] string season = "2025")
        => Ok(await _service.GetByCompetitionAsync(competitionCode, season));
}