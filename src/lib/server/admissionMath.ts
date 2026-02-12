/**
 * UJUz - Admission Engine Math Helpers
 * Pure functions — no DB or IO dependencies, fully unit-testable.
 */

import { AppError } from './errors';
import { GRADE_BUCKETS_V2, SEASONAL_MULTIPLIER } from './admissionParams';
import type { AdmissionGradeV2, AdmissionScoreInputV2 } from './admissionTypes';

// ─── Constants ────────────────────────────────────────────────────

export const ENGINE_VERSION = 'v2.0.0';
export const CALIBRATION_VERSION = 'v1';
export const EVENT_TIMEOUT_HOURS = 48;

type AgeBandStr = AdmissionScoreInputV2['child_age_band'];
const VALID_AGE_BANDS = new Set<string>(['0', '1', '2', '3', '4', '5']);

// ─── Helpers ──────────────────────────────────────────────────────

/** Safely convert numeric age band to string union */
export function toAgeBandStr(n: number): AgeBandStr {
  const s = String(n);
  if (!VALID_AGE_BANDS.has(s)) throw new AppError(`Invalid age band: ${n}`, 400, 'invalid_age_band');
  return s as AgeBandStr;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Score -> 6-grade mapping */
export function scoreToGrade(score: number): AdmissionGradeV2 {
  for (const bucket of GRADE_BUCKETS_V2) {
    if (score >= bucket.minScore) return bucket.grade;
  }
  return 'F';
}

export function effectiveHorizon(H: number, currentMonth: number): number {
  if (H <= 0) return 0;
  let H_eff = 0;
  for (let m = 0; m < H; m++) {
    const targetMonth = ((currentMonth - 1 + m) % 12) + 1;
    H_eff += SEASONAL_MULTIPLIER[targetMonth] ?? 1.0;
  }
  return H_eff;
}

export function getCacheKey(input: AdmissionScoreInputV2, w_eff: number): string {
  return `v2|${input.facility_id}|${input.child_age_band}|${w_eff}|${ENGINE_VERSION}|${CALIBRATION_VERSION}`;
}

export function findWaitMonthsInterpolated(
  threshold: number,
  probFn: (H: number) => number,
  maxH: number = 36,
): number {
  if (probFn(0) >= threshold) return 0;

  let prevP = probFn(0);
  for (let H = 1; H <= maxH; H++) {
    const currP = probFn(H);
    if (currP >= threshold) {
      const fraction = prevP === currP ? 0 : (threshold - prevP) / (currP - prevP);
      return Number((H - 1 + fraction).toFixed(1));
    }
    prevP = currP;
  }
  return maxH;
}

export function calcStrength(sourceCount: number, confidence: number): number {
  return Number(clamp(confidence * Math.min(1, sourceCount / 6), 0, 1).toFixed(2));
}

/** Validate Negative Binomial parameters */
export function validateNBParams(r: number, p: number): void {
  if (r <= 0) throw new AppError('NB parameter r must be > 0', 500, 'invalid_nb_params');
  if (p <= 0 || p >= 1) throw new AppError('NB parameter p must be in (0,1)', 500, 'invalid_nb_params');
  if (!Number.isFinite(r) || !Number.isFinite(p)) throw new AppError('NB parameters must be finite', 500, 'invalid_nb_params');
}
