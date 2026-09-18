import {
  isBusinessSubscriptionActive,
  isStripeOnboardingCompleted,
  type BusinessStatus,
} from "@/src/state/slices/userSlice";

export type ReelUploadGateResult = "ok" | "stripe" | "plan";

/** Stripe first, then any active Solo/Pro plan — same order as other business gates. */
export function getReelUploadGate(
  businessStatus: BusinessStatus | null | undefined,
): ReelUploadGateResult {
  if (!isStripeOnboardingCompleted(businessStatus)) return "stripe";
  if (!isBusinessSubscriptionActive(businessStatus)) return "plan";
  return "ok";
}
