'use client';

import { BottomSheet } from '@/components/sheets/bottom-sheet';
import type { StrategyFacility } from '@/lib/types';
import { ProbabilityBar } from '@/components/data/probability-bar';

export interface PortfolioModalProps {
  open: boolean;
  onClose: () => void;
  facilities: StrategyFacility[];
}

export function PortfolioModal({ open, onClose, facilities }: PortfolioModalProps) {
  const sorted = [...facilities].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));

  return (
    <BottomSheet open={open} onClose={onClose} title="포트폴리오 비교">
      <div className="space-y-3">
        {sorted.map((f) => (
          <div key={f.id} className="rounded-xl border border-border p-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">{f.name}</p>
              <span className="text-xs text-text-tertiary">{f.type}</span>
            </div>
            {f.probability != null && (
              <ProbabilityBar
                value={Math.round(f.probability * 100)}
                label="6개월 입소 확률"
                className="mt-2"
              />
            )}
            {f.chips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {f.chips.map((chip) => (
                  <span key={chip} className="rounded-full bg-surface-inset px-2 py-0.5 text-[10px] text-text-secondary">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
