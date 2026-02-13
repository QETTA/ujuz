'use client';

import { useSession } from 'next-auth/react';

/**
 * Client-side session hook with anonymous user detection.
 */
export function useUjuzSession() {
  const session = useSession();
  const isAnonymous = session.data?.provider === 'anonymous' || !session.data;

  return {
    ...session,
    isAnonymous,
    userId: session.data?.userId ?? null,
    provider: session.data?.provider ?? null,
  };
}
