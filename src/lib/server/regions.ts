/**
 * UJUz - Region Configuration (SSOT)
 */

export type RegionKey =
  | 'wirye'
  | 'bundang'
  | 'gangnam'
  | 'seocho'
  | 'songpa'
  | 'seongnam'
  | 'default';

export interface RegionDef {
  key: RegionKey;
  label: string;
  keywords: string[];
  bbox?: [number, number, number, number];
}

export const REGION_DEFS: RegionDef[] = [
  {
    key: 'wirye',
    label: '위례',
    keywords: ['위례'],
    bbox: [127.125, 37.465, 127.155, 37.495],
  },
  { key: 'bundang', label: '분당구', keywords: ['분당구', '분당'] },
  { key: 'gangnam', label: '강남구', keywords: ['강남구'] },
  { key: 'seocho', label: '서초구', keywords: ['서초구'] },
  { key: 'songpa', label: '송파구', keywords: ['송파구'] },
  { key: 'seongnam', label: '성남시', keywords: ['성남시', '성남'] },
];

export const REGION_MAP = new Map<RegionKey, RegionDef>(
  REGION_DEFS.map((r) => [r.key, r]),
);

export function regionLabel(key: RegionKey): string {
  return REGION_MAP.get(key)?.label ?? key;
}
