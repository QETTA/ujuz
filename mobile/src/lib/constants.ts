/** Light-mode design tokens (StyleSheet usage) */
export const COLORS = {
  // Brand
  brand50: '#eef2ff',
  brand500: '#6d5ce7',
  brand400: '#818cf8',
  brand600: '#4f46e5',
  // Surface
  background: '#ffffff',
  surface: '#fafaff',
  surfaceInset: '#f3f2fa',
  overlay: 'rgba(0,0,0,0.4)',
  // Text
  text: '#1a1730',
  textSecondary: '#6b6580',
  textTertiary: '#807b93',
  textInverse: '#ffffff',
  // Border
  border: '#e2e0ef',
  borderSubtle: '#edecf4',
  // Status
  success: '#4caf7a',
  warning: '#e0a830',
  danger: '#d44035',
  info: '#5b8fd9',
  // Grade (map pin colors)
  gradeA: '#22C55E',
  gradeB: '#84CC16',
  gradeC: '#EAB308',
  gradeD: '#F97316',
  gradeE: '#EF4444',
  gradeF: '#991B1B',
  gradeDefault: '#6B7280',
} as const;

/** Dark-mode design tokens — hex equivalents of globals.css [data-theme='dark'] OKLCH */
export const DARK_COLORS = {
  // Brand (lighter for dark backgrounds)
  brand50: '#1e1b4b',
  brand500: '#818cf8',
  brand400: '#a5b4fc',
  brand600: '#6d5ce7',
  // Surface
  background: '#1a1830',
  surface: '#222038',
  surfaceInset: '#131120',
  overlay: 'rgba(0,0,0,0.6)',
  // Text
  text: '#efedf4',
  textSecondary: '#a09bae',
  textTertiary: '#807b93',
  textInverse: '#1a1730',
  // Border
  border: '#383552',
  borderSubtle: '#2b283e',
  // Status (same)
  success: '#4caf7a',
  warning: '#e0a830',
  danger: '#d44035',
  info: '#5b8fd9',
  // Grade (same)
  gradeA: '#22C55E',
  gradeB: '#84CC16',
  gradeC: '#EAB308',
  gradeD: '#F97316',
  gradeE: '#EF4444',
  gradeF: '#991B1B',
  gradeDefault: '#6B7280',
} as const;

export const API = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
} as const;

export const APP = {
  name: 'UjuZ',
  nameKo: '우쥬',
  version: '0.1.0',
  description: '보육시설 탐색·입소 전략·AI 상담',
} as const;
