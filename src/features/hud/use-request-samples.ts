// React view over the transport's request ring buffer, plus the in-flight GET
// count the OverlayLoader already tracks. Both are module-level subscriptions in
// services/http/, so this hook is the only place the HUD touches them.

import { useEffect, useState } from 'react';
import { subscribeToActiveRequests } from '@/services/http/axios-client';
import { subscribeToRequestSamples, type RequestSample } from '@/services/http/request-telemetry';

export function useRequestSamples(): readonly RequestSample[] {
  const [samples, setSamples] = useState<readonly RequestSample[]>([]);
  useEffect(() => subscribeToRequestSamples(setSamples), []);
  return samples;
}

export function useActiveRequestCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => subscribeToActiveRequests(setCount), []);
  return count;
}
