'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Editor } from '@/components/community/Editor';
import { useToast } from '@/components/ui/toast';
import type { CommunityCategory } from '@/lib/validation/community';

export default function CommunityWritePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    title: string;
    content: string;
    category: CommunityCategory;
    region: string;
    anonymous: boolean;
  }) => {
    setLoading(true);

    try {
      const response = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = body?.error?.message || body?.error || body?.message || '게시글 등록에 실패했습니다.';
        toast(msg, 'error');
        return;
      }

      const postId = body?.id || body?._id;
      if (!postId) {
        toast('게시글 ID를 받지 못했습니다.', 'error');
        return;
      }

      toast('게시글이 등록되었어요!', 'success');
      router.push(`/community/${postId}`);
    } catch {
      toast('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="커뮤니티 글쓰기" backHref="/community" />
      <div className="px-4 py-2">
        <Editor onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
