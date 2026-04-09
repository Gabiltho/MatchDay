import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FootballDataService } from '../../services/football-data.service';
import { StateService } from '../../services/state.service';
import { LEAGUE_LABELS } from '../../models/football.models';

type StandingType = 'TOTAL' | 'HOME' | 'AWAY';

const TYPE_LABELS: Record<StandingType, string> = {
  TOTAL: 'General',
  HOME: 'Domicile',
  AWAY: 'Exterieur',
};

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './standings.component.html',
  styleUrls: ['./standings.component.scss']
})
export class StandingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private footballData = inject(FootballDataService);
  private state = inject(StateService);

  leagueCode = '';
  leagueName = '';
  loading = true;
  isCL = false;

  // All standings data keyed by type
  private allStandings: any[] = [];
  availableTypes: StandingType[] = [];
  activeType: StandingType = 'TOTAL';
  activeGroups: { name: string; table: any[] }[] = [];

  ngOnInit() {
    this.leagueCode = this.route.snapshot.paramMap.get('league') ?? '';
    this.leagueName = LEAGUE_LABELS[this.leagueCode] ?? this.leagueCode;
    this.isCL = this.leagueCode === 'CL';

    this.footballData.getStandings(this.leagueCode, this.state.season()).subscribe({
      next: (data: any) => {
        this.allStandings = data.standings ?? [];
        const types = [...new Set(this.allStandings.map((s: any) => s.type))] as StandingType[];
        // Ensure consistent order: TOTAL, HOME, AWAY
        this.availableTypes = (['TOTAL', 'HOME', 'AWAY'] as StandingType[]).filter(t => types.includes(t));
        this.activeType = 'TOTAL';
        this.buildGroups();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  selectType(type: StandingType) {
    this.activeType = type;
    this.buildGroups();
  }

  typeLabel(type: StandingType): string {
    return TYPE_LABELS[type] ?? type;
  }

  private buildGroups() {
    const filtered = this.allStandings.filter((s: any) => s.type === this.activeType);
    if (this.isCL) {
      this.activeGroups = filtered.map((s: any) => ({
        name: filtered.length > 1 ? (s.group ?? s.stage ?? '') : 'Phase de championnat',
        table: s.table ?? []
      }));
    } else {
      this.activeGroups = filtered.map((s: any) => ({
        name: s.group ?? '',
        table: s.table ?? []
      }));
    }
  }

  getZone(index: number, group: { name: string; table: any[] }): string {
    if (this.isCL) {
      if (index < 8) return 'cl';
      if (index < 24) return 'playoff';
      return 'rel';
    }
    if (group.name) return '';
    if (index < 4) return 'cl';
    if (index === 4) return 'el';
    if (index >= group.table.length - 3) return 'rel';
    return '';
  }

  parseForm(form: string | null): string[] {
    if (!form) return [];
    return form.split(',').map(f => f.trim()).filter(f => f);
  }
}
