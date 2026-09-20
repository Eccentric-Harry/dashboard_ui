// Moon phase, computed rather than fetched.
//
// The synodic month is regular enough that counting forward from a known new
// moon is accurate to well under a day — far tighter than the eight names it
// resolves to. So this needs no API, works offline, and costs nothing.

/** 2000-01-06 18:14 UTC — the new moon the standard approximation counts from. */
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_DAYS = 29.530588853;
const DAY_MS = 86_400_000;

export interface MoonPhase {
  /** 0 = new, 0.5 = full, approaching 1 = waning crescent. */
  fraction: number;
  /** Share of the disc lit, 0–1. */
  illumination: number;
  label: string;
  glyph: string;
  /** Days since the last new moon. */
  ageDays: number;
}

const PHASES: { label: string; glyph: string }[] = [
  { label: 'New', glyph: '●' },
  { label: 'Waxing crescent', glyph: '☽' },
  { label: 'First quarter', glyph: '◑' },
  { label: 'Waxing gibbous', glyph: '◕' },
  { label: 'Full', glyph: '○' },
  { label: 'Waning gibbous', glyph: '◔' },
  { label: 'Last quarter', glyph: '◐' },
  { label: 'Waning crescent', glyph: '☾' },
];

export function moonPhaseAt(date: Date): MoonPhase {
  const elapsedDays = (date.getTime() - KNOWN_NEW_MOON_MS) / DAY_MS;
  const cycles = elapsedDays / SYNODIC_MONTH_DAYS;
  const fraction = cycles - Math.floor(cycles);
  // Eight named phases, each centred on its eighth rather than starting at it —
  // otherwise "Full" would begin at the full moon instead of straddling it.
  const index = Math.round(fraction * 8) % 8;
  return {
    fraction,
    illumination: (1 - Math.cos(2 * Math.PI * fraction)) / 2,
    ageDays: fraction * SYNODIC_MONTH_DAYS,
    ...PHASES[index],
  };
}
