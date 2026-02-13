import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'ujuz_device_id';
const SESSION_COOKIE_KEY = 'ujuz_session_cookie';

type AsyncStorageValue = string | null;

const createUuidV4 = (): string => {
  const bytes = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20, 32)}`;
};

export async function getStoredDeviceId(): Promise<AsyncStorageValue> {
  return AsyncStorage.getItem(DEVICE_ID_KEY);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getStoredDeviceId();
  if (existing) {
    return existing;
  }

  const next = createUuidV4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export async function setDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
}

export async function getSessionCookie(): Promise<AsyncStorageValue> {
  return AsyncStorage.getItem(SESSION_COOKIE_KEY);
}

export async function setSessionCookie(value: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_COOKIE_KEY, value);
}

export async function clearSessionCookie(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_COOKIE_KEY);
}
