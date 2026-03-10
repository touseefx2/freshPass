import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import Logger from "@/src/services/logger";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

/**
 * Configure how notifications are presented when app is in foreground,
 * and handle when a notification is received or tapped.
 * Mounted at app root so push notifications work across the app.
 */
export default function ExpoNotificationHandler() {
  const router = useRouter();
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
        shouldShowAlert: true,
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
          "Notification frontend received:",
          notification.request.content,
        );
        // const { title, body, data } = notification.request.content;
        // if (title || body) {
        //   showBanner(title ?? "Notification", body ?? "", "info", 4000);
        // }
      },
    );

    // Fired when user taps on notification (from background or quit state)
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        Logger.log("Notification tapped, data:", data);

        // Navigate based on notification data if needed
        if (data?.screen) {
          const screen = String(data.screen);
          try {
            if (screen === "booking" && data?.booking_id) {
              router.push({
                pathname: "/bookingDetailsById",
                params: { id: String(data.booking_id) },
              });
            } else if (screen && screen !== "booking") {
              router.push(screen as any);
            }
          } catch (err) {
            Logger.error("Notification navigation error:", err);
          }
        }
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
