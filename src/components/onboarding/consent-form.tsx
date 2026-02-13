'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const consentItems = [
  { key: 'data', label: '아동 데이터 수집 및 활용 동의', required: true, description: 'AI 분석을 위해 아이의 나이, 우선순위 등 비식별 정보를 활용합니다.' },
  { key: 'ai', label: 'AI 예측 결과 이해 확인', required: true, description: 'AI 예측은 참고용이며, 실제 입소 결과와 다를 수 있음을 이해합니다.' },
  { key: 'terms', label: '서비스 이용약관 동의', required: true, description: '우주지 서비스 이용약관에 동의합니다.' },
  { key: 'marketing', label: '마케팅 정보 수신 동의 (선택)', required: false, description: '신규 기능 및 이벤트 소식을 받아보실 수 있습니다.' },
];

export interface ConsentFormProps {
  onSubmit: (consent: Record<string, boolean>) => void;
}

export function ConsentForm({ onSubmit }: ConsentFormProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allRequired = consentItems.filter((c) => c.required).every((c) => checked[c.key]);

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
            <p className="text-sm font-medium text-text-primary">
              {item.label}
              {item.required && <span className="ml-1 text-danger">*</span>}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">{item.description}</p>
          </div>
        </label>
      ))}

      <Button onClick={() => onSubmit(checked)} disabled={!allRequired} className="w-full">
        동의하고 계속
      </Button>
    </div>
  );
}
