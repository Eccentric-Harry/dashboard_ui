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

/**
 * A step in a pursuit's tree (step → sub-step → sub-sub-step, max 3 levels).
 * For a step with children, `isCompleted` is derived: true only when every child is.
 */
export interface PursuitStep {
  id: string;
  text: string;
  note?: string | null;
  isCompleted: boolean;
  /** Absent on pursuits stored before nesting existed. */
  children?: PursuitStep[];
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

export interface PursuitStepInput {
  text: string;
  note?: string;
  children?: PursuitStepInput[];
}

export interface CreatePursuitRequest {
  title: string;
  category: string;
  steps: PursuitStepInput[];
}

export interface AddPursuitStepRequest {
  /** Omit to append a top-level step. */
  parentId?: string;
  text: string;
}

export interface UpdatePursuitRequest {
  title: string;
  category: string;
}
