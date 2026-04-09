using Microsoft.EntityFrameworkCore;
using MatchDay.Api.Data;
using MatchDay.Api.Models;
using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public class TeamService : ITeamService
{
    private readonly AppDbContext _db;

    public TeamService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<TeamDto>> GetAllAsync()
    {
        return await _db.Teams
            .OrderBy(t => t.Name)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    public async Task<TeamDto> GetByIdAsync(Guid id)
    {
        var t = await _db.Teams.FindAsync(id)
            ?? throw new KeyNotFoundException($"Equipe {id} introuvable.");
        return ToDto(t);
    }

    public async Task<TeamDto> CreateAsync(CreateTeamDto dto)
    {
        var entity = new Team
        {
            Name = dto.Name,
            ShortName = dto.ShortName,
            Tla = dto.Tla,
            Country = dto.Country,
            CrestUrl = dto.CrestUrl,
            Venue = dto.Venue
        };
        _db.Teams.Add(entity);
        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.Teams.FindAsync(id)
            ?? throw new KeyNotFoundException($"Equipe {id} introuvable.");
        _db.Teams.Remove(entity);
        await _db.SaveChangesAsync();
    }

    private static TeamDto ToDto(Team t) => new(
        t.Id, t.Name, t.ShortName, t.Tla, t.Country, t.CrestUrl, t.Venue
    );
}