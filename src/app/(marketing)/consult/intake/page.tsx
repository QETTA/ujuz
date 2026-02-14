'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type PackageId = 'pkg_basic' | 'pkg_standard' | 'pkg_premium';
type InputType = 'text' | 'month' | 'number' | 'textarea';

interface Question {
  id: string;
  label: string;
  placeholder: string;
  type: InputType;
}

interface DraftPayload {
  package_id: PackageId;
  answers: Record<string, string>;
}

interface CreateOrderResponse {
  order_id: string;
  status: string;
}

const STORAGE_KEY = 'consult-intake-draft-v1';

const REQUIRED_QUESTIONS: Question[] = [
  { id: 'target_region', label: '희망 지역', placeholder: '예: 서울 강남구', type: 'text' },
  { id: 'desired_start_month', label: '희망 시작 월', placeholder: 'YYYY-MM', type: 'month' },
  { id: 'child_age_years', label: '아이 나이(만)', placeholder: '예: 4', type: 'number' },
  { id: 'household_type', label: '가정 상황', placeholder: '예: 맞벌이, 외벌이', type: 'text' },
  { id: 'top_priority', label: '가장 중요한 기준', placeholder: '예: 통학거리, 교육 철학', type: 'text' },
];

const OPTIONAL_QUESTIONS: Question[] = [
  { id: 'preferred_facility_1', label: '선호 시설 1', placeholder: '예: OO어린이집', type: 'text' },
  { id: 'preferred_facility_2', label: '선호 시설 2', placeholder: '예: OO유치원', type: 'text' },
  { id: 'budget_range', label: '예산 범위', placeholder: '예: 월 40만원 이하', type: 'text' },
  { id: 'visit_availability', label: '방문 가능 시간대', placeholder: '예: 평일 저녁, 주말 오전', type: 'text' },
  { id: 'additional_notes', label: '추가 요청사항', placeholder: '상세 요청을 자유롭게 입력해 주세요', type: 'textarea' },
];

const PACKAGE_OPTIONS = [
  { value: 'pkg_basic', label: 'Basic (49,000원)' },
  { value: 'pkg_standard', label: 'Standard (99,000원)' },
  { value: 'pkg_premium', label: 'Premium (149,000원)' },
] as const;

const ALL_QUESTION_IDS = [...REQUIRED_QUESTIONS, ...OPTIONAL_QUESTIONS].map((q) => q.id);

function isPackageId(value: unknown): value is PackageId {
  return value === 'pkg_basic' || value === 'pkg_standard' || value === 'pkg_premium';
}

function trackEvent(eventName: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('ujuz:analytics', {
      detail: { event: eventName, ...props },
    }),
  );

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('event', eventName, props ?? {});
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message && error.message !== '[object Object]') {
    return error.message;
  }
  return '제출 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
}

