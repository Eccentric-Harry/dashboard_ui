// Guest-mode goals API: the in-memory mirror of GoalController and GoalCampController.
// `evaluateGoal` is a line-for-line port of the backend's util/GoalProgress.java, and the
// camp section ports util/CampRules.java — the server is the source of truth, so a rule
// changed there must change here too (GoalProgressTest and CampRulesTest pin the cases).
// Pure over module state — `resolveGuestGoals` returns null for anything it doesn't own.

import { localToday } from '@/lib/finance-ledger';
import type {
  CampChestItem,
  CampFirstLight,
  CampFirstLightPayload,
  CampQuest,
  CampQuestKind,
  CampSeason,
  CampSeasonName,
  CampSeasonWeek,
  CampSticker,
  CampView,
  CampDecorSpot,
  CampWearSlot,
  Goal,
  GoalBoard,
  GoalCheckIn,
  GoalJourneyDay,
  GoalKit,
  GoalKitPage,
  GoalPractice,
  GoalDayCell,
  GoalPace,
  GoalPayload,
  GoalProgressView,
  GoalWeekResult,
  GoalWeekView,
} from '@/types/goals';

interface Response {
  status: number;
  body: unknown;
}

const ok = (data: unknown): Response => ({ status: 200, body: { data } });
const bad = (message: string): Response => ({ status: 400, body: { message } });

const MAX_ACTIVE_GOALS = 8;
const HISTORY_WEEKS = 8;
const RECENT_DAYS = 7;
const EPSILON = 1e-9;

// ── Date helpers over YYYY-MM-DD, in UTC so no local offset can shift a day ──

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => fromUtc(toUtc(iso) + days * 86_400_000);
const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
const weekStartOf = (iso: string) => addDays(iso, -((new Date(toUtc(iso)).getUTCDay() + 6) % 7));
const later = (a: string, b: string) => (a > b ? a : b);

// ── The rules (port of GoalProgress.java) ───────────────────────────────

const isDayPeriod = (g: Goal) => g.period === 'DAY';
const countsDays = (g: Goal) => isDayPeriod(g) || g.measure !== 'COUNT';
const isDayHit = (g: Goal, value: number) => (isDayPeriod(g) ? value + EPSILON >= g.target : value > EPSILON);
const isKept = (value: number, target: number) => target > EPSILON && value + EPSILON >= target;

function effectiveTarget(g: Goal, ws: string, start: string): number {
  const from = later(ws, start);
  const available = Math.max(0, daysBetween(from, addDays(ws, 6)) + 1);
  const base = isDayPeriod(g) ? (g.daysPerWeek ?? 7) : g.target;
  if (available >= 7) return base;
  if (countsDays(g)) return Math.min(available, Math.max(1, Math.round((base * available) / 7)));
  return (base * available) / 7;
}

function weekValue(g: Goal, sums: Map<string, number>, ws: string, start: string, until: string): number {
  let total = 0;
  const end = addDays(ws, 6);
  for (let d = later(ws, start); d <= until && d <= end; d = addDays(d, 1)) {
    const v = sums.get(d) ?? 0;
    total += countsDays(g) ? (isDayHit(g, v) ? 1 : 0) : v;
  }
  return total;
}

