// Sleep domain types. Two parallel backend subsystems exist: `/sleep`
// (SleepEntry — used by the Home route) and `/health/sleep` (SleepLog — used
// by the currently-unrendered LogSleepModal on Workouts). Re-exported from
// lib/api during migration.

export type { SleepEntry, SleepEntryPayload, SleepSource, SleepLog } from '../lib/api';
