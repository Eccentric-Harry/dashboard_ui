// Tasks domain types — single source of truth. Tasks and calendar items share the
// backend `daily_tasks` collection, so the recurrence vocabulary lives in calendar.ts.

import type { CalendarRecurrence } from './calendar';

export interface SubTask {
  id?: string;
  text: string;
  completed?: boolean;
}

export interface TaskHistoryEvent {
  timestamp: string;
  message: string;
}

export interface DailyTask {
  id?: string;
  title: string;
  date: string;
  scheduledTime?: string;
  notes?: string;
  completed?: boolean;
  status?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  recurrenceFrequency?: CalendarRecurrence;
  category?: string;
  subtasks?: SubTask[];
  tags?: string[];
}

// ── Request DTOs ──
export type TaskRequest = Omit<DailyTask, 'id'>;

// ── Google Tasks sync ──
// Mirrors GoogleTasksController's status payload. Each dashboard category becomes one
// Google task list, so a phone widget (which pins exactly one list) can show just
// "Personal" or just "Learning".
export interface GoogleTaskListSummary {
  category: string;
  title: string;
  /** The list was deleted in Google; its binding is kept so it can be recreated deliberately. */
  missing: boolean;
}

export interface GoogleTasksAccount {
  email: string;
  enabled: boolean;
  /**
   * Whether this account's OAuth grant actually covers the Tasks scope. Accounts
   * connected before Tasks sync existed are Calendar-only and must reconnect.
   */
  scopeGranted: boolean;
  status: string;
  lastSyncedAt?: string;
  syncedTaskCount: number;
  lists: GoogleTaskListSummary[];
}

export interface GoogleTasksStatus {
  connected: boolean;
  anyEnabled: boolean;
  accounts: GoogleTasksAccount[];
}

/** Result of an on-demand inbound pull from Google Tasks. */
export interface GoogleTasksRefresh {
  /** False when no connected account has mirroring turned on — nothing to wait for. */
  enabled: boolean;
  /** How many local rows the pull changed. Zero means the list on screen is already right. */
  applied: number;
  /** True when a poll ran too recently and this call was debounced away. */
  skipped: boolean;
}
