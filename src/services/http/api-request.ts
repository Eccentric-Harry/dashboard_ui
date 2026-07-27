// Unified transport: ApiRequest.safeCall<T>() never throws. It returns a
// SafeResult<T> with the envelope already unwrapped to `data` (+ `meta`), or a
// normalized `error`. Every service method is a one-liner over `instance`.

import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { axiosClient } from './axios-client';
import { buildAPI } from '../api-config';
import type { ApiEndpoint } from '../api-config';
import type { ApiEnvelope, ApiError, SafeResult } from '../../types/api';

export interface RequestOptions<P = unknown, B = unknown> {
  params?: P; // path params consumed by url(params)
  query?: Record<string, string | number | boolean | undefined>;
  body?: B;
  raw?: boolean; // true → skip envelope unwrap (e.g. /auth/* endpoints)
  signal?: AbortSignal;
}

type BackendErrorBody = { data?: { message?: string }; message?: string };

export class ApiRequest {
  private call<T>(endpoint: ApiEndpoint<unknown>, opts: RequestOptions): Promise<AxiosResponse<T>> {
    const { url, method } = buildAPI(endpoint, opts.params);
    return axiosClient.request<T>({
      url,
      method,
      params: opts.query,
      data: opts.body,
      signal: opts.signal,
    });
  }

  async safeCall<T>(
    endpoint: ApiEndpoint<never>,
    opts: RequestOptions = {},
  ): Promise<SafeResult<T>> {
    const result: SafeResult<T> = {
      data: undefined,
      meta: undefined,
      status: '',
      httpStatus: undefined,
      error: undefined,
    };
    try {
      if (opts.raw) {
        const res = await this.call<T>(endpoint as ApiEndpoint<unknown>, opts);
        result.data = res.data;
        result.status = res.statusText;
        result.httpStatus = res.status;
      } else {
        const res = await this.call<ApiEnvelope<T>>(endpoint as ApiEndpoint<unknown>, opts);
        result.data = res.data?.data; // envelope unwrap
        result.meta = res.data?.meta;
        result.status = res.statusText;
        result.httpStatus = res.status;
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        result.error = { message: 'Request cancelled', cause: err };
      } else {
        const ax = err as AxiosError<BackendErrorBody>;
        const errorInfo: ApiError = {
          message:
            ax.response?.data?.data?.message ??
            ax.response?.data?.message ??
            ax.message ??
            'Request failed',
          httpStatus: ax.response?.status,
          body: ax.response?.data,
          cause: err,
        };
        result.error = errorInfo;
      }
    }
    return result;
  }
}

export const instance = new ApiRequest();
