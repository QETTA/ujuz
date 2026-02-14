'use client';

import { useEffect, useMemo, useState } from 'react';

import { TopBar } from '@/components/nav/top-bar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type HealthStatus = {
  status: 'ok' | 'degraded';
  version: string;
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
    uptime: number;
  };
};

const REFRESH_MS = 30_000;

function formatUptime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0 || (days > 0 && hours > 0)) parts.push(`${minutes}분`);
  parts.push(`${secs}초`);

  return parts.join(' ');
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'error',
      uptime: 0,
    },
  });
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  const loadHealth = async () => {
    try {
      const res = await fetch('/api/health', {
        cache: 'no-store',
      });
      const data = (await res.json()) as HealthStatus;
      setHealth(data);
    } catch {
      setHealth((prev) => ({
        ...prev,
        status: 'degraded',
        checks: {
          ...prev.checks,
          database: 'error',
        },
      }));
    }
  };

  useEffect(() => {
    void loadHealth();
    setSecondsUntilRefresh(30);

    const pollTimer = setInterval(() => {
      void loadHealth();
      setSecondsUntilRefresh(30);
    }, REFRESH_MS);

    const countdown = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(countdown);
    };
  }, []);

  const databaseBadge = useMemo(() => (health.checks.database === 'ok' ? '정상' : '오류'), [health.checks.database]);
  const statusBadge = useMemo(() => (health.status === 'ok' ? '정상' : '저하됨'), [health.status]);

  return (
    <div className="min-h-dvh bg-surface px-4 pb-4">
      <TopBar title="시스템 상태" />

      <div className="mx-auto mt-2 max-w-xl space-y-4">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-text-secondary">시스템 상태</p>
              <Badge
                className={
                  health.status === 'ok'
                    ? 'mt-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : 'mt-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                }
              >
                {statusBadge}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary">자동 갱신</p>
              <p className="text-sm text-text-primary">{secondsUntilRefresh}초 뒤</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">버전</span>
              <span className="font-medium text-text-primary">{health.version}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">가동 시간</span>
              <span className="font-medium text-text-primary">{formatUptime(health.checks.uptime)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-text-secondary">데이터베이스</span>
              <Badge
                className={
                  health.checks.database === 'ok'
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                }
              >
                {databaseBadge}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
