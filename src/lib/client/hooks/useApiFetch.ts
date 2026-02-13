'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clientApiFetch } from '../api';

interface UseApiFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiFetch<T>(
  path: string | null,
  options?: RequestInit & { json?: unknown },
): UseApiFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async () => {
    if (!path) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await clientApiFetch<T>(path, {
        ...options,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }
  }, [path, options]);

  useEffect(() => {
    // Schedule fetch asynchronously to avoid sync setState in effect body
    const id = requestAnimationFrame(() => { doFetch(); });
    return () => {
      cancelAnimationFrame(id);
      abortRef.current?.abort();
    };
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
