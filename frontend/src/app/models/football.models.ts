export interface Competition {
  id: string;
  name: string;
  code: string;
  country: string;
  type: string;
  emblemUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  tla: string;
  country: string;
  crestUrl?: string;
  venue?: string;
}

export interface Match {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionCode: string;
  matchday: number;
  season: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  status: MatchStatus;
  venue?: string;
  stage?: string;
  group?: string;
}

export interface Standing {
  id: string;
  competitionId: string;
  competitionName: string;
  team: Team;
  season: string;
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string;
  group?: string;
}

export type MatchStatus = 'Scheduled' | 'Live' | 'HalfTime' | 'Finished' | 'Postponed' | 'Cancelled';

export type LeagueCode = 'PL' | 'PD' | 'BL1' | 'SA' | 'FL1' | 'CL';

export interface LeagueInfo {
  code: LeagueCode;
  name: string;
  country: string;
  flag: string;
}

export const LEAGUES: LeagueInfo[] = [
  { code: 'PL',  name: 'Premier League',    country: 'England',  flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F' },
  { code: 'PD',  name: 'La Liga',           country: 'Spain',    flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'BL1', name: 'Bundesliga',        country: 'Germany',  flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'SA',  name: 'Serie A',           country: 'Italy',    flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { code: 'FL1', name: 'Ligue 1',           country: 'France',   flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'CL',  name: 'Champions League',  country: 'Europe',   flag: '\uD83C\uDFC6' },
];

export const LEAGUE_LABELS: Record<string, string> = {};
LEAGUES.forEach(l => LEAGUE_LABELS[l.code] = l.name);