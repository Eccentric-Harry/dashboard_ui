// The single Axios instance and every cross-cutting transport concern:
//   • auth gate      — requests park until the boot-time auth check resolves
//   • bearer token   — injected on every non-auth request of a signed-in session
//   • active GETs    — counted for the route-transition OverlayLoader
//   • GET resilience — a default timeout, and retries for transient failures
//   • guest mode     — served by a local adapter; guest traffic never reaches the backend

import axios, { CanceledError, getAdapter } from 'axios';
import type { AxiosAdapter, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { CONFIG } from '../api-config';
import { createGuestAdapter } from './guest-adapter';
import { getAuthToken, isGuestSession } from './session';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Set once a GET has been counted towards the active-request total. */
    countedAsActiveGet?: boolean;
    /** Transient-failure retries already spent on this GET. */
    retryCount?: number;
  }
}

const isGet = (config: InternalAxiosRequestConfig) => (config.method ?? 'get').toLowerCase() === 'get';

// ── Active-GET counter (drives OverlayLoader) ──
let activeGetRequests = 0;
const requestChangeListeners = new Set<(count: number) => void>();

const notifyRequestListeners = () => {
  requestChangeListeners.forEach((listener) => listener(activeGetRequests));
};

export function subscribeToActiveRequests(listener: (count: number) => void): () => void {
  requestChangeListeners.add(listener);
  listener(activeGetRequests);
  return () => {
    requestChangeListeners.delete(listener);
  };
}

function trackActiveGet(config: InternalAxiosRequestConfig): void {
  // Already counted when a retry re-enters the chain: one GET stays one loader tick.
  if (!isGet(config) || config.countedAsActiveGet) return;
  config.countedAsActiveGet = true;
  activeGetRequests++;
  notifyRequestListeners();
}

function settleActiveGet(config: InternalAxiosRequestConfig | undefined): void {
  if (!config?.countedAsActiveGet) return;
  config.countedAsActiveGet = false;
  activeGetRequests = Math.max(0, activeGetRequests - 1);
  notifyRequestListeners();
}

// ── Auth gate ──
// Gated requests wait until the app boot has decided whether a session exists, then
// either proceed or are cancelled — an expired session produces one decision instead
// of a cascade of 401s.
let releaseAuthGate: (authorized: boolean) => void = () => undefined;
const authGate = new Promise<boolean>((resolve) => {
  releaseAuthGate = resolve;
});

/** Called once from the app bootstrap when the auth state is known. Later calls are no-ops. */
export function resolveAuthGate(isAuthorized: boolean): void {
  releaseAuthGate(isAuthorized);
}

// The backend's own /auth/* routes (login, signup) are the only unauthenticated ones.
// Matched as a prefix of the full URL: a bare `includes('/auth/')` also caught
// /google-calendar/auth/*, which then went out without a token and 401'd every time.
const AUTH_URL_PREFIX = `${CONFIG.BACKEND_API_BASE_URL}/auth/`;
const isAuthRoute = (url: string) => url.startsWith(AUTH_URL_PREFIX);
// Never gated: the auth flow itself, and the profile read used to validate the session.
const bypassesAuthGate = (url: string) => isAuthRoute(url) || url.includes('/users/profile');

// ── GET resilience ──
// A GET that hangs is worse than one that fails: the route loader never settles and the
// card never leaves its skeleton. 30 s still covers a Render cold start's first response.
const DEFAULT_GET_TIMEOUT_MS = 30_000;
// Worth another try: no response at all (network blip, timeout, a gateway error the
// browser surfaces as a CORS failure) or a gateway/unavailable status — Render answers
// 502/503/504 while an instance restarts, and the backend answers 503 when the database
// is briefly unreachable. Only GETs: retrying a write could apply it twice.
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const GET_RETRY_DELAYS_MS = [700, 2_000];

function shouldRetry(error: AxiosError, config: InternalAxiosRequestConfig): boolean {
  if (axios.isCancel(error) || !isGet(config) || config.signal?.aborted) return false;
  if ((config.retryCount ?? 0) >= GET_RETRY_DELAYS_MS.length) return false;
  const status = error.response?.status;
  return status === undefined || RETRYABLE_STATUSES.has(status);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Instance ──
// No default Content-Type: Axios sets application/json for object bodies on its own,
// and a JSON default would make it serialize FormData (meal-image uploads) to JSON.
const networkAdapter: AxiosAdapter = getAdapter('fetch');
const guestAdapter = createGuestAdapter(networkAdapter);

export const axiosClient = axios.create({
  adapter: (config) => (isGuestSession() ? guestAdapter(config) : networkAdapter(config)),
});

axiosClient.interceptors.request.use(async (config) => {
  const url = config.url ?? '';

  if (!bypassesAuthGate(url)) {
    const authorized = await authGate;
    if (!authorized) {
      throw new CanceledError('Blocked: no active session', undefined, config);
    }
  }

  const token = getAuthToken();
  if (token && !isGuestSession() && !isAuthRoute(url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  if (isGet(config) && !config.timeout) config.timeout = DEFAULT_GET_TIMEOUT_MS;

  trackActiveGet(config);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    settleActiveGet(response.config);
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const config = error.config;
    if (config && shouldRetry(error, config)) {
      const attempt = config.retryCount ?? 0;
      config.retryCount = attempt + 1;
      await sleep(GET_RETRY_DELAYS_MS[attempt]);
      // Still counted as active, so the loader stays up across the retry; the retried
      // request settles it once it finally succeeds or fails.
      return axiosClient.request(config);
    }
    settleActiveGet(config);
    return Promise.reject(error);
  },
);
