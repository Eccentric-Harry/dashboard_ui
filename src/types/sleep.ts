// Sleep domain types — single source of truth. Two parallel backend subsystems exist:
// `/sleep` (SleepEntry — used by the Home route) and `/health/sleep` (SleepLog — used
// by the currently-unrendered LogSleepModal on Workouts).

/** TODO: wearable sync will populate source: 'wearable'. */
export type SleepSource = 'manual' | 'wearable';

/** One entry per night, keyed by the wake-up date (`sleep_logs` + SleepController). */
export interface SleepEntry {
  id: string;
  /** Wake-up date, YYYY-MM-DD. */
  date: string;
  /** HH:mm */
  bedtime: string;
  /** HH:mm */
  wakeTime: string;
  durationMinutes: number;
  /** 1–5 */
  quality?: number | null;
  note?: string | null;
  source: SleepSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface SleepEntryPayload {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality?: number | null;
  note?: string;
  source?: SleepSource;
}

export interface SleepLog {
  id?: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  notes?: string;
  createdAt?: string;
}

export interface SleepLogRequest {
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  notes?: string;
}
