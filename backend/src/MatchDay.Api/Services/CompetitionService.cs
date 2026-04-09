using Microsoft.EntityFrameworkCore;
using MatchDay.Api.Data;
using MatchDay.Api.Models;
using MatchDay.Api.Models.Dtos;

namespace MatchDay.Api.Services;

public class CompetitionService : ICompetitionService
{
    private readonly AppDbContext _db;

    public CompetitionService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<CompetitionDto>> GetAllAsync()
    {
        return await _db.Competitions
            .OrderBy(c => c.Name)
            .Select(c => ToDto(c))
            .ToListAsync();
    }

    public async Task<CompetitionDto> GetByIdAsync(Guid id)
    {
        var c = await _db.Competitions.FindAsync(id)
            ?? throw new KeyNotFoundException($"Competition {id} introuvable.");
        return ToDto(c);
    }

    public async Task<CompetitionDto> GetByCodeAsync(string code)
    {
        var c = await _db.Competitions.FirstOrDefaultAsync(x => x.Code == code)
            ?? throw new KeyNotFoundException($"Competition '{code}' introuvable.");
        return ToDto(c);
    }

    public async Task<CompetitionDto> CreateAsync(CreateCompetitionDto dto)
    {
        var entity = new Competition
        {
            Name = dto.Name,
            Code = dto.Code,
            Country = dto.Country,
            Type = dto.Type,
            EmblemUrl = dto.EmblemUrl
        };
        _db.Competitions.Add(entity);
        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _db.Competitions.FindAsync(id)
            ?? throw new KeyNotFoundException($"Competition {id} introuvable.");
        _db.Competitions.Remove(entity);
        await _db.SaveChangesAsync();
    }

    private static CompetitionDto ToDto(Competition c) => new(
        c.Id, c.Name, c.Code, c.Country, c.Type.ToString(), c.EmblemUrl
    );
}