namespace MatchDay.Api.Models;

public class Standing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompetitionId { get; set; }
    public Guid TeamId { get; set; }
    public string Season { get; set; } = string.Empty;
    public int Position { get; set; }
    public int Played { get; set; }
    public int Won { get; set; }
    public int Draw { get; set; }
    public int Lost { get; set; }
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public int GoalDifference { get; set; }
    public int Points { get; set; }
    public string? Form { get; set; }
    public string? Group { get; set; }

    public Competition Competition { get; set; } = null!;
    public Team Team { get; set; } = null!;
}