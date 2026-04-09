/**
 * Shared helpers for match status formatting and CSS classes.
 * Extracted from dashboard, calendar, and matches components.
 */

export function formatStatus(status: string): string {
  switch (status) {
    case 'IN_PLAY': return 'LIVE';
    case 'PAUSED': return 'MI-TEMPS';
    case 'FINISHED': return 'TERMINE';
    case 'TIMED': case 'SCHEDULED': return 'A VENIR';
    case 'POSTPONED': return 'REPORTE';
    default: return status;
  }
}

export function getStatusClass(status: string): string {
  switch (status) {
    case 'IN_PLAY': return 'live';
    case 'PAUSED': return 'ht';
    case 'FINISHED': return 'finished';
    default: return 'scheduled';
  }
}
