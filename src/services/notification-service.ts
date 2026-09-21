// Notification-centre reads and state changes — one-liners over instance.safeCall<T>().
// Every call here is a read or a user-initiated state change; none of them can make a
// notification fire, which is what makes them safe to call on boot.
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { NotificationDiagnostics, ServerNotification } from '../types/notifications';
import * as E from './endpoints/notification-endpoints';

export interface NotificationServiceInterface {
  list(limit?: number): Promise<SafeResult<ServerNotification[]>>;
  acknowledge(id: string): Promise<SafeResult<ServerNotification>>;
  markRead(id: string): Promise<SafeResult<ServerNotification>>;
  markAllRead(): Promise<SafeResult<{ updated: number }>>;
  dismiss(id: string): Promise<SafeResult<void>>;
  dismissAll(): Promise<SafeResult<{ dismissed: number }>>;
  diagnostics(): Promise<SafeResult<NotificationDiagnostics>>;
}

export const notificationService: NotificationServiceInterface = {
  list: (limit = 50) => instance.safeCall<ServerNotification[]>(E.API_LIST_NOTIFICATIONS, { query: { limit } }),
  acknowledge: (id) => instance.safeCall<ServerNotification>(E.API_ACK_NOTIFICATION, { params: { id } }),
  markRead: (id) => instance.safeCall<ServerNotification>(E.API_READ_NOTIFICATION, { params: { id } }),
  markAllRead: () => instance.safeCall<{ updated: number }>(E.API_READ_ALL_NOTIFICATIONS),
  dismiss: (id) => instance.safeCall<void>(E.API_DISMISS_NOTIFICATION, { params: { id } }),
  dismissAll: () => instance.safeCall<{ dismissed: number }>(E.API_DISMISS_ALL_NOTIFICATIONS),
  diagnostics: () => instance.safeCall<NotificationDiagnostics>(E.API_NOTIFICATION_DIAGNOSTICS),
};
