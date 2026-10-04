// The writes The Lighthouse's sheets can make. The world implements them (service call →
// store → Pip's reaction, sound and celebration) and hands one object down, so a sheet never
// talks to the service or the store directly.

import type {
  ProgramAssessment,
  ProgramAssessmentPayload,
  ProgramLetterKey,
  ProgramLog,
  ProgramLogPayload,
  ProgramMedia,
  ProgramMediaPayload,
  ProgramReviewPayload,
  ProgramSettingsPayload,
} from '@/types/program'

export interface LogOptions {
  /** What Pip should name ("Week 2 · run 1"). */
  detail?: string
  /** Where the celebration bursts from. */
  anchor?: HTMLElement | null
  /** The sound already played at the gesture — don't play it again when the server answers. */
  soundPlayed?: boolean
}

export interface LighthouseApi {
  addLog(payload: ProgramLogPayload, opts?: LogOptions): Promise<ProgramLog | null>
  updateLog(id: string, payload: ProgramLogPayload, opts?: LogOptions): Promise<ProgramLog | null>
  deleteLog(id: string): Promise<boolean>
  saveSettings(payload: ProgramSettingsPayload, message?: string): Promise<boolean>
  writeLetter(key: ProgramLetterKey, text: string): Promise<boolean>
  saveReview(weekStart: string, payload: ProgramReviewPayload): Promise<boolean>
  addAssessment(payload: ProgramAssessmentPayload): Promise<ProgramAssessment | null>
  deleteAssessment(id: string): Promise<boolean>
  addMedia(payload: ProgramMediaPayload): Promise<ProgramMedia | null>
  deleteMedia(id: string): Promise<boolean>
}
