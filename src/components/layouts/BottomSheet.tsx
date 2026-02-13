'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SheetState } from '@/lib/types';

const SNAP_POINTS: Record<SheetState, string> = {
  MIN: '15dvh',
  MID: '50dvh',
  MAX: '90dvh',
};

export interface BottomSheetProps {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ state, onStateChange, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    setDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (clientY: number) => {
      setDragging(false);
      const delta = clientY - dragStartY.current;
      const threshold = 50;

      if (delta < -threshold) {
        // Swipe up
        if (state === 'MIN') onStateChange('MID');
        else if (state === 'MID') onStateChange('MAX');
      } else if (delta > threshold) {
        // Swipe down
        if (state === 'MAX') onStateChange('MID');
        else if (state === 'MID') onStateChange('MIN');
      }
    },
    [state, onStateChange],
  );

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'MIN') {
        onStateChange('MIN');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state, onStateChange]);

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="false"
      className={cn(
        'fixed inset-x-0 bottom-0 z-overlay rounded-t-2xl border-t border-border bg-surface shadow-lg transition-[height] duration-normal ease-smooth',
        dragging && 'transition-none',
        className,
      )}
      style={{ height: SNAP_POINTS[state] }}
    >
      {/* Drag handle */}
      <div
        className="flex cursor-grab items-center justify-center py-3 active:cursor-grabbing"
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientY)}
        onMouseDown={(e) => {
          handleDragStart(e.clientY);
          const handleMouseUp = (ev: MouseEvent) => {
            handleDragEnd(ev.clientY);
            window.removeEventListener('mouseup', handleMouseUp);
          };
          window.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div className="h-1 w-10 rounded-full bg-border" />
      </div>
      {/* Content */}
      <div className="overflow-y-auto px-4 pb-safe-bottom" style={{ height: 'calc(100% - 40px)' }}>
        {children}
      </div>
    </div>
  );
}
