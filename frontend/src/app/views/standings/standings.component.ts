import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUE_LABELS } from '../../models/football.models';

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="standings-page">
      <h1 class="page-title">{{leagueName}} — Classement</h1>

      <div class="spinner" *ngIf="loading">
        <div class="spinner-ring"></div>
      </div>

      <div *ngFor="let group of standingGroups" class="standings-group">
        <h2 class="group-title" *ngIf="group.name">{{group.name}}</h2>
        <div class="table-wrapper">
          <table class="standings-table">
            <thead>
              <tr>
                <th class="col-pos">#</th>
                <th class="col-team">Equipe</th>
                <th>MJ</th>
                <th>V</th>
                <th>N</th>
                <th>D</th>
                <th>BP</th>
                <th>BC</th>
                <th>+/-</th>
                <th class="col-pts">Pts</th>
                <th class="col-form">Forme</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of group.table; index as i"
                  [class.zone-cl]="i < 4 && !group.name"
                  [class.zone-el]="i === 4 && !group.name"
                  [class.zone-rel]="i >= group.table.length - 3 && !group.name">
                <td class="col-pos">{{row.position}}</td>
                <td class="col-team">
                  <img *ngIf="row.team?.crest" [src]="row.team.crest" class="team-crest" alt="">
                  <span class="team-name">{{row.team?.shortName || row.team?.name}}</span>
                </td>
                <td>{{row.playedGames}}</td>
                <td>{{row.won}}</td>
                <td>{{row.draw}}</td>
                <td>{{row.lost}}</td>
                <td>{{row.goalsFor}}</td>
                <td>{{row.goalsAgainst}}</td>
                <td [class.positive]="row.goalDifference > 0" [class.negative]="row.goalDifference < 0">
                  {{row.goalDifference > 0 ? '+' : ''}}{{row.goalDifference}}
                </td>
                <td class="col-pts">{{row.points}}</td>
                <td class="col-form">
                  <span *ngFor="let r of parseForm(row.form)" class="form-dot" [class]="r">{{r === 'W' ? 'V' : r === 'D' ? 'N' : 'D'}}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .standings-page { padding: 16px; max-width: 1000px; margin: 0 auto; }
    .page-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 16px; }
    .group-title { font-size: 1rem; font-weight: 700; margin: 16px 0 8px; color: var(--fg2); }
    .table-wrapper { overflow-x: auto; }
    .standings-table { width: 100%; border-collapse: collapse; font-size: .8rem; background: var(--card); border-radius: var(--radius-md); overflow: hidden; }
    .standings-table th { text-align: center; color: var(--fg3); font-weight: 600; font-size: .7rem; text-transform: uppercase; padding: 8px 6px; border-bottom: 2px solid var(--border); background: var(--surface); }
    .standings-table th.col-team { text-align: left; }
    .standings-table td { padding: 8px 6px; text-align: center; border-bottom: 1px solid var(--surface); transition: background var(--duration) var(--ease); }
    .standings-table tr:hover td { background: var(--hover); }
    .col-pos { font-weight: 700; width: 32px; color: var(--fg3); }
    .col-team { text-align: left !important; display: flex; align-items: center; gap: 8px; min-width: 160px; }
    .team-crest { height: 22px; width: 22px; object-fit: contain; }
    .team-name { font-weight: 600; white-space: nowrap; }
    .col-pts { font-weight: 800; color: var(--green); font-size: .9rem; }
    .col-form { white-space: nowrap; }
    .form-dot { display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; font-size: .6rem; font-weight: 700; border-radius: 3px; margin: 0 1px; }
    .form-dot.W { background: var(--green); color: #000; }
    .form-dot.D { background: var(--fg3); color: #fff; }
    .form-dot.L { background: var(--red); color: #fff; }
    .positive { color: var(--green); }
    .negative { color: var(--red); }
    .zone-cl td:first-child { border-left: 3px solid var(--green); }
    .zone-el td:first-child { border-left: 3px solid var(--orange); }
    .zone-rel td:first-child { border-left: 3px solid var(--red); }
    .spinner { display: flex; justify-content: center; padding: 60px; }
    .spinner-ring { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .8s linear infinite; }
  `]
})
export class StandingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);

  leagueCode = '';
  leagueName = '';
  loading = true;
  standingGroups: { name: string; table: any[] }[] = [];

  ngOnInit() {
    this.leagueCode = this.route.snapshot.paramMap.get('league') ?? '';
    this.leagueName = LEAGUE_LABELS[this.leagueCode] ?? this.leagueCode;

    this.footballData.getStandings(this.leagueCode, this.state.season()).subscribe({
      next: (data: any) => {
        const standings = data.standings ?? [];
        this.standingGroups = standings.map((s: any) => ({
          name: s.group ?? (s.type === 'TOTAL' ? '' : s.stage),
          table: s.table ?? []
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  parseForm(form: string | null): string[] {
    if (!form) return [];
    return form.split(',').map(f => f.trim()).filter(f => f);
  }
}