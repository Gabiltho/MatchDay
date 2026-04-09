using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public interface ICompetitionService
{
    Task<IEnumerable<CompetitionDto>> GetAllAsync();
    Task<CompetitionDto> GetByIdAsync(Guid id);
    Task<CompetitionDto> GetByCodeAsync(string code);
    Task<CompetitionDto> CreateAsync(CreateCompetitionDto dto);
    Task DeleteAsync(Guid id);
}