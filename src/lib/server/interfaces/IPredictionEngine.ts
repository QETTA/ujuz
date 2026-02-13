/**
 * Abstraction over the admission prediction engine.
 * Allows swapping between admissionEngineV2, mock, or future ML models.
 */

import type { AdmissionScoreResultV2 } from '../admissionTypes';

export interface PredictionInput {
  facility_id: string;
  child_age_band: number;
  waiting_position?: number;
  priority_type?: string;
}

export interface PredictionMeta {
  version: string;
  lastUpdated: string;
  supportedAgeBands: number[];
}

export interface IPredictionEngine {
  predict(input: PredictionInput): Promise<AdmissionScoreResultV2>;
  batchPredict(inputs: PredictionInput[]): Promise<AdmissionScoreResultV2[]>;
  getMeta(): PredictionMeta;
}
