/**
 * Customer "My subscriptions" list helpers.
 * Do not change business-plan helpers in subscriptionLifecycle.ts for this screen.
 * See backend subscriptions-list-endpoint.md §§4–7.
 */

import {
  getSubscriptionDateDisplay,
  isStripeCancelled,
  parseSubscriptionInstant,
  subscriptionGrantsAccess,
  type SubscriptionAccessFields,
  type SubscriptionDateKind,
} from "@/src/utils/subscriptionLifecycle";

export type CustomerSubscriptionPillTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

export type CustomerSubscriptionPill = {
  label: string;
  tone: CustomerSubscriptionPillTone;
};

export type CustomerSubscriptionListFields = SubscriptionAccessFields & {
  totalPrice?: number | string | null;
  subscriptionPlanPrice?: number | string | null;
  remainingDays?: number | null;
};

/**
 * Status pill for customer cards. Never print raw `status`.
 * Order matches backend guide §6.
 */
export function getCustomerSubscriptionPill(
  sub: SubscriptionAccessFields,
): CustomerSubscriptionPill {
  const status = sub.status?.trim().toLowerCase() ?? "";

  if (status === "paused") {
    return { label: "Paused", tone: "neutral" };
  }
  if (status === "expired") {
    return { label: "Payment failed", tone: "danger" };
  }
  if (status === "pending") {
    return { label: "Processing", tone: "neutral" };
  }
  if (!subscriptionGrantsAccess(sub)) {
    return { label: "Ended", tone: "neutral" };
  }
  if (sub.stripeStatus?.trim().toLowerCase() === "trialing") {
    return { label: "Trial", tone: "info" };
  }
  if (sub.endsAt || isStripeCancelled(sub.stripeStatus)) {
    return { label: "Cancelled", tone: "warning" };
  }
  return { label: "Active", tone: "success" };
}

/** Prefer totalPrice (includes add-ons); fall back to plan price. */
export function getCustomerSubscriptionDisplayPrice(
  sub: Pick<
    CustomerSubscriptionListFields,
    "totalPrice" | "subscriptionPlanPrice"
  >,
): string {
  const raw =
    sub.totalPrice !== undefined &&
    sub.totalPrice !== null &&
    sub.totalPrice !== ""
      ? sub.totalPrice
      : sub.subscriptionPlanPrice;

  if (raw === undefined || raw === null || raw === "") return "0.00";

  const numeric =
    typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  if (Number.isFinite(numeric)) return numeric.toFixed(2);

  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const fallback = Number.parseFloat(cleaned);
  return Number.isFinite(fallback) ? fallback.toFixed(2) : String(raw);
}

export function canBookCustomerSubscription(
  sub: SubscriptionAccessFields,
): boolean {
  return subscriptionGrantsAccess(sub);
}

/** Show Cancel only while access remains and renewal has not been cancelled. */
export function canCancelCustomerSubscription(
  sub: SubscriptionAccessFields,
): boolean {
  return subscriptionGrantsAccess(sub) && !sub.endsAt;
}

export function getCustomerSubscriptionDateDisplay(
  sub: SubscriptionAccessFields,
): { kind: SubscriptionDateKind; date: string | null } {
  return getSubscriptionDateDisplay(sub);
}

/**
 * Days of access left. `remainingDays` counts down to next charge and is null
 * after cancel — compute from endsAt when present (guide §7).
 */
export function getCustomerAccessDaysRemaining(
  sub: CustomerSubscriptionListFields,
): number | null {
  if (sub.endsAt) {
    const end = parseSubscriptionInstant(sub.endsAt);
    if (!end) return null;
    return Math.max(
      0,
      Math.ceil((end.getTime() - Date.now()) / 86_400_000),
    );
  }
  if (typeof sub.remainingDays === "number") return sub.remainingDays;
  return null;
}

/** Rows that belong under the customer "Cancelled" filter (guide §4 trap). */
export function matchesCustomerCancelledFilter(
  sub: SubscriptionAccessFields,
): boolean {
  const status = sub.status?.trim().toLowerCase() ?? "";
  if (status === "cancelled" || status === "canceled") return true;
  if (isStripeCancelled(sub.stripeStatus)) return true;
  return Boolean(sub.endsAt);
}

export function formatCustomerServiceDuration(
  hours: number,
  minutes: number,
): string {
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "";
}

export function formatCustomerSubscriptionDate(
  dateString?: string | null,
): string {
  if (!dateString) return "";
  const parsed = parseSubscriptionInstant(dateString);
  if (!parsed) return dateString;
  const month = parsed.toLocaleString("en-US", { month: "short" });
  return `${month} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}
