'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const CLOSE_ANIMATION_MS = 200;

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (!el.open) el.showModal();
      return;
    }

    if (!el.open) return;

    closeTimerRef.current = window.setTimeout(() => {
      if (dialogRef.current?.open) dialogRef.current.close();
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      data-state={open ? 'open' : 'closed'}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-modal m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md',
        'rounded-xl border border-border bg-surface p-0 shadow-lg',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm backdrop:transition-opacity backdrop:duration-200 backdrop:ease-out',
        'data-[state=open]:backdrop:opacity-100 data-[state=closed]:backdrop:opacity-0',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom sm:data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'duration-200 ease-out',
        className,
      )}
    >
      {children}
    </dialog>
  );
}

export function DialogHeader({ children, onClose, className }: { children: ReactNode; onClose?: () => void; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between border-b border-border px-5 py-4', className)}>
      <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-text-tertiary hover:bg-surface-inset hover:text-text-primary transition-colors"
          aria-label="닫기"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-border px-5 py-4', className)}>
      {children}
    </div>
  );
}
