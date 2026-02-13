'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRIORITIES } from '@/lib/constants';

export interface ChildFormData {
  nickname: string;
  birthMonth: string;
  priorityType: string;
}

export interface ChildFormProps {
  onSubmit: (data: ChildFormData) => void;
  initial?: Partial<ChildFormData>;
}

export function ChildForm({ onSubmit, initial }: ChildFormProps) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [birthMonth, setBirthMonth] = useState(initial?.birthMonth ?? '');
  const [priorityType, setPriorityType] = useState(initial?.priorityType ?? '일반');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!nickname.trim()) { setError('이름을 입력해 주세요'); return; }
    if (!birthMonth.match(/^\d{4}-\d{2}$/)) { setError('생년월을 YYYY-MM 형식으로 입력해 주세요'); return; }
    setError('');
    onSubmit({ nickname: nickname.trim(), birthMonth, priorityType });
  };

  return (
    <div className="space-y-4">
      <Input
        label="아이 이름 (닉네임)"
        placeholder="예: 첫째"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        error={error && !nickname.trim() ? error : undefined}
      />
      <Input
        label="생년월"
        type="month"
        value={birthMonth}
        onChange={(e) => setBirthMonth(e.target.value)}
        hint="YYYY-MM 형식"
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">우선순위 유형</label>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityType(p)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                priorityType === p
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                  : 'border-border text-text-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button onClick={handleSubmit} className="w-full">다음</Button>
    </div>
  );
}
