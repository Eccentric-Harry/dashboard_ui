// Notification domain types. The backend owns every one of these records; the client
// reads them and reports read/ack state back. Nothing here describes a client-side
// schedule, because the client does not have one.

export type NotificationLifecycle =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'MISSED';

export type NotificationItemType = 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';

/** A notification as the server tells it. Mirrors Java `NotificationView`. */
export interface ServerNotification {
  id: string;
  title: string;
  body: string;
  url?: string;
  sourceType?: string;
  sourceId?: string;
  itemType?: NotificationItemType;
  occurrenceDate?: string;
  fireAt: string;
  status: NotificationLifecycle;
  sentAt?: string;
  acknowledgedAt?: string;
  readAt?: string;
}

/** The payload a `push` event carries, forwarded to the page by the service worker. */
export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  sourceId?: string;
  sourceType?: string;
  itemType?: NotificationItemType;
  occurrenceDate?: string;
  fireAt?: string;
}

/** Messages the service worker posts to open pages. */
export type ServiceWorkerMessage =
  | { type: 'PUSH_RECEIVED'; notification: PushNotificationPayload }
  | { type: 'NOTIFICATION_CLICK'; id?: string; url?: string }
  | { type: 'NOTIFICATION_SNOOZED'; id?: string; minutes?: number };

export interface PushRegistrationStatus {
  /** True when *this* browser's endpoint is registered and active server-side. */
  registered: boolean;
  subscriptionId?: string;
  /** Devices with alerts on across the whole account. */
  activeDeviceCount: number;
  lastSeenAt?: string;
}

/** One device's answer to an immediate test push. */
export interface PushTestOutcome {
  subscriptionId: string;
  endpointOrigin: string;
  /** ACCEPTED | EXPIRED | RETRYABLE | PERMANENT */
  kind: 'ACCEPTED' | 'EXPIRED' | 'RETRYABLE' | 'PERMANENT';
  statusCode?: number;
  message?: string;
}

export interface PushTestResult {
  deviceCount: number;
  accepted: number;
  outcomes: PushTestOutcome[];
}

export interface NotificationDiagnostics {
  enabled: boolean;
  serverTime: string;
  resolvedTimezone: string;
  serverTimeLocal: string;
  devices: {
    id: string;
    endpointOrigin: string;
    active: boolean;
    inactiveReason?: string;
    timezone?: string;
    userAgent?: string;
    failureCount: number;
    lastSeenAt?: string;
    lastSuccessAt?: string;
    lastFailureAt?: string;
  }[];
  upcoming: {
    id: string;
    title: string;
    fireAt: string;
    fireAtLocal: string;
    status: NotificationLifecycle;
    zoneId?: string;
  }[];
  recent: {
    id: string;
    title: string;
    fireAt: string;
    status: NotificationLifecycle;
    attempts: number;
    lastError?: string;
    sentAt?: string;
    acknowledgedAt?: string;
    deliveries: string[];
  }[];
}
