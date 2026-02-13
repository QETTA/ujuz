'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getLocalStorage } from '@/lib/platform/storage';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolved: 'light',
  setMode: () => {},
});

const STORAGE_KEY = 'ujuz-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#1a1a2e' : '#ffffff');
  }
}

/**
 * Blocking script to prevent FOUC on page load.
 * Injected as dangerouslySetInnerHTML in layout.tsx <head>.
 */
export const themeInitScript = `
(function(){
  try {
    var m = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var r = m === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : m;
    document.documentElement.setAttribute('data-theme', r);
    if (r === 'dark') document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = getLocalStorage().getItem(STORAGE_KEY);
  const validModes: ThemeMode[] = ['light', 'dark', 'system'];
  return stored && validModes.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getInitialMode()));

  // Apply theme when mode changes (DOM side-effect only, no setState)
  useEffect(() => {
    applyTheme(resolveTheme(mode));
  }, [mode]);

  // Listen for system preference changes
  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r = getSystemTheme();
      setResolved(r);
      applyTheme(r);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    getLocalStorage().setItem(STORAGE_KEY, newMode);
    const r = resolveTheme(newMode);
    setResolved(r);
    applyTheme(r);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
