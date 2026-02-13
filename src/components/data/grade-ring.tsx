'use client';

import { cn } from '@/lib/utils';
import type { Grade } from '@/lib/types';

const gradeColorMap: Record<Grade, string> = {
  A: 'stroke-grade-a',
  B: 'stroke-grade-b',
  C: 'stroke-grade-c',
  D: 'stroke-grade-d',
  E: 'stroke-grade-e',
  F: 'stroke-grade-f',
};

const gradeTextColor: Record<Grade, string> = {
  A: 'text-grade-a',
  B: 'text-grade-b',
  C: 'text-grade-c',
  D: 'text-grade-d',
  E: 'text-grade-e',
  F: 'text-grade-f',
};

export interface GradeRingProps {
  score: number; // 0-100
  grade: Grade;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function GradeRing({ score, grade, size = 80, strokeWidth = 6, className }: GradeRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`입소 확률 등급 ${grade}, 점수 ${score}점`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700 ease-smooth', gradeColorMap[grade])}
        />
      </svg>
      {/* Center content */}
      <div className="absolute flex flex-col items-center">
        <span className={cn('text-xl font-bold', gradeTextColor[grade])}>{grade}</span>
        <span className="text-xs text-text-tertiary">{score}점</span>
      </div>
    </div>
  );
}
