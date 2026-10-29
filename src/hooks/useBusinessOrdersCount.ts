import { useCallback, useEffect, useState } from "react";
import { AppState, type NativeEventSubscription } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  fetchBusinessOrderStats,
  subscribeToBusinessOrderUpdates,
  subscribeToBusinessOrdersChanged,
} from "@/src/services/orderService";
import { getOrdersNeedingActionCount } from "@/src/utils/shopOrderHelpers";

// ── Shared store ─────────────────────────────────────────────────────
// DashboardHeader stays mounted on several tabs; they all read one count,
// one request and one set of listeners instead of one each.

// Focus on several screens at once (tab switch) shares a recent answer
const FRESH_MS = 2_000;

let sharedCount: number | null = null;
let inFlight: Promise<void> | null = null;
let lastLoadedAt = 0;
let requestId = 0;
const subscribers = new Set<(count: number | null) => void>();
let teardown: (() => void) | null = null;

/** `force` = something changed (order status, new order) → skip the de-dupe. */
function refreshOrdersCount(force = false): void {
  if (!force && (inFlight || Date.now() - lastLoadedAt < FRESH_MS)) return;
  const request = ++requestId;
  const promise = fetchBusinessOrderStats()
    .then((stats) => {
      if (request !== requestId) return;
      sharedCount = getOrdersNeedingActionCount(stats);
      lastLoadedAt = Date.now();
      subscribers.forEach((notify) => notify(sharedCount));
    })
    .catch(() => {
      // Badge just keeps its last value
    })
    .finally(() => {
      if (inFlight === promise) inFlight = null;
    });
  inFlight = promise;
}

function startListening(): () => void {
  const changed = () => refreshOrdersCount(true);
  const unsubscribeUpdates = subscribeToBusinessOrderUpdates(changed);
  const unsubscribeChanged = subscribeToBusinessOrdersChanged(changed);
  const appState: NativeEventSubscription = AppState.addEventListener(
    "change",
    (next) => {
      if (next === "active") refreshOrdersCount();
    },
  );
  return () => {
    unsubscribeUpdates();
    unsubscribeChanged();
    appState.remove();
  };
}

/**
 * Owner's product orders still to act on (Paid + Ready for pickup). Reloads on
 * focus, on app foreground, when an order's status changes and when a new
 * order push arrives, so the badge stays right without a reload.
 * null = not loaded yet.
 */
export function useBusinessOrdersCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(sharedCount);

  useEffect(() => {
    if (!enabled) return;
    subscribers.add(setCount);
    if (!teardown) teardown = startListening();
    setCount(sharedCount);
    return () => {
      subscribers.delete(setCount);
      if (subscribers.size === 0 && teardown) {
        teardown();
        teardown = null;
        // Last card gone (e.g. logout) → next account starts fresh. Drop the
        // pending request too, or a quick remount would wait on a discarded one.
        sharedCount = null;
        lastLoadedAt = 0;
        requestId++;
        inFlight = null;
      }
    };
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      if (enabled) refreshOrdersCount();
    }, [enabled]),
  );

  return enabled ? count : null;
}
