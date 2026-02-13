import { useEffect, useRef, useState } from 'react';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '@/lib/notifications';
import type { Notification, NotificationResponse } from 'expo-notifications';

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const notificationListener = useRef<ReturnType<typeof addNotificationReceivedListener>>();
  const responseListener = useRef<ReturnType<typeof addNotificationResponseListener>>();

  useEffect(() => {
    // Register and get token
    registerForPushNotifications().then((token) => {
      setPushToken(token);
    });

    // Listen for incoming notifications
    notificationListener.current = addNotificationReceivedListener((n) => {
      setNotification(n);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      // Handle navigation based on notification data
      console.log('Notification tapped:', data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { pushToken, notification };
}
