using Microsoft.AspNetCore.Mvc;
using MatchDay.Api.Models.Dtos;
using MatchDay.Api.Services;

namespace MatchDay.Api.Controllers;

[ApiController]
[Route("api/teams")]
public class TeamController : ControllerBase
{
    private readonly ITeamService _service;

    public TeamController(ITeamService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TeamDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TeamDto>> GetById(Guid id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    public async Task<ActionResult<TeamDto>> Create([FromBody] CreateTeamDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}