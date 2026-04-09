namespace MatchDay.Api.Models.Dtos;

public record CompetitionDto(
    Guid Id,
    string Name,
    string Code,
    string Country,
    string Type,
    string? EmblemUrl
);

public record CreateCompetitionDto(
    string Name,
    string Code,
    string Country,
    CompetitionType Type,
    string? EmblemUrl
);