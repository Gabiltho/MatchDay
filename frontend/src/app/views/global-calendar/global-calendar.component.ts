import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FootballDataService } from '../../services/football-data.service';
import { LEAGUES } from '../../models/football.models';

@Component({
  selector: 'app-global-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-calendar.component.html',
  styleUrls: ['./global-calendar.component.scss']
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