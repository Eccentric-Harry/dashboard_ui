// Is the backend answering, and how fast.
//
// Two sources, in order of how much they prove:
//
//   1. The app's own traffic (services/http/request-telemetry.ts). If a real
//      request came back 200 a moment ago, the backend is up — there is no
//      stronger evidence than that, and it costs nothing to read.
//   2. A probe of KeepAliveController's /ping, but only when the app has been
//      idle long enough that (1) has nothing recent to say.
//
// It used to be probe-only, which produced a flat contradiction in production:
// the request stream showed 200s while the light read "unreachable". The cause
// is that the backend's CorsConfig maps CORS onto `/api/**` only, so a browser
// on the Vercel origin cannot read `/ping` at all — the fetch fails for want of
// an Access-Control-Allow-Origin header, not because anything is down. That is
// fixed backend-side too, but evidence beats a probe either way, and this keeps
// the light honest against any deploy that predates the fix.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CONFIG } from '@/services/api-config';
import { isGuestSession } from '@/services/http/session';
import type { RequestSample } from '@/services/http/request-telemetry';

export type PulseState = 'unknown' | 'up' | 'slow' | 'down';
export type PulseSource = 'traffic' | 'probe' | 'none';

export interface BackendPulse {
  state: PulseState;
  /** Round trip in ms — of the last real request, or of the probe. */
  rttMs: number | undefined;
  source: PulseSource;
}

const PING_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 8_000;
/** How long a real request stays good evidence that the backend is up. */
const TRAFFIC_WINDOW_MS = 90_000;
/** Atlas sits in Mumbai and a warm round trip is tens of ms; 600 means something is off. */
const SLOW_THRESHOLD_MS = 600;

function pingUrl(): string | undefined {
  try {
    return `${new URL(CONFIG.BACKEND_API_BASE_URL, window.location.origin).origin}/ping`;
  } catch {
    return undefined;
  }
}

/**
 * A shared, quantised clock.
 *
 * Whether traffic still counts as evidence is a function of the wall clock, and
 * the answer has to change on its own — otherwise a backend that went down while
 * the app sat idle would keep a green light until something else re-rendered.
 * Reading `Date.now()` during render would do it, at the cost of making the
 * component's output depend on when React happened to call it; subscribing to a
 * ticking value keeps the render pure. The snapshot is rounded to the tick so it
 * is stable between them, which is what `useSyncExternalStore` requires.
 */
const STALENESS_TICK_MS = 10_000;
const clockListeners = new Set<() => void>();
let clockTimer = 0;

function subscribeToClock(onTick: () => void): () => void {
  clockListeners.add(onTick);
  if (!clockTimer) {
    clockTimer = window.setInterval(() => clockListeners.forEach((listener) => listener()), STALENESS_TICK_MS);
  }
  return () => {
    clockListeners.delete(onTick);
    if (clockListeners.size === 0) {
      window.clearInterval(clockTimer);
      clockTimer = 0;
    }
  };
}

const clockSnapshot = () => Math.floor(Date.now() / STALENESS_TICK_MS) * STALENESS_TICK_MS;

const isSuccess = (sample: RequestSample) => sample.status >= 200 && sample.status < 400;
const rate = (ms: number): PulseState => (ms > SLOW_THRESHOLD_MS ? 'slow' : 'up');

/**
 * What the app's own traffic says about the backend, as of `now`. Kept out of the
 * component so the render stays pure — a clock read during render is exactly the
 * kind of thing that makes a component's output depend on when React happened to
 * call it.
 */
function deriveFromTraffic(
  samples: readonly RequestSample[],
  now: number,
): { state: PulseState; rttMs: number | undefined } | undefined {
  const recent = samples.filter((sample) => !sample.guest && now - sample.at < TRAFFIC_WINDOW_MS);
  if (recent.length === 0) return undefined;

  const lastSuccess = [...recent].reverse().find(isSuccess);
  if (lastSuccess) return { state: rate(lastSuccess.durationMs), rttMs: lastSuccess.durationMs };
  // Everything recent failed — that is a real outage, not a missing signal.
  return { state: 'down', rttMs: undefined };
}

export function useBackendPulse(enabled: boolean, samples: readonly RequestSample[]): BackendPulse {
  const [probe, setProbe] = useState<{ state: PulseState; rttMs: number | undefined }>({
    state: 'unknown',
    rttMs: undefined,
  });

  // Read by the ping timer without making it a dependency — re-arming an interval
  // on every request would mean it never fires on a busy route.
  const samplesRef = useRef(samples);
  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  useEffect(() => {
    const url = pingUrl();
    if (!enabled || !url || isGuestSession()) return;

    let cancelled = false;

    const check = async () => {
      // Real traffic already answered the question; don't wake the instance for
      // a second opinion.
      if (cancelled || document.hidden || deriveFromTraffic(samplesRef.current, Date.now())) return;

      const controller = new AbortController();
      const abortTimer = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const startedAt = performance.now();

      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        const rttMs = Math.round(performance.now() - startedAt);
        if (cancelled) return;
        setProbe({ state: response.ok ? rate(rttMs) : 'down', rttMs });
      } catch {
        if (!cancelled) setProbe({ state: 'down', rttMs: undefined });
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    const onVisibility = () => {
      if (!document.hidden) void check();
    };

    void check();
    const timer = window.setInterval(() => void check(), PING_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  const now = useSyncExternalStore(subscribeToClock, clockSnapshot, clockSnapshot);
  const traffic = deriveFromTraffic(samples, now);

  if (traffic) return { ...traffic, source: 'traffic' };
  return { ...probe, source: probe.state === 'unknown' ? 'none' : 'probe' };
}
