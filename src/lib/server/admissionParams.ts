/**
 * UJUz - Admission Engine Parameters (SSOT)
 */

// ─── Grade Buckets ──────────────────────────────────────────

export interface GradeBucket {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  minScore: number;
  label: string;
}

export const GRADE_BUCKETS_V2: GradeBucket[] = [
  { grade: 'A', minScore: 85, label: '매우 높음' },
  { grade: 'B', minScore: 70, label: '높음' },
  { grade: 'C', minScore: 55, label: '보통' },
  { grade: 'D', minScore: 40, label: '낮음' },
  { grade: 'E', minScore: 25, label: '매우 낮음' },
  { grade: 'F', minScore: 0, label: '희박' },
];

// ─── P6m-based Grade Buckets (v1 API) ──────────────────

export interface P6mGradeBucket {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  minP6m: number;
  label: string;
}

export const GRADE_BUCKETS_P6M: P6mGradeBucket[] = [
  { grade: 'A', minP6m: 0.75, label: '매우 높음' },
  { grade: 'B', minP6m: 0.55, label: '높음' },
  { grade: 'C', minP6m: 0.40, label: '보통' },
  { grade: 'D', minP6m: 0.25, label: '낮음' },
  { grade: 'E', minP6m: 0.10, label: '매우 낮음' },
  { grade: 'F', minP6m: 0.00, label: '희박' },
];

/** Get grade from p6m probability */
export function gradeFromP6m(p6m: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {
  for (const bucket of GRADE_BUCKETS_P6M) {
    if (p6m >= bucket.minP6m) return bucket.grade;
  }
  return 'F';
}

// ─── Gamma Prior Means ──────────────────────────────────────

export const GAMMA_PRIOR_MEANS: Record<string, Record<string, number>> = {
  gangnam:  { '0': 0.005, '1': 0.007, '2': 0.008, '3': 0.010, '4': 0.012, '5': 0.012 },
  seocho:   { '0': 0.006, '1': 0.008, '2': 0.009, '3': 0.011, '4': 0.012, '5': 0.012 },
  bundang:  { '0': 0.007, '1': 0.008, '2': 0.010, '3': 0.012, '4': 0.013, '5': 0.013 },
  wirye:    { '0': 0.007, '1': 0.009, '2': 0.010, '3': 0.012, '4': 0.013, '5': 0.013 },
  seongnam: { '0': 0.008, '1': 0.009, '2': 0.011, '3': 0.012, '4': 0.014, '5': 0.014 },
  songpa:   { '0': 0.006, '1': 0.008, '2': 0.009, '3': 0.011, '4': 0.012, '5': 0.012 },
  default:  { '0': 0.008, '1': 0.010, '2': 0.011, '3': 0.012, '4': 0.015, '5': 0.015 },
};

// ─── Region Competition ─────────────────────────────────────

export const REGION_COMPETITION: Record<string, number> = {
  gangnam: 1.4, seocho: 1.35, bundang: 1.3, wirye: 1.3,
  seongnam: 1.2, songpa: 1.3, default: 1.15,
};

// ─── Priority Bonus ─────────────────────────────────────────

export const PRIORITY_BONUS: Record<string, number> = {
  disability: 8, single_parent: 7, multi_child: 5,
  dual_income: 3, sibling: 4, low_income: 6, general: 0,
};

// ─── Seasonal Multiplier ────────────────────────────────────

export const SEASONAL_MULTIPLIER: Record<number, number> = {
  1: 1.1, 2: 1.3, 3: 1.5,
  4: 1.05, 5: 1.0, 6: 0.95,
  7: 0.9, 8: 1.05, 9: 1.15,
  10: 1.0, 11: 1.05, 12: 1.15,
};

// ─── Age Band Capacity ──────────────────────────────────────

export const AGE_BAND_CAPACITY_RATIO: Record<string, number> = {
  '0': 0.10, '1': 0.15, '2': 0.20, '3': 0.20, '4': 0.20, '5': 0.15,
};

// ─── Engine Constants ───────────────────────────────────────

export const E0 = 3.0;
export const K_ANONYMITY_THRESHOLD = 3;
export const MIN_CONFIDENCE_FOR_COMMUNITY = 0.6;
export const COOLDOWN_HOURS = 24;

/**
 * Heuristic vacancy rate (per seat-month) for facilities without real data.
 * Based on national average daycare turnover: ~5 vacancies/year per class of 12.
 * Used when alphaPost < 1 (prior too weak for NB distribution).
 */
export const HEURISTIC_VACANCY_RATE = 0.14;

/** Minimum confidence floor for heuristic (no-data) predictions */
export const MIN_HEURISTIC_CONFIDENCE = 0.12;

// ─── Calibration ────────────────────────────────────────────

const IDENTITY_CAL = Array.from({ length: 101 }, (_, i) => Math.min(99, Math.max(1, i)));

export const CALIBRATION_ARRAY: Record<string, number[]> = {
  gangnam: IDENTITY_CAL, seocho: IDENTITY_CAL, bundang: IDENTITY_CAL,
  wirye: IDENTITY_CAL, seongnam: IDENTITY_CAL, songpa: IDENTITY_CAL,
  default: IDENTITY_CAL,
};
