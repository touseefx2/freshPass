import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import Logger from "@/src/services/logger";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchNotificationUnreadCount } from "../state/thunks/notificationThunks";
import { refreshChatInbox } from "../state/thunks/chatThunks";
import { useAppDispatch, useAppSelector } from "../hooks/hooks";
import { navigateFromNotificationData } from "@/src/services/notificationNavigation";
import type { NotificationNavigationData } from "@/src/services/notificationNavigation";
import { syncExpoPushTokenToBackend } from "@/src/services/pushTokenService";

/**
 * Configure how notifications are presented when app is in foreground,
 * and handle when a notification is received or tapped.
 * Mounted at app root so push notifications work across the app.
 */
export default function ExpoNotificationHandler() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.user.accessToken);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const { showBanner } = useNotificationContext();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Keep Expo push token registered while signed in (login alone is not enough —
  // reinstall / new build clears it and nothing put it back until next login).
  useEffect(() => {
    if (!accessToken || isGuest) {
      return;
    }

    void syncExpoPushTokenToBackend({ force: true });

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // Re-sync if Expo handed a new token, or after user enabled permission in Settings
        void syncExpoPushTokenToBackend();
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, [accessToken, isGuest]);

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

        if (!accessToken) return;

        dispatch(fetchNotificationUnreadCount());

        // Only chat message pushes refresh inbox (badge + Recent list).
        // Other types (appointment, affiliation, AI, …) must not hit chat APIs.
        const data = notification.request.content.data as
          | NotificationNavigationData
          | undefined;
        if (data?.type === "message") {
          dispatch(refreshChatInbox());
        }
      },
    );

    // Cold start (killed app) is handled in app/index.tsx after splash navigation.

    // Fired when user taps on notification (app in background or foreground).
    // Killed-app cold start is handled in app/index.tsx via pendingNotificationNavigation.
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        Logger.log(
          "------>Notification tapped (background/foreground), data:",
          data,
        );
        if (accessToken) {
          navigateFromNotificationData(router, data);
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
  }, [showBanner, router, accessToken, dispatch]);

  return null;
}
