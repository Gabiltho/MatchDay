import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FootballDataService } from '../../services/football-data.service';
import { LEAGUES } from '../../models/football.models';

@Component({
  selector: 'app-global-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="global-cal">
      <h1 class="page-title">Calendrier global</h1>

      <div class="spinner" *ngIf="loading">
        <div class="spinner-ring"></div>
      </div>

      <div *ngFor="let day of groupedByDate" class="day-section">
        <h2 class="day-title">{{day.label}}</h2>
        <div class="match-card" *ngFor="let m of day.matches" (click)="goToLeague(m.competition?.code)">
          <div class="match-comp">
            <img *ngIf="m.competition?.emblem" [src]="m.competition.emblem" class="comp-emblem" alt="">
            <span>{{m.competition?.name}}</span>
          </div>
          <div class="match-row">
            <span class="time">{{formatTime(m.utcDate)}}</span>
            <span class="home">{{m.homeTeam?.shortName || m.homeTeam?.name}}</span>
            <span class="score" *ngIf="m.score?.fullTime?.home !== null">
              {{m.score.fullTime.home}} - {{m.score.fullTime.away}}
            </span>
            <span class="score pending" *ngIf="m.score?.fullTime?.home === null">vs</span>
            <span class="away">{{m.awayTeam?.shortName || m.awayTeam?.name}}</span>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && groupedByDate.length === 0">
        Aucun match cette semaine
      </div>
    </div>
  `,
  styles: [`
    .global-cal { padding: 16px; max-width: 900px; margin: 0 auto; }
    .page-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 16px; }
    .day-section { margin-bottom: 20px; }
    .day-title { font-size: .9rem; font-weight: 700; color: var(--green); margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
    .match-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 4px; cursor: pointer; }
    .match-card:hover { border-color: var(--green); }
    .match-comp { display: flex; align-items: center; gap: 6px; font-size: .7rem; color: var(--fg3); margin-bottom: 4px; }
    .comp-emblem { height: 14px; }
    .match-row { display: flex; align-items: center; gap: 8px; font-size: .8rem; }
    .time { color: var(--fg3); font-size: .7rem; min-width: 40px; }
    .home { flex: 1; text-align: right; font-weight: 600; }
    .score { font-family: 'JetBrains Mono', monospace; font-weight: 800; min-width: 50px; text-align: center; }
    .score.pending { color: var(--fg3); font-weight: 400; }
    .away { flex: 1; font-weight: 600; }
    .empty-state { text-align: center; padding: 40px; color: var(--fg3); }
    .spinner { display: flex; justify-content: center; padding: 60px; }
    .spinner-ring { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .8s linear infinite; }
  `]
})
export class GlobalCalendarComponent implements OnInit {
  private router = inject(Router);
  private footballData = inject(FootballDataService);

  loading = true;
  groupedByDate: { label: string; matches: any[] }[] = [];

  ngOnInit() {
    this.footballData.getTodayMatches().subscribe({
      next: (data: any) => {
        const matches = data.matches ?? [];
        const grouped = new Map<string, any[]>();
        for (const m of matches) {
          const dateKey = new Date(m.utcDate).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
          if (!grouped.has(dateKey)) grouped.set(dateKey, []);
          grouped.get(dateKey)!.push(m);
        }
        this.groupedByDate = Array.from(grouped.entries()).map(([label, ms]) => ({ label, matches: ms }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  goToLeague(code: string) {
    if (code) this.router.navigate([`/${code}`]);
  }

  formatTime(utcDate: string): string {
    return new Date(utcDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}