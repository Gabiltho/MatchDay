using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public interface IMatchService
{
    Task<IEnumerable<MatchDto>> GetAllAsync(string? competitionCode = null, string? season = null, int? matchday = null);
    Task<MatchDto> GetByIdAsync(Guid id);
    Task<IEnumerable<MatchDto>> GetTodayAsync();
    Task<MatchDto> CreateAsync(CreateMatchDto dto);
    Task<MatchDto> UpdateAsync(Guid id, UpdateMatchDto dto);
    Task DeleteAsync(Guid id);
}