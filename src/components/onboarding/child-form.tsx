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
  loading?: boolean;
  error?: string;
}

export function ChildForm({
  onSubmit,
  initial,
  loading = false,
  error,
}: ChildFormProps) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [birthMonth, setBirthMonth] = useState(initial?.birthMonth ?? '');
  const [priorityType, setPriorityType] = useState(initial?.priorityType ?? '일반');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = () => {
    if (loading) return;
    if (!nickname.trim()) { setValidationError('이름을 입력해 주세요'); return; }
    if (!birthMonth.match(/^\d{4}-\d{2}$/)) { setValidationError('생년월을 YYYY-MM 형식으로 입력해 주세요'); return; }
    setValidationError('');
    onSubmit({ nickname: nickname.trim(), birthMonth, priorityType });
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-4">
      <Input
        label="아이 이름 (닉네임)"
        placeholder="예: 첫째"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        error={validationError && !nickname.trim() ? validationError : undefined}
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
      {displayError && (
        <p className="animate-in fade-in-0 duration-200 text-sm text-danger" role="alert">
          {displayError}
        </p>
      )}
      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? '저장 중...' : '다음'}
      </Button>
    </div>
  );
}
