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
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss']
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