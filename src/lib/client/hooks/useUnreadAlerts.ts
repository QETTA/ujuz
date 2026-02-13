'use client';

import { useEffect } from 'react';
import { useToAlertStore } from '@/lib/store';

/**
 * Auto-polls unread alert count every 30s.
 * Uses the existing store's startPolling/stopPolling.
 */
export function useUnreadAlerts() {
  const unreadCount = useToAlertStore((s) => s.unreadCount);
  const startPolling = useToAlertStore((s) => s.startPolling);
  const stopPolling = useToAlertStore((s) => s.stopPolling);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return { unreadCount };
}
