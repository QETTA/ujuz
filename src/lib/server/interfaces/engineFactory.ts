/**
 * Engine Factory — wraps admissionEngineV2 and botService into interface-driven adapters.
 */

import type { IPredictionEngine, PredictionInput, PredictionMeta } from './IPredictionEngine';
import type { IAIEngine, AIQueryInput, AIQueryResult, AIEngineMeta } from './IAIEngine';
import { calculateAdmissionScoreV2 } from '../admissionEngineV2';
import { ENGINE_VERSION } from '../admissionMath';
import type { AdmissionScoreInputV2 } from '../admissionTypes';
import { processQuery } from '../botService';

// ── Prediction Engine Adapter ────────────────────────────

class AdmissionPredictionEngine implements IPredictionEngine {
  async predict(input: PredictionInput) {
    const engineInput: AdmissionScoreInputV2 = {
      facility_id: input.facility_id,
      child_age_band: String(input.child_age_band) as AdmissionScoreInputV2['child_age_band'],
      waiting_position: input.waiting_position,
      priority_type: (input.priority_type ?? 'general') as AdmissionScoreInputV2['priority_type'],
    };
    return calculateAdmissionScoreV2(engineInput);
  }

  async batchPredict(inputs: PredictionInput[]) {
    return Promise.all(inputs.map((i) => this.predict(i)));
  }

  getMeta(): PredictionMeta {
    return {
      version: ENGINE_VERSION,
      lastUpdated: new Date().toISOString(),
      supportedAgeBands: [0, 1, 2, 3, 4, 5],
    };
  }
}

// ── AI Engine Adapter ────────────────────────────────────

class BotAIEngine implements IAIEngine {
  async query(input: AIQueryInput): Promise<AIQueryResult> {
    const result = await processQuery({
      user_id: input.user_id,
      message: input.message,
      conversation_id: input.conversation_id,
      context: input.context as Record<string, unknown> | undefined,
    });
    return {
      conversation_id: result.conversation_id,
      message: {
        id: result.message.id,
        role: 'assistant',
        content: result.message.content,
        data_blocks: result.message.data_blocks,
        created_at: result.message.created_at,
      },
      suggestions: result.suggestions,
    };
  }

  getMeta(): AIEngineMeta {
    return {
      version: '1.0.0',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
    };
  }
}

// ── Singletons ───────────────────────────────────────────

let predictionEngine: IPredictionEngine | null = null;
let aiEngine: IAIEngine | null = null;

export function getPredictionEngine(): IPredictionEngine {
  if (!predictionEngine) predictionEngine = new AdmissionPredictionEngine();
  return predictionEngine;
}

export function getAIEngine(): IAIEngine {
  if (!aiEngine) aiEngine = new BotAIEngine();
  return aiEngine;
}
