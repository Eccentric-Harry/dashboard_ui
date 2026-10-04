// Goals domain types — single source of truth. Mirrors the Java Goal / GoalCheckIn models
// and GoalBoardResponse (dto/GoalBoardResponse.java). Every verdict on the board (hit,
// kept, pace, weeks kept) is derived server-side by util/GoalProgress.java; guest mode
// ports the same rules in mocks/guest-goals.ts.

/** An amount in a unit, or simply done. */
export type GoalMeasure = 'COUNT' | 'CHECK';
/** The period `target` applies to. */
export type GoalPeriod = 'DAY' | 'WEEK';
export type GoalStatus = 'ACTIVE' | 'ARCHIVED';
/** The candy palette a goal wears on /goals (validated server-side by GoalRequest). */
export type GoalColor = 'tangerine' | 'mint' | 'sky' | 'grape' | 'berry' | 'lemon' | 'teal';
/** A goal's own world, visited from the camp at /goals?world=<id> (features/goals/worlds/). */
export type GoalWorldKey = 'path';
/** What kind of practice a check-in was — The Quiet Path colours its stones by it. */
export type GoalPractice = 'breathe' | 'walk' | 'write' | 'still' | 'gratitude' | 'nature' | 'talk' | 'learn' | 'other';
/**
 * The current week's pace. `TIGHT` needs every open day; `OUT_OF_REACH` means this week
 * can't be kept any more — the UI says "next week's a clean page", never "failed".
 */
export type GoalPace = 'KEPT' | 'ON_PACE' | 'TIGHT' | 'BEHIND' | 'OUT_OF_REACH';

