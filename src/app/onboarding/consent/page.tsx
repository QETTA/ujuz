'use client';

import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { ConsentForm } from '@/components/onboarding/consent-form';
import { useOnboardingStore } from '@/lib/store';
import { ROUTES } from '@/lib/platform/navigation';

export default function OnboardingStep2() {
  const router = useRouter();
  const { setConsentGiven, setStep } = useOnboardingStore();

  const handleSubmit = (consent: Record<string, boolean>) => {
    setConsentGiven(true);
    setStep(3);
    void consent;
    router.push(ROUTES.ONBOARDING_FACILITIES);
  };

  return (
    <div className="flex flex-col px-md py-md">
      <TopBar showBack title="동의" />
      <StepIndicator current={2} total={4} className="mb-6" />
      <h2 className="mb-1 text-xl font-bold text-text-primary">데이터 활용 동의</h2>
      <p className="mb-6 text-sm text-text-secondary">AI 기본법에 따라 아동 데이터 활용 동의가 필요합니다.</p>
      <ConsentForm onSubmit={handleSubmit} />
    </div>
  );
}
