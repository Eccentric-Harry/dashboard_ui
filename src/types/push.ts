// Web Push domain types.
export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
}
