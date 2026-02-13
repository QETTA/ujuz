'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnboardingStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { PRIORITY_MAP } from '@/lib/constants';
import { ROUTES } from '@/lib/platform/navigation';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function OnboardingComplete() {
  const router = useRouter();
  const { child, selectedFacilities, reset } = useOnboardingStore();
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        // Save child profile
        if (child?.nickname) {
          const birthParts = child.birthDateMasked?.split('-');
          const birthMonth = birthParts ? `${birthParts[0]}-${birthParts[1]}` : '2023-01';
          await apiFetch('/api/v1/children', {
            method: 'POST',
            json: {
              nickname: child.nickname,
              birth_date: birthMonth,
              age_band: child.ageBand ?? 2,
              priority_type: PRIORITY_MAP[child.priorityType ?? '일반'] ?? 'general',
            },
          });
        }

        // Follow facilities
        for (const f of selectedFacilities) {
          await apiFetch('/api/v1/facilities/follow', {
            method: 'POST',
            json: { facility_id: f.id, facility_name: f.name },
          });
        }
      } catch {
        // Non-fatal
      } finally {
        setAnalyzing(false);
      }
    };
    run();
  }, [child, selectedFacilities]);

  const goHome = () => {
    reset();
    router.push(ROUTES.HOME);
  };

  return (
    <div className="flex flex-col items-center px-md py-md">
      <StepIndicator current={4} total={4} className="mb-8 w-full" />

      {analyzing ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <Skeleton variant="circular" className="h-16 w-16" />
          <p className="text-lg font-semibold text-text-primary">AI 분석 중...</p>
          <p className="text-sm text-text-secondary">맞춤 입소 전략을 준비하고 있습니다</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
            <SparklesIcon className="h-8 w-8 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">준비 완료!</h2>
          <p className="text-sm text-text-secondary">
            {selectedFacilities.length}개 시설에 대한 입소 전략이 준비되었습니다.
          </p>
          <Button onClick={goHome} className="mt-4">
            홈으로 이동
          </Button>
        </div>
      )}
    </div>
  );
}
