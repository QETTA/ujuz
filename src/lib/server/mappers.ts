/**
 * UJUz Web - Engine output → Frontend type mappers
 */

import type { AdmissionScoreResultV2 as FrontendResult, EvidenceCardModel, Grade } from '../types';
import type { AdmissionScoreResultV2 as EngineResult } from './admissionEngineV2';

/** Map engine V2 output to frontend AdmissionScoreResultV2 */
export function mapEngineToFrontend(engine: EngineResult, ageBand = 0): FrontendResult {
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
