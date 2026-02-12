/**
 * Shared types for bot query processing and response generation.
 */

export type ChildAgeBand = '0' | '1' | '2' | '3' | '4' | '5';

export type PriorityType =
  | 'dual_income'
  | 'sibling'
  | 'single_parent'
  | 'multi_child'
  | 'disability'
  | 'low_income'
  | 'general';

export interface BotContext {
  facility_id?: string;
  child_id?: string;
  child_age_band?: ChildAgeBand;
  waiting_position?: number;
  priority_type?: PriorityType;
  location?: { lat: number; lng: number };
}

export interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BotDataBlock {
  type: string;
  title: string;
  content: string;
  confidence: number;
  source?: string;
}

// Backward-compatible aliases used by existing server modules.
export type ResponseContext = BotContext;
export type ChatMessage = ConversationHistoryMessage;
