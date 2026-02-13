'use client';

import { getLocalStorage } from '../platform/storage';
import { generateUUID } from '../api';

const DEVICE_ID_KEY = 'ujuz-device-id';

export function getDeviceId(): string {
  const storage = getLocalStorage();
  let id = storage.getItem(DEVICE_ID_KEY);
  if (!id) {
    if (typeof window === 'undefined') return 'server';
    id = generateUUID();
    storage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
