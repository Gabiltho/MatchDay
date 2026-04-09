namespace MatchDay.Api.Models;

public class Match
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompetitionId { get; set; }
    public int Matchday { get; set; }
    public string Season { get; set; } = string.Empty;
    public Guid HomeTeamId { get; set; }
    public Guid AwayTeamId { get; set; }
    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }
    public DateTime Date { get; set; }
    public MatchStatus Status { get; set; }
    public string? Venue { get; set; }
    public string? Stage { get; set; }
    public string? Group { get; set; }

    public Competition Competition { get; set; } = null!;
    public Team HomeTeam { get; set; } = null!;
    public Team AwayTeam { get; set; } = null!;
}

public enum MatchStatus
{
    Scheduled = 0,
    Live = 1,
    HalfTime = 2,
    Finished = 3,
    Postponed = 4,
    Cancelled = 5
}