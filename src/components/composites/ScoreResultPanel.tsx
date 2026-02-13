'use client';

import { cn } from '@/lib/utils';
import type { AdmissionScoreResultV2 } from '@/lib/types';
import { ScoreGauge } from './ScoreGauge';
import { EvidenceCard } from './EvidenceCard';
import EvidenceLabel from '@/components/data/EvidenceLabel';
import DisclaimerBanner from '@/components/data/DisclaimerBanner';

interface ScoreResultPanelProps {
  result: AdmissionScoreResultV2;
  className?: string;
}

export function ScoreResultPanel({ result, className }: ScoreResultPanelProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Gauge */}
      <ScoreGauge score={result.score} grade={result.grade} />

      {/* Wait time */}
      <div className="rounded-xl bg-surface-elevated p-4 text-center">
        <p className="text-sm text-text-secondary">예상 대기 기간</p>
        <p className="mt-1 text-2xl font-bold text-text-primary">
          약 {result.waitMonthsMedian}개월
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">
          (80% 확률: {result.waitMonthsP80}개월 이내)
        </p>
      </div>

      {/* Probability */}
      <div className="flex items-center justify-between rounded-xl bg-surface-elevated p-4">
        <div>
          <p className="text-sm text-text-secondary">6개월 입소 확률</p>
          <p className="text-xl font-bold text-text-primary">
            {(result.probability * 100).toFixed(0)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-secondary">신뢰도</p>
          <p className="text-xl font-bold text-text-primary">
            {(result.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Evidence cards */}
      {result.evidenceCards.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">분석 근거</h3>
          <EvidenceLabel
            dataSource="공공데이터 (data.go.kr)"
            lastUpdated={result.updatedAt}
            className="mb-2"
          />
          <div className="space-y-2">
            {result.evidenceCards.map((card, i) => (
              <EvidenceCard key={`${card.type}-${i}`} evidence={card} />
            ))}
          </div>
        </div>
      )}

      {/* Heuristic mode notice */}
      {result.isHeuristicMode && (
        <p className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
          이 결과는 제한된 데이터를 기반으로 한 추정치입니다. 실제 결과와 다를 수 있습니다.
        </p>
      )}

      {/* Disclaimer */}
      <DisclaimerBanner variant="prominent" />
    </div>
  );
}
