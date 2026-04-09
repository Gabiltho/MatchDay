import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FootballDataService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/football`;
  private cache = new Map<string, Observable<any>>();

  getCompetitions(): Observable<any> {
    return this.cached('competitions', () =>
      this.http.get(`${this.base}/competitions`)
    );
  }

  getCompetition(code: string): Observable<any> {
    return this.cached(`competition:${code}`, () =>
      this.http.get(`${this.base}/competitions/${code}`)
    );
  }

  getMatches(code: string, season?: string, matchday?: number): Observable<any> {
    let url = `${this.base}/competitions/${code}/matches`;
    const params: string[] = [];
    if (season) params.push(`season=${season}`);
    if (matchday) params.push(`matchday=${matchday}`);
    if (params.length) url += '?' + params.join('&');
    return this.cached(`matches:${code}:${season}:${matchday}`, () =>
      this.http.get(url)
    );
  }

  getStandings(code: string, season?: string): Observable<any> {
    let url = `${this.base}/competitions/${code}/standings`;
    if (season) url += `?season=${season}`;
    return this.cached(`standings:${code}:${season}`, () =>
      this.http.get(url)
    );
  }

  getTeams(code: string, season?: string): Observable<any> {
    let url = `${this.base}/competitions/${code}/teams`;
    if (season) url += `?season=${season}`;
    return this.cached(`teams:${code}:${season}`, () =>
      this.http.get(url)
    );
  }

  getScorers(code: string, season?: string): Observable<any> {
    let url = `${this.base}/competitions/${code}/scorers`;
    if (season) url += `?season=${season}`;
    return this.cached(`scorers:${code}:${season}`, () =>
      this.http.get(url)
    );
  }

  getTodayMatches(): Observable<any> {
    return this.cached('today', () =>
      this.http.get(`${this.base}/matches/today`)
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  private cached<T>(key: string, factory: () => Observable<T>): Observable<T> {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory().pipe(shareReplay(1)));
    }
    return this.cache.get(key) as Observable<T>;
  }
}