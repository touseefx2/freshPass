import { useEffect, useState } from "react";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  isSubscriptionTrialing,
  parseSubscriptionInstant,
  pickAccessibleSubscription,
  type SubscriptionAccessFields,
} from "@/src/utils/subscriptionLifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 10 * 60 * 1000;

// DashboardHeader mounts on every business tab — share one fetch between them
let cache: { key: string; at: number; trialEndsAt: string | null } | null =
  null;
let inFlight: { key: string; promise: Promise<string | null> } | null = null;

const fetchTrialEndsAt = async (): Promise<string | null> => {
  const response = await ApiService.get<{
    success: boolean;
    data: { data: SubscriptionAccessFields[] };
  }>(businessEndpoints.subscriptions("active", "business"));
  const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
  const sub = pickAccessibleSubscription(rows);
  return sub && isSubscriptionTrialing(sub) ? sub.trialEndsAt ?? null : null;
};

/**
 * Whole days left in the owner's FreshPass free trial, or null when the plan
 * is not trialing. `key` should change when the plan changes (refetch).
 */
export function useBusinessTrialDaysLeft(
  enabled: boolean,
  key: string,
): number | null {
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(
    cache?.key === key ? cache.trialEndsAt : null,
  );

  useEffect(() => {
    if (!enabled) {
      setTrialEndsAt(null);
      return;
    }
    if (cache?.key === key && Date.now() - cache.at < CACHE_MS) {
      setTrialEndsAt(cache.trialEndsAt);
      return;
    }

    let cancelled = false;
    if (inFlight?.key !== key) {
      inFlight = { key, promise: fetchTrialEndsAt() };
    }
    const request = inFlight;
    request.promise
      .then((endsAt) => {
        cache = { key, at: Date.now(), trialEndsAt: endsAt };
        if (!cancelled) setTrialEndsAt(endsAt);
      })
      .catch(() => {
        // Banner is optional — keep the last value on failure
      })
      .finally(() => {
        if (inFlight === request) inFlight = null;
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  if (!enabled) return null;
  const endsAt = parseSubscriptionInstant(trialEndsAt);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / DAY_MS));
}
