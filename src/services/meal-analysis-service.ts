// AI meal analysis — a long-running background job, orchestrated over two plain
// service calls: start the job (returns a jobId almost instantly), then poll its
// status until it reaches a terminal state. Each hop is short, so the analysis can't
// be lost to a proxy read-timeout the way a single ~90s request could, and because
// job status lives in the DB a dropped poll is simply retried on the next tick.
//
// Like safeCall, `analyze` never throws: it resolves with either the analysis or a
// typed MealAnalysisError the caller can branch on.

import { downscaleImages } from '@/lib/image-downscale';
import type { MealAnalysisApiResponse, MealAnalysisRequest } from '@/types/nutrition';
import { nutritionService } from './nutrition-service';

/**
 * - `rejected` — the backend refused to start the job (HTTP error or network failure).
 * - `failed`   — the job ran and reported FAILED.
 * - `timeout`  — the job never reached a terminal state before the deadline; it may
 *                still have completed server-side.
 */
export type MealAnalysisFailureKind = 'rejected' | 'failed' | 'timeout';

/** Pipeline sources that mean the meal was definitely not logged — no point reconciling. */
const DEFINITE_FAILURE_SOURCE = /validation-error|gemini-error|persistence-error/;
const GENERIC_FAILURE_SOURCE = 'meal-analysis-gemini-error';

export class MealAnalysisError extends Error {
  readonly kind: MealAnalysisFailureKind;
  /** Backend `meta.source` / job error source, e.g. `meal-analysis-validation-error`. */
  readonly source?: string;
  readonly httpStatus?: number;

  constructor(kind: MealAnalysisFailureKind, message: string, details: { source?: string; httpStatus?: number } = {}) {
    super(message);
    this.name = 'MealAnalysisError';
    this.kind = kind;
    this.source = details.source;
    this.httpStatus = details.httpStatus;
  }

  /**
   * True when the backend positively reported a business failure. Anything else
   * (timeouts, network blips, 5xx without a source) might still have persisted the
   * meal, so the caller should reconcile against stored entries before giving up.
   */
  get isDefinite(): boolean {
    return DEFINITE_FAILURE_SOURCE.test(this.source ?? '');
  }
}

export type MealAnalysisOutcome =
  | { data: MealAnalysisApiResponse; error?: undefined }
  | { data?: undefined; error: MealAnalysisError };

export interface MealAnalysisOptions {
  /**
   * Overall deadline for the job. Sized to the server's stage budget with room for one
   * fallback attempt: extraction 75s + narrative 45s, each able to fail over to the
   * secondary provider (~45s), lands the worst case near 210s.
   */
  deadlineMs?: number;
}

const DEFAULT_DEADLINE_MS = 240_000;
const POLL_INTERVAL_MS = 2_500;
const MAX_IMAGES = 3;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function sourceOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('meta' in body)) return undefined;
  const meta = (body as { meta?: { source?: unknown } }).meta;
  return typeof meta?.source === 'string' ? meta.source : undefined;
}

async function buildFormData({ files, description, mealType, date }: MealAnalysisRequest): Promise<FormData> {
  // Downscale before upload: vision models bill images by resolution, so a native 12MP
  // camera photo costs several times a 1MP render for no gain in identifying what is on
  // the plate. The backend downscales again independently.
  const images = await downscaleImages(files.slice(0, MAX_IMAGES).filter(Boolean));
  const formData = new FormData();
  // Repeated "files" parts — the backend binds List<MultipartFile>.
  images.forEach((image) => formData.append('files', image));
  const trimmed = description?.trim();
  if (trimmed) formData.append('description', trimmed);
  formData.append('mealType', mealType);
  formData.append('date', date);
  return formData;
}

export interface MealAnalysisServiceInterface {
  analyze(request: MealAnalysisRequest, options?: MealAnalysisOptions): Promise<MealAnalysisOutcome>;
}

export const mealAnalysisService: MealAnalysisServiceInterface = {
  analyze: async (request, { deadlineMs = DEFAULT_DEADLINE_MS } = {}) => {
    const started = await nutritionService.startMealAnalysis(await buildFormData(request));
    if (started.error) {
      return {
        error: new MealAnalysisError('rejected', started.error.message, {
          source: sourceOf(started.error.body),
          httpStatus: started.error.httpStatus,
        }),
      };
    }

    const jobId = started.data?.jobId;
    if (!jobId) {
      return {
        error: new MealAnalysisError('failed', 'Analysis job was not created', {
          source: GENERIC_FAILURE_SOURCE,
          httpStatus: started.httpStatus,
        }),
      };
    }

    const deadline = Date.now() + deadlineMs;
    while (Date.now() < deadline) {
      await wait(POLL_INTERVAL_MS);

      const poll = await nutritionService.getMealAnalysisJob(jobId);
      // Transient (a 404 from an instance that hasn't seen the write yet, a 5xx, a
      // network blip) — keep polling until the deadline.
      if (poll.error || !poll.data) continue;

      const { status, result, errorSource } = poll.data;
      if (status === 'COMPLETED' && result) {
        return { data: result };
      }
      if (status === 'FAILED') {
        return {
          error: new MealAnalysisError('failed', 'Meal analysis failed', {
            source: errorSource ? `meal-analysis-${errorSource}` : GENERIC_FAILURE_SOURCE,
          }),
        };
      }
      // PENDING / PROCESSING → keep waiting.
    }

    return {
      error: new MealAnalysisError('timeout', 'Analysis timed out while waiting for the result'),
    };
  },
};
