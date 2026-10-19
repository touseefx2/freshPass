import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { TFunction } from "i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { getDefaultAvatarImage } from "@/src/services/remoteConfigService";
import type { InPersonPayment } from "@/src/types/afterVisit";

dayjs.extend(customParseFormat);

/** Row from GET /api/appointments as the business home uses it. */
export interface HomeAppointment {
  id: number;
  /** MM/DD/YYYY (older rows may be YYYY-MM-DD) */
  appointmentDate: string;
  /** HH:mm */
  appointmentTime: string;
  appointmentType?: "service" | "subscription" | string;
  status: string;
  user?: string | null;
  userProfilePic?: string | null;
  userImage?: string | null;
  userAvatar?: string | null;
  subscription?: string | null;
  services?: Array<{ id: number; name: string }> | unknown;
  subscriptionServices?: Array<{ id: number; name: string }> | unknown;
  staffId?: number | null;
  staffName?: string | null;
  staffIsOwner?: boolean;
  canMarkOutcome?: boolean;
  inPersonPayment?: InPersonPayment | null;
}

export function resolveImageUri(raw: string | null | undefined): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    return getDefaultAvatarImage();
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  return `${base}/${trimmed.replace(/^\//, "")}`;
}

export function customerAvatarUri(appt: HomeAppointment): string {
  return resolveImageUri(
    appt.userProfilePic ?? appt.userImage ?? appt.userAvatar ?? null,
  );
}

export function appointmentServiceLabel(
  appt: HomeAppointment,
  t: TFunction,
): string {
  const list =
    appt.appointmentType === "subscription" &&
    Array.isArray(appt.subscriptionServices)
      ? (appt.subscriptionServices as Array<{ name: string }>)
      : Array.isArray(appt.services)
        ? (appt.services as Array<{ name: string }>)
        : [];
  const names = list.map((s) => s?.name).filter(Boolean);
  if (names.length === 0) return appt.subscription || t("service");
  if (names.length <= 2) return names.join(" & ");
  return `${names[0]} +${names.length - 1}`;
}

export function appointmentMoment(appt: HomeAppointment): dayjs.Dayjs {
  const time = appt.appointmentTime || "00:00";
  const formats = ["MM/DD/YYYY HH:mm", "YYYY-MM-DD HH:mm", "MM/DD/YYYY H:mm"];
  for (const format of formats) {
    const parsed = dayjs(`${appt.appointmentDate} ${time}`, format, true);
    if (parsed.isValid()) return parsed;
  }
  return dayjs(`${appt.appointmentDate} ${time}`);
}

export function sortAppointmentsByTime<T extends HomeAppointment>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => appointmentMoment(a).valueOf() - appointmentMoment(b).valueOf(),
  );
}

/** Statuses the business can still act on (the "current" ones). */
export const ACTIVE_APPOINTMENT_STATUSES = [
  "pending",
  "scheduled",
  "awaiting_outcome",
];

export type AppointmentAction = "view" | "update" | "confirm";

/** Existing actions only: mark outcome, confirm a pay-at-shop claim, or open. */
export function appointmentAction(appt: HomeAppointment): AppointmentAction {
  if (appt.inPersonPayment?.status === "claimed") return "confirm";
  if (appt.status === "awaiting_outcome" && appt.canMarkOutcome !== false) {
    return "update";
  }
  return "view";
}

export function statusChipMeta(
  status: string,
  theme: Theme,
  t: TFunction,
): { label: string; a11y: string; bg: string; fg: string } {
  switch (status) {
    case "pending":
      return {
        label: t("bhStatusPending"),
        a11y: t("bhStatusPending"),
        bg: theme.apptBlueBg,
        fg: theme.apptBlueAccent,
      };
    case "scheduled":
      return {
        label: t("bhStatusUpcoming"),
        a11y: t("bhStatusUpcoming"),
        bg: theme.tilePeach,
        fg: theme.orangeBrownText,
      };
    case "awaiting_outcome":
      return {
        label: t("bhStatusAwaiting"),
        a11y: t("statusAwaitingOutcome"),
        bg: theme.apptGoldBg,
        fg: theme.apptGoldAccent,
      };
    case "completed":
      return {
        label: t("bhStatusCompleted"),
        a11y: t("bhStatusCompleted"),
        bg: theme.tileMint,
        fg: theme.successGreen,
      };
    case "no_show":
      return {
        label: t("bhStatusNoShow"),
        a11y: t("bhStatusNoShow"),
        bg: theme.lightRed,
        fg: theme.red,
      };
    case "cancelled":
    case "canceled":
      return {
        label: t("bhStatusCancelled"),
        a11y: t("bhStatusCancelled"),
        bg: theme.lightGreen07,
        fg: theme.lightGreen6,
      };
    default:
      return {
        label: status,
        a11y: status,
        bg: theme.lightGreen07,
        fg: theme.darkGreen,
      };
  }
}

/** "$395.00" — big totals and list amounts. */
export function formatAmount(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = Math.abs(safe).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${safe < 0 ? "−" : ""}$${formatted}`;
}

/** "$220" when whole, "$220.50" otherwise — small tiles. */
export function formatAmountCompact(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const whole = Math.round(safe * 100) % 100 === 0;
  const formatted = Math.abs(safe).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
  return `${safe < 0 ? "−" : ""}$${formatted}`;
}

/** Narrow tiles: "$9,999.50" as is, then "$25K" / "$25.5K" / "$1.2M". */
export function formatAmountShort(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  if (abs < 10_000) return formatAmountCompact(safe);
  const [div, unit] = abs >= 1_000_000 ? [1_000_000, "M"] : [1_000, "K"];
  const short = (Math.floor((abs / div) * 10) / 10).toString();
  return `${safe < 0 ? "−" : ""}$${short}${unit}`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const createChipStyles = () =>
  StyleSheet.create({
    chip: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(6),
    },
    chipText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
  });

const chipStyles = createChipStyles();

export function StatusChip({
  status,
  t,
  style,
}: {
  status: string;
  t: TFunction;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const meta = statusChipMeta(status, colors as Theme, t);
  return (
    <View
      style={[chipStyles.chip, { backgroundColor: meta.bg }, style]}
      accessible
      accessibilityLabel={meta.a11y}
    >
      <Text style={[chipStyles.chipText, { color: meta.fg }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
}

const createHeaderStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
      gap: moderateWidthScale(12),
    },
    title: {
      flexShrink: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    action: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.primary,
    },
  });

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = React.useMemo(
    () => createHeaderStyles(colors as Theme),
    [colors],
  );
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Card surface used by the lists on both screens. */
export const createCardStyle = (theme: Theme) => ({
  backgroundColor: theme.white,
  borderRadius: moderateWidthScale(16),
  borderWidth: 1,
  borderColor: theme.borderLight,
  shadowColor: theme.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 1,
});
