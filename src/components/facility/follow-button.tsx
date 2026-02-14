'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/primitives/Spinner';

export interface FollowButtonProps {
  facilityId: string;
  facilityName: string;
  initialFollowed?: boolean;
  className?: string;
}

export function FollowButton({ facilityId, facilityName, initialFollowed = false, className }: FollowButtonProps) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [loading, setLoading] = useState(false);
  const [heartScaleState, setHeartScaleState] = useState<'idle' | 'up' | 'down'>('idle');
  const bounceTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearBounceTimers = () => {
    bounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    bounceTimersRef.current = [];
  };

  const triggerFollowBounce = () => {
    clearBounceTimers();
    setHeartScaleState('up');
    bounceTimersRef.current.push(
      setTimeout(() => {
        setHeartScaleState('down');
      }, 120),
    );
    bounceTimersRef.current.push(
      setTimeout(() => {
        setHeartScaleState('idle');
      }, 320),
    );
  };

  useEffect(() => {
    return () => {
      clearBounceTimers();
    };
  }, []);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (followed) {
        await apiFetch(`/api/v1/facilities/follow?facility_id=${encodeURIComponent(facilityId)}`, { method: 'DELETE' });
        setFollowed(false);
      } else {
        await apiFetch('/api/v1/facilities/follow', {
          method: 'POST',
          json: { facility_id: facilityId, facility_name: facilityName },
        });
        setFollowed(true);
        triggerFollowBounce();
      }
    } catch {
      // Silently fail — non-critical
    } finally {
      setLoading(false);
    }
  };

  const Icon = followed ? HeartIconSolid : HeartIcon;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-70',
        followed ? 'text-danger hover:text-red-500 dark:hover:text-red-400' : 'text-text-tertiary hover:text-danger',
        className,
      )}
      aria-label={followed ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-pressed={followed}
    >
      {loading ? (
        <Spinner size="sm" className="text-current" />
      ) : (
        <Icon
          className={cn(
            'h-5 w-5 transition-all duration-200',
            heartScaleState === 'up' ? 'scale-[1.2]' : 'scale-100',
          )}
        />
      )}
    </button>
  );
}