export default function ConsultIntakePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPackageId = searchParams.get('package_id');

  const [packageId, setPackageId] = useState<PackageId>('pkg_standard');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const requiredCompleted = useMemo(
    () => REQUIRED_QUESTIONS.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [answers],
  );
  const optionalCompleted = useMemo(
    () => OPTIONAL_QUESTIONS.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [answers],
  );

  const progressValue = Math.round((requiredCompleted / REQUIRED_QUESTIONS.length) * 100);
  const submitDisabled = isSubmitting || requiredCompleted < REQUIRED_QUESTIONS.length;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawDraft = window.localStorage.getItem(STORAGE_KEY);
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft) as Partial<DraftPayload>;
        if (isPackageId(parsed.package_id)) {
          setPackageId(parsed.package_id);
        }
        if (parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)) {
          const safeAnswers: Record<string, string> = {};
          for (const key of ALL_QUESTION_IDS) {
            const value = (parsed.answers as Record<string, unknown>)[key];
            if (typeof value === 'string') {
              safeAnswers[key] = value;
            }
          }
          setAnswers(safeAnswers);
        }
      } catch {
        // ignore invalid draft payload
      }
    }

    if (isPackageId(queryPackageId)) {
      setPackageId(queryPackageId);
    }

    trackEvent('consult_intake_start', {
      package_id: isPackageId(queryPackageId) ? queryPackageId : undefined,
    });

    setIsHydrated(true);
  }, [queryPackageId]);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    const payload: DraftPayload = {
      package_id: packageId,
      answers,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [answers, isHydrated, packageId]);

  const updateAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (requiredCompleted < REQUIRED_QUESTIONS.length) {
      setErrorMessage('필수 질문 5개를 모두 입력해 주세요.');
      return;
    }

    const normalizedAnswers: Record<string, string> = {};
    for (const key of ALL_QUESTION_IDS) {
      const value = answers[key]?.trim();
      if (value) {
        normalizedAnswers[key] = value;
      }
    }

    setIsSubmitting(true);
    try {
      const order = await apiFetch<CreateOrderResponse>('/api/v1/consultations/orders', {
        method: 'POST',
        json: { package_id: packageId },
      });

      await apiFetch<{ status: string }>(
        `/api/v1/consultations/orders/${encodeURIComponent(order.order_id)}/intake`,
        {
          method: 'POST',
          json: { answers: normalizedAnswers },
        },
      );

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      trackEvent('consult_intake_submit_success', {
        order_id: order.order_id,
        package_id: packageId,
      });

      router.push(`/consult/payment?orderId=${encodeURIComponent(order.order_id)}`);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      trackEvent('consult_intake_submit_fail', {
        package_id: packageId,
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <TopBar showBack title="상담 사전 설문" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Card className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">진행률</p>
            <p className="text-xs text-text-secondary">필수 {requiredCompleted}/5 완료</p>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
            className="h-2 w-full overflow-hidden rounded-full bg-surface-inset"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <p className="text-xs text-text-tertiary">
            선택 {optionalCompleted}/5 완료 · 입력 내용은 자동 임시저장됩니다.
          </p>

          <Select
            label="상담 패키지"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value as PackageId)}
            options={PACKAGE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-base font-semibold text-text-primary">필수 질문 (5)</h2>
            {REQUIRED_QUESTIONS.map((question) => (
              <div key={question.id}>
                {question.type === 'textarea' ? (
                  <Textarea
                    label={`${question.label} *`}
                    placeholder={question.placeholder}
                    value={answers[question.id] ?? ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    className="min-h-28"
                    required
                  />
                ) : (
                  <Input
                    label={`${question.label} *`}
                    placeholder={question.placeholder}
                    type={question.type}
                    value={answers[question.id] ?? ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    inputMode={question.type === 'number' ? 'numeric' : undefined}
                    min={question.type === 'number' ? 0 : undefined}
                    max={question.type === 'number' ? 12 : undefined}
                    required
                  />
                )}
              </div>
            ))}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-base font-semibold text-text-primary">선택 질문 (5)</h2>
            {OPTIONAL_QUESTIONS.map((question) => (
              <div key={question.id}>
                {question.type === 'textarea' ? (
                  <Textarea
                    label={question.label}
                    placeholder={question.placeholder}
                    value={answers[question.id] ?? ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    className="min-h-28"
                  />
                ) : (
                  <Input
                    label={question.label}
                    placeholder={question.placeholder}
                    type={question.type}
                    value={answers[question.id] ?? ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    inputMode={question.type === 'number' ? 'numeric' : undefined}
                  />
                )}
              </div>
            ))}
          </Card>

          {errorMessage && (
            <p className="text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" loading={isSubmitting} disabled={submitDisabled}>
            {submitDisabled && !isSubmitting ? '필수 질문을 모두 입력해 주세요' : '제출하고 결제 단계로 이동'}
          </Button>
        </form>
      </main>
    </div>
  );
}
