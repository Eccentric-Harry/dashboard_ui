// Calendar domain types — single source of truth. Occurrences of recurring items are
// expanded server-side (CalendarItemService.getOccurrences) and never persisted.

import type { TaskHistoryEvent } from './tasks';

export type CalendarItemType = 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';
export type CalendarRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface CalendarItem {
  id?: string;
  occurrenceId?: string;
  date: string;
  originalDate?: string;
  title: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  itemType?: CalendarItemType;
  category?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
  cancelled?: boolean;
  sortOrder?: number;
  recurrenceFrequency?: CalendarRecurrence;
  recurrenceUntil?: string;
  history?: TaskHistoryEvent[];
  createdAt?: string;
}

export interface CalendarItemPayload {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  itemType?: CalendarItemType;
  category?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
  cancelled?: boolean;
  sortOrder?: number;
  recurrenceFrequency?: CalendarRecurrence;
  recurrenceUntil?: string;
}

// ── Google Calendar sync ──
export interface GoogleCalendarAccount {
  email: string;
  lastSyncedAt?: string;
  webhookExpiration?: string;
}

export interface GoogleSyncStatus {
  connected: boolean;
  /** First connected account — kept for legacy callers. */
  email?: string;
  accounts: GoogleCalendarAccount[];
}
