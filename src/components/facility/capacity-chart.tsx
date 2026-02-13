import { cn } from '@/lib/utils';

export interface CapacityChartProps {
  capacityByAge: Record<string, number>;
  className?: string;
}

const ageLabels: Record<string, string> = {
  age_0: '0세',
  age_1: '1세',
  age_2: '2세',
  age_3: '3세',
  age_4: '4세',
  age_5_plus: '5세+',
  mixed: '혼합',
};

export function CapacityChart({ capacityByAge, className }: CapacityChartProps) {
  const entries = Object.entries(capacityByAge).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-sm font-semibold text-text-primary">연령별 정원</h3>
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-10 text-xs text-text-secondary">{ageLabels[key] ?? key}</span>
          <div className="flex-1">
            <div className="h-5 w-full overflow-hidden rounded bg-surface-inset">
              <div
                className="h-full rounded bg-brand-400 transition-all duration-300"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-8 text-right text-xs font-medium text-text-primary">{value}명</span>
        </div>
      ))}
    </div>
  );
}
