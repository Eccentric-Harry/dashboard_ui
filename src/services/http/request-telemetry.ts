// Request telemetry — a ring buffer of the app's own API calls.
//
// Fed by the Axios interceptors (axios-client.ts) so it sees every request the
// app makes, including retries, without a single feature knowing it exists. The
// HUD reads it for a live latency figure and a request stream; nothing else
// depends on it, and dropping the two interceptor calls silently disables it
// rather than breaking transport.
//
// It is deliberately module-level rather than a store: samples arrive at
// whatever rate the app makes requests, and pushing each one through Zustand +
// Immer + DevTools would put a structural clone of the buffer in the redux
// devtools timeline for every GET.

import { CONFIG } from '../api-config';

export interface RequestSample {
  id: number;
  method: string;
  /** Path relative to the API base, e.g. '/home/summary'. Query string dropped. */
  path: string;
  /** HTTP status, or 0 when the request never got a response (network/timeout). */
  status: number;
  durationMs: number;
  at: number;
  /** Guest samples are answered by the local mock adapter — not real latency. */
  guest: boolean;
}

/** Roughly one route's worth of traffic; enough for a p50 that means something. */
const CAPACITY = 40;

let samples: RequestSample[] = [];
let nextId = 1;
const listeners = new Set<(samples: readonly RequestSample[]) => void>();

function shortenPath(url: string | undefined): string {
  if (!url) return '—';
  const withoutBase = url.startsWith(CONFIG.BACKEND_API_BASE_URL)
    ? url.slice(CONFIG.BACKEND_API_BASE_URL.length)
    : url.replace(/^https?:\/\/[^/]+/, '');
  return withoutBase.split('?')[0] || '/';
}

export function recordRequest(input: {
  method: string | undefined;
  url: string | undefined;
  status: number | undefined;
  startedAt: number | undefined;
  guest: boolean;
}): void {
  if (input.startedAt === undefined) return;

  const sample: RequestSample = {
    id: nextId++,
    method: (input.method ?? 'get').toUpperCase(),
    path: shortenPath(input.url),
    status: input.status ?? 0,
    durationMs: Math.max(0, Math.round(performance.now() - input.startedAt)),
    at: Date.now(),
    guest: input.guest,
  };

  samples = [...samples.slice(-(CAPACITY - 1)), sample];
  listeners.forEach((listener) => listener(samples));
}

export function getRequestSamples(): readonly RequestSample[] {
  return samples;
}

export function subscribeToRequestSamples(listener: (samples: readonly RequestSample[]) => void): () => void {
  listeners.add(listener);
  listener(samples);
  return () => {
    listeners.delete(listener);
  };
}

/** Percentile over the sample window. `p` is 0–1; returns undefined when empty. */
export function percentileLatency(window: readonly RequestSample[], p: number): number | undefined {
  if (window.length === 0) return undefined;
  const sorted = window.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}
