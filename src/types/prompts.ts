// Prompt library domain types — single source of truth.

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Request DTOs ──
export interface PromptRequest {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}
