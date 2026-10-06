import {
  isBusinessSubscriptionActive,
  isStripeOnboardingCompleted,
  type BusinessStatus,
} from "@/src/state/slices/userSlice";

export type ReelUploadGateResult = "ok" | "stripe" | "plan";

/**
 * Stripe first, then any active Solo/Pro plan — same order as other business gates.
 * Staff post on the owner's business: they have no Stripe/plan of their own, and
 * their limit is the monthly number the owner gives them (enforced by the server).
 */
export function getReelUploadGate(
  businessStatus: BusinessStatus | null | undefined,
  userRole?: string | null,
): ReelUploadGateResult {
  if (userRole === "staff") return "ok";
  if (!isStripeOnboardingCompleted(businessStatus)) return "stripe";
  if (!isBusinessSubscriptionActive(businessStatus)) return "plan";
  return "ok";
}

/** Roles that can create and manage reels for a business (owner + staff). */
export function canManageReels(userRole?: string | null): boolean {
  return userRole === "business" || userRole === "staff";
}
