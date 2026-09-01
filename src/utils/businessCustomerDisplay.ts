import dayjs from "dayjs";
import type {
  BusinessCustomer,
  BusinessCustomerPurchaseService,
  BusinessCustomerSubscription,
} from "@/src/types/customers";
import type { CustomerSubscriptionPillTone } from "@/src/utils/customerSubscriptionLifecycle";

export type BusinessCustomerStatusPill = {
  label: string;
  tone: CustomerSubscriptionPillTone;
};

export function getBusinessCustomerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function resolveBusinessCustomerAvatarUrl(
  profileImageUrl?: string | null,
): string | null {
  if (!profileImageUrl?.trim()) return null;

  const trimmed = profileImageUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return path ? `${base}/${path}` : null;
}

export function formatBusinessCustomerDate(
  dateString?: string | null,
): string {
  if (!dateString) return "--";
  const parsed = dayjs(dateString);
  if (!parsed.isValid()) return dateString;
  return parsed.format("MMM D, YYYY");
}

export function formatBusinessCustomerTime(
  timeString?: string | null,
): string {
  if (!timeString) return "";
  const parsed = dayjs(`2000-01-01 ${timeString}`);
  if (!parsed.isValid()) return timeString;
  return parsed.format("h:mm A");
}

export function getBusinessCustomerListStatus(
  customer: Pick<BusinessCustomer, "currentStatus">,
): BusinessCustomerStatusPill {
  const status = customer.currentStatus?.trim().toLowerCase() ?? "";

  if (!status) {
    return { label: "No subscription", tone: "neutral" };
  }
  if (status === "active") {
    return { label: "Active", tone: "success" };
  }
  if (status === "trialing" || status === "trial") {
    return { label: "Trial", tone: "info" };
  }
  if (status === "cancelled" || status === "canceled") {
    return { label: "Cancelled", tone: "warning" };
  }
  if (status === "paused") {
    return { label: "Paused", tone: "neutral" };
  }
  if (status === "expired") {
    return { label: "Expired", tone: "danger" };
  }
  if (status === "pending") {
    return { label: "Processing", tone: "neutral" };
  }

  return {
    label: customer.currentStatus ?? "Unknown",
    tone: "neutral",
  };
}

export function getSubscriptionStartDate(
  sub: Pick<BusinessCustomerSubscription, "startedAt">,
): string {
  return formatBusinessCustomerDate(sub.startedAt);
}

export function getSubscriptionPeriodLabel(
  sub: Pick<
    BusinessCustomerSubscription,
    "currentPeriodStart" | "currentPeriodEnd"
  >,
): string {
  const start = formatBusinessCustomerDate(sub.currentPeriodStart);
  const end = formatBusinessCustomerDate(sub.currentPeriodEnd);

  if (start === "--" && end === "--") return "--";
  if (start === "--") return end;
  if (end === "--") return start;
  if (start === end) return start;
  return `${start} – ${end}`;
}

export function formatBusinessCustomerPrice(
  price: number | string | null | undefined,
): string {
  if (price === undefined || price === null || price === "") return "--";
  const numeric = typeof price === "number" ? price : parseFloat(price);
  if (Number.isNaN(numeric)) return String(price);
  return `$${numeric.toFixed(2)}`;
}

export function getBusinessCustomerContactLine(
  customer: Pick<BusinessCustomer, "email" | "phone">,
): string {
  if (customer.email?.trim()) return customer.email.trim();
  if (customer.phone?.trim()) return customer.phone.trim();
  return "--";
}

export function formatPurchaseServiceName(
  service: BusinessCustomerPurchaseService,
): string {
  if (typeof service === "string") return service.trim();
  if (!service || typeof service !== "object") return "";
  const name = service.name ?? service.title;
  return typeof name === "string" ? name.trim() : "";
}

export function formatPurchaseServicesLabel(
  services?: BusinessCustomerPurchaseService[] | null,
  additionalServices?: BusinessCustomerPurchaseService[] | null,
): string {
  const names = [...(services ?? []), ...(additionalServices ?? [])]
    .map(formatPurchaseServiceName)
    .filter(Boolean);
  return names.join(", ");
}

export function formatPaymentMethodLabel(method?: string | null): string {
  if (!method?.trim()) return "--";
  return method
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getStatusPillColors(
  tone: CustomerSubscriptionPillTone,
  theme: {
    green: string;
    orangeBrown: string;
    red: string;
    darkGreen: string;
    buttonBack: string;
    lightGreen07: string;
    lightGreen13: string;
    lightGreen015: string;
    lightRed: string;
    white: string;
  },
): { backgroundColor: string; color: string } {
  switch (tone) {
    case "success":
      return { backgroundColor: theme.green, color: theme.darkGreen };
    case "warning":
      return { backgroundColor: theme.orangeBrown, color: theme.white };
    case "danger":
      return { backgroundColor: theme.lightRed, color: theme.red };
    case "info":
      return {
        backgroundColor: theme.lightGreen015,
        color: theme.buttonBack,
      };
    default:
      return {
        backgroundColor: theme.lightGreen13,
        color: theme.darkGreen,
      };
  }
}
