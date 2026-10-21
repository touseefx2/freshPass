/**
 * Checkout (review) → bookingNow hand-off: a tapped review row stores the
 * step to edit, checkout goes back, and bookingNow opens that step on focus.
 */
export type ReviewEditTarget = "staff" | "time" | "payment" | "extras";

let pendingTarget: ReviewEditTarget | null = null;

export const requestReviewEdit = (target: ReviewEditTarget) => {
  pendingTarget = target;
};

/** Returns the pending target once, then clears it. */
export const takeReviewEdit = (): ReviewEditTarget | null => {
  const target = pendingTarget;
  pendingTarget = null;
  return target;
};
