import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const REGION_MAP: [string, string][] = [
  ['강남구', '강남'],
  ['서초구', '서초'],
  ['송파구', '송파'],
  ['분당구', '분당'],
  ['분당', '분당'],
  ['위례', '위례'],
  ['성남시', '성남'],
  ['성남', '성남'],
];

/** Extract region key from address string (client-side) */
export function extractRegionFromName(address: string): string | null {
  for (const [keyword, region] of REGION_MAP) {
    if (address.includes(keyword)) return region;
  }
  return null;
}

/** Format number with Korean 만/억 units */
export function formatKoreanNumber(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString('ko-KR');
}

/** Format ISO date string to relative time (방금, N분 전, N시간 전, N일 전) */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}
