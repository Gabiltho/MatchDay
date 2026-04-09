using Microsoft.EntityFrameworkCore;
using MatchDay.Api.Data;
using MatchDay.Api.Models;
using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public class MatchService : IMatchService
{
    private readonly AppDbContext _db;

    public MatchService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<MatchDto>> GetAllAsync(string? competitionCode = null, string? season = null, int? matchday = null)
    {
        var query = _db.Matches
            .Include(m => m.Competition)
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .AsQueryable();

        if (!string.IsNullOrEmpty(competitionCode))
            query = query.Where(m => m.Competition.Code == competitionCode);
        if (!string.IsNullOrEmpty(season))
            query = query.Where(m => m.Season == season);
        if (matchday.HasValue)
            query = query.Where(m => m.Matchday == matchday.Value);

        return await query.OrderBy(m => m.Date).Select(m => ToDto(m)).ToListAsync();
    }

    public async Task<MatchDto> GetByIdAsync(Guid id)
    {
        var m = await _db.Matches
            .Include(x => x.Competition)
            .Include(x => x.HomeTeam)
            .Include(x => x.AwayTeam)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Match {id} introuvable.");
        return ToDto(m);
    }

    public async Task<IEnumerable<MatchDto>> GetTodayAsync()
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        return await _db.Matches
            .Include(m => m.Competition)
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Date >= today && m.Date < tomorrow)
            .OrderBy(m => m.Date)
            .Select(m => ToDto(m))
            .ToListAsync();
    }

    public async Task<MatchDto> CreateAsync(CreateMatchDto dto)
    {
        var entity = new Match
        {
            CompetitionId = dto.CompetitionId,
            Matchday = dto.Matchday,
            Season = dto.Season,
            HomeTeamId = dto.HomeTeamId,
            AwayTeamId = dto.AwayTeamId,
            Date = dto.Date,
            Status = MatchStatus.Scheduled,
            Venue = dto.Venue,
            Stage = dto.Stage,
            Group = dto.Group
        };
        _db.Matches.Add(entity);
        await _db.SaveChangesAsync();
        return await GetByIdAsync(entity.Id);
    }

    public async Task<MatchDto> UpdateAsync(Guid id, UpdateMatchDto dto)
    {
        var entity = await _db.Matches.FindAsync(id)
            ?? throw new KeyNotFoundException($"Match {id} introuvable.");

        if (dto.HomeScore.HasValue) entity.HomeScore = dto.HomeScore.Value;
        if (dto.AwayScore.HasValue) entity.AwayScore = dto.AwayScore.Value;
        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.Date.HasValue) entity.Date = dto.Date.Value;
        if (dto.Venue != null) entity.Venue = dto.Venue;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(entity.Id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.Matches.FindAsync(id)
            ?? throw new KeyNotFoundException($"Match {id} introuvable.");
        _db.Matches.Remove(entity);
        await _db.SaveChangesAsync();
    }

    private static TeamDto ToTeamDto(Team t) => new(
        t.Id, t.Name, t.ShortName, t.Tla, t.Country, t.CrestUrl, t.Venue
    );

    private static MatchDto ToDto(Match m) => new(
        m.Id, m.CompetitionId, m.Competition.Name, m.Competition.Code,
        m.Matchday, m.Season,
        ToTeamDto(m.HomeTeam), ToTeamDto(m.AwayTeam),
        m.HomeScore, m.AwayScore, m.Date,
        m.Status.ToString(), m.Venue, m.Stage, m.Group
    );
}