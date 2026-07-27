// The single Axios instance + its interceptors.
//
// PHASE A (migration): `adapter: 'fetch'` routes every Axios request through the
// existing window.fetch patch in lib/api.ts, so auth-header injection, guest-mode
// mocking, and active-GET counting keep working with zero duplication. The counter
// itself now lives here (its final home); the fetch patch feeds it.
//
// PHASE B (cleanup): drop `adapter: 'fetch'`, move auth + GET counting into the
// commented interceptor stubs below, and delete the window.fetch patch.

import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// ── Active-GET counter (drives OverlayLoader). Fed by the fetch patch in Phase A. ──
let activeGetRequests = 0;
const requestChangeListeners = new Set<(n: number) => void>();

export function subscribeToActiveRequests(listener: (n: number) => void) {
  requestChangeListeners.add(listener);
  listener(activeGetRequests);
  return () => {
    requestChangeListeners.delete(listener);
  };
}

export function incrementActiveGets() {
  activeGetRequests++;
  requestChangeListeners.forEach((cb) => cb(activeGetRequests));
}

export function decrementActiveGets() {
  activeGetRequests = Math.max(0, activeGetRequests - 1);
  requestChangeListeners.forEach((cb) => cb(activeGetRequests));
}

// ── Auth gatekeeper (adapts the blueprint's /LoggedInUser request queue) ──
// Non-bypassed requests wait until the token has been validated at boot, then
// either proceed or are cancelled. Prevents a cascade of 401s on an expired token.
let authChecked = false;
let authorized = false;
const step = () => new Promise<void>((r) => setTimeout(r, 25));
const waitUntilAuth = async () => {
  while (!authChecked) await step();
};

/** Called once from the app bootstrap when the auth state is known. */
export function resolveAuthGate(isAuthorized: boolean) {
  authorized = isAuthorized;
  authChecked = true;
}

// Endpoints that must never wait on the gate: the auth flow and the profile call
// used to validate the token itself.
const GATE_BYPASS = ['/auth/', '/users/profile'];

export const axiosClient = axios.create({
  // Reuse the window.fetch patch during migration. Remove in Phase B.
  adapter: 'fetch',
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const url = config.url ?? '';
  const isBypass = GATE_BYPASS.some((p) => url.includes(p));
  if (!isBypass) {
    await waitUntilAuth();
    if (authChecked && !authorized) {
      throw new axios.Cancel('Blocked: unauthorized');
    }
  }
  // PHASE B only — the fetch patch handles these in Phase A:
  //   if ((config.method ?? 'get').toLowerCase() === 'get') incrementActiveGets();
  //   const token = localStorage.getItem('authToken');
  //   if (token && !isBypass) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

// PHASE B only — decrement on settle:
// axiosClient.interceptors.response.use(
//   (res) => {
//     if ((res.config.method ?? 'get').toLowerCase() === 'get') decrementActiveGets();
//     return res;
//   },
//   (err) => {
//     if ((err.config?.method ?? 'get').toLowerCase() === 'get') decrementActiveGets();
//     return Promise.reject(err);
//   },
// );
