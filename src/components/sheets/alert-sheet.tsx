'use client';

import { cn } from '@/lib/utils';
import { BottomSheet } from './bottom-sheet';
import type { ToAlertHistory } from '@/lib/types';

export interface AlertSheetProps {
  open: boolean;
  onClose: () => void;
  alerts: ToAlertHistory[];
  onMarkRead: (ids: string[]) => void;
}

type AlertSeverity = 'URGENT' | 'INSIGHT' | 'INFO';

function getSeverity(alert: ToAlertHistory): AlertSeverity {
  if (alert.estimated_slots >= 2 && alert.confidence >= 0.7) return 'URGENT';
  if (alert.confidence >= 0.5) return 'INSIGHT';
  return 'INFO';
}

const severityStyles: Record<AlertSeverity, string> = {
  URGENT: 'border-l-4 border-l-danger bg-danger/5',
  INSIGHT: 'border-l-4 border-l-warning bg-warning/5',
  INFO: 'border-l-4 border-l-info bg-info/5',
};

export function AlertSheet({ open, onClose, alerts, onMarkRead }: AlertSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="TO 알림">
      {alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">알림이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const severity = getSeverity(alert);
            return (
              <div
                key={alert.id}
                className={cn(
                  'rounded-lg p-sm',
                  severityStyles[severity],
                  !alert.is_read && 'ring-1 ring-brand-300',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">{alert.facility_name}</p>
                  {!alert.is_read && (
                    <button
                      onClick={() => onMarkRead([alert.id])}
                      className="text-xs text-brand-600"
                    >
                      읽음 처리
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {alert.age_class} · 예상 {alert.estimated_slots}석 · 신뢰도 {Math.round(alert.confidence * 100)}%
                </p>
                <p className="mt-0.5 text-[10px] text-text-tertiary">
                  {new Date(alert.detected_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
