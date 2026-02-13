export const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
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
