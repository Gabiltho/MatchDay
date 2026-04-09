using Microsoft.EntityFrameworkCore;
using MatchDay.Api.Models;

namespace MatchDay.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
        Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    }

    public DbSet<Competition> Competitions => Set<Competition>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Standing> Standings => Set<Standing>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Competition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(10);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EmblemUrl).HasMaxLength(500);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ShortName).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Tla).IsRequired().HasMaxLength(5);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CrestUrl).HasMaxLength(500);
            entity.Property(e => e.Venue).HasMaxLength(200);
        });

        modelBuilder.Entity<Match>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Season).IsRequired().HasMaxLength(10);
            entity.Property(e => e.Venue).HasMaxLength(200);
            entity.Property(e => e.Stage).HasMaxLength(50);
            entity.Property(e => e.Group).HasMaxLength(50);
            entity.HasIndex(e => new { e.CompetitionId, e.Season, e.Matchday });
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Competition)
                  .WithMany(c => c.Matches)
                  .HasForeignKey(e => e.CompetitionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.HomeTeam)
                  .WithMany(t => t.HomeMatches)
                  .HasForeignKey(e => e.HomeTeamId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.AwayTeam)
                  .WithMany(t => t.AwayMatches)
                  .HasForeignKey(e => e.AwayTeamId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Standing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Season).IsRequired().HasMaxLength(10);
            entity.Property(e => e.Form).HasMaxLength(20);
            entity.Property(e => e.Group).HasMaxLength(50);
            entity.HasIndex(e => new { e.CompetitionId, e.Season, e.Position });
            entity.HasOne(e => e.Competition)
                  .WithMany(c => c.Standings)
                  .HasForeignKey(e => e.CompetitionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Team)
                  .WithMany(t => t.Standings)
                  .HasForeignKey(e => e.TeamId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}