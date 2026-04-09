namespace MatchDay.Api.Models.Dtos;

public record MatchDto(
    Guid Id,
    Guid CompetitionId,
    string CompetitionName,
    string CompetitionCode,
    int Matchday,
    string Season,
    TeamDto HomeTeam,
    TeamDto AwayTeam,
    int? HomeScore,
    int? AwayScore,
    DateTime Date,
    string Status,
    string? Venue,
    string? Stage,
    string? Group
);

public record CreateMatchDto(
    Guid CompetitionId,
    int Matchday,
    string Season,
    Guid HomeTeamId,
    Guid AwayTeamId,
    DateTime Date,
    string? Venue,
    string? Stage,
    string? Group
);

public record UpdateMatchDto(
    int? HomeScore,
    int? AwayScore,
    MatchStatus? Status,
    DateTime? Date,
    string? Venue
);