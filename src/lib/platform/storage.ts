/**
 * UJUz — Platform Storage Adapter
 *
 * Web: returns native localStorage/sessionStorage
 * SSR: returns noop storage
 * React Native (future): swap to AsyncStorage wrapper
 */

export interface SyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const noopStorage: SyncStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export function getLocalStorage(): SyncStorage {
  if (typeof window === 'undefined') return noopStorage;
  return window.localStorage;
}

export function getSessionStorage(): SyncStorage {
  if (typeof window === 'undefined') return noopStorage;
  return window.sessionStorage;
}
