'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { ConsentForm } from '@/components/onboarding/consent-form';
import { useOnboardingStore } from '@/lib/store';
import { ROUTES } from '@/lib/platform/navigation';

export default function OnboardingStep2() {
  const router = useRouter();
  const { setConsentGiven, setStep } = useOnboardingStore();
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (consent: Record<string, boolean>) => {
    setIsSubmitting(true);
    setConsentGiven(true);
    setStep(3);
    setSubmitStatus('동의가 저장되었습니다. 다음 단계로 이동합니다.');
    void consent;
    setTimeout(() => {
      router.push(ROUTES.ONBOARDING_FACILITIES);
    }, 400);
  };

  return (
    <div className="flex flex-col px-4 py-4">
      <TopBar showBack title="동의" />
      <StepIndicator current={2} total={4} className="mb-6" />
      <h2 className="mb-1 text-xl font-bold text-text-primary">데이터 활용 동의</h2>
      <p className="mb-6 text-sm text-text-secondary">AI 기본법에 따라 아동 데이터 활용 동의가 필요합니다.</p>
      {submitStatus && (
        <p aria-live="polite" role="status" className="mb-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          {submitStatus}
        </p>
      )}
      <ConsentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
