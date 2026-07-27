// Learnings domain types. During migration these re-export the definitions still
// living in lib/api.ts; the Phase-B cleanup moves the definitions here and flips
// lib/api.ts to re-export from this file. New code should import from here.

export type {
  LearningLog,
  LearningsCategoryCount,
  LearningsTodaySummary,
  LearningsTimelineDay,
  LearningsStatsSummary,
  LearningsSummary,
  LearningPursuit,
  PursuitStep,
} from '../lib/api';

import type { LearningLog } from '../lib/api';

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
