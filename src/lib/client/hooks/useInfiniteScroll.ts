'use client';

import { useCallback, useRef, useEffect } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
}

export function useInfiniteScroll({ onLoadMore, hasMore, loading, threshold = 200 }: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasMore || loading) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !loading) {
            onLoadMore();
          }
        },
        { rootMargin: `0px 0px ${threshold}px 0px` },
      );

      observerRef.current.observe(node);
    },
    [onLoadMore, hasMore, loading, threshold],
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return { sentinelRef };
}
