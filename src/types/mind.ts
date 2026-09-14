// Mind (mental wellness) domain types — single source of truth. Mirrors the
// `mind_entries` collection + MindController; UI constants live in
// features/mind/mind-types.ts.

export type MindEntryType =
  | 'THOUGHT'
  | 'WIN'
  | 'GRATITUDE'
  | 'AFFIRMATION'
  | 'REFLECTION'
  | 'INTENTION'
  | 'BREATH'
  | 'SPIRAL';

export type MindEntryStatus =
  | 'OPEN'
  | 'RESOLVED'
  | 'PARKED'
  | 'RELEASED'
  | 'CONVERTED'
  /** An intrusive thought that was noticed and let pass. Terminal — never returns to the inbox. */
  | 'NOTICED'
  /** A parked worry whose review date arrived and whose prediction is still unanswered. */
  | 'VERDICT_DUE';

export type MindValueTag = 'Coding' | 'Growth' | 'Calm' | 'Confidence' | 'Devotion' | 'Joy' | 'Fulfilment';

/**
 * The value tag stored on an entry: one of the defaults, or a tag the user added
 * themselves. `string & Record<never, never>` keeps editor autocomplete for the defaults.
 */
export type MindTag = MindValueTag | (string & Record<never, never>);

export type MindDistortionTag =
  | 'Catastrophizing'
  | 'Mind-reading'
  | 'All-or-nothing'
  | 'Fortune-telling'
  | 'Labeling';

/**
 * Which of the three handling lanes a thought was triaged into.
 *
 * This is the axis the UI branches on, and it matters more than it looks: a worry gets
 * better when it is examined and predicted, an intrusive thought gets worse. So the lane
 * — not the text — decides which actions are offered at all. Null means untriaged.
 */
export type MindLane = 'PROBLEM' | 'WORRY' | 'INTRUSIVE';

export type MindIntrusiveCategory = 'DOUBT' | 'HARM' | 'IMMORAL' | 'UNNAMED';
export type MindWorryOutcome = 'NOT_HAPPENED' | 'PARTLY' | 'HAPPENED';
export type MindWorrySeverity = 'BETTER' | 'AS_FEARED' | 'WORSE';

/** How a Home anchor (INTENTION) landed, once the user records it. */
export type MindAnchorOutcome = 'ACHIEVED' | 'PARTIAL' | 'MISSED';

/** A worry's feared outcome and predicted likelihood, plus the verdict once it is known. */
export interface MindWorryPrediction {
  fearedOutcome?: string | null;
  /** Gut-feel likelihood at park time, 0-100. */
  predictedProbability?: number | null;
  outcome?: MindWorryOutcome | null;
  severity?: MindWorrySeverity | null;
  recordedAt?: string | null;
}

/** Coarse metadata on an INTRUSIVE-lane entry. Deliberately shallow — detail invites rumination. */
export interface MindIntrusiveMeta {
  category?: MindIntrusiveCategory | null;
  /** 1-5. */
  intensity?: number | null;
  urgeWaitedSeconds?: number | null;
  urgeFaded?: boolean | null;
}

/** A completed or abandoned Spiral Breaker session. */
export interface MindSpiralLog {
  solvableIn24h?: boolean | null;
  returnedToTaskId?: string | null;
  durationSeconds?: number | null;
}

export interface MindEntry {
  id: string;
  type: MindEntryType;
  /**
   * Null when the entry is sealed — the backend strips it on every read except the
   * sealed archive, so never assume this is present on an INTRUSIVE-lane entry.
   */
  text: string | null;
  reframedText?: string | null;
  distortionTag?: MindDistortionTag | null;
  status: MindEntryStatus;
  linkedTaskId?: string | null;
  valueTag?: MindTag | null;
  pinned?: boolean;
  lane?: MindLane | null;
  /** True when `text` is withheld from normal reads. Render nothing in its place. */
  textSealed?: boolean;
  prediction?: MindWorryPrediction | null;
  intrusive?: MindIntrusiveMeta | null;
  spiral?: MindSpiralLog | null;
  reviewDate?: string | null;
  /** True once this entry has ever been PARKED — unlike reviewDate, this never clears on resurface. */
  wasParked?: boolean;
  /** INTENTION (Home anchor) only — freeform notes kept against the day's one thing. */
  note?: string | null;
  /** INTENTION only — how the anchor landed; null until the user records it. */
  outcome?: MindAnchorOutcome | null;
  date: string;
  createdAt?: string;
  resolvedAt?: string | null;
}

/**
 * The accumulating case against catastrophising: what the gut predicted against what
 * actually happened. Rates are null until at least one verdict exists — show an empty
 * state rather than inventing a reassuring 0%.
 */
export interface MindWorryLedger {
  totalPredicted: number;
  totalResolved: number;
  notHappened: number;
  partly: number;
  happened: number;
  meanPredictedProbability: number | null;
  /** 0-100. PARTLY counts as half an occurrence. */
  actualOccurrenceRate: number | null;
  copedBetter: number;
  copedAsFeared: number;
  copedWorse: number;
}

/** One day of mind activity next to the Life OS signals that plausibly move it. */
export interface MindLoopRadarDay {
  date: string;
  problems: number;
  worries: number;
  intrusive: number;
  untriaged: number;
  spirals: number;
  sleepHours: number | null;
  focusMinutes: number | null;
  tasksCompleted: number | null;
  workouts: number | null;
  moodScore: number | null;
}

export interface MindSummary {
  focusMinutes: number;
  tasksCompleted: number;
  workouts: number;
  learnings: number;
  streakDays: number;
  captured: number;
  converted: number;
  reframed: number;
  released: number;
  moodScore: number | null;
}

/** The per-day `daily_logs` document mood check-ins persist onto. */
export interface DailyLog {
  id?: string;
  date?: string;
  newLearnings?: string[];
  moodRating?: string;
  moodScore?: number | null;
  moodNote?: string | null;
}

// ── Request DTOs ──
export interface MindEntryPayload {
  text: string;
  type?: MindEntryType;
  valueTag?: MindTag | null;
  pinned?: boolean;
  date?: string;
  /** INTENTION only — freeform notes kept against the day's anchor. */
  note?: string | null;
  /** INTENTION only — send '' to clear. */
  outcome?: MindAnchorOutcome | '' | null;
}

export interface MindStatusPayload {
  status: MindEntryStatus;
  reviewDate?: string;
  reframedText?: string;
  distortionTag?: MindDistortionTag | null;
  pinned?: boolean;
}

/** Every field optional — the primary path is a single tap with an empty body. */
export interface MindNoticedPayload {
  text?: string;
  category?: MindIntrusiveCategory;
  intensity?: number;
  urgeWaitedSeconds?: number;
  urgeFaded?: boolean;
  date?: string;
}

export interface MindLanePayload {
  lane: MindLane;
}

export interface MindPredictionPayload {
  fearedOutcome?: string;
  predictedProbability?: number;
}

export interface MindVerdictPayload {
  outcome: MindWorryOutcome;
  severity?: MindWorrySeverity;
}

export interface MindSpiralPayload {
  solvableIn24h?: boolean;
  returnedToTaskId?: string;
  durationSeconds?: number;
  date?: string;
}
