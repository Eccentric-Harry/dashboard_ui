// Goals store — the /goals board. The route loads it once; every mutation goes through
// goalsService in the component and hands the server's freshly judged row back through
// applyGoal, so one check-in never re-reads the whole board.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { requestAndSet, createSelectors, remoteStateWith, type RemoteDataStatus } from './zustand-utils';
import { goalsService } from '../services/goals-service';
import type { CampView, GoalBoard, GoalProgressView } from '../types/goals';

interface GoalsState {
  board: RemoteDataStatus<GoalBoard | null>;
}

interface GoalsActions {
  actions: {
    loadBoard: (today: string) => Promise<void>;
    /** Swap in one goal's server-judged row (appending it when it is new). */
    applyGoal: (view: GoalProgressView) => void;
    /** Drop a goal from the board — archived or deleted. */
    removeGoal: (id: string) => void;
    /** Swap in the camp (sparks, chest, quests, look) after a camp call or a progress change. */
    applyCamp: (camp: CampView) => void;
    /** Re-read just the camp — quests and the chest move as progress is logged. */
    refreshCamp: (today: string) => Promise<void>;
  };
}

type GoalsStore = GoalsState & GoalsActions;

const initialState: GoalsState = {
  board: remoteStateWith<GoalBoard | null>(null),
};

const useGoalsStoreBase = create<GoalsStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        loadBoard: async (today) => {
          await requestAndSet<GoalsStore, 'board'>('board', () => goalsService.getBoard(today), set);
        },
        applyGoal: (view) =>
          set((state) => {
            const board = state.board.data;
            if (!board) return;
            const i = board.goals.findIndex((g) => g.goal.id === view.goal.id);
            if (i === -1) board.goals.push(view);
            else board.goals[i] = view;
          }),
        removeGoal: (id) =>
          set((state) => {
            const board = state.board.data;
            if (!board) return;
            board.goals = board.goals.filter((g) => g.goal.id !== id);
          }),
        applyCamp: (camp) =>
          set((state) => {
            if (state.board.data) state.board.data.camp = camp;
          }),
        refreshCamp: async (today) => {
          const res = await goalsService.getCamp(today);
          if (res.data) {
            const camp = res.data;
            set((state) => {
              if (state.board.data) state.board.data.camp = camp;
            });
          }
        },
      },
    })),
    { name: 'GoalsStore' },
  ),
);

export const useGoalsStore = createSelectors(useGoalsStoreBase);
export const goalsActions = useGoalsStore.getState().actions;
