/** Shared UI constants used across admission and profile pages */

export const REGIONS = ['강남', '서초', '송파', '분당', '위례', '성남', '기타'] as const;
export type Region = (typeof REGIONS)[number];

export const PRIORITIES = ['일반', '맞벌이', '형제 재원', '다자녀', '저소득가구', '한부모가정', '장애아동'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Map Korean priority labels to engine priority_type keys */
export const PRIORITY_MAP: Record<string, string> = {
  '일반': 'general',
  '맞벌이': 'dual_income',
  '형제 재원': 'sibling',
  '다자녀': 'multi_child',
  '저소득가구': 'low_income',
  '한부모가정': 'single_parent',
  '장애아동': 'disability',
};
