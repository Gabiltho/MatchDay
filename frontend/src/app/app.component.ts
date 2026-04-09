import { Component, OnInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, Subject } from 'rxjs';
import { catchError, filter, takeUntil } from 'rxjs/operators';

import { StateService } from './services/state.service';
import { FootballDataService } from './services/football-data.service';
import { LeagueCode, LEAGUES, LEAGUE_LABELS } from './models/football.models';
import { ALL_LEAGUES, TAB_LEAGUES } from './utils/constants';

const STORAGE_KEY = 'matchday_league_order';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private http = inject(HttpClient);
  readonly state = inject(StateService);
  private footballData = inject(FootballDataService);

  leagueLabels = LEAGUE_LABELS;
  leagueOrder: LeagueCode[] = [];
  showReorder = false;

  activeTab: string = 'dashboard';
  activeLeague: LeagueCode | null = null;
  detailView: string | null = null;

  seasons = ['2025', '2024', '2023', '2022'];
  selectedSeason = '2025';
  cacheBusy = false;
  themeIcon = '\u263D';

  ngOnInit() {
    this.leagueOrder = this.loadOrder();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects || e.url;
      this.syncFromUrl(url);
    });

    this.applyTheme(localStorage.getItem('theme') ?? 'dark');
    this.syncFromUrl(this.router.url);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrder(): LeagueCode[] {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (Array.isArray(saved)) {
        const valid = saved.filter((c: string) => TAB_LEAGUES.includes(c as LeagueCode)) as LeagueCode[];
        for (const c of TAB_LEAGUES) { if (!valid.includes(c)) valid.push(c); }
        if (valid.length === TAB_LEAGUES.length) return valid;
      }
    } catch {}
    return [...TAB_LEAGUES];
  }

  private saveOrder() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.leagueOrder));
  }

  moveLeague(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.leagueOrder.length) return;
    const temp = this.leagueOrder[index];
    this.leagueOrder[index] = this.leagueOrder[target];
    this.leagueOrder[target] = temp;
    this.leagueOrder = [...this.leagueOrder];
    this.saveOrder();
  }

  resetOrder() {
    this.leagueOrder = [...TAB_LEAGUES];
    this.saveOrder();
  }

  private syncFromUrl(url: string) {
    const segments = url.replace(/^\//, '').split('/');
    const first = segments[0];

    if (first === 'dashboard' || !first) {
      this.activeTab = 'dashboard';
      this.activeLeague = null;
      this.detailView = null;
    } else if (first === 'calendar') {
      this.activeTab = 'calendar';
      this.activeLeague = null;
      this.detailView = null;
    } else if (ALL_LEAGUES.includes(first as LeagueCode)) {
      const league = first as LeagueCode;
      this.activeTab = league;
      this.activeLeague = league;
      this.detailView = segments[1] ?? null;

      if (this.state.league() !== league) {
        this.footballData.clearCache();
        this.state.setStatusDot('');
        this.state.setLeague(league);
      }
    } else {
      this.activeTab = 'dashboard';
      this.activeLeague = null;
      this.detailView = null;
    }
  }

  goTo(path: string) {
    this.router.navigate([path]);
  }

  goToLeague(code: LeagueCode) {
    if (this.activeLeague === code && !this.detailView) return;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([`/${code}`]);
    });
  }

  onSeasonChange() {
    this.footballData.clearCache();
    this.state.setSeason(this.selectedSeason);
    this.state.setStatusDot('');
    if (this.activeLeague) {
      const path = this.detailView
        ? `/${this.activeLeague}/${this.detailView}`
        : `/${this.activeLeague}`;
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([path]);
      });
    }
  }

  toggleTheme() {
    this.applyTheme(document.body.classList.contains('light') ? 'dark' : 'light');
  }

  private applyTheme(t: string) {
    document.body.classList.toggle('light', t === 'light');
    this.themeIcon = t === 'light' ? '\u263E' : '\u263D';
    localStorage.setItem('theme', t);
  }

  async clearAllCaches() {
    this.cacheBusy = true;
    try {
      await firstValueFrom(
        this.http.post('/api/cache/clear', {}).pipe(catchError(() => of(null)))
      );
      this.footballData.clearCache();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  }
}