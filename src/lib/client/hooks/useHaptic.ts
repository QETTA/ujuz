'use client';

/**
 * Haptic feedback hook.
 * Web: no-op (vibration API rarely supported on desktop).
 * React Native: will be swapped to expo-haptics.
 */
export function useHaptic() {
  const light = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const medium = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };

  const heavy = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  return { light, medium, heavy };
}
