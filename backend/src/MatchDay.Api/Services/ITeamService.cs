using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public interface ITeamService
{
    Task<IEnumerable<TeamDto>> GetAllAsync();
    Task<TeamDto> GetByIdAsync(Guid id);
    Task<TeamDto> CreateAsync(CreateTeamDto dto);
    Task DeleteAsync(Guid id);
}