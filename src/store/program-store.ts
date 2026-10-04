// Program store — The Lighthouse on /goals ("90 days to 23"). The world loads the whole
// state once; every write goes through programService in the component and hands the one
// changed thing back through an apply* action, so a log never re-reads the program.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { requestAndSet, createSelectors, remoteStateWith, type RemoteDataStatus } from './zustand-utils';
import { programService } from '../services/program-service';
import type { Program, ProgramAssessment, ProgramLog, ProgramMedia, ProgramReview, ProgramState } from '../types/program';

interface ProgramStoreState {
  state: RemoteDataStatus<ProgramState | null>;
  /** Photos and recordings fetched this session, by media id (data: URLs). */
  mediaData: Record<string, string>;
}

interface ProgramStoreActions {
  actions: {
    load: (today: string) => Promise<void>;
    applyProgram: (program: Program | null) => void;
    applyLog: (log: ProgramLog) => void;
    removeLog: (id: string) => void;
    applyReview: (review: ProgramReview) => void;
    applyAssessment: (assessment: ProgramAssessment) => void;
    removeAssessment: (id: string) => void;
    applyMedia: (media: ProgramMedia) => void;
    removeMedia: (id: string) => void;
    cacheMedia: (id: string, dataUrl: string) => void;
  };
}

type ProgramStore = ProgramStoreState & ProgramStoreActions;

const initialState: ProgramStoreState = {
  state: remoteStateWith<ProgramState | null>(null),
  mediaData: {},
};

const byDate = <T extends { date: string; createdAt?: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '');

const useProgramStoreBase = create<ProgramStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      actions: {
        load: async (today) => {
          await requestAndSet<ProgramStore, 'state'>('state', () => programService.getState(today), set);
        },
        applyProgram: (program) =>
          set((s) => {
            if (!s.state.data) return;
            if (!program) {
              s.state.data = { ...s.state.data, program: null, logs: [], reviews: [], assessments: [], media: [] };
              s.mediaData = {};
              return;
            }
            s.state.data.program = program;
          }),
        applyLog: (log) =>
          set((s) => {
            const data = s.state.data;
            if (!data) return;
            const i = data.logs.findIndex((l) => l.id === log.id);
            if (i === -1) data.logs.push(log);
            else data.logs[i] = log;
            data.logs.sort(byDate);
          }),
        removeLog: (id) =>
          set((s) => {
            if (s.state.data) s.state.data.logs = s.state.data.logs.filter((l) => l.id !== id);
          }),
        applyReview: (review) =>
          set((s) => {
            const data = s.state.data;
            if (!data) return;
            const i = data.reviews.findIndex((r) => r.weekStart === review.weekStart);
            if (i === -1) data.reviews.push(review);
            else data.reviews[i] = review;
            data.reviews.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
          }),
        applyAssessment: (assessment) =>
          set((s) => {
            const data = s.state.data;
            if (!data) return;
            data.assessments = [...data.assessments.filter((a) => a.id !== assessment.id), assessment].sort(byDate);
          }),
        removeAssessment: (id) =>
          set((s) => {
            if (s.state.data) s.state.data.assessments = s.state.data.assessments.filter((a) => a.id !== id);
          }),
        applyMedia: (media) =>
          set((s) => {
            const data = s.state.data;
            if (!data) return;
            const { dataUrl, ...meta } = media;
            data.media = [...data.media.filter((m) => m.id !== media.id), meta].sort(byDate);
            if (dataUrl) s.mediaData[media.id] = dataUrl;
          }),
        removeMedia: (id) =>
          set((s) => {
            if (s.state.data) s.state.data.media = s.state.data.media.filter((m) => m.id !== id);
            delete s.mediaData[id];
          }),
        cacheMedia: (id, dataUrl) =>
          set((s) => {
            s.mediaData[id] = dataUrl;
          }),
      },
    })),
    { name: 'ProgramStore' },
  ),
);

export const useProgramStore = createSelectors(useProgramStoreBase);
export const programActions = useProgramStore.getState().actions;
