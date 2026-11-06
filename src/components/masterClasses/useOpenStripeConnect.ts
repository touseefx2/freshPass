import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { setStripeConnectModalVisible } from "@/src/state/slices/generalSlice";

/**
 * Opens the existing Stripe Connect flow, like HomeQuickCards: the onboarding
 * status screen while Stripe is reviewing / waiting on the pro, else the
 * "connect" modal.
 */
export function useOpenStripeConnect() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const stripeStatus = useAppSelector(
    (s) => s.user.businessStatus?.stripe_onboarding_status,
  );
  return useCallback(() => {
    if (stripeStatus === "action_required" || stripeStatus === "under_review") {
      router.push("/(main)/stripeConnectOnboarding" as any);
    } else {
      dispatch(setStripeConnectModalVisible(true));
    }
  }, [dispatch, router, stripeStatus]);
}
