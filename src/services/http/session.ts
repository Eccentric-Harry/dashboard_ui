// Client session flags persisted in localStorage. Read on every request rather than
// cached, so logging in/out (which reloads the app) can never leave a stale value.

const AUTH_TOKEN_KEY = 'authToken';
const GUEST_FLAG_KEY = 'isGuest';

/** Guest mode serves every request from the local mock dataset — nothing reaches the backend. */
export function isGuestSession(): boolean {
  return localStorage.getItem(GUEST_FLAG_KEY) === 'true';
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function hasSession(): boolean {
  return isGuestSession() || !!getAuthToken();
}
