'use client';

import { use, useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { FacilityDetailHeader } from '@/components/composites/FacilityDetailHeader';
import { ScoreResultPanel } from '@/components/composites/ScoreResultPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useApiFetch } from '@/lib/client/hooks/useApiFetch';
import { useOnboardingStore, useToAlertStore } from '@/lib/store';
import { ROUTES } from '@/lib/platform/navigation';
import { BellIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import type { AdmissionScoreResultV2 } from '@/lib/types';

interface FacilityDetail {
  _id: string;
  name: string;
  type: string;
  status: string;
  address?: { full?: string };
  phone?: string;
  capacity_current?: number;
  capacity_max?: number;
  extended_care?: boolean;
  operating_hours?: { open?: string; close?: string };
}

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const child = useOnboardingStore((s) => s.child);
  const ageBand = child?.ageBand ?? 2;
  const { data: facility, loading } = useApiFetch<FacilityDetail>(`/api/v1/facilities/${id}`);
  const { data: scoreResult } = useApiFetch<AdmissionScoreResultV2>(`/api/v1/simulate?facility_id=${id}&child_age_band=${ageBand}`);
  const subscribe = useToAlertStore((s) => s.subscribe);
  const [activeTab, setActiveTab] = useState('info');

  if (loading || !facility) {
    return (
      <div className="flex flex-col">
        <PageHeader title="시설 정보" backHref={ROUTES.SEARCH} />
        <div className="space-y-4 p-4">
          <Skeleton variant="rectangular" className="h-32" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title={facility.name} backHref={ROUTES.SEARCH} />

      <div className="space-y-6 p-4">
        <FacilityDetailHeader
          name={facility.name}
          type={facility.type}
          address={facility.address?.full}
          phone={facility.phone}
          grade={scoreResult?.grade}
          score={scoreResult?.score}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => subscribe(id, facility.name, [])}
          >
            <BellIcon className="h-4 w-4" />
            TO 알림 설정
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setActiveTab('score')}>
            <CalculatorIcon className="h-4 w-4" />
            입소 확률 계산
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="info">기본정보</TabsTrigger>
            <TabsTrigger value="score">입소분석</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="space-y-3 rounded-xl bg-surface-elevated p-4">
              <InfoRow label="정원" value={facility.capacity_max ? `${facility.capacity_max}명` : '-'} />
              <InfoRow label="현원" value={facility.capacity_current ? `${facility.capacity_current}명` : '-'} />
              <InfoRow label="연장보육" value={facility.extended_care ? '가능' : '미제공'} />
              <InfoRow
                label="운영시간"
                value={
                  facility.operating_hours
                    ? `${facility.operating_hours.open ?? '07:30'} ~ ${facility.operating_hours.close ?? '19:30'}`
                    : '-'
                }
              />
              <InfoRow label="상태" value={facility.status === 'active' ? '운영중' : '미운영'} />
            </div>
          </TabsContent>

          <TabsContent value="score">
            {scoreResult ? (
              <ScoreResultPanel result={scoreResult} />
            ) : (
              <div className="rounded-xl bg-surface-elevated p-6 text-center">
                <p className="text-sm text-text-secondary">입소 분석 데이터를 불러오는 중...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
