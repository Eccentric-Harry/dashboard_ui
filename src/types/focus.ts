// Focus-domain types. Source of truth going forward; lib/api.ts keeps the
// legacy FocusSession/FocusDaySummary shapes during the migration.

/** Where a session's minutes came from — see backend FocusSource. */
export type FocusSourceKind = 'TIMER' | 'MANUAL' | 'CALENDAR';

/** Payload for recording focus work that already happened. */
export interface FocusLogPayload {
  /** YYYY-MM-DD. Must not be in the future. */
  date: string;
  minutes: number;
  /** HH:mm; the server places the block at midday when omitted. */
  startTime?: string;
  activePursuit?: string;
  note?: string;
}

/**
 * A timed calendar block that looks like it held focused work, offered for
 * confirmation. Covers native calendar items and Google-synced events alike —
 * both live in the same `daily_tasks` collection.
 */
export interface FocusSuggestion {
  /** Calendar occurrence id; the dedupe key once imported. */
  occurrenceId: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  minutes: number;
  category: string | null;
  origin: 'LOCAL' | 'GOOGLE';
}
