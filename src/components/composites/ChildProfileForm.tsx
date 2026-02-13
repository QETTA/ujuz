'use client';

import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { REGIONS, PRIORITIES } from '@/lib/constants';

interface ChildProfileFormProps {
  initialValues?: {
    nickname?: string;
    birthMonth?: string;
    ageBand?: string;
    priorityType?: string;
    regionKey?: string;
  };
  loading?: boolean;
  onSubmit: (values: {
    nickname: string;
    birth_date: string;
    age_band: number;
    priority_type: string;
    region_key: string;
  }) => void;
  className?: string;
}

const AGE_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  value: String(i),
  label: `만 ${i}세`,
}));

export function ChildProfileForm({ initialValues, loading, onSubmit, className }: ChildProfileFormProps) {
  const [nickname, setNickname] = useState(initialValues?.nickname ?? '');
  const [birthMonth, setBirthMonth] = useState(initialValues?.birthMonth ?? '');
  const [ageBand, setAgeBand] = useState(initialValues?.ageBand ?? '2');
  const [priorityType, setPriorityType] = useState(initialValues?.priorityType ?? '일반');
  const [regionKey, setRegionKey] = useState(initialValues?.regionKey ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      nickname,
      birth_date: birthMonth,
      age_band: parseInt(ageBand),
      priority_type: priorityType,
      region_key: regionKey,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Input
        label="아이 닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="예: 하늘이"
        required
        maxLength={20}
      />
      <Input
        label="출생 연월"
        type="month"
        value={birthMonth}
        onChange={(e) => setBirthMonth(e.target.value)}
        required
      />
      <Select
        label="나이 반"
        options={AGE_OPTIONS}
        value={ageBand}
        onChange={(e) => setAgeBand(e.target.value)}
      />
      <Select
        label="우선순위 유형"
        options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        value={priorityType}
        onChange={(e) => setPriorityType(e.target.value)}
      />
      <Select
        label="지역"
        options={REGIONS.map((r) => ({ value: r, label: r }))}
        value={regionKey}
        onChange={(e) => setRegionKey(e.target.value)}
        placeholder="지역 선택"
      />
      <Button type="submit" loading={loading} className="w-full">
        저장하기
      </Button>
    </form>
  );
}
