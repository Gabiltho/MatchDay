namespace MatchDay.Api.Models.Dtos;

public record StandingDto(
    Guid Id,
    Guid CompetitionId,
    string CompetitionName,
    TeamDto Team,
    string Season,
    int Position,
    int Played,
    int Won,
    int Draw,
    int Lost,
    int GoalsFor,
    int GoalsAgainst,
    int GoalDifference,
    int Points,
    string? Form,
    string? Group
);