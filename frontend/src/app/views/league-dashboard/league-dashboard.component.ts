import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUE_LABELS } from '../../models/football.models';

@Component({
  selector: 'app-league-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="league-dash">
      <h1 class="page-title">{{leagueName}}</h1>

      <div class="spinner" *ngIf="loading">
        <div class="spinner-ring"></div>
      </div>

      <div class="dash-grid" *ngIf="!loading">
        <!-- Prochains matchs -->
        <div class="card">
          <h2 class="card-title">Prochains matchs</h2>
          <div class="match-list">
            <div class="match-row" *ngFor="let m of upcomingMatches">
              <span class="match-date">{{formatDate(m.utcDate)}}</span>
              <span class="match-home">{{m.homeTeam?.shortName || m.homeTeam?.name}}</span>
              <span class="match-vs">vs</span>
              <span class="match-away">{{m.awayTeam?.shortName || m.awayTeam?.name}}</span>
            </div>
            <div *ngIf="upcomingMatches.length === 0" class="empty-msg">Aucun match a venir</div>
          </div>
        </div>

        <!-- Derniers resultats -->
        <div class="card">
          <h2 class="card-title">Derniers resultats</h2>
          <div class="match-list">
            <div class="match-row" *ngFor="let m of recentResults">
              <span class="match-date">{{formatDate(m.utcDate)}}</span>
              <span class="match-home" [class.winner]="m.score?.fullTime?.home > m.score?.fullTime?.away">{{m.homeTeam?.shortName}}</span>
              <span class="match-score-sm">{{m.score?.fullTime?.home}} - {{m.score?.fullTime?.away}}</span>
              <span class="match-away" [class.winner]="m.score?.fullTime?.away > m.score?.fullTime?.home">{{m.awayTeam?.shortName}}</span>
            </div>
            <div *ngIf="recentResults.length === 0" class="empty-msg">Aucun resultat</div>
          </div>
        </div>

        <!-- Classement top 5 -->
        <div class="card">
          <h2 class="card-title">Classement</h2>
          <table class="mini-table" *ngIf="standings.length > 0">
            <thead>
              <tr><th>#</th><th>Equipe</th><th>Pts</th><th>MJ</th><th>+/-</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of standings.slice(0, 8)">
                <td class="pos">{{s.position}}</td>
                <td class="team-cell">
                  <img *ngIf="s.team?.crest" [src]="s.team.crest" class="mini-crest" alt="">
                  {{s.team?.shortName || s.team?.name}}
                </td>
                <td class="pts">{{s.points}}</td>
                <td>{{s.playedGames}}</td>
                <td>{{s.goalDifference > 0 ? '+' : ''}}{{s.goalDifference}}</td>
              </tr>
            </tbody>
          </table>
          <button class="see-all" (click)="router.navigate(['/' + leagueCode + '/standings'])">Voir tout</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .league-dash { padding: 16px; max-width: 1200px; margin: 0 auto; }
    .page-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 16px; }
    .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; }
    .card-title { font-size: .95rem; font-weight: 700; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .match-list { display: flex; flex-direction: column; gap: 6px; }
    .match-row { display: flex; align-items: center; gap: 8px; font-size: .85rem; padding: 4px 0; }
    .match-date { color: var(--fg3); font-size: .75rem; min-width: 80px; }
    .match-home { flex: 1; text-align: right; font-weight: 600; }
    .match-vs { color: var(--fg3); font-size: .7rem; }
    .match-away { flex: 1; font-weight: 600; }
    .match-score-sm { font-family: 'JetBrains Mono', monospace; font-weight: 800; min-width: 40px; text-align: center; }
    .winner { color: var(--green); }
    .empty-msg { color: var(--fg3); font-size: .85rem; text-align: center; padding: 12px; }
    .mini-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
    .mini-table th { text-align: left; color: var(--fg3); font-weight: 600; font-size: .7rem; text-transform: uppercase; padding: 4px; border-bottom: 1px solid var(--border); }
    .mini-table td { padding: 5px 4px; border-bottom: 1px solid var(--surface); }
    .pos { font-weight: 700; color: var(--fg3); width: 24px; }
    .team-cell { display: flex; align-items: center; gap: 6px; font-weight: 600; }
    .mini-crest { height: 18px; width: 18px; object-fit: contain; }
    .pts { font-weight: 800; color: var(--green); }
    .see-all { display: block; width: 100%; margin-top: 12px; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg2); cursor: pointer; font-size: .8rem; transition: all var(--duration) var(--ease); }
    .see-all:hover { border-color: var(--green); color: var(--green); }
    .spinner { display: flex; justify-content: center; padding: 60px; }
    .spinner-ring { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .8s linear infinite; }
  `]
})
export class LeagueDashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);
  router = inject(Router);

  leagueCode = '';
  leagueName = '';
  loading = true;
  upcomingMatches: any[] = [];
  recentResults: any[] = [];
  standings: any[] = [];

  ngOnInit() {
    this.leagueCode = this.route.snapshot.paramMap.get('league') ?? '';
    this.leagueName = LEAGUE_LABELS[this.leagueCode] ?? this.leagueCode;

    const season = this.state.season();

    this.footballData.getMatches(this.leagueCode, season).subscribe({
      next: (data: any) => {
        const matches = data.matches ?? [];
        const now = new Date();
        this.upcomingMatches = matches
          .filter((m: any) => m.status === 'TIMED' || m.status === 'SCHEDULED')
          .slice(0, 5);
        this.recentResults = matches
          .filter((m: any) => m.status === 'FINISHED')
          .reverse()
          .slice(0, 5);
      },
      error: () => {}
    });

    this.footballData.getStandings(this.leagueCode, season).subscribe({
      next: (data: any) => {
        this.standings = data.standings?.[0]?.table ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  formatDate(utcDate: string): string {
    return new Date(utcDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}