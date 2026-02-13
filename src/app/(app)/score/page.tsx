'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { ScoreResultPanel } from '@/components/composites/ScoreResultPanel';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useAdmissionStore } from '@/lib/store';
import { clientApiFetch } from '@/lib/client/api';
import { PRIORITIES, PRIORITY_MAP } from '@/lib/constants';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import type { AdmissionScoreResultV2, Place } from '@/lib/types';

export default function ScorePage() {
  const result = useAdmissionStore((s) => s.result);
  const loading = useAdmissionStore((s) => s.loading);
  const setResult = useAdmissionStore((s) => s.setResult);
  const setLoading = useAdmissionStore((s) => s.setLoading);
  const setError = useAdmissionStore((s) => s.setError);
  const error = useAdmissionStore((s) => s.error);

  const [facilityName, setFacilityName] = useState('');
  const [ageBand, setAgeBand] = useState('2');
  const [priorityType, setPriorityType] = useState('일반');

  const handleCalculate = async () => {
    if (!facilityName.trim()) return;
    setLoading(true);

    try {
      const data = await clientApiFetch<AdmissionScoreResultV2>('/api/v1/admission/score-by-name', {
        method: 'POST',
        json: {
          facility_name: facilityName,
          child_age_band: parseInt(ageBand),
          priority_type: PRIORITY_MAP[priorityType] ?? 'general',
        },
      });

      const facility: Place = {
        id: data.facilityId,
        name: data.facilityName,
        address: '',
        regionKey: data.regionKey,
      };

      setResult(data, facility);
    } catch (err) {
      setError(err instanceof Error ? err.message : '계산에 실패했습니다');
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="입소 확률 계산기" />

      <div className="space-y-6 p-4">
        {/* Form */}
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <Input
            label="어린이집 이름"
            placeholder="예: 강남구립 세곡어린이집"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
          />
          <Select
            label="아이 나이"
            options={Array.from({ length: 6 }, (_, i) => ({
              value: String(i),
              label: `만 ${i}세`,
            }))}
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value)}
          />
          <Select
            label="우선순위 유형"
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            value={priorityType}
            onChange={(e) => setPriorityType(e.target.value)}
          />
          <Button
            onClick={handleCalculate}
            loading={loading}
            className="w-full"
            size="lg"
          >
            <CalculatorIcon className="h-5 w-5" />
            확률 계산하기
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
        )}

        {/* Result */}
        {result ? (
          <ScoreResultPanel result={result} />
        ) : (
          !loading && (
            <EmptyState
              icon={<CalculatorIcon className="h-8 w-8" />}
              title="계산 결과가 여기에 표시됩니다"
              description="어린이집 이름과 아이 정보를 입력하고 계산하기를 누르세요"
            />
          )
        )}
      </div>
    </div>
  );
}
