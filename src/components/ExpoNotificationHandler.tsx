import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import Logger from "@/src/services/logger";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchNotificationUnreadCount } from "../state/thunks/notificationThunks";
import { useAppDispatch } from "../hooks/hooks";
import { navigateFromNotificationData } from "@/src/services/notificationNavigation";

/**
 * Configure how notifications are presented when app is in foreground,
 * and handle when a notification is received or tapped.
 * Mounted at app root so push notifications work across the app.
 */
export default function ExpoNotificationHandler() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );

  useEffect(() => {
    // Show notification when app is in foreground (banner + sound)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldAnimate: true,
      }),
    });

    // Fired when notification is received while app is open
    receivedListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        Logger.log(
          "------>Notification received:",
          notification.request.content,
        );

        dispatch(fetchNotificationUnreadCount());
      },
    );

    // Handle app opened from KILLED state by notification tap (listener doesn't fire in that case)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      Logger.log("------>Notification tap (cold start), data:", data);
      // Small delay so app shell is mounted and router is ready
      setTimeout(() => navigateFromNotificationData(router, data), 1200);
    });

    // Fired when user taps on notification (app in BACKGROUND - when killed, use getLastNotificationResponseAsync above)
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        Logger.log(
          "------>Notification tapped (background/foreground), data:",
          data,
        );
        navigateFromNotificationData(router, data);
      });

    return () => {
      if (receivedListenerRef.current) {
        receivedListenerRef.current.remove();
        receivedListenerRef.current = null;
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
    };
  }, [showBanner, router]);

  return null;
}
