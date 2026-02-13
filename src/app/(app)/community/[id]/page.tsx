'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandThumbUpIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { formatRelativeTime } from '@/lib/utils';

interface CommunityPost {
  id: string;
  _id?: string;
  title: string;
  category?: string;
  region?: string;
  content: string;
  likes?: number;
  likeCount?: number;
  commentCount?: number;
  comment_count?: number;
  author_nickname?: string;
  authorName?: string;
  created_at?: string;
  createdAt?: string;
}

export default function CommunityPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError('');

    fetch(`/api/v1/community/posts/${id}`, { signal: abortController.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('not-found');
          }
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || '게시글을 불러오지 못했습니다.');
        }
        return response.json() as Promise<CommunityPost>;
      })
      .then((data) => {
        if (!abortController.signal.aborted) {
          setPost(data);
        }
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        if (err instanceof Error && err.message === 'not-found') {
          notFound();
        } else {
          setError(err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [id]);

  if (!id || typeof id !== 'string') {
    return null;
  }

  const createdAtText = post?.created_at || post?.createdAt
    ? formatRelativeTime((post.created_at || post.createdAt) as string)
    : '';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="게시글"
        backHref="/community"
        rightAction={
          <Button variant="secondary" size="sm" onClick={() => router.push('/community')}>
            목록
          </Button>
        }
      />

      <div className="px-4">
        {loading ? <p className="text-text-tertiary">불러오는 중...</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}

        {post && (
          <Card>
            <CardHeader>
              <p className="text-xs text-text-tertiary">{post.category ?? '후기'} · {post.region ?? ''}</p>
              <CardTitle>{post.title}</CardTitle>
              <div className="text-sm text-text-tertiary">{post.author_nickname || post.authorName || '익명'}{createdAtText ? ` · ${createdAtText}` : ''}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{post.content}</p>
              <div className="flex items-center gap-4 text-sm text-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  <HandThumbUpIcon className="h-4 w-4" />
                  {post.likeCount ?? post.likes ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ChatBubbleLeftIcon className="h-4 w-4" />
                  {post.commentCount ?? post.comment_count ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
