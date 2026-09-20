// Backend liveness, measured directly rather than inferred.
//
// The request stream (services/http/request-telemetry.ts) only knows about calls
// the app happens to make, so on an idle route it says nothing at all. This is
// the one signal that has to keep speaking: a slow round trip to KeepAliveController's
// /ping (unauthenticated, @CrossOrigin, no database touch) every minute.
//
// It stops while the tab is hidden, and never runs for a guest — guest traffic is
// answered locally by design and there is no backend to reach.

import { useEffect, useState } from 'react';
import { CONFIG } from '@/services/api-config';
import { isGuestSession } from '@/services/http/session';

export type PulseState = 'unknown' | 'up' | 'slow' | 'down';

export interface BackendPulse {
  state: PulseState;
  rttMs: number | undefined;
  checkedAt: number | undefined;
}

const PING_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 8_000;
/** Atlas sits in Mumbai and a warm round trip is tens of ms; 600 means something is off. */
const SLOW_THRESHOLD_MS = 600;

function pingUrl(): string | undefined {
  try {
    return `${new URL(CONFIG.BACKEND_API_BASE_URL, window.location.origin).origin}/ping`;
  } catch {
    return undefined;
  }
}

export function useBackendPulse(enabled: boolean): BackendPulse {
  const [pulse, setPulse] = useState<BackendPulse>({ state: 'unknown', rttMs: undefined, checkedAt: undefined });

  useEffect(() => {
    const url = pingUrl();
    if (!enabled || !url || isGuestSession()) return;

    let cancelled = false;
    let timer = 0;

    const check = async () => {
      if (cancelled || document.hidden) return;

      const controller = new AbortController();
      const abortTimer = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const startedAt = performance.now();

      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        const rttMs = Math.round(performance.now() - startedAt);
        if (cancelled) return;
        setPulse({
          state: !response.ok ? 'down' : rttMs > SLOW_THRESHOLD_MS ? 'slow' : 'up',
          rttMs,
          checkedAt: Date.now(),
        });
      } catch {
        if (!cancelled) setPulse({ state: 'down', rttMs: undefined, checkedAt: Date.now() });
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    const onVisibility = () => {
      if (!document.hidden) void check();
    };

    void check();
    timer = window.setInterval(() => void check(), PING_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return pulse;
}
