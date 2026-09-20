// Web Push domain types.
export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  /** Stable per-browser id so a rotated endpoint is still recognisable as this install. */
  deviceId?: string;
}
