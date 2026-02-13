import type { AdmissionCalcRequest, AdmissionCalcResponse, EvidenceCard, Grade, UncertaintyBand } from './types';

const MODEL_VERSION = 'admission-bayes@1.0.0';

type EngineResult = Omit<AdmissionCalcResponse, 'request_id'>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gradeFromP6(p6: number): Grade {
  if (p6 >= 0.75) return 'A';
  if (p6 >= 0.55) return 'B';
  if (p6 >= 0.4) return 'C';
  if (p6 >= 0.25) return 'D';
  if (p6 >= 0.1) return 'E';
  return 'F';
}

function computeUncertainty(request: AdmissionCalcRequest): { band: UncertaintyBand; notes: string[] } {
  if (request.wait_rank == null) {
    return { band: 'HIGH', notes: ['대기순번 미입력'] };
  }
  if (request.facility_scope.mode === 'SHORTLIST') {
    return { band: 'LOW', notes: [] };
  }
  return { band: 'MEDIUM', notes: [] };
}

function buildEvidenceCards(request: AdmissionCalcRequest, p6: number): EvidenceCard[] {
  const seasonalPositive = request.desired_start_month === '2026-03' || request.desired_start_month === '2026-09';
  const hasWaitRank = request.wait_rank != null;
  const shortWait = hasWaitRank && request.wait_rank <= 20;
  const moderateWait = hasWaitRank && request.wait_rank <= 30;

  const cards: EvidenceCard[] = [];

  cards.push({
    id: 'REGION_COMPETITION',
    title: '지역 경쟁도',
    summary: `${request.region.label}의 입소 경쟁을 반영했습니다.`,
    signals: [
      {
        name: '지역 경쟁도',
        direction: p6 >= 0.4 ? 'POSITIVE' : 'NEGATIVE',
        strength: p6 >= 0.4 ? 'MEDIUM' : 'HIGH',
      },
    ],
    confidence: p6 >= 0.45 ? 'MEDIUM' : 'LOW',
    disclaimer: '지역별 대기열 상황은 변동될 수 있습니다.',
  });

  cards.push({
    id: 'YOUR_POSITION',
    title: '현재 대기순번',
    summary: hasWaitRank
      ? `현재 대기순번 ${request.wait_rank}순위가 반영되었습니다.`
      : '대기순번 정보가 없어 위치 추정 신뢰도가 낮습니다.',
    signals: [
      {
        name: '대기순번',
        direction: hasWaitRank && shortWait ? 'POSITIVE' : hasWaitRank && moderateWait ? 'NEUTRAL' : 'NEGATIVE',
        strength: !hasWaitRank ? 'LOW' : moderateWait ? 'MEDIUM' : 'HIGH',
      },
    ],
    confidence: hasWaitRank ? 'MEDIUM' : 'LOW',
    disclaimer: '순번 데이터는 기관별로 상이합니다.',
  });

  cards.push({
    id: 'SEASONALITY',
    title: '입소 시기 패턴',
    summary: seasonalPositive
      ? '신청 희망 달의 계절성 가점을 반영했습니다.'
      : '계절적 반영은 일반 가중치로 처리했습니다.',
    signals: [
      {
        name: request.desired_start_month,
        direction: seasonalPositive ? 'POSITIVE' : 'NEUTRAL',
        strength: seasonalPositive ? 'LOW' : 'MEDIUM',
      },
    ],
    confidence: 'LOW',
    disclaimer: '계절 가점은 연도별로 달라질 수 있습니다.',
  });

  cards.push({
    id: 'ACTIONS',
    title: '실행 힌트',
    summary: request.facility_scope.mode === 'SHORTLIST'
      ? '대기열 단축 가설이 높아지는 구간을 중심으로 정리했습니다.'
      : '현재 입력 조건 기반으로 우선순위 권장액션을 제안합니다.',
    signals: [
      {
        name: '보너스 반영',
        direction: request.bonuses.length >= 2 ? 'POSITIVE' : request.bonuses.length === 1 ? 'NEUTRAL' : 'NEGATIVE',
        strength: request.bonuses.length >= 2 ? 'HIGH' : request.bonuses.length === 1 ? 'MEDIUM' : 'LOW',
      },
    ],
    confidence: request.bonuses.length >= 1 ? 'MEDIUM' : 'LOW',
    disclaimer: '실행 항목은 실무 규정에 따라 실제 효과가 달라집니다.',
  });

  return cards;
}

export function calculateAdmission(request: AdmissionCalcRequest): EngineResult {
  let base = 0.15;
  if (request.wait_rank != null) {
    base += clamp(0.35 - Math.log(request.wait_rank + 1) * 0.08, -0.1, 0.35);
  }
  base += request.bonuses.length * 0.03;
  if (request.desired_start_month === '2026-03' || request.desired_start_month === '2026-09') {
    base += 0.04;
  }

  const p6 = clamp(base, 0.02, 0.9);
  const p3 = clamp(p6 * 0.65, 0.01, p6);
  const p12 = clamp(1 - (1 - p6) * 0.55, p6, 0.98);
  const etaP50 = Math.round(clamp(12 * (1 - p6), 1, 18));
  const etaP90 = Math.min(24, etaP50 + 6);

  const uncertainty = computeUncertainty(request);

  const grade = gradeFromP6(p6);
  const evidence_cards = buildEvidenceCards(request, p6);

  return {
    model_version: MODEL_VERSION,
    result: {
      grade,
      probability: {
        p_3m: Number(p3.toFixed(4)),
        p_6m: Number(p6.toFixed(4)),
        p_12m: Number(p12.toFixed(4)),
      },
      eta_months: {
        p50: etaP50,
        p90: etaP90,
      },
      uncertainty,
    },
    evidence_cards,
    next_ctas: [
      { type: 'EXPLAIN', label: '상세 설명 보기' },
      { type: 'TO_ALERT', label: '입소 알림 받기' },
    ],
  };
}
