// Strictly-typed Tasks service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { DailyTask, GoogleTasksRefresh, GoogleTasksStatus, TaskRequest } from '../types/tasks';
import * as E from './endpoints/tasks-endpoints';

export interface TasksServiceInterface {
  getTasks(date?: string): Promise<SafeResult<DailyTask[]>>;
  getTasksRange(startDate: string, endDate: string): Promise<SafeResult<DailyTask[]>>;
  addTask(dto: TaskRequest): Promise<SafeResult<DailyTask>>;
  updateTask(id: string, dto: TaskRequest): Promise<SafeResult<DailyTask>>;
  toggleTask(id: string, date?: string): Promise<SafeResult<DailyTask>>;
  deleteTask(id: string): Promise<SafeResult<unknown>>;

  // Google Tasks mirroring — opt-in per connected account.
  getGoogleTasksStatus(): Promise<SafeResult<GoogleTasksStatus>>;
  enableGoogleTasks(email?: string): Promise<SafeResult<unknown>>;
  disableGoogleTasks(email?: string): Promise<SafeResult<unknown>>;
  syncGoogleTasks(email?: string): Promise<SafeResult<unknown>>;
  /** Debounced inbound pull; `applied > 0` means the local list is now stale. */
  refreshGoogleTasks(): Promise<SafeResult<GoogleTasksRefresh>>;
}

export const tasksService: TasksServiceInterface = {
  getTasks: (date) => instance.safeCall<DailyTask[]>(E.API_GET_TASKS, { query: { date } }),
  getTasksRange: (startDate, endDate) =>
    instance.safeCall<DailyTask[]>(E.API_GET_TASKS_RANGE, { query: { startDate, endDate } }),
  addTask: (dto) => instance.safeCall<DailyTask>(E.API_ADD_TASK, { body: dto }),
  updateTask: (id, dto) => instance.safeCall<DailyTask>(E.API_UPDATE_TASK, { params: { id }, body: dto }),
  toggleTask: (id, date) => instance.safeCall<DailyTask>(E.API_TOGGLE_TASK, { params: { id }, query: { date } }),
  deleteTask: (id) => instance.safeCall(E.API_DELETE_TASK, { params: { id } }),

  getGoogleTasksStatus: () => instance.safeCall<GoogleTasksStatus>(E.API_GOOGLE_TASKS_STATUS),
  enableGoogleTasks: (email) => instance.safeCall(E.API_GOOGLE_TASKS_ENABLE, { query: { email } }),
  disableGoogleTasks: (email) => instance.safeCall(E.API_GOOGLE_TASKS_DISABLE, { query: { email } }),
  syncGoogleTasks: (email) => instance.safeCall(E.API_GOOGLE_TASKS_SYNC, { query: { email } }),
  refreshGoogleTasks: () => instance.safeCall<GoogleTasksRefresh>(E.API_GOOGLE_TASKS_REFRESH),
};
