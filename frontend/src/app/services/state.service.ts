import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StateService {
  private _league = signal<string>('');
  private _season = signal<string>('2025');
  private _statusDot = signal<string>('');
  private _timestamp = signal<string>('');

  league = this._league.asReadonly();
  season = this._season.asReadonly();
  statusDot = this._statusDot.asReadonly();
  timestamp = this._timestamp.asReadonly();

  setLeague(code: string): void {
    this._league.set(code);
  }

  setSeason(season: string): void {
    this._season.set(season);
  }

  setStatusDot(status: string): void {
    this._statusDot.set(status);
  }

  setTimestamp(ts: string): void {
    this._timestamp.set(ts);
  }

  clearTimestamp(): void {
    this._timestamp.set('');
  }
}