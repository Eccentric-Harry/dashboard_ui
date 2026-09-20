// Formatting for the HUD's readouts. Everything here returns a fixed-width-ish
// string: the columns are monospace with tabular figures, so values that change
// once a second must not change width as they do, or the whole line jitters.

/** '4h 12m' / '12m 30s' / '48s' — the largest two units that carry information. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
  return `${remainder}s`;
}

/** Clock time in a given zone, 24h with zero padding — no AM/PM to change width. */
export function formatClock(date: Date, timeZone?: string, withSeconds = true): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' as const } : {}),
    hour12: false,
    timeZone,
  }).format(date);
}

/** Hour-only label for the forecast axis: '15h', '03h'. */
export function formatHourLabel(epochMs: number): string {
  return `${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false }).format(new Date(epochMs))}h`;
}

/** Short weekday for the outlook rows: 'MON'. */
export function formatWeekday(epochMs: number): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(epochMs)).toUpperCase();
}

export function formatDayStamp(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone,
  })
    .format(date)
    .toUpperCase();
}

/** '2m ago' / 'just now' — for "when was this reading taken". */
export function formatAgo(epochMs: number | undefined): string {
  if (!epochMs || Number.isNaN(epochMs)) return '—';
  const seconds = Math.round((Date.now() - epochMs) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}

/** Latency, kept to three significant characters so the column never reflows. */
export function formatMs(ms: number | undefined): string {
  if (ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Byte sizes at a sensible precision — '812 KB', '1.4 GB', not '0 MB'. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/**
 * Durations for the request stream's fixed-width column. A 30s timeout printed
 * as '30003' overflows it and looks like a corrupted number.
 */
export function formatCompactMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export function formatTemperature(celsius: number | undefined): string {
  return celsius === undefined || Number.isNaN(celsius) ? '—' : `${Math.round(celsius)}°`;
}

/** Signed coordinate pair in the compass form a map would print. */
export function formatCoords(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat} ${lon}`;
}

/**
 * IANA zones keep their historical spellings forever, and browsers still resolve
 * India to 'Asia/Calcutta'. Show the name the city actually goes by.
 */
const ZONE_CITY_ALIASES: Record<string, string> = {
  Calcutta: 'Kolkata',
  Saigon: 'Ho Chi Minh',
  Katmandu: 'Kathmandu',
};

/** The zone id with its city modernised ('Asia/Calcutta' → 'Asia/Kolkata'). */
export function displayTimeZone(timeZone: string | undefined): string {
  if (!timeZone) return '—';
  const parts = timeZone.split('/');
  const city = parts.pop() ?? '';
  const alias = ZONE_CITY_ALIASES[city.replace(/_/g, ' ')];
  return [...parts, alias ? alias.replace(/ /g, '_') : city].join('/');
}

/** The city half of an IANA zone ('Asia/Kolkata' → 'Kolkata'). */
export function timeZoneCity(timeZone: string | undefined): string {
  if (!timeZone) return '—';
  const city = (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
  return ZONE_CITY_ALIASES[city] ?? city;
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/** Fraction of the way from `start` to `end` at time `now`, clamped to 0–1. */
export function progressBetween(start: number, end: number, now: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}
