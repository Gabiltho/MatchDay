import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'calendar',
    loadComponent: () => import('./views/global-calendar/global-calendar.component').then(m => m.GlobalCalendarComponent)
  },
  {
    path: ':league/matches',
    loadComponent: () => import('./views/matches/matches.component').then(m => m.MatchesComponent)
  },
  {
    path: ':league/standings',
    loadComponent: () => import('./views/standings/standings.component').then(m => m.StandingsComponent)
  },
  {
    path: ':league/calendar',
    loadComponent: () => import('./views/calendar/calendar.component').then(m => m.CalendarComponent)
  },
  {
    path: ':league',
    loadComponent: () => import('./views/league-dashboard/league-dashboard.component').then(m => m.LeagueDashboardComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];