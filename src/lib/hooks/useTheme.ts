'use client';

import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue, type ThemeMode } from '@/components/providers/theme-provider';

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return ctx;
}

/** Cycle through themes: light → dark → system → light */
export function nextThemeMode(current: ThemeMode): ThemeMode {
  const order: ThemeMode[] = ['light', 'dark', 'system'];
  return order[(order.indexOf(current) + 1) % order.length];
}
