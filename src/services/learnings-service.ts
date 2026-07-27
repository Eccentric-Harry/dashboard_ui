// Strictly-typed Learnings service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  LearningLog,
  LearningsSummary,
  LearningRequest,
  LearningPursuit,
  CreatePursuitRequest,
  UpdatePursuitRequest,
} from '../types/learnings';
import * as E from './endpoints/learnings-endpoints';

export interface LearningsServiceInterface {
  getLearnings(date?: string): Promise<SafeResult<LearningLog[]>>;
  getLearningsRange(startDate: string, endDate: string): Promise<SafeResult<LearningLog[]>>;
  getSummary(date?: string): Promise<SafeResult<LearningsSummary>>;
  addLearning(dto: LearningRequest): Promise<SafeResult<LearningLog>>;
  updateLearning(id: string, dto: LearningRequest): Promise<SafeResult<LearningLog>>;
  deleteLearning(id: string): Promise<SafeResult<void>>;
  // Pursuits
  getPursuits(): Promise<SafeResult<LearningPursuit[]>>;
  createPursuit(dto: CreatePursuitRequest): Promise<SafeResult<LearningPursuit>>;
  updatePursuit(id: string, dto: UpdatePursuitRequest): Promise<SafeResult<LearningPursuit>>;
  deletePursuit(id: string): Promise<SafeResult<void>>;
  togglePursuitStep(id: string, stepId: string): Promise<SafeResult<LearningPursuit>>;
  updatePursuitStep(id: string, stepId: string, text: string): Promise<SafeResult<LearningPursuit>>;
  deletePursuitStep(id: string, stepId: string): Promise<SafeResult<LearningPursuit>>;
}

export const learningsService: LearningsServiceInterface = {
  getLearnings: (date) => instance.safeCall<LearningLog[]>(E.API_GET_LEARNINGS, { query: { date } }),
  getLearningsRange: (startDate, endDate) =>
    instance.safeCall<LearningLog[]>(E.API_GET_LEARNINGS_RANGE, { query: { startDate, endDate } }),
  getSummary: (date) => instance.safeCall<LearningsSummary>(E.API_GET_LEARNINGS_SUMMARY, { query: { date } }),
  addLearning: (dto) => instance.safeCall<LearningLog>(E.API_ADD_LEARNING, { body: dto }),
  updateLearning: (id, dto) => instance.safeCall<LearningLog>(E.API_UPDATE_LEARNING, { params: { id }, body: dto }),
  deleteLearning: (id) => instance.safeCall<void>(E.API_DELETE_LEARNING, { params: { id } }),

  getPursuits: () => instance.safeCall<LearningPursuit[]>(E.API_GET_PURSUITS),
  createPursuit: (dto) => instance.safeCall<LearningPursuit>(E.API_CREATE_PURSUIT, { body: dto }),
  updatePursuit: (id, dto) =>
    instance.safeCall<LearningPursuit>(E.API_UPDATE_PURSUIT, { params: { id }, body: dto }),
  deletePursuit: (id) => instance.safeCall<void>(E.API_DELETE_PURSUIT, { params: { id } }),
  togglePursuitStep: (id, stepId) =>
    instance.safeCall<LearningPursuit>(E.API_TOGGLE_PURSUIT_STEP, { params: { id, stepId } }),
  updatePursuitStep: (id, stepId, text) =>
    instance.safeCall<LearningPursuit>(E.API_UPDATE_PURSUIT_STEP, { params: { id, stepId }, body: { text } }),
  deletePursuitStep: (id, stepId) =>
    instance.safeCall<LearningPursuit>(E.API_DELETE_PURSUIT_STEP, { params: { id, stepId } }),
};
