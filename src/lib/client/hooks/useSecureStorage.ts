'use client';

import { useCallback, useState } from 'react';
import { getLocalStorage } from '@/lib/platform/storage';

function readStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const stored = getLocalStorage().getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as T;
    } catch {
      // Invalid JSON, use default
    }
  }
  return defaultValue;
}

export function useSecureStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, defaultValue));

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(prev)
          : newValue;
        getLocalStorage().setItem(key, JSON.stringify(resolved));
        return resolved;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    getLocalStorage().removeItem(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, set, remove] as const;
}
