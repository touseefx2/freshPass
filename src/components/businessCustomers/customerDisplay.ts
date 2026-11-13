import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { Theme } from "@/src/theme/colors";
import type {
  BusinessCustomerRecord,
  CustomerSource,
} from "@/src/types/businessCustomer";

/** "Sep 8, 2026" from "YYYY-MM-DD" (or an ISO string). */
export function formatCustomerDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = dayjs(value.length > 10 ? value.slice(0, 10) : value);
  return d.isValid() ? d.format("MMM D, YYYY") : value;
}

export function sourceLabel(t: TFunction, source: CustomerSource | null | undefined) {
  switch (source) {
    case "booking":
      return t("bcuSourceBooking");
    case "walk_in":
      return t("bcuSourceWalkIn");
    case "import":
      return t("bcuSourceImport");
    default:
      return source ? String(source).replace(/_/g, " ") : "";
  }
}

/** Email line + dot colour for a row / record. */
export function emailStatusInfo(
  t: TFunction,
  theme: Theme,
  c: Pick<BusinessCustomerRecord, "email" | "emailStatus" | "suppression">,
): { label: string; color: string } {
  if (!c.email) return { label: t("bcuEmailNone"), color: theme.lightGreen2 };
  if (c.suppression === "bounced")
    return { label: t("bcuEmailBounced"), color: theme.red };
  if (c.suppression === "complained")
    return { label: t("bcuEmailComplained"), color: theme.red };
  if (c.suppression === "invalid")
    return { label: t("bcuEmailInvalid"), color: theme.red };
  if (c.emailStatus === "subscribed")
    return { label: t("bcuEmailSubscribed"), color: theme.successGreen };
  if (c.emailStatus === "unsubscribed")
    return { label: t("bcuEmailUnsubscribed"), color: theme.accentAmber };
  return { label: t("bcuEmailUnknown"), color: theme.lightGreen };
}

/** "Last visit: Sep 8, 2026 · 66 days ago" / "Visit history unknown" / "No visits yet". */
export function lastVisitLine(
  t: TFunction,
  c: Pick<BusinessCustomerRecord, "history" | "lastVisitOn" | "daysSinceVisit">,
): string {
  if (c.lastVisitOn) {
    const date = formatCustomerDate(c.lastVisitOn);
    return c.daysSinceVisit != null
      ? t("bcuLastVisitAgo", {
          date,
          ago: t("bcuDaysAgo", { count: Math.max(0, c.daysSinceVisit) }),
        })
      : t("bcuLastVisit", { date });
  }
  if (c.history === "unknown") return t("bcuHistoryUnknown");
  return t("bcuNoVisitsYet");
}
