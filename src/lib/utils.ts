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
