'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { PostCard } from '@/components/composites/PostCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/primitives/Spinner';
import { Button } from '@/components/ui/button';
import { useApiFetch } from '@/lib/client/hooks/useApiFetch';
import { useInfiniteScroll } from '@/lib/client/hooks/useInfiniteScroll';
import { PencilSquareIcon, UsersIcon } from '@heroicons/react/24/outline';

interface PostData {
  _id: string;
  type: 'review' | 'to_report' | 'question';
  content: string;
  author_nickname?: string;
  created_at: string;
  likes?: number;
  comment_count?: number;
  structured_fields?: {
    age_class?: string;
    wait_months?: number;
    facility_type?: string;
  };
}

interface PostsResponse {
  posts: PostData[];
  has_more: boolean;
  cursor?: string;
}

export default function CommunityPage() {
  const [postType, setPostType] = useState<'review' | 'to_report' | 'question'>('review');

  const { data, loading } = useApiFetch<PostsResponse>(
    `/api/v1/community/posts?type=${postType}&limit=20`,
  );

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => {},
    hasMore: data?.has_more ?? false,
    loading,
  });

  const posts = data?.posts ?? [];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="커뮤니티"
        rightAction={
          <Button variant="primary" size="sm">
            <PencilSquareIcon className="h-4 w-4" />
            글쓰기
          </Button>
        }
      />

      <div className="p-4">
        <Tabs
          defaultValue="review"
          onValueChange={(v) => setPostType(v as typeof postType)}
        >
          <TabsList>
            <TabsTrigger value="review">후기</TabsTrigger>
            <TabsTrigger value="to_report">TO 제보</TabsTrigger>
            <TabsTrigger value="question">질문</TabsTrigger>
          </TabsList>

          {['review', 'to_report', 'question'].map((type) => (
            <TabsContent key={type} value={type}>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="card" className="h-32" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <EmptyState
                  icon={<UsersIcon className="h-8 w-8" />}
                  title="아직 게시글이 없어요"
                  description="첫 번째 글을 작성해보세요!"
                />
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      id={post._id}
                      type={post.type}
                      content={post.content}
                      authorNickname={post.author_nickname}
                      createdAt={post.created_at}
                      likes={post.likes}
                      commentCount={post.comment_count}
                      structuredFields={post.structured_fields}
                    />
                  ))}
                  <div ref={sentinelRef} className="flex justify-center py-4">
                    {loading && <Spinner size="sm" />}
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
