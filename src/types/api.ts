// Transport-level contract shared by every service/store.
// The envelope mirrors the backend Java ApiResponse<T> / ApiMeta.

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  source: string;
}

/** Every backend response is wrapped in this shape. */
export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  message: string;
  httpStatus?: number;
  /** Raw backend error payload when present (envelope-shaped or `{ message }`). */
  body?: unknown;
  cause?: unknown;
}

/**
 * What every service method returns. The envelope is already unwrapped, so
 * `data` is the payload and `meta` is preserved separately. `error` is set
 * instead of thrown — callers never need try/catch.
 */
export interface SafeResult<T> {
  data: T | undefined;
  meta: ApiMeta | undefined;
  status: string;
  httpStatus: number | undefined;
  error: ApiError | undefined;
}
