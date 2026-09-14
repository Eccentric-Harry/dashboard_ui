// Focus domain types — single source of truth.

export type FocusSessionStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface FocusSession {
  id: string;
  userId?: string;
  activePursuit: string;
  durationMinutes: number;
  status: FocusSessionStatus;
  startTime?: string;
  endTime?: string;
  remainingSecondsOnPause?: number;
}

/** Per-day completed focus minutes. */
export interface FocusDaySummary {
  /** YYYY-MM-DD */
  date: string;
  totalMinutes: number;
  sessions: number;
  /** Provenance split — measured by the timer vs entered later vs imported. */
  timerMinutes?: number;
  manualMinutes?: number;
  calendarMinutes?: number;
}

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
