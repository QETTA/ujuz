'use client';

import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { useStrategyStore } from '@/lib/store';
import type { RecommendationInput } from '@/lib/types';

const AGE_OPTIONS = [
  { value: '0', label: '0세 (만 0세)' },
  { value: '1', label: '1세 (만 1세)' },
  { value: '2', label: '2세 (만 2세)' },
  { value: '3', label: '3세 (만 3세)' },
  { value: '4', label: '4세 (만 4세)' },
  { value: '5', label: '5세 (만 5세)' },
];

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    options.push({ value, label });
  }
  return options;
}

interface RecommendationFormProps {
  className?: string;
  onSubmit?: () => void;
}

export function RecommendationForm({ className, onSubmit }: RecommendationFormProps) {
  const analyze = useStrategyStore((s) => s.analyze);
  const loading = useStrategyStore((s) => s.loading);

  const [childAge, setChildAge] = useState<string>('2');
  const [startMonth, setStartMonth] = useState<string>(getMonthOptions()[0].value);
  const [needExtended, setNeedExtended] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const input: RecommendationInput = {
      user_context: {
        home: { lat: 37.5, lng: 127.0 }, // Default Seoul; real location from user
        child_age: childAge as RecommendationInput['user_context']['child_age'],
        start_month: startMonth,
        need_extended: needExtended,
      },
    };

    await analyze(input);
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Select
        label="아이 나이"
        options={AGE_OPTIONS}
        value={childAge}
        onChange={(e) => setChildAge(e.target.value)}
      />
      <Select
        label="입소 희망 시기"
        options={getMonthOptions()}
        value={startMonth}
        onChange={(e) => setStartMonth(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">연장보육 필요</span>
        <Toggle pressed={needExtended} onPressedChange={setNeedExtended} size="sm">
          {needExtended ? '필요' : '불필요'}
        </Toggle>
      </div>
      <Button type="submit" loading={loading} className="w-full" size="lg">
        AI 분석 시작
      </Button>
    </form>
  );
}
