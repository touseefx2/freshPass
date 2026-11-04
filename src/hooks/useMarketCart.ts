import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAppSelector } from "@/src/hooks/hooks";
import { fetchCartCount } from "@/src/services/cartService";

// Several cart icons can gain focus together (tab switch); share one request
const FRESH_MS = 2_000;
let inFlight: Promise<unknown> | null = null;
let lastLoadedAt = 0;

/** Re-reads the badge count unless a recent / running request covers it. */
export function refreshCartBadgeCount(force = false): void {
  if (!force && (inFlight || Date.now() - lastLoadedAt < FRESH_MS)) return;
  const promise = fetchCartCount()
    .then(() => {
      lastLoadedAt = Date.now();
    })
    .catch(() => {
      // Badge keeps its last value
    })
    .finally(() => {
      if (inFlight === promise) inFlight = null;
    });
  inFlight = promise;
}

/** Signed-in customer (or business account in customer mode) — the cart exists. */
export function useCanUseMarketCart(): boolean {
  const isGuest = useAppSelector((s) => s.user.isGuest);
  const accessToken = useAppSelector((s) => s.user.accessToken);
  const userRole = useAppSelector((s) => s.user.userRole);
  return !isGuest && !!accessToken && userRole === "customer";
}

/**
 * Units in the Marketplace cart for header badges. Reads the `marketCart`
 * slice (every cart change updates it) and re-reads GET /api/cart/count when
 * the screen gains focus. Guests and business mode → 0.
 */
export function useCartBadgeCount(): number {
  const enabled = useCanUseMarketCart();
  const itemCount = useAppSelector((s) => s.marketCart.itemCount);

  useFocusEffect(
    useCallback(() => {
      if (enabled) refreshCartBadgeCount();
    }, [enabled]),
  );

  return enabled ? itemCount : 0;
}