export interface Goal {
  id: string;
  title: string;
  /** Key into features/goals/goal-icons.ts; unknown keys fall back to a target. */
  icon?: string | null;
  /** Key into features/goals/goal-palette.ts; null → picked from board order. */
  color?: GoalColor | null;
  /** The goal's own world; null → a lantern at camp only. */
  world?: GoalWorldKey | null;
  measure: GoalMeasure;
  period: GoalPeriod;
  /** Per day (DAY) or per week (WEEK). CHECK + WEEK counts days. */
  target: number;
  /** COUNT only. */
  unit?: string | null;
  /** DAY only — hit days that keep the week. */
  daysPerWeek?: number | null;
  status: GoalStatus;
  /** YYYY-MM-DD. The week it falls in is prorated. */
  startDate: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalCheckIn {
  id: string;
  goalId: string;
  /** Local day, YYYY-MM-DD. */
  date: string;
  value: number;
  note?: string | null;
  practice?: GoalPractice | null;
  /** A guided session from a goal world's course (worlds/quiet-path/course.ts). */
  session?: string | null;
  minutes?: number | null;
  source: 'manual';
  createdAt?: string;
}

export interface GoalDayView {
  date: string;
  value: number;
  /** DAY goals only; WEEK goals have no per-day target. */
  target: number | null;
  /** DAY: reached the target. WEEK: anything logged today. */
  hit: boolean;
}

export interface GoalDayCell {
  date: string;
  value: number;
  hit: boolean;
  today: boolean;
  future: boolean;
  /** Before the goal existed — drawn, never judged. */
  beforeStart: boolean;
}

export interface GoalWeekView {
  /** Monday, YYYY-MM-DD. */
  weekStart: string;
  /** Hit days for day-counted goals; the sum for COUNT + WEEK. */
  value: number;
  /** What keeps the week (prorated in the start week). */
  target: number;
  kept: boolean;
  pace: GoalPace;
  /** Days still open this week, today included unless already hit. */
  daysLeft: number;
  /** COUNT + WEEK only: even share of what's left per open day; null once kept. */
  perDayToFinish: number | null;
  /** Monday → Sunday. */
  days: GoalDayCell[];
}

export interface GoalWeekResult {
  weekStart: string;
  value: number;
  target: number;
  kept: boolean;
}

export interface GoalProgressView {
  goal: Goal;
  today: GoalDayView;
  week: GoalWeekView;
  /** Completed weeks before this one, oldest first, at most 8. */
  history: GoalWeekResult[];
  /** Check-ins from the last 7 days (today included), oldest first — what can be undone. */
  recentEntries: GoalCheckIn[];
  /** Lifetime kept weeks — only grows. */
  weeksKept: number;
  /** Consecutive kept weeks ending last week, +1 once this week is kept. */
  weekStreak: number;
}

export interface GoalBoard {
  /** The day the board was judged for. */
  date: string;
  weekStart: string;
  goals: GoalProgressView[];
  /** The camp around the board (dto/CampView.java). */
  camp: CampView;
}

// ── The camp: sparks, the chest, Wren's quests, Fen's cart, the season map ──
// Derived by util/CampRules.java (guest mode: mocks/guest-goals.ts) from goals, check-ins
// and the user's goal_camps document. Sparks only ever come in by opening the chest or
// claiming a quest; only a purchase the user chooses spends them.

/** Where an item from Fen's cart goes. */
export type CampSlot = 'hat' | 'neck' | 'face' | 'decor';
export type CampWearSlot = Exclude<CampSlot, 'decor'>;

export interface CampSticker {
  /** The tier: 1, 4, 12, 26 or 52 kept weeks. */
  weeks: number;
  name: string;
  bonus: number;
}

export interface CampChestItem {
  goalId: string;
  title: string;
  icon?: string | null;
  color?: GoalColor | null;
  /** Kept weeks not yet paid out. */
  weeks: number;
  /** Sparks for them, sticker bonuses included. */
  sparks: number;
  stickers: CampSticker[];
}

export type CampQuestKind = 'light-n' | 'light-goal' | 'note' | 'early' | 'amount' | 'all';

export interface CampQuest {
  /** "yyyy-MM-dd:slot" — what a claim sends. */
  id: string;
  date: string;
  /** The UI writes the words (Wren's voice, camp-quests.ts). */
  kind: CampQuestKind;
  goalId?: string | null;
  goalTitle?: string | null;
  /** amount quests: how much, in `unit`. */
  amount?: number | null;
  unit?: string | null;
  progress: number;
  target: number;
  reward: number;
  done: boolean;
  claimed: boolean;
}

export type CampSeasonName = 'winter' | 'spring' | 'summer' | 'autumn';

export interface CampSeasonWeek {
  weekStart: string;
  /** Active goals that existed by this week. */
  goals: number;
  /** How many of them kept it (the current week counts once kept). */
  kept: number;
  current: boolean;
  future: boolean;
}

export interface CampSeason {
  /** "autumn-2026" */
  key: string;
  name: CampSeasonName;
  start: string;
  end: string;
  weeks: CampSeasonWeek[];
}

export interface CampView {
  /** Null means the default name, "Pip". */
  buddyName?: string | null;
  sparks: number;
  sparksEarned: number;
  owned: string[];
  equipped: Partial<Record<CampWearSlot, string>>;
  decor: string[];
  /** Where each meadow decoration stands, if it's been moved (else its default spot). */
  decorAt: Record<string, CampDecorSpot>;
  /** Empty means there's nothing in the chest right now. */
  chest: CampChestItem[];
  quests: CampQuest[];
  /** Yesterday's done-but-unclaimed quests, still claimable today. */
  questsYesterday: CampQuest[];
  season: CampSeason;
  /** Lifetime kept weeks the buddy grows from — never shrinks when a goal is archived. */
  grownWeeks: number;
}

export interface CampChestOpenResult {
  /** Empty when another tab opened it first. */
  opened: CampChestItem[];
  sparks: number;
  camp: CampView;
}

export interface CampQuestClaimResult {
  /** 0 when it was already claimed. */
  reward: number;
  camp: CampView;
}

/** A spot in the camp's meadow: fractions (0–1) across its width and down its depth. */
export interface CampDecorSpot {
  x: number;
  y: number;
}

export interface CampLookPayload {
  buddyName?: string | null;
  equipped: Partial<Record<CampWearSlot, string>>;
  decor: string[];
  /** Omitted keeps the current spots; spots for decorations not out are dropped. */
  decorAt?: Record<string, CampDecorSpot>;
}

export interface GoalPayload {
  title: string;
  icon?: string;
  color?: GoalColor;
  /** Omit or '' for camp only. */
  world?: GoalWorldKey | '';
  measure: GoalMeasure;
  period: GoalPeriod;
  target: number;
  unit?: string;
  daysPerWeek?: number;
  startDate?: string;
}

export interface GoalCheckInPayload {
  date: string;
  /** COUNT goals only. */
  value?: number;
  note?: string;
  practice?: GoalPractice;
  session?: string;
  /** 1–240, for sessions and timed practices. */
  minutes?: number;
}

/** A goal's journey (dto/GoalJourneyResponse.java): every day it was tended, oldest first. */
export interface GoalJourneyDay {
  date: string;
  entries: number;
  /** Summed value — minutes, for a goal counted in minutes. */
  value: number;
  practices: GoalPractice[];
  notes: string[];
  /** Guided sessions done that day, in order (replays kept). */
  sessions: string[];
  minutes: number;
}

export interface GoalJourney {
  goalId: string;
  date: string;
  /** Only days with progress — a journey never records a gap. */
  days: GoalJourneyDay[];
  /** What's been packed in the world's kit, by page key (worlds/quiet-path/kit.ts). */
  kit?: GoalKit;
}

/** One page of a goal world's kit (GoalKit.Page on the server). */
export interface GoalKitPage {
  /** Suggestions picked, in the order picked. */
  picks: string[];
  /** The user's own words, by field key. */
  fields: Record<string, string>;
  updatedAt?: string;
}

export type GoalKit = Record<string, GoalKitPage>;

/** PUT /goals/{id}/kit/{page} — empty picks and fields clear the page. */
export interface GoalKitPagePayload {
  picks: string[];
  fields: Record<string, string>;
}
