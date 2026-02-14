/**
 * UJUz Web - Engine output → Frontend type mappers
 */

import type { Grade } from '../types';
import type { AdmissionScoreResultV2 as EngineResult, EvidenceCardV2 } from './admissionTypes';

/** Frontend evidence card (flattened for client rendering) */
export interface EvidenceCardModel {
  type: string;
  summary: string;
  strength: number;
  data: Record<string, unknown>;
  updatedAt: string;
}

/** Frontend admission result (flattened for client rendering) */
export interface FrontendAdmissionResult {
  facilityId: string;
  facilityName: string;
  ageBand: number;
  regionKey: string;
  waiting: number;
  effectiveWaiting: number;
  probability: number;
  score: number;
  grade: Grade;
  confidence: number;
  waitMonthsMedian: number;
  waitMonthsP80: number;
  evidenceCards: EvidenceCardModel[];
  updatedAt: string;
  isHeuristicMode?: boolean;
}

/** Map engine V2 output to frontend AdmissionScoreResultV2 */
export function mapEngineToFrontend(engine: EngineResult, ageBand = 0): FrontendAdmissionResult {
  return {
    facilityId: engine.facility_id,
    facilityName: engine.facility_name,
    ageBand,
    regionKey: engine.region_key,
    waiting: engine.effectiveWaiting,
    effectiveWaiting: engine.effectiveWaiting,
    probability: engine.probability,
    score: engine.score,
    grade: engine.grade,
    confidence: engine.confidence,
    waitMonthsMedian: engine.waitMonths.median,
    waitMonthsP80: engine.waitMonths.p80,
    evidenceCards: engine.evidenceCards.map(
      (ec): EvidenceCardModel => ({
        type: ec.type,
        summary: ec.summary,
        strength: ec.strength,
        data: ec.data,
        updatedAt: engine.asOf,
      }),
    ),
    updatedAt: engine.asOf,
    isHeuristicMode: engine.isHeuristicMode,
  };
}
