'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const COMMUNITY_CATEGORIES = ['질문', '정보공유', '후기', '자유'] as const;

const REGION_OPTIONS = [
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '부산', label: '부산' },
  { value: '대구', label: '대구' },
  { value: '광주', label: '광주' },
  { value: '대전', label: '대전' },
  { value: '울산', label: '울산' },
  { value: '제주', label: '제주' },
  { value: '기타', label: '기타' },
] as const;

export default function CommunityWritePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<(typeof COMMUNITY_CATEGORIES)[number]>('후기');
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const titleLength = title.length;
  const contentLength = content.length;

  const canSubmit = title.trim().length > 0
    && titleLength <= 100
    && content.trim().length > 0
    && contentLength <= 2000
    && region.trim().length > 0;

  const preview = useMemo(() => ({
    title: title.trim(),
    content: content.trim(),
    category,
    region,
  }), [title, content, category, region]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }

    if (title.length > 100) {
      setError('제목은 최대 100자입니다.');
      return;
    }

    if (!content.trim()) {
      setError('내용을 입력해 주세요.');
      return;
    }

    if (content.length > 2000) {
      setError('내용은 최대 2000자입니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          region,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body?.error || body?.message || '게시글 등록에 실패했습니다.');
        return;
      }

      const postId = body?.id || body?._id;
      if (!postId) {
        setError('게시글 ID를 받지 못했습니다.');
        return;
      }

      router.push(`/community/${postId}`);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="커뮤니티 글쓰기" backHref="/community" />

      <div className="px-4 py-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Select
            label="카테고리"
            value={category}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value as (typeof COMMUNITY_CATEGORIES)[number])}
            required
            options={COMMUNITY_CATEGORIES.map((value) => ({ value, label: value }))}
          />

          <Select
            label="지역"
            value={region}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setRegion(event.target.value)}
            required
            options={[...REGION_OPTIONS] as { value: string; label: string; }[]}
          />

          <Input
            label="제목"
            value={title}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
            maxLength={100}
            required
            placeholder="제목(최대 100자)"
            hint={`${titleLength}/100`}
          />

          <Textarea
            label="내용"
            value={content}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)}
            maxLength={2000}
            rows={14}
            required
            placeholder="내용을 입력하세요"
            hint={`${contentLength}/2000`}
          />

          <Button type="submit" className="w-full" loading={loading} disabled={!canSubmit}>
            {loading ? '등록 중...' : '게시글 등록'}
          </Button>
        </form>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>미리보기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-text-secondary">
            <p className="text-text-primary font-semibold">{preview.title || '제목 미입력'}</p>
            <p className="text-xs">
              <span className="mr-2 rounded-full bg-surface-elevated px-2 py-0.5">{preview.category}</span>
              <span className="rounded-full bg-surface-elevated px-2 py-0.5">{preview.region}</span>
            </p>
            <p className="whitespace-pre-wrap break-words text-text-primary">
              {preview.content || '내용 미입력'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
