'use client';

import { BottomSheet } from './bottom-sheet';
import { Button } from '@/components/ui/button';

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: { type?: string; sido?: string };
  onApply: (filters: { type?: string; sido?: string }) => void;
}

const facilityTypes = [
  { value: '', label: '전체' },
  { value: 'national_public', label: '국공립' },
  { value: 'private', label: '민간' },
  { value: 'home', label: '가정' },
  { value: 'workplace', label: '직장' },
  { value: 'cooperative', label: '협동' },
];

export function FilterSheet({ open, onClose, filters, onApply }: FilterSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="필터">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-medium text-text-primary">시설 유형</h3>
          <div className="flex flex-wrap gap-2">
            {facilityTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => onApply({ ...filters, type: t.value || undefined })}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  (filters.type ?? '') === t.value
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                    : 'border-border text-text-secondary hover:border-brand-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => onApply({})}>
            초기화
          </Button>
          <Button className="flex-1" onClick={onClose}>
            적용
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
