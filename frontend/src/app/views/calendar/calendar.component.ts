import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUE_LABELS } from '../../models/football.models';
import { formatStatus as _formatStatus, getStatusClass as _getStatusClass } from '../../utils/match-helpers';

interface MatchdayEntry {
  label: string;
  key: string;       // matchday number or stage id
  matches: any[];
}

const CL_STAGE_ORDER = ['LEAGUE_STAGE', 'PLAYOFF', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
const CL_STAGE_LABELS: Record<string, string> = {
  'LEAGUE_STAGE': 'Phase de championnat',
  'PLAYOFF': 'Barrages',
  'LAST_16': '8emes de finale',
  'QUARTER_FINALS': 'Quarts de finale',
  'SEMI_FINALS': 'Demi-finales',
  'FINAL': 'Finale',
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calendar-page">
      <div class="calendar-header">
        <h1 class="page-title">{{leagueName}} — Calendrier</h1>
        <span class="live-indicator" *ngIf="hasLive">
          <span class="pulse-dot"></span> LIVE
        </span>
        <span class="last-updated" *ngIf="lastUpdated">MAJ {{lastUpdated}}</span>
      </div>

      <div class="spinner" *ngIf="loading">
        <div class="spinner-ring"></div>
      </div>

      <div *ngIf="!loading">
        <!-- CL phase tabs -->
        <div class="phase-tabs" *ngIf="isCL && phases.length > 1">
          <button *ngFor="let p of phases" class="phase-tab"
                  [class.active]="p === activePhase"
                  (click)="selectPhase(p)">{{phaseLabel(p)}}</button>
        </div>

        <!-- Matchday navigation -->
        <div class="matchday-nav">
          <button class="nav-btn" (click)="prev()" [disabled]="currentIndex <= 0">&laquo;</button>
          <span class="matchday-label">{{currentEntry?.label}}</span>
          <button class="nav-btn" (click)="next()" [disabled]="currentIndex >= entries.length - 1">&raquo;</button>
        </div>

        <!-- Match list -->
        <div class="match-list">
          <div class="match-card" *ngFor="let m of currentEntry?.matches"
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
            <!-- Aggregate for CL knockout -->
            <div class="aggregate" *ngIf="m.aggregateLabel">{{m.aggregateLabel}}</div>
          </div>
          <div *ngIf="currentEntry && currentEntry.matches.length === 0" class="empty-state">Aucun match pour cette journee</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-page { padding: var(--sp-5); max-width: 900px; margin: 0 auto; }
    .calendar-header { display: flex; align-items: center; gap: 12px; margin-bottom: var(--sp-5); }
    .page-title { font-size: 1.3rem; font-weight: 900; letter-spacing: -.3px; }
    .live-indicator { display: flex; align-items: center; gap: 6px; font-size: .7rem; font-weight: 700; color: var(--green); }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.7); } }
    .last-updated { margin-left: auto; font-size: .65rem; color: var(--fg3); font-family: 'JetBrains Mono', monospace; }

    .phase-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
    .phase-tab {
      padding: 7px 16px; border-radius: var(--radius-sm); font-size: .73rem; font-weight: 700;
      background: var(--surface); border: 1px solid var(--border); color: var(--fg2); cursor: pointer;
      transition: all var(--duration) var(--ease); letter-spacing: .2px;
    }
    .phase-tab.active { background: var(--green); color: #000; border-color: var(--green); box-shadow: 0 0 12px rgba(52,211,153,.2); }
    .phase-tab:hover:not(.active) { border-color: rgba(52,211,153,.3); background: var(--hover); }

    .matchday-nav { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px; }
    .nav-btn {
      background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 10px 18px; color: var(--fg); cursor: pointer; font-weight: 700; font-size: 1rem;
      transition: all var(--duration) var(--ease); box-shadow: var(--shadow-sm);
    }
    .nav-btn:hover:not(:disabled) { border-color: var(--green); background: var(--card-hover); transform: translateY(-1px); }
    .nav-btn:disabled { opacity: .25; cursor: default; }
    .matchday-label { font-weight: 800; font-size: .95rem; min-width: 200px; text-align: center; letter-spacing: -.1px; }

    .match-list { display: flex; flex-direction: column; gap: 10px; }
    .match-card {
      background: var(--card); background-image: var(--gradient-card);
      border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 14px 18px; box-shadow: var(--shadow-card);
      transition: all var(--duration) var(--ease);
    }
    .match-card:hover { border-color: rgba(255,255,255,.08); background: var(--card-hover); }
    .match-card.live { border-color: var(--green); box-shadow: 0 0 20px rgba(52,211,153,.12), var(--shadow-card); }
    .match-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .match-date { font-size: .73rem; color: var(--fg3); }
    .match-status { font-size: .6rem; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: var(--radius-sm); letter-spacing: .5px; }
    .match-status.live { background: var(--green); color: #000; box-shadow: 0 0 12px rgba(52,211,153,.3); }
    .match-status.ht { background: var(--orange); color: #000; }
    .match-status.finished { background: var(--surface); color: var(--fg3); }
    .match-status.scheduled { background: var(--surface); color: var(--fg3); }
    .match-minute { font-variant-numeric: tabular-nums; }
    .match-body { display: flex; align-items: center; gap: 12px; }
    .team { display: flex; align-items: center; gap: 10px; flex: 1; }
    .team.away { justify-content: flex-end; text-align: right; }
    .team-crest { height: 30px; width: 30px; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,.3)); }
    .team-name { font-weight: 700; font-size: .9rem; }
    .score-box { text-align: center; min-width: 80px; }
    .score { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 1.25rem; }
    .pending { color: var(--fg3); font-size: .85rem; }
    .half-time { display: block; font-size: .65rem; color: var(--fg3); margin-top: 3px; font-family: 'JetBrains Mono', monospace; }
    .aggregate { text-align: center; font-size: .7rem; color: var(--fg3); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); }
    .empty-state { text-align: center; padding: 40px; color: var(--fg3); }
    .spinner { display: flex; justify-content: center; padding: 60px; }
    .spinner-ring { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .8s linear infinite; }
  `]
})
export class CalendarComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);
  private pollSub?: Subscription;

  private static readonly POLL_INTERVAL = 30_000;
  private static readonly LIVE_STATUSES = ['IN_PLAY', 'PAUSED'];

  leagueCode = '';
  leagueName = '';
  loading = true;
  hasLive = false;
  lastUpdated = '';

  isCL = false;
  allMatches: any[] = [];

  // CL phases
  phases: string[] = [];
  activePhase = '';

  // Current matchday entries (filtered by phase for CL)
  entries: MatchdayEntry[] = [];
  currentIndex = 0;

  get currentEntry(): MatchdayEntry | null {
    return this.entries[this.currentIndex] ?? null;
  }

  ngOnInit() {
    this.leagueCode = this.route.snapshot.paramMap.get('league') ?? '';
    this.leagueName = LEAGUE_LABELS[this.leagueCode] ?? this.leagueCode;
    this.isCL = this.leagueCode === 'CL';
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
        this.loading = false;

        if (this.isCL) {
          this.buildCLPhases();
          if (isFirstLoad) this.selectPhase(this.detectDefaultPhase());
          else this.buildEntries();
        } else {
          this.buildLeagueEntries();
          if (isFirstLoad) this.goToDefaultMatchday();
        }

        this.lastUpdated = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.hasLive = (this.currentEntry?.matches ?? []).some((m: any) =>
          CalendarComponent.LIVE_STATUSES.includes(m.status)
        );
        this.hasLive ? this.startPolling() : this.stopPolling();
      },
      error: () => { this.loading = false; }
    });
  }

  // --- Regular league ---
  private buildLeagueEntries() {
    const grouped = new Map<number, any[]>();
    for (const m of this.allMatches) {
      const md = m.matchday ?? 0;
      if (!grouped.has(md)) grouped.set(md, []);
      grouped.get(md)!.push(m);
    }
    this.entries = Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([md, ms]) => ({
        label: `Journee ${md}`,
        key: String(md),
        matches: ms.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
      }));
  }

  private goToDefaultMatchday() {
    const now = new Date();
    // Find first matchday with an upcoming/live match
    const idx = this.entries.findIndex(e =>
      e.matches.some((m: any) =>
        ['TIMED', 'SCHEDULED', 'IN_PLAY', 'PAUSED'].includes(m.status)
      )
    );
    this.currentIndex = idx >= 0 ? idx : this.entries.length - 1;
  }

  // --- CL ---
  private buildCLPhases() {
    const stagesInData = [...new Set(this.allMatches.map((m: any) => m.stage))];
    this.phases = CL_STAGE_ORDER.filter(s => stagesInData.includes(s));
    if (this.phases.length === 0 && stagesInData.length > 0) {
      this.phases = stagesInData;
    }
  }

  private detectDefaultPhase(): string {
    // Pick the phase that has upcoming/live matches, or the last phase with matches
    for (const phase of this.phases) {
      const matches = this.allMatches.filter((m: any) => m.stage === phase);
      if (matches.some((m: any) => ['TIMED', 'SCHEDULED', 'IN_PLAY', 'PAUSED'].includes(m.status))) {
        return phase;
      }
    }
    return this.phases[this.phases.length - 1] || '';
  }

  selectPhase(phase: string) {
    this.activePhase = phase;
    this.buildEntries();
    this.goToDefaultMatchday();
  }

  private buildEntries() {
    if (this.isCL) {
      this.buildCLEntries();
    } else {
      this.buildLeagueEntries();
    }
  }

  private buildCLEntries() {
    const phaseMatches = this.allMatches.filter((m: any) => m.stage === this.activePhase);

    if (this.activePhase === 'LEAGUE_STAGE') {
      // Group by matchday
      const grouped = new Map<number, any[]>();
      for (const m of phaseMatches) {
        const md = m.matchday ?? 0;
        if (!grouped.has(md)) grouped.set(md, []);
        grouped.get(md)!.push(m);
      }
      this.entries = Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([md, ms]) => ({
          label: `Journee ${md}`,
          key: `league-${md}`,
          matches: ms.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
        }));
    } else {
      // Knockout: group by date pair (aller/retour) or show all as one entry
      const label = CL_STAGE_LABELS[this.activePhase] || this.activePhase;
      // Group by matchday if available, else single entry
      const grouped = new Map<number, any[]>();
      for (const m of phaseMatches) {
        const md = m.matchday ?? 1;
        if (!grouped.has(md)) grouped.set(md, []);
        grouped.get(md)!.push(m);
      }
      if (grouped.size > 1) {
        this.entries = Array.from(grouped.entries())
          .sort(([a], [b]) => a - b)
          .map(([md, ms], i) => ({
            label: `${label} — ${i === 0 ? 'Aller' : 'Retour'}`,
            key: `ko-${this.activePhase}-${md}`,
            matches: ms.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
          }));
      } else {
        this.entries = [{
          label,
          key: `ko-${this.activePhase}`,
          matches: phaseMatches.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
        }];
      }
    }
  }

  phaseLabel(phase: string): string {
    return CL_STAGE_LABELS[phase] || phase;
  }

  // --- Navigation ---
  prev() { if (this.currentIndex > 0) this.currentIndex--; }
  next() { if (this.currentIndex < this.entries.length - 1) this.currentIndex++; }

  // --- Polling ---
  private startPolling() {
    if (this.pollSub) return;
    this.pollSub = interval(CalendarComponent.POLL_INTERVAL).subscribe(() => {
      this.fetchMatches(true);
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  // --- Formatting ---
  formatStatus = _formatStatus;
  getStatusClass = _getStatusClass;

  formatDateTime(utcDate: string): string {
    const d = new Date(utcDate);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
