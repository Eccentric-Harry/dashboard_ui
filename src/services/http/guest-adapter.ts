// Axios adapter for guest mode. Requests are answered from the in-memory guest
// dataset (mocks/guest-api.ts) without touching the network; the only exception is
// the auth flow, which the resolver hands back to the real network adapter.

import axios, { AxiosHeaders } from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';
import { resolveGuestRequest } from '@/mocks/guest-api';

export function createGuestAdapter(networkAdapter: AxiosAdapter): AxiosAdapter {
  return async (config): Promise<AxiosResponse> => {
    const guestResponse = resolveGuestRequest({
      url: axios.getUri(config),
      method: (config.method ?? 'get').toUpperCase(),
      body: typeof config.data === 'string' ? config.data : undefined,
    });

    if (guestResponse === null) {
      return networkAdapter(config);
    }

    // Serialize, exactly as a real response would arrive. Handing out references to the
    // mock dataset would let Immer auto-freeze it inside a store, and the next guest
    // mutation of that record would then throw.
    return {
      data: JSON.stringify(guestResponse.body),
      status: guestResponse.status,
      statusText: 'OK',
      headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
      config,
      request: undefined,
    };
  };
}
