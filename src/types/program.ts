// Program domain types — single source of truth for /goals' Lighthouse world ("90 days to
// 23", design/LIGHTHOUSE_90_PLAN.md). Mirrors the Java Program / ProgramLog / ProgramReview /
// ProgramAssessment / ProgramMedia models and ProgramStateResponse. The server stores and
// scores; every judged view (day, phase, statuses, consistency, the screen cap, Pip's line)
// is derived client-side by features/goals/lighthouse/program-engine.ts.

/** Track keys are forever — rename a label in program-content.ts, never a key. */
export type ProgramTrackKey = 'run' | 'lift' | 'protein' | 'mood' | 'learn' | 'english' | 'screen' | 'regard';
/** FULL: the full version. MIN: the bad-day version — still done. REST: a planned rest day. */
export type ProgramLevel = 'FULL' | 'MIN' | 'REST';
export type ProgramLetterKey = 'to23' | 'from23' | 'to24';
export type ProgramAssessmentType = 'ROSENBERG' | 'WHO5' | 'BODY';
export type ProgramMediaKind = 'PHOTO' | 'AUDIO';
export type ProgramMediaLabel = 'front' | 'side' | 'speech';
export type LiftPlace = 'gym' | 'home';

export interface ProgramTrack {
  key: ProgramTrackKey;
  /** Per week (run, lift, learn), grams (protein), minutes (english), a cap (screen; null = from the audit week), per day (regard). */
  target?: number | null;
  /** The bad-day floor, where the track has a number for it. */
  floor?: number | null;
  /** The user's if-then plan. */
  plan?: string | null;
  /** Started before its scheduled day ("Start it now"): on from this date. */
  openedOn?: string | null;
}

export interface ProgramLetter {
  /** True until `opensOn`; the server then withholds `text`. */
  sealed: boolean;
  opensOn?: string | null;
  writtenAt?: string | null;
  text?: string | null;
  length: number;
}

export interface Program {
  id: string;
  title: string;
  status: 'ACTIVE' | 'ENDED';
  /** Day 1, YYYY-MM-DD. */
  startDate: string;
  /** The last day, inclusive. */
  endDate: string;
  birthday?: string | null;
  weightKg?: number | null;
  liftPlace?: LiftPlace | null;
  tracks: ProgramTrack[];
  answers: Record<string, string>;
  letters: Partial<Record<ProgramLetterKey, ProgramLetter>>;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiftSet {
  exercise: string;
  /** 0 for bodyweight. */
  weightKg?: number | null;
  reps?: number | null;
}

export interface ProgramLog {
  id: string;
  programId: string;
  track: ProgramTrackKey;
  /** Local day, YYYY-MM-DD (04:00 rollover). */
  date: string;
  /** Null for evidence that isn't a completion: an urge ridden out, a meeting stretch. */
  level?: ProgramLevel | null;
  /** Screen minutes, mood 1–5, protein grams, speaking minutes. */
  value?: number | null;
  minutes?: number | null;
  distanceKm?: number | null;
  feel?: number | null;
  sets?: LiftSet[] | null;
  /** A mood word, or work/home for Learn. */
  tag?: string | null;
  note?: string | null;
  /** Self-regard: the promise kept. Learn: the takeaway. */
  text?: string | null;
  /** Self-regard: the kind sentence. */
  kind?: string | null;
  pursuitId?: string | null;
  /** c25k-3-2, lift-a, lift-b… */
  session?: string | null;
  urge?: boolean | null;
  morningRule?: boolean | null;
  nightRule?: boolean | null;
  stretch?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgramTargetChange {
  track: ProgramTrackKey;
  fromTarget?: number | null;
  toTarget?: number | null;
  fromFloor?: number | null;
  toFloor?: number | null;
}

export interface ProgramReview {
  id: string;
  programId: string;
  /** Monday. */
  weekStart: string;
  /** "I trust myself to do what I say I will", 1–10. */
  selfTrust: number;
  win?: string | null;
  obstacle?: string | null;
  adjustment?: string | null;
  ifThen?: string | null;
  changes: ProgramTargetChange[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgramAssessment {
  id: string;
  programId: string;
  date: string;
  type: ProgramAssessmentType;
  /** As answered — Rosenberg 0–3 agreement, WHO-5 0–5. */
  answers?: number[] | null;
  /** Rosenberg 0–30, WHO-5 0–100; null for BODY. */
  score?: number | null;
  weightKg?: number | null;
  waistCm?: number | null;
  mediaIds?: string[] | null;
  note?: string | null;
  createdAt?: string;
}

export interface ProgramMedia {
  id: string;
  kind: ProgramMediaKind;
  label: ProgramMediaLabel;
  date: string;
  mime: string;
  bytes?: number | null;
  durationSec?: number | null;
  createdAt?: string;
  /** Only when one item is fetched (GET /program/{id}/media/{mediaId}). */
  dataUrl?: string | null;
}

export interface ProgramRunDay {
  count: number;
  km: number;
  minutes: number;
}

/** Other routes' data for the program's days. A day missing from a map is unknown, never zero. */
export interface ProgramSources {
  protein: Record<string, number>;
  proteinGoal?: number | null;
  sleep: Record<string, number>;
  mood: Record<string, number>;
  runs: Record<string, ProgramRunDay>;
  focus: Record<string, number>;
  profileWeightKg?: number | null;
}

export interface ProgramState {
  /** Null until a program begins. */
  program: Program | null;
  logs: ProgramLog[];
  reviews: ProgramReview[];
  assessments: ProgramAssessment[];
  media: ProgramMedia[];
  sources: ProgramSources;
}

// ── Request payloads ──

export interface ProgramStartPayload {
  title?: string;
  startDate: string;
  endDate?: string;
  birthday?: string;
  weightKg?: number;
  liftPlace?: LiftPlace;
  answers?: Record<string, string>;
}

export interface ProgramSettingsPayload {
  title?: string;
  startDate?: string;
  birthday?: string;
  weightKg?: number;
  liftPlace?: LiftPlace;
  answers?: Record<string, string>;
  /** Track key → if-then plan; '' clears it. */
  plans?: Partial<Record<ProgramTrackKey, string>>;
  /** Track key → the date it starts early; '' puts it back on the schedule. */
  opens?: Partial<Record<ProgramTrackKey, string>>;
}

export type ProgramLogPayload = Omit<ProgramLog, 'id' | 'programId' | 'createdAt' | 'updatedAt'>;

export interface ProgramTargetEdit {
  target?: number | null;
  floor?: number | null;
  /** Screen only: back to the cap derived from the audit week. */
  auto?: boolean;
}

export interface ProgramReviewPayload {
  selfTrust: number;
  win?: string;
  obstacle?: string;
  adjustment?: string;
  ifThen?: string;
  targets?: Partial<Record<ProgramTrackKey, ProgramTargetEdit>>;
}

export interface ProgramReviewResult {
  review: ProgramReview;
  program: Program;
}

export interface ProgramAssessmentPayload {
  type: ProgramAssessmentType;
  date: string;
  answers?: number[];
  weightKg?: number;
  waistCm?: number;
  mediaIds?: string[];
  note?: string;
}

export interface ProgramMediaPayload {
  kind: ProgramMediaKind;
  label: ProgramMediaLabel;
  date: string;
  /** data:<mime>;base64,… */
  dataUrl: string;
  durationSec?: number;
}