export function evaluateGoal(goal: Goal, checkIns: GoalCheckIn[], today: string): GoalProgressView {
  const sums = new Map<string, number>();
  for (const c of checkIns) sums.set(c.date, (sums.get(c.date) ?? 0) + c.value);

  const start = goal.startDate && goal.startDate <= today ? goal.startDate : today;
  const thisWeek = weekStartOf(today);

  const past: GoalWeekResult[] = [];
  for (let ws = weekStartOf(start); ws < thisWeek; ws = addDays(ws, 7)) {
    const target = effectiveTarget(goal, ws, start);
    const value = weekValue(goal, sums, ws, start, addDays(ws, 6));
    past.push({ weekStart: ws, value, target, kept: isKept(value, target) });
  }

  // Current week.
  const we = addDays(thisWeek, 6);
  const target = effectiveTarget(goal, thisWeek, start);
  const value = weekValue(goal, sums, thisWeek, start, today);
  const kept = isKept(value, target);
  const todayHit = isDayHit(goal, sums.get(today) ?? 0);

  const days: GoalDayCell[] = [];
  for (let d = thisWeek; d <= we; d = addDays(d, 1)) {
    const v = sums.get(d) ?? 0;
    days.push({ date: d, value: v, hit: isDayHit(goal, v), today: d === today, future: d > today, beforeStart: d < start });
  }

  const firstOpen = later(todayHit && countsDays(goal) ? addDays(today, 1) : today, start);
  const daysLeft = firstOpen > we ? 0 : daysBetween(firstOpen, we) + 1;

  let pace: GoalPace;
  let perDayToFinish: number | null = null;
  if (kept) {
    pace = 'KEPT';
  } else if (countsDays(goal)) {
    const need = Math.ceil(target - value - EPSILON);
    pace = need > daysLeft ? 'OUT_OF_REACH' : need === daysLeft ? 'TIGHT' : 'ON_PACE';
  } else {
    const from = later(thisWeek, start);
    const available = daysBetween(from, we) + 1;
    const elapsed = Math.max(0, daysBetween(from, today));
    const expected = (target * elapsed) / available;
    pace = value + EPSILON >= expected ? 'ON_PACE' : 'BEHIND';
    perDayToFinish = (target - value) / Math.max(1, daysLeft);
  }

  const week: GoalWeekView = { weekStart: thisWeek, value, target, kept, pace, daysLeft, perDayToFinish, days };

  let weekStreak = 0;
  for (let i = past.length - 1; i >= 0 && past[i].kept; i--) weekStreak++;
  let weeksKept = past.filter((w) => w.kept).length;
  if (kept) {
    weekStreak++;
    weeksKept++;
  }

  const todayValue = sums.get(today) ?? 0;
  return {
    goal,
    today: {
      date: today,
      value: todayValue,
      target: isDayPeriod(goal) ? goal.target : null,
      hit: isDayHit(goal, todayValue),
    },
    week,
    history: past.slice(Math.max(0, past.length - HISTORY_WEEKS)),
    recentEntries: checkIns
      .filter((c) => c.date >= addDays(today, -(RECENT_DAYS - 1)) && c.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    weeksKept,
    weekStreak,
  };
}

// ── Seed: four goals with a believable, imperfect six weeks behind them ──

const seedToday = localToday();
const seedWeek = weekStartOf(seedToday);
let seq = 0;
const nextId = (prefix: string) => `${prefix}-guest-${Date.now().toString(36)}-${++seq}`;

let goals: Goal[] = [
  { id: 'goal-guest-read', title: 'Read', icon: 'book', color: 'tangerine', measure: 'COUNT', period: 'DAY', target: 10, unit: 'pages', daysPerWeek: 5, status: 'ACTIVE', startDate: addDays(seedWeek, -42), order: 0 },
  { id: 'goal-guest-move', title: 'Move', icon: 'dumbbell', color: 'mint', measure: 'CHECK', period: 'WEEK', target: 3, unit: null, daysPerWeek: null, status: 'ACTIVE', startDate: addDays(seedWeek, -35), order: 1 },
  { id: 'goal-guest-learn', title: 'Deep learning', icon: 'graduation', color: 'grape', measure: 'COUNT', period: 'WEEK', target: 420, unit: 'min', daysPerWeek: null, status: 'ACTIVE', startDate: addDays(seedWeek, -28), order: 2 },
  { id: 'goal-guest-calm', title: 'Mental peace', icon: 'leaf', color: 'sky', world: 'path', measure: 'CHECK', period: 'DAY', target: 1, unit: null, daysPerWeek: 4, status: 'ACTIVE', startDate: addDays(seedWeek, -38), order: 3 },
];

// Deterministic "randomness" so every guest sees the same history.
const wobble = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function seedCheckIns(): GoalCheckIn[] {
  const rows: GoalCheckIn[] = [];
  const push = (goalId: string, date: string, value: number, practice: GoalPractice | null = null, note: string | null = null, session: string | null = null, minutes: number | null = null) => {
    if (date >= seedToday) return; // today stays open for the guest to log
    rows.push({ id: nextId('checkin'), goalId, date, value, note, practice, session, minutes, source: 'manual', createdAt: `${date}T14:00:00.000Z` });
  };
  // The first stretch of the Quiet Path's course, walked one a day (worlds/quiet-path/course.ts):
  // the trailhead's story, practices and kit page, then the birch wood up to its satchel and beyond.
  const COURSE_START: [string, GoalPractice, number][] = [
    ['story-arriving', 'learn', 2], ['arrive', 'still', 3], ['three-sounds', 'still', 4], ['kind-pause', 'still', 3],
    ['coming-back', 'still', 5], ['kit-signs', 'write', 2], ['story-breath', 'learn', 2], ['long-exhale', 'breathe', 3],
    ['box-breath', 'breathe', 4], ['slow-even', 'breathe', 4],
  ]
  let walked = 0
  const PRACTICES: GoalPractice[] = ['breathe', 'walk', 'still', 'breathe', 'write', 'nature', 'gratitude', 'breathe', 'talk']
  const NOTES = ['A slow walk after lunch', 'Long exhales on the balcony', null, 'Wrote three lines before bed', null, null]
  goals.forEach((g, gi) => {
    for (let d = g.startDate; d < seedToday; d = addDays(d, 1)) {
      const r = wobble(toUtc(d) / 86_400_000 + gi * 101);
      // One rough week in the middle, so the record isn't a wall of green.
      const roughWeek = weekStartOf(d) === addDays(seedWeek, -21);
      if (g.id === 'goal-guest-read' && r > (roughWeek ? 0.8 : 0.25)) push(g.id, d, r > 0.9 ? 6 : 8 + Math.round(r * 14));
      if (g.id === 'goal-guest-move' && r > (roughWeek ? 0.9 : 0.55)) push(g.id, d, 1);
      if (g.id === 'goal-guest-learn' && r > 0.3) push(g.id, d, 30 + Math.round(r * 60));
      if (g.id === 'goal-guest-calm' && r > (roughWeek ? 0.85 : 0.4)) {
        const k = Math.floor(r * 1000)
        // Every other tended day walks the next session; the rest are other practices.
        const session = k % 2 === 0 && walked < COURSE_START.length ? COURSE_START[walked++] : null
        if (session) push(g.id, d, 1, session[1], NOTES[k % NOTES.length], session[0], session[2])
        else push(g.id, d, 1, PRACTICES[k % PRACTICES.length], NOTES[k % NOTES.length])
      }
    }
  });
  return rows;
}

let checkIns: GoalCheckIn[] = seedCheckIns();

// A goal world's kit (port of GoalKitService): goalId → page → what's on it.
const kits: Record<string, GoalKit> = {
  'goal-guest-calm': {
    signs: { picks: ['Tight shoulders', 'Racing thoughts', 'Scrolling more'], fields: { own: 'I stop replying to messages' }, updatedAt: `${addDays(seedToday, -5)}T20:00:00.000Z` },
  },
};


// ── The camp (port of CampRules.java + GoalCampService) ────────────────

const SPARKS_PER_KEPT_WEEK = 10;
const STICKER_TIERS: CampSticker[] = [
  { weeks: 1, name: 'First week', bonus: 5 },
  { weeks: 4, name: 'A month strong', bonus: 15 },
  { weeks: 12, name: 'A whole season', bonus: 40 },
  { weeks: 26, name: 'Half a year', bonus: 80 },
  { weeks: 52, name: 'A full year', bonus: 150 },
];
const WEAR_SLOTS = ['hat', 'neck', 'face'] as const;
const ITEMS: { id: string; slot: string; price: number }[] = [
  { id: 'acorn-cap', slot: 'hat', price: 30 },
  { id: 'party-hat', slot: 'hat', price: 40 },
  { id: 'beanie', slot: 'hat', price: 55 },
  { id: 'straw-hat', slot: 'hat', price: 70 },
  { id: 'flower-crown', slot: 'hat', price: 90 },
  { id: 'wizard-hat', slot: 'hat', price: 160 },
  { id: 'crown', slot: 'hat', price: 260 },
  { id: 'bow-tie', slot: 'neck', price: 35 },
  { id: 'bandana', slot: 'neck', price: 45 },
  { id: 'scarf', slot: 'neck', price: 50 },
  { id: 'round-glasses', slot: 'face', price: 60 },
  { id: 'star-shades', slot: 'face', price: 90 },
  { id: 'flower-bed', slot: 'decor', price: 50 },
  { id: 'bunting', slot: 'decor', price: 60 },
  { id: 'mushroom-lamps', slot: 'decor', price: 80 },
  { id: 'fairy-lights', slot: 'decor', price: 100 },
  { id: 'guitar', slot: 'decor', price: 120 },
  { id: 'telescope', slot: 'decor', price: 180 },
  { id: 'headphones', slot: 'hat', price: 85 },
  { id: 'bucket-hat', slot: 'hat', price: 65 },
  { id: 'flower-lei', slot: 'neck', price: 60 },
  { id: 'medal', slot: 'neck', price: 110 },
  { id: 'heart-shades', slot: 'face', price: 80 },
  { id: 'lamp-post', slot: 'decor', price: 90 },
  { id: 'pumpkins', slot: 'decor', price: 55 },
  { id: 'pinwheel', slot: 'decor', price: 45 },
  { id: 'birdhouse', slot: 'decor', price: 75 },
  { id: 'pond', slot: 'decor', price: 140 },
  { id: 'picnic', slot: 'decor', price: 95 },
  { id: 'signpost', slot: 'decor', price: 70 },
  { id: 'cherry-tree', slot: 'decor', price: 220 },
  { id: 'night-cap', slot: 'hat', price: 75 },
  { id: 'keeper-cap', slot: 'hat', price: 140 },
  { id: 'star-scarf', slot: 'neck', price: 70 },
  { id: 'moon-monocle', slot: 'face', price: 95 },
];

/** Java's String.hashCode, so the guest picks the same quests the server would. */
function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
const floorMod = (a: number, n: number) => ((a % n) + n) % n;

function keptWeeks(goal: Goal, list: GoalCheckIn[], today: string): Set<string> {
  const sums = new Map<string, number>();
  for (const c of list) sums.set(c.date, (sums.get(c.date) ?? 0) + c.value);
  const start = goal.startDate && goal.startDate <= today ? goal.startDate : today;
  const thisWeek = weekStartOf(today);
  const kept = new Set<string>();
  for (let ws = weekStartOf(start); ws <= thisWeek; ws = addDays(ws, 7)) {
    const until = ws === thisWeek ? today : addDays(ws, 6);
    if (isKept(weekValue(goal, sums, ws, start, until), effectiveTarget(goal, ws, start))) kept.add(ws);
  }
  return kept;
}

function campChest(views: GoalProgressView[], paid: Record<string, number>): CampChestItem[] {
  const out: CampChestItem[] = [];
  for (const v of views) {
    const already = paid[v.goal.id] ?? 0;
    const kept = v.weeksKept;
    if (kept <= already) continue;
    const stickers = STICKER_TIERS.filter((t) => t.weeks > already && t.weeks <= kept);
    out.push({
      goalId: v.goal.id,
      title: v.goal.title,
      icon: v.goal.icon,
      color: v.goal.color,
      weeks: kept - already,
      sparks: (kept - already) * SPARKS_PER_KEPT_WEEK + stickers.reduce((sum, t) => sum + t.bonus, 0),
      stickers,
    });
  }
  return out;
}

function campQuests(day: string, active: Goal[], claimed: Set<string>): CampQuest[] {
  const present = active
    .filter((g) => !g.startDate || g.startDate <= day)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (present.length === 0) return [];
  const counts = present.filter((g) => g.measure === 'COUNT');
  const kinds: CampQuestKind[] = [present.length >= 2 ? 'light-n' : 'light-goal'];
  const flourish: CampQuestKind[] = ['note', 'early'];
  if (counts.length) flourish.push('amount');
  if (present.length >= 2) flourish.push('light-goal');
  const second = flourish[floorMod(javaHash(`${day}#2`), flourish.length)];
  kinds.push(second);
  if (present.length >= 2) kinds.push('all');
  else {
    const rest = flourish.filter((k) => k !== second);
    kinds.push(rest[floorMod(javaHash(`${day}#3`), rest.length)]);
  }
  const named = present[floorMod(javaHash(`${day}#goal`), present.length)];
  const amountGoal = counts.length ? counts[floorMod(javaHash(`${day}#amount`), counts.length)] : null;
  const onDay = (g: Goal) => checkIns.filter((c) => c.goalId === g.id && c.date === day);
  const sumOn = (g: Goal) => onDay(g).reduce((sum, c) => sum + c.value, 0);
  const dayCheckIns = present.flatMap(onDay);
  const beforeNoon = (c: GoalCheckIn) => {
    if (!c.createdAt) return false;
    const at = new Date(c.createdAt);
    const local = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
    return local === day && at.getHours() < 12;
  };

  return kinds.map((kind, slot) => {
    const id = `${day}:${slot}`;
    const base = { id, date: day, kind, claimed: claimed.has(id), goalId: null, goalTitle: null, amount: null, unit: null };
    let q: CampQuest;
    switch (kind) {
      case 'light-n': {
        const n = present.length >= 4 ? 3 : 2;
        const lit = present.filter((g) => isDayHit(g, sumOn(g))).length;
        q = { ...base, target: n, progress: Math.min(n, lit), reward: n >= 3 ? 6 : 4, done: false };
        break;
      }
      case 'light-goal':
        q = { ...base, goalId: named.id, goalTitle: named.title, target: 1, progress: isDayHit(named, sumOn(named)) ? 1 : 0, reward: 4, done: false };
        break;
      case 'note':
        q = { ...base, target: 1, progress: dayCheckIns.some((c) => c.note?.trim()) ? 1 : 0, reward: 3, done: false };
        break;
      case 'early':
        q = { ...base, target: 1, progress: dayCheckIns.some(beforeNoon) ? 1 : 0, reward: 4, done: false };
        break;
      case 'amount': {
        const g = amountGoal as Goal;
        const amount = g.period === 'DAY' ? g.target : Math.ceil(g.target / 7);
        q = { ...base, goalId: g.id, goalTitle: g.title, amount, unit: g.unit ?? null, target: amount, progress: Math.min(amount, sumOn(g)), reward: 4, done: false };
        break;
      }
      case 'all': {
        const done = present.filter((g) => {
          const v = evaluateGoal(g, checkIns.filter((c) => c.goalId === g.id), day);
          return v.today.hit || v.week.kept;
        }).length;
        q = { ...base, target: present.length, progress: done, reward: 8, done: false };
        break;
      }
    }
    q.done = q.progress + EPSILON >= q.target;
    return q;
  });
}

function campSeason(active: Goal[], today: string): CampSeason {
  const [y, m] = today.split('-').map(Number);
  let name: CampSeasonName;
  let start: string;
  if (m === 12 || m <= 2) {
    name = 'winter';
    start = `${m === 12 ? y : y - 1}-12-01`;
  } else if (m <= 5) {
    name = 'spring';
    start = `${y}-03-01`;
  } else if (m <= 8) {
    name = 'summer';
    start = `${y}-06-01`;
  } else {
    name = 'autumn';
    start = `${y}-09-01`;
  }
  const [sy, sm] = start.split('-').map(Number);
  const end = fromUtc(Date.UTC(sy, sm - 1 + 3, 1) - 86_400_000);
  const thisWeek = weekStartOf(today);
  const kept = active.map((g) => keptWeeks(g, checkIns.filter((c) => c.goalId === g.id), today));
  const weeks: CampSeasonWeek[] = [];
  for (let ws = weekStartOf(start); ws <= end; ws = addDays(ws, 7)) {
    let present = 0;
    let keptCount = 0;
    active.forEach((g, i) => {
      const goalStart = g.startDate && g.startDate <= today ? g.startDate : today;
      if (weekStartOf(goalStart) <= ws) {
        present++;
        if (kept[i].has(ws)) keptCount++;
      }
    });
    weeks.push({ weekStart: ws, goals: present, kept: keptCount, current: ws === thisWeek, future: ws > thisWeek });
  }
  return { key: `${name}-${name === 'winter' && m <= 2 ? y - 1 : y}`, name, start, end, weeks };
}

interface GuestCamp {
  buddyName: string | null;
  sparks: number;
  sparksEarned: number;
  owned: string[];
  equipped: Partial<Record<CampWearSlot, string>>;
  decor: string[];
  decorAt: Record<string, CampDecorSpot>;
  chestPaid: Record<string, number>;
  questsClaimed: string[];
  firstLight: CampFirstLight | null;
}

const camp: GuestCamp = { buddyName: null, sparks: 0, sparksEarned: 0, owned: [], equipped: {}, decor: [], decorAt: {}, chestPaid: {}, questsClaimed: [], firstLight: null };

const activeGoals = () => goals.filter((g) => g.status === 'ACTIVE').sort((a, b) => a.order - b.order);

function campView(today: string): CampView {
  const active = activeGoals();
  const views = active.map((g) => viewOf(g, today));
  const claimed = new Set(camp.questsClaimed);
  const activeIds = new Set(active.map((g) => g.id));
  const grownWeeks =
    views.reduce((sum, v) => sum + v.weeksKept, 0) +
    Object.entries(camp.chestPaid).reduce((sum, [id, n]) => sum + (activeIds.has(id) ? 0 : n), 0);
  return {
    grownWeeks,
    buddyName: camp.buddyName,
    sparks: camp.sparks,
    sparksEarned: camp.sparksEarned,
    owned: [...camp.owned],
    equipped: { ...camp.equipped },
    decor: [...camp.decor],
    decorAt: { ...camp.decorAt },
    chest: campChest(views, camp.chestPaid),
    quests: campQuests(today, active, claimed),
    questsYesterday: campQuests(addDays(today, -1), active, claimed).filter((q) => q.done && !q.claimed),
    season: campSeason(active, today),
    firstLight: camp.firstLight && camp.firstLight.date >= today && activeIds.has(camp.firstLight.goalId) ? { ...camp.firstLight } : null,
  };
}

function resolveCamp(path: string, method: string, body: () => unknown, today: string): Response | null {
  if (path.endsWith('/goals/camp') && method === 'GET') return ok(campView(today));

  if (path.endsWith('/goals/camp/chest/open') && method === 'POST') {
    const active = activeGoals();
    const items = campChest(active.map((g) => viewOf(g, today)), camp.chestPaid);
    let total = 0;
    for (const item of items) {
      camp.chestPaid[item.goalId] = viewOf(active.find((g) => g.id === item.goalId) as Goal, today).weeksKept;
      total += item.sparks;
    }
    camp.sparks += total;
    camp.sparksEarned += total;
    return ok({ opened: items, sparks: total, camp: campView(today) });
  }

  if (path.endsWith('/goals/camp/quests/claim') && method === 'POST') {
    const { questId } = body() as { questId: string };
    const day = questId.slice(0, 10);
    if (day !== today && day !== addDays(today, -1)) return bad("That letter has been put away — today's quests are fresh ones.");
    const quest = campQuests(day, activeGoals(), new Set()).find((q) => q.id === questId);
    if (!quest) return bad(`Quest not found: ${questId}`);
    if (!quest.done) return bad("Not done yet — it'll be ready to claim once it is.");
    if (camp.questsClaimed.includes(questId)) return ok({ reward: 0, camp: campView(today) });
    camp.questsClaimed.push(questId);
    camp.sparks += quest.reward;
    camp.sparksEarned += quest.reward;
    return ok({ reward: quest.reward, camp: campView(today) });
  }

  if (path.endsWith('/goals/camp/shop/buy') && method === 'POST') {
    const { itemId } = body() as { itemId: string };
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return bad("Fen doesn't sell that.");
    if (camp.owned.includes(itemId)) return bad("That's already yours.");
    if (camp.sparks < item.price) return bad('Not enough sparks for that yet.');
    camp.sparks -= item.price;
    camp.owned.push(itemId);
    if ((WEAR_SLOTS as readonly string[]).includes(item.slot)) camp.equipped[item.slot as CampWearSlot] = itemId;
    else camp.decor.push(itemId);
    return ok(campView(today));
  }

  if (path.endsWith('/goals/camp/first-light') && method === 'PUT') {
    const { date, goalId } = body() as CampFirstLightPayload;
    if (date !== today && date !== addDays(today, 1)) return bad('Hoot only plans for today or tomorrow.');
    if (!goalId) {
      camp.firstLight = null;
      return ok(campView(today));
    }
    if (!activeGoals().some((g) => g.id === goalId)) return bad("That lantern isn't at camp.");
    camp.firstLight = { date, goalId };
    return ok(campView(today));
  }

  if (path.endsWith('/goals/camp/look') && method === 'PUT') {
    const look = body() as { buddyName?: string | null; equipped?: Record<string, string>; decor?: string[]; decorAt?: Record<string, CampDecorSpot> };
    const equipped: Partial<Record<CampWearSlot, string>> = {};
    for (const [slot, id] of Object.entries(look.equipped ?? {})) {
      if (!id) continue;
      const item = ITEMS.find((i) => i.id === id && i.slot === slot && (WEAR_SLOTS as readonly string[]).includes(slot));
      if (!item) return bad("That doesn't go there.");
      if (!camp.owned.includes(id)) return bad('Buy it from Fen first.');
      equipped[slot as CampWearSlot] = id;
    }
    const decor = [...new Set(look.decor ?? [])];
    if (decor.some((id) => !camp.owned.includes(id) || ITEMS.find((i) => i.id === id)?.slot !== 'decor')) {
      return bad('Buy it from Fen first.');
    }
    const name = look.buddyName?.trim().replace(/\s+/g, ' ') || null;
    if (name && !/^[\p{L}][\p{L} '-]{0,15}$/u.test(name)) return bad("a name uses letters, spaces, ' and -");
    camp.buddyName = name;
    camp.equipped = equipped;
    const spots = look.decorAt ?? camp.decorAt;
    const decorAt: Record<string, CampDecorSpot> = {};
    for (const [id, spot] of Object.entries(spots)) {
      if (!decor.includes(id)) continue;
      if (![spot?.x, spot?.y].every((v) => typeof v === 'number' && v >= 0 && v <= 1)) return bad('That spot is outside the camp.');
      decorAt[id] = { x: spot.x, y: spot.y };
    }
    camp.decor = decor;
    camp.decorAt = decorAt;
    return ok(campView(today));
  }

  return null;
}

// ── Resolver ─────────────────────────────────────────────────────────────

const viewOf = (goal: Goal, today: string) => evaluateGoal(goal, checkIns.filter((c) => c.goalId === goal.id), today);
const activeCount = () => goals.filter((g) => g.status === 'ACTIVE').length;

function applyPayload(goal: Goal, p: GoalPayload, today: string): string | null {
  let target = Number(p.target);
  if (!p.title?.trim()) return 'title is required';
  if (!(target > 0)) return 'target must be above zero';
  if (p.measure === 'CHECK') {
    if (p.period === 'DAY') target = 1;
    else {
      target = Math.round(target);
      if (target < 1 || target > 7) return 'A times-a-week goal needs between 1 and 7 days.';
    }
  }
  const start = p.startDate ?? goal.startDate ?? today;
  if (start > today) return "A goal can't start in the future.";
  goal.title = p.title.trim();
  goal.icon = p.icon?.trim() || null;
  goal.color = p.color ?? null;
  goal.world = p.world || null;
  goal.measure = p.measure;
  goal.period = p.period;
  goal.target = target;
  goal.unit = p.measure === 'COUNT' ? p.unit?.trim() || null : null;
  goal.daysPerWeek = p.period === 'DAY' ? (p.daysPerWeek ?? 7) : null;
  goal.startDate = start;
  return null;
}

export function resolveGuestGoals(url: URL, method: string, rawBody?: string): Response | null {
  const path = url.pathname;
  if (!path.includes('/api/v1/goals')) return null;
  const body = () => JSON.parse(rawBody || '{}');
  const today = url.searchParams.get('today') || localToday();

  if (path.endsWith('/goals/board') && method === 'GET') {
    const board: GoalBoard = {
      date: today,
      weekStart: weekStartOf(today),
      goals: activeGoals().map((g) => viewOf(g, today)),
      camp: campView(today),
    };
    return ok(board);
  }

  if (path.includes('/goals/camp')) return resolveCamp(path, method, body, today);

  // A goal's journey (port of util/GoalJourney.java): one row per day tended, oldest first.
  const journeyMatch = path.match(/\/goals\/([^/]+)\/journey$/);
  if (journeyMatch && method === 'GET') {
    const goal = goals.find((g) => g.id === journeyMatch[1]);
    if (!goal) return bad(`Goal not found with id: ${journeyMatch[1]}`);
    const byDay = new Map<string, GoalCheckIn[]>();
    for (const c of checkIns) {
      if (c.goalId !== goal.id || c.date > today || !(c.value > 0)) continue;
      byDay.set(c.date, [...(byDay.get(c.date) ?? []), c]);
    }
    const days: GoalJourneyDay[] = [...byDay.keys()].sort().map((date) => {
      const list = (byDay.get(date) ?? []).slice().sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
      return {
        date,
        entries: list.length,
        value: list.reduce((sum, c) => sum + c.value, 0),
        practices: [...new Set(list.map((c) => c.practice).filter((p): p is GoalPractice => !!p))],
        notes: list.map((c) => c.note).filter((n): n is string => !!n?.trim()),
        sessions: list.map((c) => c.session).filter((s): s is string => !!s),
        minutes: list.reduce((sum, c) => sum + (c.minutes ?? 0), 0),
      };
    });
    return ok({ goalId: goal.id, date: today, days, kit: kits[goal.id] ?? {} });
  }

  const kitMatch = path.match(/\/goals\/([^/]+)\/kit\/([^/]+)$/);
  if (kitMatch && method === 'PUT') {
    const goal = goals.find((g) => g.id === kitMatch[1]);
    if (!goal) return bad(`Goal not found with id: ${kitMatch[1]}`);
    const page = decodeURIComponent(kitMatch[2]);
    if (!/^[a-z-]{1,24}$/.test(page)) return bad(`Unknown kit page: ${page}`);
    const b = body() as { picks?: string[]; fields?: Record<string, string> };
    const fields: Record<string, string> = {};
    Object.entries(b.fields ?? {}).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) fields[k] = v.trim().slice(0, 300);
    });
    const saved: GoalKitPage = {
      picks: [...new Set((b.picks ?? []).map((p) => p.trim()).filter(Boolean))].slice(0, 12),
      fields,
      updatedAt: new Date().toISOString(),
    };
    kits[goal.id] = { ...(kits[goal.id] ?? {}), [page]: saved };
    return ok(kits[goal.id]);
  }

  const checkInMatch = path.match(/\/goals\/([^/]+)\/checkins(?:\/([^/]+))?$/);
  if (checkInMatch) {
    const goal = goals.find((g) => g.id === checkInMatch[1]);
    if (!goal) return bad(`Goal not found with id: ${checkInMatch[1]}`);
    if (method === 'DELETE' && checkInMatch[2]) {
      const before = checkIns.length;
      checkIns = checkIns.filter((c) => !(c.id === checkInMatch[2] && c.goalId === goal.id));
      if (checkIns.length === before) return bad(`Check-in not found with id: ${checkInMatch[2]}`);
      return ok(viewOf(goal, today));
    }
    if (method === 'POST') {
      if (goal.status !== 'ACTIVE') return bad('This goal is archived — bring it back to log progress.');
      const b = body() as { date: string; value?: number; note?: string; practice?: GoalPractice; session?: string; minutes?: number };
      if (b.date > addDays(localToday(), 1)) return bad("Progress can't be logged for a future day.");
      if (goal.measure === 'COUNT' && !(Number(b.value) > 0)) return bad('How much? A value is required for this goal.');
      if (goal.measure === 'CHECK' && checkIns.some((c) => c.goalId === goal.id && c.date === b.date && (c.practice ?? null) === (b.practice || null) && (c.session ?? null) === (b.session || null))) {
        return ok(viewOf(goal, today));
      }
      if (b.date < goal.startDate) goal.startDate = b.date;
      checkIns.push({
        id: nextId('checkin'),
        goalId: goal.id,
        date: b.date,
        value: goal.measure === 'COUNT' ? Number(b.value) : 1,
        note: b.note?.trim() || null,
        practice: b.practice || null,
        session: b.session || null,
        minutes: b.minutes ?? null,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
      return ok(viewOf(goal, today));
    }
    return null;
  }

  const statusMatch = path.match(/\/goals\/([^/]+)\/status$/);
  if (statusMatch && method === 'PATCH') {
    const goal = goals.find((g) => g.id === statusMatch[1]);
    if (!goal) return bad(`Goal not found with id: ${statusMatch[1]}`);
    const { status } = body() as { status: Goal['status'] };
    if (status === 'ACTIVE' && goal.status !== 'ACTIVE' && activeCount() >= MAX_ACTIVE_GOALS) {
      return bad(`You already have ${MAX_ACTIVE_GOALS} active goals — archive one to bring this back.`);
    }
    goal.status = status;
    return ok(goal);
  }

  const idMatch = path.match(/\/goals\/([^/]+)$/);
  if (idMatch && idMatch[1] !== 'board') {
    const goal = goals.find((g) => g.id === idMatch[1]);
    if (!goal) return bad(`Goal not found with id: ${idMatch[1]}`);
    if (method === 'PUT') {
      const draft = { ...goal };
      const error = applyPayload(draft, body() as GoalPayload, today);
      if (error) return bad(error);
      Object.assign(goal, draft);
      return ok(viewOf(goal, today));
    }
    if (method === 'DELETE') {
      goals = goals.filter((g) => g.id !== goal.id);
      checkIns = checkIns.filter((c) => c.goalId !== goal.id);
      delete kits[goal.id];
      return ok(null);
    }
    return null;
  }

  if (path.endsWith('/goals')) {
    if (method === 'GET') return ok([...goals].sort((a, b) => a.order - b.order));
    if (method === 'POST') {
      if (activeCount() >= MAX_ACTIVE_GOALS) {
        return bad(`You already have ${MAX_ACTIVE_GOALS} active goals — archive one to make room.`);
      }
      const goal: Goal = {
        id: nextId('goal'),
        title: '',
        measure: 'COUNT',
        period: 'DAY',
        target: 1,
        status: 'ACTIVE',
        startDate: today,
        order: goals.reduce((max, g) => Math.max(max, g.order), -1) + 1,
      };
      const error = applyPayload(goal, body() as GoalPayload, today);
      if (error) return bad(error);
      goals.push(goal);
      return ok(viewOf(goal, today));
    }
  }

  return null;
}
