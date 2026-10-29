import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import { ApiService, isRequestCanceled } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { fetchBusinessOrderStats } from "@/src/services/orderService";
import type { ShopOrderStats } from "@/src/types/shopOrder";
import { getOrdersNeedingActionCount } from "@/src/utils/shopOrderHelpers";
import {
  dismissSetupReminder,
  advanceGrowthReminder,
} from "@/src/state/slices/generalSlice";

// ── Reminder identifiers ────────────────────────────────────────────

export type SetupReminderKey =
  | "connectStripe"
  | "createMembership"
  | "cancellationPolicy";

export type GrowthReminderKey =
  | "createReel"
  | "addProduct"
  | "hiring";

export type ReminderKey = SetupReminderKey | GrowthReminderKey;

// Maps growth keys → FAB menu item ids
export const GROWTH_TO_FAB: Record<GrowthReminderKey, string> = {
  createReel: "createReel",
  addProduct: "addProduct",
  hiring: "hiring",
};

// ── Ordered setup steps ─────────────────────────────────────────────
const SETUP_STEPS: SetupReminderKey[] = [
  "connectStripe",
  "createMembership",
  "cancellationPolicy",
];

const GROWTH_STEPS: GrowthReminderKey[] = [
  "createReel",
  "addProduct",
  "hiring",
];

// ── Module-level fetch dedup ────────────────────────────────────────
type SetupData = {
  hasMemberships: boolean | null;
  hasCancellationPolicy: boolean | null;
  pendingOrdersCount: number;
};

const CACHE_TTL_MS = 60_000;

let _setupCache: {
  key: string;
  promise: Promise<SetupData>;
  ts: number;
} | null = null;

let _sessionAdvanced = false;

export function clearSetupCache() {
  _setupCache = null;
  _sessionAdvanced = false;
}

function fetchSetupData(
  businessId: number | string | null | undefined,
  stripeComplete: boolean,
): Promise<SetupData> {
  const key = `${businessId ?? 0}:${stripeComplete ? "y" : "n"}`;
  if (
    _setupCache?.key === key &&
    Date.now() - _setupCache.ts < CACHE_TTL_MS
  ) {
    return _setupCache.promise;
  }

  const promise = (async (): Promise<SetupData> => {
    let hasMemberships: boolean | null = null;
    let hasCancellationPolicy: boolean | null = null;
    let pendingOrdersCount = 0;

    if (stripeComplete) {
      const [membershipRes, policyRes] = await Promise.all([
        ApiService.get<{
          success: boolean;
          data: { subscription_plans: unknown[] };
        }>(businessEndpoints.moduleData("subscription-plans")).catch(
          () => null,
        ),
        ApiService.get<{
          success: boolean;
          data: { cancellation_cutoff?: string; policy_active?: boolean };
        }>(businessEndpoints.cancellationPolicy).catch(() => null),
      ]);

      hasMemberships =
        membershipRes?.success === true &&
        Array.isArray(membershipRes.data?.subscription_plans) &&
        membershipRes.data.subscription_plans.length > 0;

      const policy = policyRes?.data;
      hasCancellationPolicy =
        policyRes?.success === true &&
        policy != null &&
        (policy.policy_active === true ||
          (policy.cancellation_cutoff != null &&
            policy.cancellation_cutoff !== "none"));
    }

    try {
      const stats: ShopOrderStats = await fetchBusinessOrderStats();
      pendingOrdersCount = getOrdersNeedingActionCount(stats);
    } catch {
      // badge just won't show
    }

    return { hasMemberships, hasCancellationPolicy, pendingOrdersCount };
  })();

  promise.catch(() => {
    if (_setupCache?.promise === promise) _setupCache = null;
  });

  _setupCache = { key, promise, ts: Date.now() };
  return promise;
}

// ── Hook ─────────────────────────────────────────────────────────────

export interface SetupReminderState {
  /** The single reminder to highlight right now (null = nothing to show) */
  currentReminder: ReminderKey | null;
  /** Whether currentReminder is a setup step (vs growth) */
  isSetupStep: boolean;
  /** Pending orders that need attention */
  pendingOrdersCount: number;
  /** Dismiss the current reminder for this session */
  dismiss: () => void;
  /** Whether data is still loading */
  loading: boolean;
}

export function useSetupReminder(): SetupReminderState {
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userRole = useAppSelector((s) => s.user.userRole);
  const dismissedReminders = useAppSelector(
    (s) => s.general.dismissedSetupReminders,
  );
  const growthIndex = useAppSelector(
    (s) => s.general.lastGrowthReminderIndex,
  );
  const [visitGrowthIndex] = useState(() => growthIndex);

  const businessId = useAppSelector((s) => s.user.business_id);

  const isOwner =
    userRole === "business" && businessStatus?.onboarding_completed === true;

  const [hasMemberships, setHasMemberships] = useState<boolean | null>(null);
  const [hasCancellationPolicy, setHasCancellationPolicy] = useState<
    boolean | null
  >(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [loading, setLoading] = useState(isOwner);

  const stripeComplete = isStripeOnboardingCompleted(businessStatus);

  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    fetchSetupData(businessId, stripeComplete)
      .then((data) => {
        if (cancelled) return;
        setHasMemberships(data.hasMemberships);
        setHasCancellationPolicy(data.hasCancellationPolicy);
        setPendingOrdersCount(data.pendingOrdersCount);
      })
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner, businessId, stripeComplete]);

  const currentReminder = useMemo((): ReminderKey | null => {
    if (!isOwner || loading) return null;

    // ── Setup steps (priority order) ────────────────────────────────
    const stripeComplete = isStripeOnboardingCompleted(businessStatus);

    const stepStatus: Record<SetupReminderKey, boolean> = {
      connectStripe: stripeComplete,
      createMembership: hasMemberships !== false,
      cancellationPolicy: hasCancellationPolicy !== false,
    };

    for (const step of SETUP_STEPS) {
      if (!stepStatus[step] && !dismissedReminders.includes(step)) {
        // Membership and cancellation policy only after Stripe
        if (step !== "connectStripe" && !stripeComplete) continue;
        return step;
      }
    }

    // ── Growth reminders (rotate per visit) ─────────────────────────
    const eligible = GROWTH_STEPS.filter(
      (g) => !dismissedReminders.includes(g),
    );
    if (eligible.length === 0) return null;

    const idx = visitGrowthIndex % eligible.length;
    return eligible[idx];
  }, [
    isOwner,
    loading,
    businessStatus,
    hasMemberships,
    hasCancellationPolicy,
    dismissedReminders,
    visitGrowthIndex,
  ]);

  const isSetupStep =
    currentReminder != null &&
    (SETUP_STEPS as string[]).includes(currentReminder);

  useEffect(() => {
    if (!_sessionAdvanced && currentReminder != null && !isSetupStep) {
      _sessionAdvanced = true;
      dispatch(advanceGrowthReminder());
    }
  }, [currentReminder, isSetupStep, dispatch]);

  const dismiss = useCallback(() => {
    if (!currentReminder) return;
    dispatch(dismissSetupReminder(currentReminder));
  }, [currentReminder, dispatch]);

  return {
    currentReminder,
    isSetupStep,
    pendingOrdersCount,
    dismiss,
    loading,
  };
}
