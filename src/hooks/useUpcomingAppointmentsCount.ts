import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { ApiService, isRequestCanceled } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { subscribeToAppointmentChanges } from "@/src/services/appointmentChangeEvents";
import Logger from "@/src/services/logger";

// One flow can send a few writes in a row (outcome + receipt…); wait for the last
const CHANGE_DEBOUNCE_MS = 400;

/**
 * Owner's upcoming (scheduled) appointments — the same list as the Upcoming
 * tab in All appointments. Reloads on focus, on app foreground, and whenever
 * an appointment changes, so the badge drops as soon as one is completed.
 * null = not loaded yet.
 */
export function useUpcomingAppointmentsCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const request = ++requestRef.current;
    try {
      const response = await ApiService.get<{
        success: boolean;
        data: { meta?: { total?: number } };
      }>(
        appointmentsEndpoints.list({
          status: "scheduled",
          per_page: 1,
          page: 1,
        }),
      );
      if (request !== requestRef.current) return;
      const total = response.success ? response.data?.meta?.total : undefined;
      if (typeof total === "number") setCount(total);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      Logger.error("Upcoming appointments count failed:", error);
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToAppointmentChanges(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), CHANGE_DEBOUNCE_MS);
    });
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void load();
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [enabled, load]);

  return enabled ? count : null;
}
