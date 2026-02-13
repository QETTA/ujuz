'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

/* ── Types ─────────────────────────────────────────────── */

export type ToastVariant =
  | 'default'
  | 'destructive'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

/* ── Context ───────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/* ── Variant styles ────────────────────────────────────── */

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-surface-elevated text-text-primary',
  destructive: 'border-danger/30 bg-danger/10 text-danger',
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger', // backwards compatibility
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
};

const variantIcons: Record<ToastVariant, typeof CheckCircleIcon> = {
  default: InformationCircleIcon,
  destructive: XCircleIcon,
  success: CheckCircleIcon,
  error: XCircleIcon, // backwards compatibility
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const SWIPE_DISMISS_THRESHOLD_PX = 88;
const EXIT_ANIMATION_MS = 240;
const ARIA_ANNOUNCE_DELAY_MS = 120;

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

type ToastCssVars = CSSProperties & {
  '--toast-swipe-move-x'?: string;
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [state, setState] = useState<'open' | 'closed'>('open');
  const [swipe, setSwipe] = useState<'move' | 'cancel' | 'end'>();
  const [swipeX, setSwipeX] = useState(0);
  const [shouldAnnounce, setShouldAnnounce] = useState(false);
  const [progressStarted, setProgressStarted] = useState(false);

  const pointerStartXRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (removeTimerRef.current) {
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }
    if (swipeResetTimerRef.current) {
      clearTimeout(swipeResetTimerRef.current);
      swipeResetTimerRef.current = null;
    }
  }, []);

  const dismissWithAnimation = useCallback(
    (fromSwipe = false) => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      if (fromSwipe) setSwipe('end');
      setState('closed');
      removeTimerRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, EXIT_ANIMATION_MS);
    },
    [onDismiss, toast.id],
  );

  const resetSwipe = useCallback(() => {
    pointerStartXRef.current = null;
    setSwipe('cancel');
    setSwipeX(0);
    if (swipeResetTimerRef.current) clearTimeout(swipeResetTimerRef.current);
    swipeResetTimerRef.current = setTimeout(() => {
      setSwipe(undefined);
    }, 180);
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (state === 'closed') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartXRef.current = event.clientX;
    setSwipe(undefined);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [state]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const startX = pointerStartXRef.current;
    if (startX === null || state === 'closed') return;
    const deltaX = Math.max(0, event.clientX - startX);
    if (deltaX <= 0) return;
    setSwipe('move');
    setSwipeX(deltaX);
  }, [state]);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const startX = pointerStartXRef.current;
    if (startX === null) return;

    const deltaX = Math.max(0, event.clientX - startX);
    if (deltaX >= SWIPE_DISMISS_THRESHOLD_PX) {
      setSwipeX(deltaX);
      dismissWithAnimation(true);
      return;
    }
    resetSwipe();
  }, [dismissWithAnimation, resetSwipe]);

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointerStartXRef.current !== null) resetSwipe();
  }, [resetSwipe]);

  useEffect(() => {
    const announceTimer = setTimeout(() => {
      setShouldAnnounce(true);
    }, ARIA_ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(announceTimer);
    };
  }, []);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    dismissTimerRef.current = setTimeout(() => {
      dismissWithAnimation();
    }, toast.duration);
    const rafId = requestAnimationFrame(() => {
      setProgressStarted(true);
    });
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      cancelAnimationFrame(rafId);
    };
  }, [dismissWithAnimation, toast.duration]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const Icon = variantIcons[toast.variant];

  return (
    <div
      role="status"
      aria-live={shouldAnnounce ? 'polite' : 'off'}
      aria-atomic="true"
      data-state={state}
      data-swipe={swipe}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={
        {
          '--toast-swipe-move-x': `${swipeX}px`,
        } as ToastCssVars
      }
      className={cn(
        'pointer-events-auto flex w-full max-w-sm touch-pan-y select-none items-start gap-2.5 rounded-xl border px-4 py-3 shadow-md backdrop-blur-sm',
        'transition-[opacity,transform] duration-200 ease-out will-change-transform',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full',
        'data-[swipe=move]:translate-x-[var(--toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=cancel]:duration-200',
        'data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0 data-[swipe=end]:slide-out-to-right-full',
        variantStyles[toast.variant],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5">{toast.message}</p>
        {toast.duration && toast.duration > 0 ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-current/15" aria-hidden="true">
            <span
              className="block h-full w-full origin-left bg-current/55 transition-transform ease-linear"
              style={{
                transform: progressStarted && state === 'open' ? 'scaleX(0)' : 'scaleX(1)',
                transitionDuration: `${toast.duration}ms`,
              }}
            />
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => dismissWithAnimation()}
        className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="닫기"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Provider ──────────────────────────────────────────── */

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'default', duration = 4000) => {
      const id = `toast-${++toastCounter}`;
      const toast: Toast = { id, message, variant, duration };
      setToasts((prev) => [...prev, toast]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toast: addToast }), [addToast]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast, index) => {
          return (
            <div
              key={toast.id}
              className="transition-transform duration-200 ease-out"
              style={{ transform: `translateY(${index * 8}px)` }}
            >
              <ToastItem toast={toast} onDismiss={removeToast} />
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
