'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Grade } from '@/lib/types';

const GRADE_COLORS: Record<Grade, string> = {
  A: 'text-grade-a',
  B: 'text-grade-b',
  C: 'text-grade-c',
  D: 'text-grade-d',
  E: 'text-grade-e',
  F: 'text-grade-f',
};

const GRADE_STROKE: Record<Grade, string> = {
  A: 'stroke-grade-a',
  B: 'stroke-grade-b',
  C: 'stroke-grade-c',
  D: 'stroke-grade-d',
  E: 'stroke-grade-e',
  F: 'stroke-grade-f',
};

interface ScoreGaugeProps {
  score: number; // 1–99
  grade: Grade;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const sizes = {
  sm: { width: 120, stroke: 8, fontSize: 'text-2xl' },
  md: { width: 180, stroke: 10, fontSize: 'text-4xl' },
  lg: { width: 240, stroke: 12, fontSize: 'text-5xl' },
};

export function ScoreGauge({ score, grade, size = 'md', animated = true, className }: ScoreGaugeProps) {
  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = animated && !prefersReducedMotion;

  const [displayScore, setDisplayScore] = useState(shouldAnimate ? 0 : score);
  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius; // half-circle

  useEffect(() => {
    if (!shouldAnimate) return;
    let frame: number;
    let start: number | null = null;
    const duration = 1200;

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplayScore(Math.round(eased * score));
      if (pct < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, shouldAnimate]);

  const effectiveScore = shouldAnimate ? displayScore : score;
  const progress = (effectiveScore / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={width}
        height={width / 2 + stroke}
        viewBox={`0 0 ${width} ${width / 2 + stroke}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={describeArc(width / 2, width / 2, radius, 180, 360)}
          fill="none"
          className="stroke-surface-inset"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={describeArc(width / 2, width / 2, radius, 180, 360)}
          fill="none"
          className={GRADE_STROKE[grade]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: shouldAnimate ? 'none' : 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      {/* Score number */}
      <div className="-mt-8 text-center">
        <span className={cn(fontSize, 'font-bold tabular-nums', GRADE_COLORS[grade])}>
          {effectiveScore}
        </span>
        <span className="ml-1 text-sm text-text-tertiary">/ 99</span>
      </div>
      {/* Grade badge */}
      <div className={cn('mt-1 rounded-full px-3 py-0.5 text-xs font-bold', GRADE_COLORS[grade])}>
        등급 {grade}
      </div>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
