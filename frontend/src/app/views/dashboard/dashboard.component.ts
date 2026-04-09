import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUES, LeagueInfo, LeagueCode } from '../../models/football.models';
import { formatStatus as _formatStatus, getStatusClass as _getStatusClass } from '../../utils/match-helpers';

const STORAGE_KEY = 'matchday_league_order';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="title-row">
        <h1 class="page-title">Matchs du jour</h1>
        <span class="live-indicator" *ngIf="hasLive">
          <span class="pulse-dot"></span> LIVE
        </span>
        <span class="last-updated" *ngIf="lastUpdated">MAJ {{lastUpdated}}</span>
      </div>

      <div class="today-matches" *ngIf="todayMatches.length > 0">
        <div class="match-card" *ngFor="let m of todayMatches" (click)="goToLeague(m.competition?.code)">
          <div class="match-competition">
            <img *ngIf="m.competition?.emblem" [src]="m.competition.emblem" class="comp-emblem" alt="">
            <span>{{m.competition?.name}}</span>
            <span class="match-status" [class]="getStatusClass(m.status)">
              {{formatStatus(m.status)}}<span *ngIf="m.minute" class="match-minute"> {{m.minute}}'</span>
            </span>
          </div>
          <div class="match-teams">
            <div class="team home">
              <img *ngIf="m.homeTeam?.crest" [src]="m.homeTeam.crest" class="team-crest" alt="">
              <span class="team-name">{{m.homeTeam?.shortName || m.homeTeam?.name}}</span>
            </div>
            <div class="match-score">
              <span *ngIf="m.score?.fullTime?.home !== null">
                {{m.score?.fullTime?.home}} - {{m.score?.fullTime?.away}}
              </span>
              <span *ngIf="m.score?.fullTime?.home === null" class="match-time">
                {{formatTime(m.utcDate)}}
              </span>
            </div>
            <div class="team away">
              <span class="team-name">{{m.awayTeam?.shortName || m.awayTeam?.name}}</span>
              <img *ngIf="m.awayTeam?.crest" [src]="m.awayTeam.crest" class="team-crest" alt="">
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && todayMatches.length === 0">
        <p>Aucun match aujourd'hui</p>
      </div>

      <div class="spinner" *ngIf="loading">
        <div class="spinner-ring"></div>
      </div>

      <h2 class="section-title">Classements</h2>
      <div class="standings-grid">
        <div class="standings-card" *ngFor="let lg of leagueStandings" (click)="goToLeague(lg.code)">
          <div class="standings-card-header">
            <span class="standings-flag">{{lg.flag}}</span>
            <span class="standings-league-name">{{lg.name}}</span>
          </div>
          <table class="mini-table" *ngIf="lg.table.length > 0">
            <thead>
              <tr><th class="col-pos">#</th><th class="col-team">Equipe</th><th>MJ</th><th>+/-</th><th class="col-pts">Pts</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of lg.table">
                <td class="col-pos">{{row.position}}</td>
                <td class="col-team">
                  <img *ngIf="row.team?.crest" [src]="row.team.crest" class="mini-crest" alt="">
                  <span>{{row.team?.shortName || row.team?.name}}</span>
                </td>
                <td>{{row.playedGames}}</td>
                <td [class.positive]="row.goalDifference > 0" [class.negative]="row.goalDifference < 0">{{row.goalDifference > 0 ? '+' : ''}}{{row.goalDifference}}</td>
                <td class="col-pts">{{row.points}}</td>
              </tr>
            </tbody>
          </table>
          <div class="mini-spinner" *ngIf="lg.table.length === 0 && standingsLoading">
            <div class="spinner-ring small"></div>
          </div>
          <div class="no-data" *ngIf="lg.table.length === 0 && !standingsLoading">Classement indisponible</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { padding: var(--sp-5); max-width: 1280px; margin: 0 auto; }
    .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: var(--sp-5); }
    .page-title { font-size: 1.5rem; font-weight: 900; letter-spacing: -.3px; }
    .live-indicator { display: flex; align-items: center; gap: 6px; font-size: .7rem; font-weight: 700; color: var(--green); }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.7); } }
    .last-updated { margin-left: auto; font-size: .65rem; color: var(--fg3); font-family: 'JetBrains Mono', monospace; }
    .section-title { font-size: 1.1rem; font-weight: 800; margin: 32px 0 16px; letter-spacing: -.2px; }
    .today-matches { display: flex; flex-direction: column; gap: 10px; }
    .match-card {
      background: var(--card); background-image: var(--gradient-card);
      border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 14px 18px; cursor: pointer;
      box-shadow: var(--shadow-card);
      transition: all var(--duration) var(--ease);
      &:hover { border-color: rgba(52,211,153,.3); background: var(--card-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
    }
    .match-competition {
      display: flex; align-items: center; gap: 8px; font-size: .73rem; color: var(--fg3); margin-bottom: 10px;
    }
    .comp-emblem { height: 16px; width: auto; }
    .match-status { margin-left: auto; font-weight: 700; text-transform: uppercase; font-size: .6rem; padding: 3px 8px; border-radius: var(--radius-sm); letter-spacing: .5px; }
    .match-status.live { background: var(--green); color: #000; box-shadow: 0 0 12px rgba(52,211,153,.3); }
    .match-status.ht { background: var(--orange); color: #000; }
    .match-status.finished { color: var(--fg3); background: var(--surface); }
    .match-status.scheduled { color: var(--fg3); background: var(--surface); }
    .match-minute { font-variant-numeric: tabular-nums; }
    .match-teams { display: flex; align-items: center; gap: 12px; }
    .team { display: flex; align-items: center; gap: 10px; flex: 1; }
    .team.away { justify-content: flex-end; text-align: right; }
    .team-crest { height: 28px; width: 28px; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,.3)); }
    .team-name { font-weight: 700; font-size: .9rem; }
    .match-score { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 1.2rem; min-width: 60px; text-align: center; }
    .match-time { font-size: .85rem; color: var(--fg3); font-weight: 500; font-family: 'JetBrains Mono', monospace; }
    .empty-state { text-align: center; padding: 48px; color: var(--fg3); font-size: .9rem; }
    .standings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
    .standings-card {
      background: var(--card); background-image: var(--gradient-card);
      border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 14px 18px; cursor: pointer;
      box-shadow: var(--shadow-card);
      transition: all var(--duration) var(--ease);
      &:hover { border-color: rgba(52,211,153,.3); background: var(--card-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
    }
    .standings-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
    .standings-flag { font-size: 1.3rem; }
    .standings-league-name { font-weight: 800; font-size: .9rem; letter-spacing: -.1px; }
    .mini-table { width: 100%; border-collapse: collapse; font-size: .75rem; }
    .mini-table th { text-align: center; color: var(--fg3); font-weight: 600; font-size: .6rem; text-transform: uppercase; letter-spacing: .5px; padding: 4px; border-bottom: 1px solid var(--border); }
    .mini-table th.col-team { text-align: left; }
    .mini-table td { padding: 4px; text-align: center; border-bottom: 1px solid var(--border-subtle); }
    .mini-table tr:hover td { background: var(--hover); }
    .mini-table .col-pos { font-weight: 700; color: var(--fg3); width: 22px; font-family: 'JetBrains Mono', monospace; font-size: .7rem; }
    .mini-table .col-team { text-align: left; display: flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mini-table .col-pts { font-weight: 800; color: var(--green); font-family: 'JetBrains Mono', monospace; }
    .mini-crest { height: 16px; width: 16px; object-fit: contain; flex-shrink: 0; }
    .positive { color: var(--green); }
    .negative { color: var(--red); }
    .no-data { text-align: center; padding: 16px; font-size: .75rem; color: var(--fg3); }
    .mini-spinner { display: flex; justify-content: center; padding: 24px; }
    .spinner { display: flex; justify-content: center; padding: 48px; }
    .spinner-ring { width: 28px; height: 28px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .7s linear infinite; }
    .spinner-ring.small { width: 18px; height: 18px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);
  private pollSub?: Subscription;

  private static readonly POLL_INTERVAL = 30_000;
  private static readonly LIVE_STATUSES = ['IN_PLAY', 'PAUSED'];

  leagues: LeagueInfo[] = LEAGUES;
  todayMatches: any[] = [];
  loading = true;
  hasLive = false;
  lastUpdated = '';
  standingsLoading = true;
  leagueStandings: { code: string; name: string; flag: string; table: any[] }[] = [];

  ngOnInit() {
    this.fetchMatches(false);
    this.fetchStandings();
  }

  private getOrderedLeagues(): LeagueInfo[] {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (Array.isArray(saved)) {
        const ordered: LeagueInfo[] = [];
        for (const code of saved) {
          const league = LEAGUES.find(l => l.code === code);
          if (league) ordered.push(league);
        }
        for (const l of LEAGUES) { if (!ordered.find(o => o.code === l.code)) ordered.push(l); }
        return ordered;
      }
    } catch {}
    return LEAGUES;
  }

  private fetchStandings() {
    const ordered = this.getOrderedLeagues();
    this.leagueStandings = ordered.map(l => ({ code: l.code, name: l.name, flag: l.flag, table: [] }));
    const season = this.state.season();
    let loaded = 0;
    for (const lg of this.leagueStandings) {
      this.footballData.getStandings(lg.code, season).subscribe({
        next: (data: any) => {
          const standings = data?.standings ?? [];
          const total = standings.find((s: any) => s.type === 'TOTAL') ?? standings[0];
          lg.table = (total?.table ?? []).slice(0, 10);
          if (++loaded >= LEAGUES.length) this.standingsLoading = false;
        },
        error: () => { if (++loaded >= LEAGUES.length) this.standingsLoading = false; }
      });
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private fetchMatches(forceRefresh: boolean) {
    this.footballData.getTodayMatches(forceRefresh).subscribe({
      next: (data: any) => {
        this.todayMatches = data.matches ?? [];
        this.loading = false;
        this.hasLive = this.todayMatches.some((m: any) =>
          DashboardComponent.LIVE_STATUSES.includes(m.status)
        );
        this.lastUpdated = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.hasLive ? this.startPolling() : this.stopPolling();
      },
      error: () => { this.loading = false; }
    });
  }

  private startPolling() {
    if (this.pollSub) return;
    this.pollSub = interval(DashboardComponent.POLL_INTERVAL).subscribe(() => {
      this.fetchMatches(true);
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  goToLeague(code: string) {
    if (code) this.router.navigate([`/${code}`]);
  }

  formatStatus = _formatStatus;
  getStatusClass = _getStatusClass;

  formatTime(utcDate: string): string {
    return new Date(utcDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}