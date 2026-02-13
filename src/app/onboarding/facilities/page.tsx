'use client';

import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { FacilitySearch } from '@/components/onboarding/facility-search';
import { useOnboardingStore } from '@/lib/store';
import { ROUTES } from '@/lib/platform/navigation';

export default function OnboardingStep3() {
  const router = useRouter();
  const { selectedFacilities, addFacility, removeFacility, setStep } = useOnboardingStore();

  const handleDone = () => {
    setStep(4);
    router.push(ROUTES.ONBOARDING_COMPLETE);
  };

  return (
    <div className="flex flex-col px-md py-md">
      <TopBar showBack title="관심 시설" />
      <StepIndicator current={3} total={4} className="mb-6" />
      <h2 className="mb-1 text-xl font-bold text-text-primary">관심 시설을 등록하세요</h2>
      <p className="mb-6 text-sm text-text-secondary">AI가 이 시설들을 중심으로 분석합니다.</p>
      <FacilitySearch
        selected={selectedFacilities}
        onAdd={addFacility}
        onRemove={removeFacility}
        onDone={handleDone}
      />
    </div>
  );
}
