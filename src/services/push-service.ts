// Strictly-typed Web Push service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { PushSubscriptionPayload } from '../types/push';
import type { PushRegistrationStatus } from '../types/notifications';
import * as E from './endpoints/push-endpoints';

export interface PushServiceInterface {
  getVapidPublicKey(): Promise<SafeResult<string>>;
  subscribeDevice(payload: PushSubscriptionPayload): Promise<SafeResult<unknown>>;
  unsubscribeDevice(endpoint: string): Promise<SafeResult<unknown>>;
  /** Server-side truth for this device's registration, used to reconcile the UI on boot. */
  getStatus(endpoint?: string): Promise<SafeResult<PushRegistrationStatus>>;
}

export const pushService: PushServiceInterface = {
  getVapidPublicKey: () => instance.safeCall<string>(E.API_GET_VAPID_KEY),
  subscribeDevice: (payload) => instance.safeCall(E.API_SUBSCRIBE_DEVICE, { body: payload }),
  unsubscribeDevice: (endpoint) => instance.safeCall(E.API_UNSUBSCRIBE_DEVICE, { query: { endpoint } }),
  getStatus: (endpoint) =>
    instance.safeCall<PushRegistrationStatus>(E.API_PUSH_STATUS, { query: endpoint ? { endpoint } : {} }),
};
