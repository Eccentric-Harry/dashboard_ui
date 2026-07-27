// Endpoint descriptors + base-URL resolution.
// One base today; API_BASE keeps a single member as an extension point for
// future microservices (matches the target blueprint's buildAPI shape).

export const API_BASE = { BACKEND: 'BACKEND' } as const;
export type ApiBaseKey = keyof typeof API_BASE;

export const CONFIG = {
  BACKEND_API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
} as const;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Declarative endpoint descriptor. `url` may be a function of path params so
 * REST resources interpolate cleanly (e.g. /finance/transactions/{id}).
 */
export interface ApiEndpoint<P = void> {
  url: string | ((params: P) => string);
  method: HttpMethod;
  urlBase?: ApiBaseKey; // defaults to BACKEND
}

export interface ResolvedEndpoint {
  url: string;
  method: HttpMethod;
}

export const buildAPI = <P>(endpoint: ApiEndpoint<P>, params: P): ResolvedEndpoint => {
  const path = typeof endpoint.url === 'function' ? endpoint.url(params) : endpoint.url;
  // Single base today; switch on endpoint.urlBase here when microservices arrive.
  const base = CONFIG.BACKEND_API_BASE_URL;
  return { method: endpoint.method, url: `${base}${path}` };
};
