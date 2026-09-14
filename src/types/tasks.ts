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
