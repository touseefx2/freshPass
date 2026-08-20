import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAppSelector } from "@/src/hooks/hooks";
import {
  recoverPendingIosPurchases,
  resetAppleAccountToken,
  startIapRecoveryListener,
  stopIapRecoveryListener,
} from "@/src/services/iapService";

/**
 * Recovers Apple purchases whose verify never landed. iOS-only; renders nothing.
 */
export default function IapRecoveryHandler() {
  const accessToken = useAppSelector((state) => state.user.accessToken);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const appState = useRef(AppState.currentState);

  const isSignedIn = Boolean(accessToken) && !isGuest;

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    if (!isSignedIn) {
      stopIapRecoveryListener();
      resetAppleAccountToken();
      return;
    }

    startIapRecoveryListener();
    void recoverPendingIosPurchases({ includeEntitlements: true });

    return () => {
      stopIapRecoveryListener();
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (Platform.OS !== "ios" || !isSignedIn) {
      return;
    }

    const onChange = (nextState: AppStateStatus) => {
      const wasBackground =
        appState.current === "background" || appState.current === "inactive";
      appState.current = nextState;

      if (wasBackground && nextState === "active") {
        void recoverPendingIosPurchases();
      }
    };

    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, [isSignedIn]);

  return null;
}
