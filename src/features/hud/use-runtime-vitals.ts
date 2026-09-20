// Runtime vitals — what the browser will tell us about the machine this tab is
// running on, plus the app's own uptime.
//
// Device readings, not server state, so they stay out of Zustand: nothing else in
// the app wants them, they change several times a second, and they die with the
// tab. Every one of them is optional — `performance.memory` is Chromium-only,
// `navigator.connection` and `getBattery()` are unevenly implemented — so each
// returns `undefined` rather than a zero, and the HUD renders a dash. A zero
// here would read as "0 fps" / "no battery", which is worse than silence.

import { useEffect, useState } from 'react';

/** Module scope, so uptime counts from app boot rather than from a HUD mount. */
const BOOT_AT = Date.now();

export const getBootAt = () => BOOT_AT;

// ── Non-standard browser APIs, narrowly typed rather than cast to any ──
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  dischargingTime: number;
}

const memoryInfo = (): MemoryInfo | undefined =>
  (performance as Performance & { memory?: MemoryInfo }).memory;

const connectionInfo = (): NetworkInformation | undefined =>
  (navigator as Navigator & { connection?: NetworkInformation }).connection;

const batteryApi = (): (() => Promise<BatteryManager>) | undefined =>
  (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }).getBattery?.bind(navigator);

/** How many one-second frame counts the sparkline keeps. */
const FPS_HISTORY = 36;

export interface FpsReading {
  current: number | undefined;
  history: number[];
}

/**
 * Frames per second, bucketed per second. The rAF loop is the cheapest possible
 * one — a counter — and it stops entirely while the tab is hidden, so a dashboard
 * left open on a second monitor is not burning a wakeup every 16ms.
 */
export function useFps(enabled: boolean): FpsReading {
  const [reading, setReading] = useState<FpsReading>({ current: undefined, history: [] });

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let frames = 0;
    let bucketStart = performance.now();
    let running = true;

    const tick = () => {
      if (!running) return;
      frames++;
      const now = performance.now();
      if (now - bucketStart >= 1000) {
        const fps = Math.round((frames * 1000) / (now - bucketStart));
        frames = 0;
        bucketStart = now;
        setReading((prev) => ({ current: fps, history: [...prev.history.slice(-(FPS_HISTORY - 1)), fps] }));
      }
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frames = 0;
      bucketStart = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
      // A hidden tab's rAF is throttled to roughly 1 Hz, which would otherwise be
      // reported as "1 fps" — alarming, and untrue of the tab you are looking at.
      setReading((prev) => ({ current: undefined, history: prev.history }));
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    running = false;
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return reading;
}

export interface MemoryReading {
  usedMb: number;
  limitMb: number;
  ratio: number;
}

/** JS heap usage. Chromium only; undefined everywhere else. */
export function useMemory(enabled: boolean, intervalMs = 2000): MemoryReading | undefined {
  const [reading, setReading] = useState<MemoryReading | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !memoryInfo()) return;

    const sample = () => {
      const memory = memoryInfo();
      if (!memory || document.hidden) return;
      setReading({
        usedMb: memory.usedJSHeapSize / 1_048_576,
        limitMb: memory.jsHeapSizeLimit / 1_048_576,
        ratio: memory.jsHeapSizeLimit ? memory.usedJSHeapSize / memory.jsHeapSizeLimit : 0,
      });
    };

    sample();
    const timer = window.setInterval(sample, intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);

  return reading;
}

export interface NetworkReading {
  online: boolean;
  effectiveType: string | undefined;
  downlinkMbps: number | undefined;
  rttMs: number | undefined;
}

export function useNetwork(): NetworkReading {
  const [reading, setReading] = useState<NetworkReading>(() => ({
    online: navigator.onLine,
    effectiveType: connectionInfo()?.effectiveType,
    downlinkMbps: connectionInfo()?.downlink,
    rttMs: connectionInfo()?.rtt,
  }));

  useEffect(() => {
    const connection = connectionInfo();

    const sync = () => {
      setReading({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlinkMbps: connection?.downlink,
        rttMs: connection?.rtt,
      });
    };

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    connection?.addEventListener('change', sync);

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      connection?.removeEventListener('change', sync);
    };
  }, []);

  return reading;
}

export interface BatteryReading {
  level: number;
  charging: boolean;
}

/** Undefined on Safari and Firefox, which never shipped the Battery Status API. */
export function useBattery(): BatteryReading | undefined {
  const [reading, setReading] = useState<BatteryReading | undefined>(undefined);

  useEffect(() => {
    const getBattery = batteryApi();
    if (!getBattery) return;

    let battery: BatteryManager | undefined;
    let cancelled = false;

    const sync = () => {
      if (!battery || cancelled) return;
      setReading({ level: battery.level, charging: battery.charging });
    };

    void getBattery().then((result) => {
      if (cancelled) return;
      battery = result;
      sync();
      battery.addEventListener('levelchange', sync);
      battery.addEventListener('chargingchange', sync);
    });

    return () => {
      cancelled = true;
      battery?.removeEventListener('levelchange', sync);
      battery?.removeEventListener('chargingchange', sync);
    };
  }, []);

  return reading;
}

/** Static device facts — read once, they never change for the life of the tab. */
export interface DeviceFacts {
  cores: number | undefined;
  memoryGb: number | undefined;
  pixelRatio: number;
}

export function readDeviceFacts(): DeviceFacts {
  return {
    cores: navigator.hardwareConcurrency || undefined,
    memoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    pixelRatio: window.devicePixelRatio,
  };
}

/** Seconds since app boot, re-rendered once a second while the tab is visible. */
export function useUptimeSeconds(): number {
  const [seconds, setSeconds] = useState(() => Math.floor((Date.now() - BOOT_AT) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setSeconds(Math.floor((Date.now() - BOOT_AT) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return seconds;
}
