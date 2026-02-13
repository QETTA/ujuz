'use client';

import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';

const consentItems = [
  { key: 'data', label: '아동 데이터 수집 및 활용 동의', required: true, description: 'AI 분석을 위해 아이의 나이, 우선순위 등 비식별 정보를 활용합니다.' },
  { key: 'ai', label: 'AI 예측 결과 이해 확인', required: true, description: 'AI 예측은 참고용이며, 실제 입소 결과와 다를 수 있음을 이해합니다.' },
  { key: 'terms', label: '서비스 이용약관 동의', required: true, description: '우주지 서비스 이용약관에 동의합니다.' },
  { key: 'marketing', label: '마케팅 정보 수신 동의 (선택)', required: false, description: '신규 기능 및 이벤트 소식을 받아보실 수 있습니다.' },
];

export interface ConsentFormProps {
  onSubmit: (consent: Record<string, boolean>) => void;
  isSubmitting?: boolean;
}

export function ConsentForm({ onSubmit, isSubmitting = false }: ConsentFormProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const requiredItems = consentItems.filter((c) => c.required);
  const completedRequiredCount = requiredItems.filter((c) => checked[c.key]).length;
  const requiredTotalCount = requiredItems.length;

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allRequired = completedRequiredCount === requiredTotalCount;
  const progressLabel = `${completedRequiredCount}/${requiredTotalCount} 필수 항목 완료`;

  return (
    <div className="space-y-4">
      {consentItems.map((item) => (
        <label key={item.key} className="flex items-start gap-3 rounded-lg p-2 hover:bg-surface-inset">
          <input
            type="checkbox"
            checked={!!checked[item.key]}
            onChange={() => toggle(item.key)}
            className="mt-0.5 h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          <div>
            <p className="flex items-center gap-1 text-sm font-medium text-text-primary">
              <span>{item.label}</span>
              {item.required && <span className="text-danger">*</span>}
              {item.required && checked[item.key] && (
                <CheckCircleIcon className="h-4 w-4 text-success" aria-hidden="true" />
              )}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">{item.description}</p>
          </div>
        </label>
      ))}

      <div aria-live="polite" role="status" className="rounded-lg bg-surface-inset px-3 py-2">
        <p className="text-sm text-text-secondary">{progressLabel}</p>
      </div>

      <Button onClick={() => onSubmit(checked)} disabled={!allRequired || isSubmitting} className="w-full">
        {isSubmitting ? '저장 중...' : '동의하고 계속'}
      </Button>
    </div>
  );
}
