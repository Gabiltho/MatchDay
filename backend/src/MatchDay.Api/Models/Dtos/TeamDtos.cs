namespace MatchDay.Api.Models.Dtos;

public record TeamDto(
    Guid Id,
    string Name,
    string ShortName,
    string Tla,
    string Country,
    string? CrestUrl,
    string? Venue
);

public record CreateTeamDto(
    string Name,
    string ShortName,
    string Tla,
    string Country,
    string? CrestUrl,
    string? Venue
);