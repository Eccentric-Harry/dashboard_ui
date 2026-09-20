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

/**
 * Ends the session on this device.
 *
 * Clearing localStorage alone is not enough: the browser's push subscription belongs to the
 * *browser*, not to the account, so it survives a logout. Left registered, the previous
 * user's reminders keep arriving on a device that now belongs to whoever logs in next —
 * and the server would keep pushing to an endpoint nobody is entitled to any more. So the
 * device is unregistered first, on a best-effort basis, and the sign-out proceeds either way.
 */
export async function logoutAndReload(): Promise<void> {
  try {
    const { notificationActions } = await import('@/store/notification-store');
    await notificationActions.unregisterDevice();
  } catch (err) {
    console.warn('[auth] could not unregister this device for push on logout', err);
  }
  localStorage.clear();
  window.location.reload();
}
