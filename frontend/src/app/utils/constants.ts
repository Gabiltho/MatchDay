import { LeagueCode, LEAGUES, LEAGUE_LABELS } from '../models/football.models';

export const ALL_LEAGUES: LeagueCode[] = LEAGUES.map(l => l.code);
export const TAB_LEAGUES = ALL_LEAGUES;
export { LEAGUE_LABELS, LEAGUES };