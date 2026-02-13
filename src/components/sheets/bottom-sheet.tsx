'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: ('MIN' | 'MID' | 'MAX')[];
  children: ReactNode;
  className?: string;
}

const snapHeights: Record<string, string> = {
  MIN: 'max-h-[25dvh]',
  MID: 'max-h-[50dvh]',
  MAX: 'max-h-[85dvh]',
};

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-overlay bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'fixed inset-x-0 bottom-0 z-modal rounded-t-2xl bg-surface shadow-lg',
          'animate-in slide-in-from-bottom duration-300',
          snapHeights['MAX'],
          className,
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {title && (
          <div className="flex items-center justify-between border-b border-border px-md pb-sm">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-sm text-text-secondary hover:text-text-primary"
              aria-label="닫기"
            >
              닫기
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-md py-sm safe-bottom">
          {children}
        </div>
      </div>
    </>
  );
}
