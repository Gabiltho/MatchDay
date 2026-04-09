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
  template: `
    <!-- Top bar -->
    <div class="top-bar">
      <div class="logo" (click)="goTo('/dashboard')" style="cursor:pointer">
        <svg class="logo-svg" viewBox="0 0 140 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#00b341"/><stop offset="100%" stop-color="#00d95f"/>
            </linearGradient>
          </defs>
          <g transform="translate(18,24)">
            <circle r="13" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
            <circle r="10" fill="none" stroke="#00b341" stroke-width=".8" opacity=".4"/>
            <path d="M-4,-8 L4,-8 L6,-2 L0,2 L-6,-2Z" fill="none" stroke="currentColor" stroke-width=".8" opacity=".4"/>
            <circle r="3" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5"/>
            <circle r="1" fill="#00b341"/>
          </g>
          <text x="38" y="22" font-family="'Arial Black',Impact,sans-serif" font-weight="900" font-size="17" letter-spacing="2" fill="currentColor">MATCH</text>
          <rect x="38" y="25" width="90" height="2" rx="1" fill="url(#logoGreen)"/>
          <text x="38" y="42" font-family="'Arial Black',Impact,sans-serif" font-weight="900" font-size="18" letter-spacing="1.5" fill="url(#logoGreen)">DAY</text>
        </svg>
      </div>

      <div class="champ-tabs">
        <div class="champ-tab" [class.active]="activeTab==='dashboard'" (click)="goTo('/dashboard')">Dashboard</div>
        <div class="champ-tab" [class.active]="activeTab==='calendar'"  (click)="goTo('/calendar')">Calendrier</div>
        <div class="champ-tab" *ngFor="let l of leagueOrder"
             [class.active]="activeTab===l"
             (click)="goToLeague(l)">{{leagueLabels[l]}}</div>
      </div>

      <div class="top-right">
        <select *ngIf="activeLeague" [(ngModel)]="selectedSeason" (change)="onSeasonChange()" title="Saison">
          <option *ngFor="let s of seasons" [value]="s">{{s}}</option>
        </select>
        <button class="icon-btn" (click)="clearAllCaches()" title="Vider les caches" [class.spin]="cacheBusy">&#8635;</button>
        <button class="icon-btn" (click)="toggleTheme()" title="Theme">{{themeIcon}}</button>
        <button class="icon-btn" (click)="showReorder = !showReorder" title="Reorganiser les onglets">&#9776;</button>
        <span class="status-dot"
              [class.live]="state.statusDot()==='live'"
              [class.finished]="state.statusDot()==='finished'"></span>
      </div>
    </div>

    <!-- Reorder panel -->
    <div class="reorder-panel" *ngIf="showReorder">
      <div class="reorder-head">
        <span>Ordre des ligues</span>
        <button class="reorder-close" (click)="showReorder = false">&#10005;</button>
      </div>
      <div class="reorder-list">
        <div *ngFor="let l of leagueOrder; index as i" class="reorder-item">
          <span class="reorder-label">{{leagueLabels[l]}}</span>
          <button class="reorder-btn" (click)="moveLeague(i, -1)" [disabled]="i === 0">&#9650;</button>
          <button class="reorder-btn" (click)="moveLeague(i, 1)" [disabled]="i === leagueOrder.length - 1">&#9660;</button>
        </div>
      </div>
      <button class="reorder-reset" (click)="resetOrder()">Reinitialiser</button>
    </div>

    <!-- Sub nav -->
    <div class="sub-nav" *ngIf="activeLeague">
      <div class="sub-tab" [class.active]="!detailView"               (click)="goToLeague(activeLeague!)">Accueil</div>
      <div class="sub-tab" [class.active]="detailView==='matches'"    (click)="goTo('/'+activeLeague+'/matches')">Matchs</div>
      <div class="sub-tab" [class.active]="detailView==='standings'"  (click)="goTo('/'+activeLeague+'/standings')">Classement</div>
      <div class="sub-tab" [class.active]="detailView==='calendar'"   (click)="goTo('/'+activeLeague+'/calendar')">Calendrier</div>
    </div>

    <!-- Routed view content -->
    <router-outlet />

    <!-- Timestamp -->
    <div class="ts" *ngIf="state.timestamp()">{{state.timestamp()}}</div>
  `,
  encapsulation: ViewEncapsulation.None,
  styles: [`:host { display: block; }`]
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
    this.router.navigate([`/${code}`]);
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