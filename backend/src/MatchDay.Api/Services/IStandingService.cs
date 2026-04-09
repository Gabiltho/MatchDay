using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public interface IStandingService
{
    Task<IEnumerable<StandingDto>> GetByCompetitionAsync(string competitionCode, string season);
}