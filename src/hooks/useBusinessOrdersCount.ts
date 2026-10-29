import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  fetchBusinessOrderStats,
  subscribeToBusinessOrderUpdates,
  subscribeToBusinessOrdersChanged,
} from "@/src/services/orderService";
import { getOrdersNeedingActionCount } from "@/src/utils/shopOrderHelpers";

/**
 * Owner's product orders still to act on (Paid + Ready for pickup). Reloads on
 * focus, on app foreground, when an order's status changes and when a new
 * order push arrives, so the badge stays right without a reload.
 * null = not loaded yet.
 */
export function useBusinessOrdersCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(() => {
    if (!enabled) return;
    const request = ++requestRef.current;
    fetchBusinessOrderStats()
      .then((stats) => {
        if (request === requestRef.current) {
          setCount(getOrdersNeedingActionCount(stats));
        }
      })
      .catch(() => {
        // Badge just keeps its last value
      });
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!enabled) return;
    const unsubscribeUpdates = subscribeToBusinessOrderUpdates(() => load());
    const unsubscribeChanged = subscribeToBusinessOrdersChanged(load);
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") load();
    });
    return () => {
      unsubscribeUpdates();
      unsubscribeChanged();
      appState.remove();
    };
  }, [enabled, load]);

  return enabled ? count : null;
}
