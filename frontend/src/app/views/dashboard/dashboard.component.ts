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
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
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