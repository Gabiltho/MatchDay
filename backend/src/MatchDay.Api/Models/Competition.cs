namespace MatchDay.Api.Models;

public class Competition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public CompetitionType Type { get; set; }
    public string? EmblemUrl { get; set; }

    public ICollection<Match> Matches { get; set; } = new List<Match>();
    public ICollection<Standing> Standings { get; set; } = new List<Standing>();
}

public enum CompetitionType
{
    League = 0,
    Cup = 1
}