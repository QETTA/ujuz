'use client';

import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { ChildForm, type ChildFormData } from '@/components/onboarding/child-form';
import { useOnboardingStore } from '@/lib/store';
import { ROUTES } from '@/lib/platform/navigation';
import type { ChildProfile } from '@/lib/types';

export default function OnboardingStep1() {
  const router = useRouter();
  const { setChild, setStep } = useOnboardingStore();

  const handleSubmit = (data: ChildFormData) => {
    setChild({
      nickname: data.nickname,
      birthDateMasked: `${data.birthMonth}-**`,
      priorityType: data.priorityType as ChildProfile['priorityType'],
    });
    setStep(2);
    router.push(ROUTES.ONBOARDING_CONSENT);
  };

  return (
    <div className="flex flex-col px-md py-md">
      <TopBar showBack title="아이 정보" />
      <StepIndicator current={1} total={4} className="mb-6" />
      <h2 className="mb-1 text-xl font-bold text-text-primary">아이 정보를 입력해 주세요</h2>
      <p className="mb-6 text-sm text-text-secondary">AI 입소 분석에 사용됩니다.</p>
      <ChildForm onSubmit={handleSubmit} />
    </div>
  );
}
