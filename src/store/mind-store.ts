// Mind store. Holds the heavily-optimistic entries/summary/mood as plain shared
// state (the view drives its own load + seed fallback). `setEntries` mirrors the
// React setState signature so the component's optimistic call sites migrate by a
// simple rename.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './zustand-utils';
import type { MindEntry, MindSummary, MindWorryLedger, MindLoopRadarDay } from '../types/mind';

interface MindState {
  entries: MindEntry[];
  summary: MindSummary | null;
  mood: number | null;
  worryLedger: MindWorryLedger | null;
  loopRadar: MindLoopRadarDay[];
  /**
   * Sealed entry text, loaded only when the user deliberately opens the archive and
   * cleared the moment they leave it. Held apart from `entries` so no ordinary render
   * path can reach it by accident.
   */
  sealedEntries: MindEntry[] | null;
}

interface MindActions {
  actions: {
    setEntries: (updater: MindEntry[] | ((prev: MindEntry[]) => MindEntry[])) => void;
    setSummary: (summary: MindSummary | null) => void;
    setMood: (mood: number | null) => void;
    setWorryLedger: (ledger: MindWorryLedger | null) => void;
    setLoopRadar: (days: MindLoopRadarDay[]) => void;
    setSealedEntries: (entries: MindEntry[] | null) => void;
  };
}

type MindStore = MindState & MindActions;

const useMindStoreBase = create<MindStore>()(
  devtools(
    immer((set) => ({
      entries: [],
      summary: null,
      mood: null,
      worryLedger: null,
      loopRadar: [],
      sealedEntries: null,
      actions: {
        setEntries: (updater) =>
          set((s) => {
            s.entries = typeof updater === 'function' ? updater(s.entries) : updater;
          }),
        setSummary: (summary) =>
          set((s) => {
            s.summary = summary;
          }),
        setMood: (mood) =>
          set((s) => {
            s.mood = mood;
          }),
        setWorryLedger: (ledger) =>
          set((s) => {
            s.worryLedger = ledger;
          }),
        setLoopRadar: (days) =>
          set((s) => {
            s.loopRadar = days;
          }),
        setSealedEntries: (entries) =>
          set((s) => {
            s.sealedEntries = entries;
          }),
      },
    })),
    { name: 'MindStore' },
  ),
);

export const useMindStore = createSelectors(useMindStoreBase);

/** Stable module-level handle to the store actions — safe to call from anywhere
 * (including inside useCallback bodies) without listing it as a dependency. */
export const mindActions = useMindStoreBase.getState().actions;
