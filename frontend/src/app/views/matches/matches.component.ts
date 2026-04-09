import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUE_LABELS } from '../../models/football.models';
import { formatStatus as _formatStatus, getStatusClass as _getStatusClass } from '../../utils/match-helpers';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="matches-page">
      <div class="matches-header">
        <div class="title-row">
          <h1 class="page-title">{{leagueName}} — Matchs</h1>
          <span class="live-indicator" *ngIf="hasLive">
            <span class="pulse-dot"></span> LIVE
          </span>
          <span class="last-updated" *ngIf="lastUpdated">MAJ {{lastUpdated}}</span>
        </div>
        <div class="matchday-selector">
          <button (click)="prevMatchday()" [disabled]="selectedMatchday <= 1">&laquo;</button>
          <span>Journee {{selectedMatchday}}</span>
          <button (click)="nextMatchday()" [disabled]="selectedMatchday >= maxMatchday">&raquo;</button>
        </div>
      </div>

      <div class="spinner" *ngIf="loading">
        <div class="spinner-ring"></div>
      </div>

      <div class="match-list" *ngIf="!loading">
        <div class="match-card" *ngFor="let m of filteredMatches"
             [class.live]="m.status === 'IN_PLAY' || m.status === 'PAUSED'">
          <div class="match-meta">
            <span class="match-date">{{formatDateTime(m.utcDate)}}</span>
            <span class="match-status" [class]="getStatusClass(m.status)">
              {{formatStatus(m.status)}}<span *ngIf="m.minute" class="match-minute"> {{m.minute}}'</span>
            </span>
          </div>
          <div class="match-body">
            <div class="team home">
              <img *ngIf="m.homeTeam?.crest" [src]="m.homeTeam.crest" class="team-crest" alt="">
              <span class="team-name">{{m.homeTeam?.shortName || m.homeTeam?.name}}</span>
            </div>
            <div class="score-box">
              <span *ngIf="m.score?.fullTime?.home !== null" class="score">
                {{m.score.fullTime.home}} - {{m.score.fullTime.away}}
              </span>
              <span *ngIf="m.score?.fullTime?.home === null" class="pending">vs</span>
              <span *ngIf="m.score?.halfTime?.home !== null" class="half-time">
                (MT: {{m.score.halfTime.home}} - {{m.score.halfTime.away}})
              </span>
            </div>
            <div class="team away">
              <span class="team-name">{{m.awayTeam?.shortName || m.awayTeam?.name}}</span>
              <img *ngIf="m.awayTeam?.crest" [src]="m.awayTeam.crest" class="team-crest" alt="">
            </div>
          </div>
        </div>
        <div *ngIf="filteredMatches.length === 0" class="empty-state">Aucun match pour cette journee</div>
      </div>
    </div>
  `,
  styles: [`
    .matches-page { padding: 16px; max-width: 900px; margin: 0 auto; }
    .matches-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 12px; }
    .page-title { font-size: 1.2rem; font-weight: 700; }
    .live-indicator { display: flex; align-items: center; gap: 6px; font-size: .7rem; font-weight: 700; color: var(--green); }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.7); } }
    .last-updated { font-size: .65rem; color: var(--fg3); }
    .matchday-selector { display: flex; align-items: center; gap: 12px; }
    .matchday-selector button { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 12px; color: var(--fg); cursor: pointer; font-weight: 700; }
    .matchday-selector button:hover:not(:disabled) { border-color: var(--green); }
    .matchday-selector button:disabled { opacity: .3; cursor: default; }
    .matchday-selector span { font-weight: 700; min-width: 100px; text-align: center; }
    .match-list { display: flex; flex-direction: column; gap: 8px; }
    .match-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px 16px; transition: border-color var(--duration) var(--ease); }
    .match-card.live { border-color: var(--green); box-shadow: 0 0 12px rgba(52,211,153,.15); }
    .match-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .match-date { font-size: .75rem; color: var(--fg3); }
    .match-status { font-size: .65rem; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; }
    .match-status.live { background: var(--green); color: #000; }
    .match-status.ht { background: var(--orange); color: #000; }
    .match-minute { font-variant-numeric: tabular-nums; }
    .match-body { display: flex; align-items: center; gap: 12px; }
    .team { display: flex; align-items: center; gap: 8px; flex: 1; }
    .team.away { justify-content: flex-end; text-align: right; }
    .team-crest { height: 28px; width: 28px; object-fit: contain; }
    .team-name { font-weight: 600; font-size: .9rem; }
    .score-box { text-align: center; min-width: 80px; }
    .score { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 1.2rem; }
    .pending { color: var(--fg3); font-size: .85rem; }
    .half-time { display: block; font-size: .65rem; color: var(--fg3); margin-top: 2px; }
    .empty-state { text-align: center; padding: 40px; color: var(--fg3); }
    .spinner { display: flex; justify-content: center; padding: 60px; }
    .spinner-ring { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .8s linear infinite; }
  `]
})
export class MatchesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);
  private pollSub?: Subscription;

  private static readonly POLL_INTERVAL = 30_000;
  private static readonly LIVE_STATUSES = ['IN_PLAY', 'PAUSED'];

  leagueCode = '';
  leagueName = '';
  loading = true;
  allMatches: any[] = [];
  filteredMatches: any[] = [];
  selectedMatchday = 1;
  maxMatchday = 38;
  hasLive = false;
  lastUpdated = '';

  ngOnInit() {
    this.leagueCode = this.route.snapshot.paramMap.get('league') ?? '';
    this.leagueName = LEAGUE_LABELS[this.leagueCode] ?? this.leagueCode;
    this.fetchMatches(false);
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private fetchMatches(forceRefresh: boolean) {
    this.footballData.getMatches(this.leagueCode, this.state.season(), undefined, forceRefresh).subscribe({
      next: (data: any) => {
        const isFirstLoad = this.allMatches.length === 0;
        this.allMatches = data.matches ?? [];
        const maxMd = Math.max(...this.allMatches.map((m: any) => m.matchday ?? 0), 1);
        this.maxMatchday = maxMd;

        if (isFirstLoad) {
          const now = new Date();
          const upcoming = this.allMatches.find((m: any) =>
            (m.status === 'TIMED' || m.status === 'SCHEDULED') && new Date(m.utcDate) >= now
          );
          this.selectedMatchday = upcoming?.matchday ?? maxMd;
        }
        this.filterByMatchday();
        this.loading = false;
        this.lastUpdated = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        this.hasLive = this.filteredMatches.some((m: any) =>
          MatchesComponent.LIVE_STATUSES.includes(m.status)
        );
        this.hasLive ? this.startPolling() : this.stopPolling();
      },
      error: () => { this.loading = false; }
    });
  }

  private startPolling() {
    if (this.pollSub) return;
    this.pollSub = interval(MatchesComponent.POLL_INTERVAL).subscribe(() => {
      this.fetchMatches(true);
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  filterByMatchday() {
    this.filteredMatches = this.allMatches.filter((m: any) => m.matchday === this.selectedMatchday);
  }

  prevMatchday() { if (this.selectedMatchday > 1) { this.selectedMatchday--; this.filterByMatchday(); } }
  nextMatchday() { if (this.selectedMatchday < this.maxMatchday) { this.selectedMatchday++; this.filterByMatchday(); } }

  formatStatus = _formatStatus;
  getStatusClass = _getStatusClass;

  formatDateTime(utcDate: string): string {
    const d = new Date(utcDate);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}