// Tasks store. Holds the raw task list; the dashboard sorts/filters in memos.
// Optimistic UI (toggle/delete/update) goes through `applyTasks`; the actual
// network mutations stay in the component (lib/api) then call `reloadTasks`.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  emptyRemoteStateWithArray,
  type RemoteDataStatus,
} from './zustand-utils';
import { tasksService } from '../services/tasks-service';
import type { DailyTask } from '../types/tasks';

interface TasksState {
  tasks: RemoteDataStatus<DailyTask[]>;
}

interface TasksActions {
  actions: {
    /** Initial / explicit load with the loading flag. */
    loadTasks: () => Promise<void>;
    /** Silent re-sync after a mutation (no skeleton). Keeps prior data on error. */
    reloadTasks: () => Promise<void>;
    /** Optimistic in-place update of the task list. */
    applyTasks: (updater: (prev: DailyTask[]) => DailyTask[]) => void;
  };
}

type TasksStore = TasksState & TasksActions;

const initialState: TasksState = {
  tasks: emptyRemoteStateWithArray<DailyTask>(),
};

const useTasksStoreBase = create<TasksStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadTasks: async () => {
          await requestAndSet<TasksStore, 'tasks'>('tasks', tasksService.getTasks, set);
        },
        reloadTasks: async () => {
          const res = await tasksService.getTasks();
          if (!res.error) {
            set((state) => {
              state.tasks.data = res.data ?? [];
              state.tasks.loaded = true;
            });
          }
        },
        applyTasks: (updater) =>
          set((state) => {
            state.tasks.data = updater(state.tasks.data);
          }),
      },
    })),
    { name: 'TasksStore' },
  ),
);

export const useTasksStore = createSelectors(useTasksStoreBase);
