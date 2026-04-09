import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUE_LABELS } from '../../models/football.models';

const CL_STAGE_ORDER = ['LEAGUE_STAGE', 'PLAYOFF', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
const CL_STAGE_LABELS: Record<string, string> = {
  'LEAGUE_STAGE': 'Phase de championnat',
  'PLAYOFF': 'Barrages',
  'LAST_16': '8emes de finale',
  'QUARTER_FINALS': 'Quarts de finale',
  'SEMI_FINALS': 'Demi-finales',
  'FINAL': 'Finale',
};

interface MatchdayEntry {
  label: string;
  key: string;
  matches: any[];
}

@Component({
  selector: 'app-league-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './league-dashboard.component.html',
  styleUrls: ['./league-dashboard.component.scss']
})
export class LeagueDashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);
  router = inject(Router);

  leagueCode = '';
  leagueName = '';
  loading = true;
  isCL = false;

  // Regular league
  standings: any[] = [];
  lastMatchday = 0;
  nextMatchday = 0;
  lastMatchdayMatches: any[] = [];
  nextMatchdayMatches: any[] = [];

  // CL calendar
  allMatches: any[] = [];
  clPhases: string[] = [];
  clActivePhase = '';
  clEntries: MatchdayEntry[] = [];
  clIndex = 0;

  get clCurrentEntry(): MatchdayEntry | null {
    return this.clEntries[this.clIndex] ?? null;
  }

  ngOnInit() {
    this.leagueCode = this.route.snapshot.paramMap.get('league') ?? '';
    this.leagueName = LEAGUE_LABELS[this.leagueCode] ?? this.leagueCode;
    this.isCL = this.leagueCode === 'CL';

    const season = this.state.season();

    if (this.isCL) {
      this.footballData.getMatches(this.leagueCode, season).subscribe({
        next: (data: any) => {
          this.allMatches = data.matches ?? [];
          this.buildCLPhases();
          this.selectPhase(this.detectDefaultPhase());
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    } else {
      let matchesLoaded = false;
      let standingsLoaded = false;

      this.footballData.getMatches(this.leagueCode, season).subscribe({
        next: (data: any) => {
          this.computeMatchdays(data.matches ?? []);
          matchesLoaded = true;
          if (standingsLoaded) this.loading = false;
        },
        error: () => { matchesLoaded = true; if (standingsLoaded) this.loading = false; }
      });

      this.footballData.getStandings(this.leagueCode, season).subscribe({
        next: (data: any) => {
          const standings = data.standings ?? [];
          const total = standings.find((s: any) => s.type === 'TOTAL') ?? standings[0];
          this.standings = total?.table ?? [];
          standingsLoaded = true;
          if (matchesLoaded) this.loading = false;
        },
        error: () => { standingsLoaded = true; if (matchesLoaded) this.loading = false; }
      });
    }
  }

  // --- Regular league ---
  private computeMatchdays(matches: any[]) {
    const upcoming = matches.find((m: any) =>
      ['TIMED', 'SCHEDULED', 'IN_PLAY', 'PAUSED'].includes(m.status)
    );
    const currentMd = upcoming?.matchday ?? Math.max(...matches.map((m: any) => m.matchday ?? 0), 1);

    const finishedMds = [...new Set(
      matches.filter((m: any) => m.status === 'FINISHED').map((m: any) => m.matchday)
    )].sort((a: number, b: number) => b - a);

    this.lastMatchday = finishedMds.find((md: number) => md <= currentMd) ?? finishedMds[0] ?? 0;
    this.nextMatchday = currentMd;

    const currentMdMatches = matches.filter((m: any) => m.matchday === currentMd);
    const allFinished = currentMdMatches.length > 0 && currentMdMatches.every((m: any) => m.status === 'FINISHED');
    if (allFinished) {
      this.lastMatchday = currentMd;
      this.nextMatchday = currentMd + 1;
    }

    this.lastMatchdayMatches = matches.filter((m: any) => m.matchday === this.lastMatchday && m.status === 'FINISHED');
    this.nextMatchdayMatches = matches.filter((m: any) => m.matchday === this.nextMatchday && m.status !== 'FINISHED');
  }

  // --- CL ---
  private buildCLPhases() {
    const stagesInData = [...new Set(this.allMatches.map((m: any) => m.stage))];
    this.clPhases = CL_STAGE_ORDER.filter(s => stagesInData.includes(s));
    if (this.clPhases.length === 0 && stagesInData.length > 0) {
      this.clPhases = stagesInData;
    }
  }

  private detectDefaultPhase(): string {
    for (const phase of this.clPhases) {
      const matches = this.allMatches.filter((m: any) => m.stage === phase);
      if (matches.some((m: any) => ['TIMED', 'SCHEDULED', 'IN_PLAY', 'PAUSED'].includes(m.status))) {
        return phase;
      }
    }
    return this.clPhases[this.clPhases.length - 1] || '';
  }

  selectPhase(phase: string) {
    this.clActivePhase = phase;
    this.buildCLEntries();
    this.goToDefaultEntry();
  }

  private buildCLEntries() {
    const phaseMatches = this.allMatches.filter((m: any) => m.stage === this.clActivePhase);

    if (this.clActivePhase === 'LEAGUE_STAGE') {
      const grouped = new Map<number, any[]>();
      for (const m of phaseMatches) {
        const md = m.matchday ?? 0;
        if (!grouped.has(md)) grouped.set(md, []);
        grouped.get(md)!.push(m);
      }
      this.clEntries = Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([md, ms]) => ({
          label: `Journee ${md}`,
          key: `league-${md}`,
          matches: ms.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
        }));
    } else {
      const label = CL_STAGE_LABELS[this.clActivePhase] || this.clActivePhase;
      const grouped = new Map<number, any[]>();
      for (const m of phaseMatches) {
        const md = m.matchday ?? 1;
        if (!grouped.has(md)) grouped.set(md, []);
        grouped.get(md)!.push(m);
      }
      if (grouped.size > 1) {
        this.clEntries = Array.from(grouped.entries())
          .sort(([a], [b]) => a - b)
          .map(([, ms], i) => ({
            label: `${label} — ${i === 0 ? 'Aller' : 'Retour'}`,
            key: `ko-${this.clActivePhase}-${i}`,
            matches: ms.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
          }));
      } else {
        this.clEntries = [{
          label,
          key: `ko-${this.clActivePhase}`,
          matches: phaseMatches.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
        }];
      }
    }
  }

  private goToDefaultEntry() {
    const idx = this.clEntries.findIndex(e =>
      e.matches.some((m: any) => ['TIMED', 'SCHEDULED', 'IN_PLAY', 'PAUSED'].includes(m.status))
    );
    this.clIndex = idx >= 0 ? idx : this.clEntries.length - 1;
  }

  phaseLabel(phase: string): string {
    return CL_STAGE_LABELS[phase] || phase;
  }

  clPrev() { if (this.clIndex > 0) this.clIndex--; }
  clNext() { if (this.clIndex < this.clEntries.length - 1) this.clIndex++; }

  // --- Shared ---
  formatStatus(status: string): string {
    switch (status) {
      case 'IN_PLAY': return 'LIVE';
      case 'PAUSED': return 'MI-TEMPS';
      case 'FINISHED': return 'TERMINE';
      default: return 'A VENIR';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'IN_PLAY': return 'live';
      case 'PAUSED': return 'ht';
      case 'FINISHED': return 'finished';
      default: return 'scheduled';
    }
  }

  parseForm(form: string | null): string[] {
    if (!form) return [];
    return form.split(',').map(f => f.trim()).filter(f => f);
  }

  formatDateTime(utcDate: string): string {
    const d = new Date(utcDate);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
