namespace MatchDay.Api.Models;

public class Team
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Tla { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string? CrestUrl { get; set; }
    public string? Venue { get; set; }

    public ICollection<Match> HomeMatches { get; set; } = new List<Match>();
    public ICollection<Match> AwayMatches { get; set; } = new List<Match>();
    public ICollection<Standing> Standings { get; set; } = new List<Standing>();
}