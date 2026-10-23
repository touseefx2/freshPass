import {
  isBusinessSubscriptionActive,
  type BusinessStatus,
} from "@/src/state/slices/userSlice";

export type ReelUploadGateResult = "ok" | "plan";

/**
 * Any active Solo/Pro plan (trial counts). Stripe Connect is not needed to post.
 * Staff post on the owner's business: they have no Stripe/plan of their own, and
 * their limit is the monthly number the owner gives them (enforced by the server).
 */
export function getReelUploadGate(
  businessStatus: BusinessStatus | null | undefined,
  userRole?: string | null,
): ReelUploadGateResult {
  if (userRole === "staff") return "ok";
  if (!isBusinessSubscriptionActive(businessStatus)) return "plan";
  return "ok";
}

/** Roles that can create and manage reels for a business (owner + staff). */
export function canManageReels(userRole?: string | null): boolean {
  return userRole === "business" || userRole === "staff";
}
