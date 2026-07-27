// Prompts domain types. Re-exported from lib/api during migration.
export type { Prompt } from '../lib/api';

export interface PromptRequest {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}
