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
  /** ISO instant a leaf was ticked. */
  completedAt?: string | null;
  /** Planned minutes for a leaf; parents sum their leaves (see pursuit-tree.ts). */
  estimateMinutes?: number | null;
  /** Minutes logged against this step by step-linked focus sessions. */
  spentMinutes?: number;
  /** Where the learner stopped last time. */
  resumeNote?: string | null;
  /** Key takeaways captured from study sessions. */
  takeaways?: string | null;
  /** Absent on pursuits stored before nesting existed. */
  children?: PursuitStep[];
}

export type LearningPursuitStatus = 'ACTIVE' | 'COMPLETED';

export interface LearningPursuit {
  id: string;
  title: string;
  category: string;
  notionUrl: string;
  goal?: string | null;
  /** The single main pursuit the Next-up panel works from. */
  isPrimary?: boolean;
  status: LearningPursuitStatus;
  steps: PursuitStep[];
}

// ── Request DTOs ──
export type LearningRequest = Omit<LearningLog, 'id'>;

export interface PursuitStepInput {
  text: string;
  note?: string;
  estimateMinutes?: number;
  children?: PursuitStepInput[];
}

export interface CreatePursuitRequest {
  title: string;
  category: string;
  goal?: string;
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
  /** Omit to leave unchanged; empty string clears. */
  goal?: string;
}

/** Partial step update — omitted fields are left unchanged. */
export interface UpdatePursuitStepRequest {
  text?: string;
  /** 0 clears the estimate. */
  estimateMinutes?: number;
  /** Empty string clears. */
  resumeNote?: string;
  /** Empty string clears. */
  takeaways?: string;
}
