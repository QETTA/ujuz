'use client';

import { BottomSheet } from '@/components/sheets/bottom-sheet';
import type { ChecklistItem } from '@/lib/types';

export interface ChecklistModalProps {
  open: boolean;
  onClose: () => void;
  items: ChecklistItem[];
  onToggle: (key: string, done: boolean) => void;
}

export function ChecklistModal({ open, onClose, items, onToggle }: ChecklistModalProps) {
  const completed = items.filter((i) => i.done).length;

  return (
    <BottomSheet open={open} onClose={onClose} title={`체크리스트 (${completed}/${items.length})`}>
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 rounded-lg p-2 hover:bg-surface-inset"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(item.key, !item.done)}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
            />
            <div className="flex-1">
              <p className={`text-sm font-medium ${item.done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">{item.reason}</p>
            </div>
          </label>
        ))}
      </div>
    </BottomSheet>
  );
}
