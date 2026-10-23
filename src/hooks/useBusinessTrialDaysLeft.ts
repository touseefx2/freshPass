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
/**
 * Right after buying a plan the server may not have the trial yet (Stripe /
 * Apple confirm a moment later) — re-check instead of caching "no trial".
 */
const EMPTY_RETRY_DELAYS_MS = [3000, 8000, 20000];

// DashboardHeader mounts on every business tab — share one fetch between them
let cache: { key: string; at: number; trialEndsAt: string | null } | null =
  null;
type TrialFetch = { trialEndsAt: string | null; pending: boolean };
let inFlight: { key: string; promise: Promise<TrialFetch> } | null = null;

// pending = no resolvable plan yet (just bought) — only then is it worth retrying
const fetchTrialEndsAt = async (): Promise<TrialFetch> => {
  const response = await ApiService.get<{
    success: boolean;
    data: { data: SubscriptionAccessFields[] };
  }>(businessEndpoints.subscriptions("active", "business"));
  const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
  const sub = pickAccessibleSubscription(rows);
  if (!sub) return { trialEndsAt: null, pending: true };
  if (!isSubscriptionTrialing(sub)) return { trialEndsAt: null, pending: false };
  const trialEndsAt = sub.trialEndsAt ?? null;
  return { trialEndsAt, pending: !trialEndsAt };
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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const load = (attempt: number) => {
      if (inFlight?.key !== key) {
        inFlight = { key, promise: fetchTrialEndsAt() };
      }
      const request = inFlight;
      request.promise
        .then(({ trialEndsAt: endsAt, pending }) => {
          if (endsAt) {
            cache = { key, at: Date.now(), trialEndsAt: endsAt };
          }
          if (cancelled) return;
          setTrialEndsAt(endsAt);
          const delay = EMPTY_RETRY_DELAYS_MS[attempt];
          if (!endsAt && pending && delay !== undefined) {
            retryTimer = setTimeout(() => load(attempt + 1), delay);
          } else if (!endsAt) {
            cache = { key, at: Date.now(), trialEndsAt: null };
          }
        })
        .catch(() => {
          // Banner is optional — keep the last value on failure
        })
        .finally(() => {
          if (inFlight === request) inFlight = null;
        });
    };
    load(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled, key]);

  if (!enabled) return null;
  const endsAt = parseSubscriptionInstant(trialEndsAt);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / DAY_MS));
}
