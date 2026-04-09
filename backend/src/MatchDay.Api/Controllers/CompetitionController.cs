using Microsoft.AspNetCore.Mvc;
using MatchDay.Api.Models.Dtos;
using MatchDay.Api.Services;

namespace MatchDay.Api.Controllers;

[ApiController]
[Route("api/competitions")]
public class CompetitionController : ControllerBase
{
    private readonly ICompetitionService _service;

    public CompetitionController(ICompetitionService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CompetitionDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CompetitionDto>> GetById(Guid id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpGet("code/{code}")]
    public async Task<ActionResult<CompetitionDto>> GetByCode(string code)
        => Ok(await _service.GetByCodeAsync(code));

    [HttpPost]
    public async Task<ActionResult<CompetitionDto>> Create([FromBody] CreateCompetitionDto dto)
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