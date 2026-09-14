// Learnings domain types — single source of truth.

export interface LearningLog {
  id?: string;
  title: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  notionUrl?: string;
  createdAt?: string;
}

export interface LearningsCategoryCount {
  name: string;
  count: number;
}

export interface LearningsTodaySummary {
  learningsCount: number;
  tasksTotal: number;
  tasksCompleted: number;
  categories: LearningsCategoryCount[];
}

export interface LearningsTimelineDay {
  date: string;
  learningsCount: number;
  tasksCompleted: number;
  intensity: number;
}

export interface LearningsStatsSummary {
  weeklyLearningCount: number;
  streakDays: number;
  totalTasksCompleted?: number;
  totalTasksCount?: number;
  totalLearningsCount?: number;
  totalPursuitsCount?: number;
}

export interface LearningsSummary {
  date: string;
  today: LearningsTodaySummary;
  timeline: LearningsTimelineDay[];
  stats: LearningsStatsSummary;
}

export interface PursuitStep {
  id: string;
  text: string;
  isCompleted: boolean;
}

export type LearningPursuitStatus = 'ACTIVE' | 'COMPLETED';

export interface LearningPursuit {
  id: string;
  title: string;
  category: string;
  notionUrl: string;
  status: LearningPursuitStatus;
  steps: PursuitStep[];
}

// ── Request DTOs ──
export type LearningRequest = Omit<LearningLog, 'id'>;

export interface CreatePursuitRequest {
  title: string;
  category: string;
  steps: string[];
}

export interface UpdatePursuitRequest {
  title: string;
  category: string;
}
