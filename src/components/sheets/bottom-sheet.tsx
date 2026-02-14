'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save and restore focus, close on Escape
  useEffect(() => {
    if (!open) return;

    // Save previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the sheet
    requestAnimationFrame(() => sheetRef.current?.focus());

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      // Restore focus when closing
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  // Focus trap: Tab/Shift+Tab cycle within sheet
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;

      const focusable = sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

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
        onKeyDown={handleKeyDown}
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
          <div className="flex items-center justify-between border-b border-border px-4 pb-2">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-text-secondary hover:text-text-primary"
              aria-label="닫기"
            >
              닫기
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-4 py-2 safe-bottom">
          {children}
        </div>
      </div>
    </>
  );
}
