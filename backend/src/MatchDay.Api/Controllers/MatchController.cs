using Microsoft.AspNetCore.Mvc;
using MatchDay.Api.Models.Dtos;
using MatchDay.Api.Services;

namespace MatchDay.Api.Controllers;

[ApiController]
[Route("api/matches")]
public class MatchController : ControllerBase
{
    private readonly IMatchService _service;

    public MatchController(IMatchService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MatchDto>>> GetAll(
        [FromQuery] string? competition = null,
        [FromQuery] string? season = null,
        [FromQuery] int? matchday = null)
        => Ok(await _service.GetAllAsync(competition, season, matchday));

    [HttpGet("today")]
    public async Task<ActionResult<IEnumerable<MatchDto>>> GetToday()
        => Ok(await _service.GetTodayAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MatchDto>> GetById(Guid id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    public async Task<ActionResult<MatchDto>> Create([FromBody] CreateMatchDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<MatchDto>> Update(Guid id, [FromBody] UpdateMatchDto dto)
        => Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}