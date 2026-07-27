// Strictly-typed Prompts service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { Prompt, PromptRequest } from '../types/prompts';
import * as E from './endpoints/prompts-endpoints';

export interface PromptsServiceInterface {
  getPrompts(): Promise<SafeResult<Prompt[]>>;
  createPrompt(dto: PromptRequest): Promise<SafeResult<Prompt>>;
  updatePrompt(id: string, dto: PromptRequest): Promise<SafeResult<Prompt>>;
  deletePrompt(id: string): Promise<SafeResult<unknown>>;
}

export const promptsService: PromptsServiceInterface = {
  getPrompts: () => instance.safeCall<Prompt[]>(E.API_GET_PROMPTS),
  createPrompt: (dto) => instance.safeCall<Prompt>(E.API_CREATE_PROMPT, { body: dto }),
  updatePrompt: (id, dto) => instance.safeCall<Prompt>(E.API_UPDATE_PROMPT, { params: { id }, body: dto }),
  deletePrompt: (id) => instance.safeCall(E.API_DELETE_PROMPT, { params: { id } }),
};
