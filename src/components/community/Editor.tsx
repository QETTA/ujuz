'use client';

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  COMMUNITY_CATEGORIES,
  REGION_OPTIONS,
  TITLE_MAX,
  CONTENT_MAX,
  type CommunityCategory,
  type CommunityDraft,
  saveDraft,
  loadDraft,
  clearDraft,
  validateWrite,
} from '@/lib/validation/community';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EditorProps {
  onSubmit: (data: {
    title: string;
    content: string;
    category: CommunityCategory;
    region: string;
    anonymous: boolean;
  }) => Promise<void>;
  loading?: boolean;
}

const SAFETY_GUIDELINES = [
  '개인정보(이름, 연락처, 주소 등)를 포함하지 마세요.',
  '특정인을 비방하거나 명예를 훼손하는 내용은 삼가세요.',
  '확인되지 않은 정보를 사실처럼 작성하지 마세요.',
];

const DRAFT_SAVE_INTERVAL_MS = 3000;

export function Editor({ onSubmit, loading = false }: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('후기');
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [anonymous, setAnonymous] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftRestored, setDraftRestored] = useState(false);

  const isDirtyRef = useRef(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 임시저장 복구
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setTitle(draft.title);
      setContent(draft.content);
      setCategory(draft.category);
      setRegion(draft.region);
      setAnonymous(draft.anonymous);
      setDraftRestored(true);
      isDirtyRef.current = true;
    }
  }, []);

  // 주기적 임시저장
  const scheduleDraftSave = useCallback(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (title.trim() || content.trim()) {
        saveDraft({ title, content, category, region, anonymous });
      }
    }, DRAFT_SAVE_INTERVAL_MS);
  }, [title, content, category, region, anonymous]);

  const handleFieldChange = useCallback(() => {
    isDirtyRef.current = true;
    scheduleDraftSave();
  }, [scheduleDraftSave]);

  // 이탈 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current && !loading) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [loading]);

  // cleanup
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    const result = validateWrite({ title: title.trim(), content: content.trim(), category, region, anonymous });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    await onSubmit(result.data);
    isDirtyRef.current = false;
    clearDraft();
  };

  const dismissDraftNotice = () => setDraftRestored(false);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 임시저장 복구 알림 */}
      {draftRestored && (
        <div className="flex items-center justify-between rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-sm text-info">
          <span>이전에 작성 중이던 글을 불러왔어요.</span>
          <button type="button" onClick={dismissDraftNotice} className="ml-2 text-xs underline">
            닫기
          </button>
        </div>
      )}

      {/* 안전 가이드 */}
      <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-warning">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
          작성 시 주의사항
        </div>
        <ul className="mt-1.5 space-y-0.5 text-xs text-text-secondary">
          {SAFETY_GUIDELINES.map((g) => (
            <li key={g} className="flex gap-1">
              <span className="shrink-0">•</span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <Select
        label="카테고리"
        value={category}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          setCategory(e.target.value as CommunityCategory);
          handleFieldChange();
        }}
        required
        options={COMMUNITY_CATEGORIES.map((v) => ({ value: v, label: v }))}
        error={!!fieldErrors.category}
        errorMessage={fieldErrors.category}
      />

      <Select
        label="지역"
        value={region}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          setRegion(e.target.value);
          handleFieldChange();
        }}
        required
        options={[...REGION_OPTIONS] as { value: string; label: string }[]}
        error={!!fieldErrors.region}
        errorMessage={fieldErrors.region}
      />

      <Input
        label="제목"
        value={title}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setTitle(e.target.value);
          handleFieldChange();
        }}
        maxLength={TITLE_MAX}
        required
        placeholder="제목(최대 100자)"
        hint={`${title.length}/${TITLE_MAX}`}
        error={fieldErrors.title}
      />

      <Textarea
        label="내용"
        value={content}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
          setContent(e.target.value);
          handleFieldChange();
        }}
        maxLength={CONTENT_MAX}
        rows={14}
        required
        placeholder="내용을 입력하세요"
        hint={`${content.length}/${CONTENT_MAX}`}
        error={fieldErrors.content}
      />

      {/* 익명 옵션 */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => {
            setAnonymous(e.target.checked);
            handleFieldChange();
          }}
          className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
        />
        <span className="text-text-secondary">익명으로 작성</span>
      </label>

      <Button type="submit" className="w-full" loading={loading} disabled={loading}>
        {loading ? '등록 중...' : '게시글 등록'}
      </Button>
    </form>
  );
}
