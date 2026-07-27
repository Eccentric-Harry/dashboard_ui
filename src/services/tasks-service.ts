// Strictly-typed Tasks service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { DailyTask, TaskRequest } from '../types/tasks';
import * as E from './endpoints/tasks-endpoints';

export interface TasksServiceInterface {
  getTasks(date?: string): Promise<SafeResult<DailyTask[]>>;
  getTasksRange(startDate: string, endDate: string): Promise<SafeResult<DailyTask[]>>;
  addTask(dto: TaskRequest): Promise<SafeResult<DailyTask>>;
  updateTask(id: string, dto: TaskRequest): Promise<SafeResult<DailyTask>>;
  toggleTask(id: string, date?: string): Promise<SafeResult<DailyTask>>;
  deleteTask(id: string): Promise<SafeResult<unknown>>;
}

export const tasksService: TasksServiceInterface = {
  getTasks: (date) => instance.safeCall<DailyTask[]>(E.API_GET_TASKS, { query: { date } }),
  getTasksRange: (startDate, endDate) =>
    instance.safeCall<DailyTask[]>(E.API_GET_TASKS_RANGE, { query: { startDate, endDate } }),
  addTask: (dto) => instance.safeCall<DailyTask>(E.API_ADD_TASK, { body: dto }),
  updateTask: (id, dto) => instance.safeCall<DailyTask>(E.API_UPDATE_TASK, { params: { id }, body: dto }),
  toggleTask: (id, date) => instance.safeCall<DailyTask>(E.API_TOGGLE_TASK, { params: { id }, query: { date } }),
  deleteTask: (id) => instance.safeCall(E.API_DELETE_TASK, { params: { id } }),
};
