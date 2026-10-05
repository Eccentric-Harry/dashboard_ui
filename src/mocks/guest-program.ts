// Guest-mode program API: the in-memory mirror of ProgramController (/api/v1/program).
// The server only stores and scores, so this ports ProgramService's storage rules and
// ProgramScoring's maths; every judged view is derived client-side either way. Sources (food,
// sleep, focus) are seeded deterministically so The Lighthouse has something to read.
// Pure over module state — `resolveGuestProgram` returns null for anything it doesn't own.

import { localToday } from '@/lib/finance-ledger';
import type {
  Program,
  ProgramAssessment,
  ProgramAssessmentPayload,
  ProgramLetter,
  ProgramLetterKey,
  ProgramLog,
  ProgramLogPayload,
  ProgramMedia,
  ProgramMediaPayload,
  ProgramReview,
  ProgramReviewPayload,
  ProgramSettingsPayload,
  ProgramSources,
  ProgramStartPayload,
  ProgramState,
  ProgramTrack,
  ProgramTrackKey,
} from '@/types/program';

interface Response {
  status: number;
  body: unknown;
}

const ok = (data: unknown): Response => ({ status: 200, body: { data } });
const bad = (message: string): Response => ({ status: 400, body: { message } });

const TRACK_KEYS: ProgramTrackKey[] = ['run', 'lift', 'protein', 'mood', 'learn', 'english', 'regard'];
const GUEST_WEIGHT_KG = 70;

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => fromUtc(toUtc(iso) + days * 86_400_000);
const addYears = (iso: string, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;

let program: (Omit<Program, 'letters'> & { letters: Partial<Record<ProgramLetterKey, { text: string; writtenAt: string; opensOn: string | null }>> }) | null = null;
let logs: ProgramLog[] = [];
let reviews: ProgramReview[] = [];
let assessments: ProgramAssessment[] = [];
let media: (ProgramMedia & { dataUrl: string })[] = [];
let seq = 0;
const nextId = (prefix: string) => `${prefix}-guest-${++seq}`;
const now = () => new Date().toISOString();

// ── ProgramScoring, ported ──────────────────────────────────────────────

function defaultTracks(weightKg?: number | null): ProgramTrack[] {
  return TRACK_KEYS.map((key) => {
    switch (key) {
      case 'run':
      case 'lift':
        return { key, target: 3 };
      case 'protein':
        return { key, target: weightKg ? Math.round(weightKg * 1.6) : 110, floor: weightKg ? Math.round(weightKg * 1.2) : 85 };
      case 'learn':
        return { key, target: 5 };
      case 'english':
        return { key, target: 15, floor: 5 };
      case 'regard':
        return { key, target: 1 };
      default:
        return { key };
    }
  });
}

const ROSENBERG_REVERSED = new Set([1, 4, 5, 7, 8]);

function score(type: string, answers?: number[]): number | null | string {
  if (type === 'ROSENBERG') {
    if (!answers || answers.length !== 10 || answers.some((a) => a < 0 || a > 3)) return 'The Rosenberg scale has 10 statements, answered 0–3.';
    return answers.reduce((n, a, i) => n + (ROSENBERG_REVERSED.has(i) ? 3 - a : a), 0);
  }
  if (type === 'WHO5') {
    if (!answers || answers.length !== 5 || answers.some((a) => a < 0 || a > 5)) return 'The WHO-5 has 5 statements, answered 0–5.';
    return answers.reduce((n, a) => n + a, 0) * 4;
  }
  return null;
}

// ── Views ───────────────────────────────────────────────────────────────

function view(): Program | null {
  if (!program) return null;
  const today = localToday();
  const letters: Program['letters'] = {};
  for (const [key, letter] of Object.entries(program.letters) as [ProgramLetterKey, { text: string; writtenAt: string; opensOn: string | null }][]) {
    const sealed = !!letter.opensOn && today < letter.opensOn;
    const v: ProgramLetter = { sealed, opensOn: letter.opensOn, writtenAt: letter.writtenAt, text: sealed ? null : letter.text, length: letter.text.length };
    letters[key] = v;
  }
  return JSON.parse(JSON.stringify({ ...program, letters }));
}

/** A day's seeded number in [lo, hi] — stable per date so reloads agree. */
function seeded(date: string, salt: number, lo: number, hi: number) {
  let h = salt;
  for (let i = 0; i < date.length; i++) h = (h * 33 + date.charCodeAt(i)) % 100_003;
  return lo + (h % (hi - lo + 1));
}

function sources(today: string): ProgramSources {
  const out: ProgramSources = { protein: {}, sleep: {}, mood: {}, runs: {}, focus: {}, proteinGoal: 110, profileWeightKg: GUEST_WEIGHT_KG };
  if (!program) return out;
  const from = addDays(program.startDate, -7);
  for (let d = from; d <= today && d <= program.endDate; d = addDays(d, 1)) {
    // Most days have food logged; about one in five is unknown.
    if (seeded(d, 7, 0, 4) > 0) out.protein[d] = seeded(d, 11, 62, 124);
    out.sleep[d] = seeded(d, 13, 330, 500);
    if (seeded(d, 17, 0, 3) === 0) out.focus[d] = seeded(d, 19, 15, 60);
  }
  return out;
}

/** A media item without its bytes — what listings return. */
const metaOf = (m: ProgramMedia): ProgramMedia => ({
  id: m.id,
  kind: m.kind,
  label: m.label,
  date: m.date,
  mime: m.mime,
  bytes: m.bytes,
  durationSec: m.durationSec,
  createdAt: m.createdAt,
});

function state(today: string): ProgramState {
  return JSON.parse(
    JSON.stringify({
      program: view(),
      logs: program ? logs : [],
      reviews: program ? reviews : [],
      assessments: program ? assessments : [],
      media: program ? media.map(metaOf) : [],
      sources: sources(today),
    }),
  );
}

// ── Writes ──────────────────────────────────────────────────────────────

function validLog(p: ProgramLogPayload): string | null {
  if (!program) return 'No program is running.';
  if (p.track !== 'urge' && !TRACK_KEYS.includes(p.track)) return 'track must be a program track or urge';
  if (p.date < addDays(program.startDate, -7) || p.date > addDays(program.endDate, 7)) return 'That day is outside the program.';
  if (p.track === 'mood' && (p.value == null || p.value < 1 || p.value > 5 || p.value % 1 !== 0)) return 'A mood check-in is a score from 1 to 5.';
  if (p.track === 'regard' && !p.text?.trim()) return 'Write the promise you kept.';
  if (p.track === 'urge' && !p.urge) return 'An urge log is an urge ridden out.';
  return null;
}

function applyTarget(track: ProgramTrack, edit: { target?: number | null; floor?: number | null }): string | null {
  if (edit.target == null) return 'A new target needs a number.';
  const t = Math.round(edit.target);
  switch (track.key) {
    case 'run':
    case 'lift':
    case 'learn':
      if (t < 1 || t > 7) return 'Between 1 and 7 a week.';
      track.target = t;
      return null;
    case 'regard':
      if (t < 1 || t > 5) return 'Between 1 and 5 a day.';
      track.target = t;
      return null;
    case 'protein':
    case 'english': {
      const [lo, hi] = track.key === 'protein' ? [30, 400] : [1, 180];
      if (t < lo || t > hi) return track.key === 'protein' ? 'Between 30 and 400 g.' : 'Between 1 and 180 minutes.';
      track.target = t;
      const floor = edit.floor != null ? Math.round(edit.floor) : track.floor;
      if (floor != null) track.floor = Math.min(floor, t);
      return null;
    }
    default:
      return 'That track has no target.';
  }
}

export function resolveGuestProgram(url: URL, method: string, rawBody?: string): Response | null {
  const path = url.pathname;
  if (!path.includes('/api/v1/program')) return null;
  const body = <T>() => JSON.parse(rawBody || '{}') as T;
  const today = url.searchParams.get('today') || localToday();
  const rest = path.slice(path.indexOf('/api/v1/program') + '/api/v1/program'.length).split('/').filter(Boolean);

  if (rest.length === 0) {
    if (method === 'GET') return ok(state(today));
    if (method === 'POST') {
      if (program) return bad('A program is already running.');
      const p = body<ProgramStartPayload>();
      const start = p.startDate;
      const end = p.endDate || addDays(start, 89);
      const weight = p.weightKg ?? GUEST_WEIGHT_KG;
      program = {
        id: nextId('program'),
        title: p.title?.trim() || 'Turning 23',
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        birthday: p.birthday || end,
        weightKg: weight,
        liftPlace: p.liftPlace || 'gym',
        tracks: defaultTracks(weight),
        answers: Object.fromEntries(Object.entries(p.answers ?? {}).filter(([, v]) => v?.trim())),
        letters: {},
        createdAt: now(),
        updatedAt: now(),
      };
      logs = [];
      reviews = [];
      assessments = [];
      media = [];
      return ok(view());
    }
    return null;
  }

  if (!program || rest[0] !== program.id) return bad(`Program not found with id: ${rest[0]}`);
  const p = program;
  const [, section, itemId] = rest;

  if (!section) {
    if (method === 'DELETE') {
      program = null;
      logs = [];
      reviews = [];
      assessments = [];
      media = [];
      return ok(null);
    }
    if (method === 'PUT') {
      const s = body<ProgramSettingsPayload>();
      if (s.title?.trim()) p.title = s.title.trim();
      if (s.startDate) {
        const length = (toUtc(p.endDate) - toUtc(p.startDate)) / 86_400_000;
        const birthdayWasEnd = p.birthday === p.endDate;
        p.startDate = s.startDate;
        p.endDate = addDays(s.startDate, length);
        if (birthdayWasEnd) p.birthday = p.endDate;
      }
      if (s.birthday) p.birthday = s.birthday;
      if (s.weightKg != null) p.weightKg = s.weightKg;
      if (s.liftPlace) p.liftPlace = s.liftPlace;
      if (s.answers) {
        for (const [k, v] of Object.entries(s.answers)) {
          if (v?.trim()) p.answers[k] = v.trim();
          else delete p.answers[k];
        }
      }
      if (s.plans) {
        for (const [k, plan] of Object.entries(s.plans)) {
          const track = p.tracks.find((t) => t.key === k);
          if (!track) return bad(`Unknown track: ${k}`);
          track.plan = plan?.trim() || null;
        }
      }
      if (s.opens) {
        for (const [k, date] of Object.entries(s.opens)) {
          const track = p.tracks.find((t) => t.key === k);
          if (!track) return bad(`Unknown track: ${k}`);
          if (!date) {
            track.openedOn = null;
            continue;
          }
          if (date > p.endDate) return bad("A track can't start after the program ends");
          track.openedOn = date < p.startDate ? p.startDate : date;
        }
      }
      p.updatedAt = now();
      return ok(view());
    }
    return null;
  }

  if (section === 'letters' && method === 'PUT') {
    const key = itemId as ProgramLetterKey;
    if (!['to23', 'from23', 'to24'].includes(key)) return bad(`Unknown letter: ${key}`);
    const { text } = body<{ text: string }>();
    if (!text?.trim()) return bad('a letter needs some words');
    const birthday = p.birthday || p.endDate;
    if (key === 'to23' && localToday() >= birthday) return bad('That letter has already opened.');
    const opensOn = key === 'to23' ? birthday : key === 'to24' ? addYears(birthday, 1) : null;
    p.letters[key] = { text: text.trim(), writtenAt: now(), opensOn };
    p.updatedAt = now();
    return ok(view());
  }

  if (section === 'logs') {
    if (method === 'POST' || method === 'PUT') {
      const payload = body<ProgramLogPayload>();
      const error = validLog(payload);
      if (error) return bad(error);
      if (method === 'POST') {
        const log: ProgramLog = { ...payload, id: nextId('log'), programId: p.id, createdAt: now(), updatedAt: now() };
        logs.push(log);
        return ok(log);
      }
      const i = logs.findIndex((l) => l.id === itemId);
      if (i === -1) return bad(`Log not found with id: ${itemId}`);
      if (logs[i].track !== payload.track) return bad('A log can’t move to another track.');
      logs[i] = { ...payload, id: logs[i].id, programId: p.id, createdAt: logs[i].createdAt, updatedAt: now() };
      return ok(logs[i]);
    }
    if (method === 'DELETE') {
      if (!logs.some((l) => l.id === itemId)) return bad(`Log not found with id: ${itemId}`);
      logs = logs.filter((l) => l.id !== itemId);
      return ok(null);
    }
  }

  if (section === 'reviews' && method === 'PUT') {
    const weekStart = itemId;
    if (new Date(toUtc(weekStart)).getUTCDay() !== 1) return bad('A review week starts on a Monday.');
    const r = body<ProgramReviewPayload>();
    if (!r.selfTrust || r.selfTrust < 1 || r.selfTrust > 10) return bad('selfTrust is 1–10');
    let review = reviews.find((x) => x.weekStart === weekStart);
    if (!review) {
      review = { id: nextId('review'), programId: p.id, weekStart, selfTrust: r.selfTrust, changes: [], createdAt: now() };
      reviews.push(review);
    }
    const changes = new Map(review.changes.map((c) => [c.track, c]));
    for (const [key, edit] of Object.entries(r.targets ?? {}) as [ProgramTrackKey, NonNullable<ProgramReviewPayload['targets']>[ProgramTrackKey]][]) {
      const track = p.tracks.find((t) => t.key === key);
      if (!track || !edit) return bad(`Unknown track: ${key}`);
      const fromTarget = track.target ?? null;
      const fromFloor = track.floor ?? null;
      const error = applyTarget(track, edit);
      if (error) return bad(error);
      if (fromTarget === (track.target ?? null) && fromFloor === (track.floor ?? null)) continue;
      const earlier = changes.get(key);
      changes.set(key, {
        track: key,
        fromTarget: earlier ? earlier.fromTarget : fromTarget,
        fromFloor: earlier ? earlier.fromFloor : fromFloor,
        toTarget: track.target ?? null,
        toFloor: track.floor ?? null,
      });
    }
    review.selfTrust = r.selfTrust;
    review.win = r.win?.trim() || null;
    review.obstacle = r.obstacle?.trim() || null;
    review.adjustment = r.adjustment?.trim() || null;
    review.ifThen = r.ifThen?.trim() || null;
    review.changes = [...changes.values()].filter((c) => c.fromTarget !== c.toTarget || c.fromFloor !== c.toFloor);
    review.updatedAt = now();
    reviews.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    p.updatedAt = now();
    return ok(JSON.parse(JSON.stringify({ review, program: view() })));
  }

  if (section === 'assessments') {
    if (method === 'POST') {
      const a = body<ProgramAssessmentPayload>();
      const s = score(a.type, a.answers);
      if (typeof s === 'string') return bad(s);
      if (a.type === 'BODY' && a.weightKg == null && a.waistCm == null && !a.mediaIds?.length) return bad('A body check needs a photo, a weight or a waist.');
      const assessment: ProgramAssessment = {
        id: nextId('check'),
        programId: p.id,
        date: a.date,
        type: a.type,
        answers: a.type === 'BODY' ? null : a.answers ?? null,
        score: s,
        weightKg: a.type === 'BODY' ? a.weightKg ?? null : null,
        waistCm: a.type === 'BODY' ? a.waistCm ?? null : null,
        mediaIds: a.type === 'BODY' ? (a.mediaIds ?? []).filter((id) => media.some((m) => m.id === id)) : null,
        note: a.note?.trim() || null,
        createdAt: now(),
      };
      assessments.push(assessment);
      return ok(assessment);
    }
    if (method === 'DELETE') {
      assessments = assessments.filter((a) => a.id !== itemId);
      return ok(null);
    }
  }

  if (section === 'media') {
    if (method === 'POST') {
      const m = body<ProgramMediaPayload>();
      const match = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[^,;]*)*;base64,/.exec(m.dataUrl);
      if (!match) return bad('That file couldn’t be read.');
      const item = {
        id: nextId('media'),
        kind: m.kind,
        label: m.label,
        date: m.date,
        mime: match[1],
        bytes: Math.round((m.dataUrl.length - match[0].length) * 0.75),
        durationSec: m.kind === 'AUDIO' ? m.durationSec ?? null : null,
        createdAt: now(),
        dataUrl: m.dataUrl,
      };
      media.push(item);
      return ok(metaOf(item));
    }
    if (method === 'GET') {
      const item = media.find((x) => x.id === itemId);
      return item ? ok(item) : bad(`Not found: ${itemId}`);
    }
    if (method === 'DELETE') {
      media = media.filter((x) => x.id !== itemId);
      return ok(null);
    }
  }

  return null;
}
