using Microsoft.EntityFrameworkCore;
using MatchDay.Api.Data;
using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public class StandingService : IStandingService
{
    private readonly AppDbContext _db;

    public StandingService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<StandingDto>> GetByCompetitionAsync(string competitionCode, string season)
    {
        return await _db.Standings
            .Include(s => s.Competition)
            .Include(s => s.Team)
            .Where(s => s.Competition.Code == competitionCode && s.Season == season)
            .OrderBy(s => s.Group)
            .ThenBy(s => s.Position)
            .Select(s => new StandingDto(
                s.Id, s.CompetitionId, s.Competition.Name,
                new TeamDto(s.Team.Id, s.Team.Name, s.Team.ShortName, s.Team.Tla, s.Team.Country, s.Team.CrestUrl, s.Team.Venue),
                s.Season, s.Position, s.Played, s.Won, s.Draw, s.Lost,
                s.GoalsFor, s.GoalsAgainst, s.GoalDifference, s.Points, s.Form, s.Group
            ))
            .ToListAsync();
    }
}