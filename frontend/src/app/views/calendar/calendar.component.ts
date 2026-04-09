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
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
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
