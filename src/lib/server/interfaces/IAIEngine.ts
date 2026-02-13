/**
 * Abstraction over the AI chat engine.
 * Allows swapping between botService, mock, or future LLM providers.
 */

export interface AIQueryInput {
  user_id: string;
  message: string;
  conversation_id?: string;
  context?: Record<string, unknown>;
}

export interface AIQueryResult {
  conversation_id: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    data_blocks?: Array<{
      type: string;
      title: string;
      content: string;
      confidence: number;
      source?: string;
    }>;
    created_at: string;
  };
  suggestions: string[];
}

export interface AIEngineMeta {
  version: string;
  model: string;
  maxTokens: number;
}

export interface IAIEngine {
  query(input: AIQueryInput): Promise<AIQueryResult>;
  getMeta(): AIEngineMeta;
}
