export type AgeClass = 'AGE_0' | 'AGE_1' | 'AGE_2' | 'AGE_3' | 'AGE_4' | 'AGE_5';

export type NotifyMode = 'instant' | 'digest';

export interface Facility {
  facility_id: string;
  name: string;
  board_region: string;
  region?: string;
  facility_type?: string;
  distance_km?: number;
  wait_months?: number;
}

export interface Probability {
  p_3m: number;
  p_6m: number;
  p_12m: number;
}

export interface EtaMonths {
  p50: number;
  p90: number;
}

export interface Uncertainty {
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string[];
}

export interface AdmissionScore {
  request_id: string;
  model_version: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  probability: Probability;
  eta_months: EtaMonths;
  uncertainty: Uncertainty;
}

export interface TOAlert {
  alert_id: string;
  anon_id: string;
  facility_id: string;
  age_class: AgeClass;
  notify_mode: NotifyMode;
  active: boolean;
  last_notified_at: string | null;
  created_at: string;
}

export type ConversationRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  title: string;
  messages: ConversationMessage[];
  updated_at: string;
}

export interface Subscription {
  plan: 'free' | 'basic' | 'premium';
  expires_at?: string | null;
  is_active: boolean;
}
