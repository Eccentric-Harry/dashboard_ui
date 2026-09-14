// The single Axios instance and every cross-cutting transport concern:
//   • auth gate      — requests park until the boot-time auth check resolves
//   • bearer token   — injected on every non-auth request of a signed-in session
//   • active GETs    — counted for the route-transition OverlayLoader
//   • guest mode     — served by a local adapter; guest traffic never reaches the backend

import axios, { CanceledError, getAdapter } from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { createGuestAdapter } from './guest-adapter';
import { getAuthToken, isGuestSession } from './session';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Set once a GET has been counted towards the active-request total. */
    countedAsActiveGet?: boolean;
  }
}

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
  if ((config.method ?? 'get').toLowerCase() !== 'get') return;
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

const AUTH_PATH = '/auth/';
// Never gated: the auth flow itself, and the profile read used to validate the session.
const GATE_BYPASS = [AUTH_PATH, '/users/profile'];

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

  if (!GATE_BYPASS.some((path) => url.includes(path))) {
    const authorized = await authGate;
    if (!authorized) {
      throw new CanceledError('Blocked: no active session', undefined, config);
    }
  }

  const token = getAuthToken();
  if (token && !isGuestSession() && !url.includes(AUTH_PATH)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  trackActiveGet(config);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    settleActiveGet(response.config);
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) settleActiveGet(error.config);
    return Promise.reject(error);
  },
);
