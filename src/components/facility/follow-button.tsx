'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { apiFetch } from '@/lib/api';

export interface FollowButtonProps {
  facilityId: string;
  facilityName: string;
  initialFollowed?: boolean;
  className?: string;
}

export function FollowButton({ facilityId, facilityName, initialFollowed = false, className }: FollowButtonProps) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (followed) {
        await apiFetch(`/api/facilities/follow?facility_id=${encodeURIComponent(facilityId)}`, { method: 'DELETE' });
      } else {
        await apiFetch('/api/facilities/follow', {
          method: 'POST',
          json: { facility_id: facilityId, facility_name: facilityName },
        });
      }
      setFollowed(!followed);
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
        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        followed ? 'text-danger' : 'text-text-tertiary hover:text-danger',
        className,
      )}
      aria-label={followed ? '관심시설 해제' : '관심시설 등록'}
      aria-pressed={followed}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
