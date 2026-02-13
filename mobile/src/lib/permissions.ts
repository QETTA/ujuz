import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export type PermissionResult = { granted: boolean; canAskAgain: boolean };

function toPermissionResult(permission: {
  granted: boolean;
  canAskAgain: boolean;
}): PermissionResult {
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
  };
}

export async function requestLocationPermission(): Promise<PermissionResult> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted || !current.canAskAgain) {
    return toPermissionResult(current);
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return toPermissionResult(requested);
}

export async function checkLocationPermission(): Promise<PermissionResult> {
  const current = await Location.getForegroundPermissionsAsync();
  return toPermissionResult(current);
}

export async function requestPushPermission(): Promise<PermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) {
    return toPermissionResult(current);
  }

  const requested = await Notifications.requestPermissionsAsync();
  return toPermissionResult(requested);
}

export async function checkPushPermission(): Promise<PermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  return toPermissionResult(current);
}

export function openAppSettings(): void {
  if (Platform.OS === 'ios') {
    void Linking.openURL('app-settings:');
    return;
  }

  void Linking.openSettings();
}
