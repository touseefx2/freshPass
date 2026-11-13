// Bring Customers Back: shared pieces for the campaign list, create flow
// and detail screens.

import React, { useEffect, useMemo, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { StatusChip } from "@/src/components/masterClasses/parts";
import { EditorSheet } from "@/src/components/masterClasses/editorSheets";
import type { ClassBadgeTone } from "@/src/utils/masterClassHelpers";
import type {
  Campaign,
  CampaignAllowance,
  CampaignStatus,
} from "@/src/types/campaign";

export const CAMPAIGNS_ROUTE = "/(main)/bringCustomersBack";
export const CAMPAIGN_CREATE_ROUTE = "/(main)/bringCustomersBack/create";
export const CAMPAIGN_DETAIL_ROUTE = "/(main)/bringCustomersBack/detail";

const useStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

/** "2026-12-01" → "Dec 1, 2026" (date only, no time-zone shift). */
export function formatCampaignDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  const d = dayjs(match ? match[1] : value);
  return d.isValid() ? d.format("MMM D, YYYY") : null;
}

/**
 * "2026-11-20 10:00" (salon clock) → "Nov 20, 2026 · 10:00 AM". Reads the wall
 * clock digits so the salon time is never shifted to the phone's zone.
 */
export function formatCampaignDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return formatCampaignDate(value);
  const d = dayjs(`${match[1]}T${match[2]}:${match[3]}:00`);
  return d.isValid() ? d.format("MMM D, YYYY · h:mm A") : null;
}

export function formatCampaignMoney(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;
}

/** Server status → chip. Unknown values show the server text. */
export function campaignStatusMeta(
  status: CampaignStatus,
  t: TFunction,
): { label: string; tone: ClassBadgeTone } {
  switch (status) {
    case "draft":
      return { label: t("bcbStatusDraft"), tone: "draft" };
    case "scheduled":
      return { label: t("bcbStatusScheduled"), tone: "info" };
    case "sending":
      return { label: t("bcbStatusSending"), tone: "warning" };
    case "sent":
      return { label: t("bcbStatusSent"), tone: "live" };
    case "cancelled":
    case "canceled":
      return { label: t("bcbStatusCancelled"), tone: "neutral" };
    default: {
      const text = String(status || "").replace(/_/g, " ");
      return {
        label: text ? text.charAt(0).toUpperCase() + text.slice(1) : "",
        tone: "neutral",
      };
    }
  }
}

/** Monthly email allowance: used / limit, a bar, remaining and reset date. */
export function AllowanceCard({
  allowance,
  style,
}: {
  allowance: CampaignAllowance | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  if (!allowance) return null;
  const pct =
    allowance.limit > 0 ? Math.min(1, Math.max(0, allowance.used / allowance.limit)) : 0;
  const reset = formatCampaignDate(allowance.resetsOn);
  const low = allowance.remaining <= 0;
  return (
    <View
      style={[styles.allowance, style]}
      accessible
      accessibilityLabel={[
        t("bcbAllowanceTitle"),
        t("bcbAllowanceUsed", { used: allowance.used, limit: allowance.limit }),
        t("bcbAllowanceLeft", { count: allowance.remaining }),
        reset ? t("bcbAllowanceResets", { date: reset }) : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.allowanceTop}>
        <View style={styles.allowanceIcon}>
          <Ionicons name="mail-outline" size={iconScale(18)} color={theme.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.allowanceLabel}>{t("bcbAllowanceTitle")}</Text>
          <Text style={styles.allowanceValue}>
            {t("bcbAllowanceUsed", { used: allowance.used, limit: allowance.limit })}
          </Text>
        </View>
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.round(pct * 100)}%` },
            low && { backgroundColor: theme.red },
          ]}
        />
      </View>
      <View style={styles.allowanceBottom}>
        <Text style={[styles.allowanceLeft, low && { color: theme.lightRedSolid }]}>
          {t("bcbAllowanceLeft", { count: allowance.remaining })}
        </Text>
        {reset ? (
          <Text style={styles.allowanceReset}>{t("bcbAllowanceResets", { date: reset })}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** One campaign in the list. */
export function CampaignCard({
  campaign,
  onPress,
}: {
  campaign: Campaign;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const status = campaignStatusMeta(campaign.status, t);
  const when =
    campaign.status === "scheduled"
      ? t("bcbScheduledFor", {
          date: formatCampaignDateTime(campaign.scheduled_at) ?? "",
        })
      : campaign.status === "sent" || campaign.status === "sending"
        ? campaign.results
          ? t("bcbSentCount", { count: campaign.results.sent })
          : formatCampaignDateTime(campaign.sent_at)
        : campaign.inactivity_days
          ? t("bcbInactiveDays", { count: campaign.inactivity_days })
          : null;
  const offer = [campaign.offer?.savings_label, campaign.offer?.title]
    .filter(Boolean)
    .join(" · ");
  const title = campaign.subject || t("bcbUntitled");
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={[title, status.label, offer, when].filter(Boolean).join(", ")}
    >
      <View style={styles.cardIcon}>
        <Ionicons
          name={campaign.template === "holiday" ? "gift-outline" : "paper-plane-outline"}
          size={iconScale(20)}
          color={theme.orangeBrown}
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <StatusChip label={status.label} tone={status.tone} hideIcon />
        </View>
        {offer ? (
          <Text style={styles.cardSub} numberOfLines={1}>
            {offer}
          </Text>
        ) : null}
        {when ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {when}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={iconScale(18)} color={theme.lightGreen5} />
    </TouchableOpacity>
  );
}

/** Label + switch row (white card). */
export function ToggleRow({
  label,
  sub,
  value,
  onChange,
  disabled,
}: {
  label: string;
  sub?: string | null;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { theme, styles } = useStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: moderateHeightScale(2) }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub ? <Text style={styles.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.borderLight, true: theme.buttonBack }}
        thumbColor={theme.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Multi-select list in a bottom sheet (services / staff filters). */
export function CampaignMultiSelectSheet({
  visible,
  title,
  subtitle,
  options,
  selected,
  emptyText,
  onDone,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  options: { id: number; label: string; sub: string | null }[];
  selected: number[];
  emptyText: string;
  onDone: (ids: number[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const [picked, setPicked] = useState<number[]>(selected);

  useEffect(() => {
    if (visible) setPicked(selected);
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <EditorSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onDone(picked)}
          style={styles.sheetBtn}
          accessibilityRole="button"
        >
          <Text style={styles.sheetBtnText}>
            {picked.length ? `${t("done")} · ${picked.length}` : t("done")}
          </Text>
        </TouchableOpacity>
      }
    >
      {options.length ? (
        <View style={{ gap: moderateHeightScale(8) }}>
          {options.map((o) => {
            const on = picked.includes(o.id);
            return (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.8}
                onPress={() => toggle(o.id)}
                style={[styles.option, on && styles.optionOn]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={o.label}
              >
                <Ionicons
                  name={on ? "checkbox" : "square-outline"}
                  size={iconScale(22)}
                  color={on ? theme.darkGreen : theme.lightGreen5}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{o.label}</Text>
                  {o.sub ? <Text style={styles.optionSub}>{o.sub}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.optionSub}>{emptyText}</Text>
      )}
    </EditorSheet>
  );
}

/** Yes / no question in a bottom sheet (send, cancel, delete). */
export function CampaignConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string | null;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  return (
    <EditorSheet
      visible={visible}
      title={title}
      onClose={loading ? () => {} : onClose}
      footer={
        <View style={{ gap: moderateHeightScale(10) }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onConfirm}
            disabled={loading}
            style={[styles.sheetBtn, danger && { backgroundColor: theme.red }, loading && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.sheetBtnText}>{loading ? t("bcbPleaseWait") : confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            disabled={loading}
            style={styles.sheetBtnOutline}
            accessibilityRole="button"
          >
            <Text style={styles.sheetBtnOutlineText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {message ? <Text style={styles.confirmText}>{message}</Text> : null}
    </EditorSheet>
  );
}

/** Pill row (single choice), e.g. 30 / 60 / 90 / Custom days. */
export function PillChoice<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  const { styles } = useStyles();
  return (
    <View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={String(o.value)}
            activeOpacity={0.85}
            onPress={() => onChange(o.value)}
            style={[styles.pill, on && styles.pillOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.pillText, on && styles.pillTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    allowance: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    allowanceTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    allowanceIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    allowanceLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    allowanceValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    bar: {
      height: moderateHeightScale(8),
      borderRadius: moderateHeightScale(4),
      backgroundColor: theme.white15,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: moderateHeightScale(4),
      backgroundColor: theme.orangeBrown,
    },
    allowanceBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    allowanceLeft: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    allowanceReset: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    cardIcon: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      backgroundColor: theme.tileGoldCream,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: { flex: 1, gap: moderateHeightScale(4) },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    cardMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      minHeight: moderateHeightScale(52),
    },
    toggleLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    toggleSub: {
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    sheetBtn: {
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetBtnText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sheetBtnOutline: {
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetBtnOutlineText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    confirmText: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.5,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      minHeight: moderateHeightScale(52),
    },
    optionOn: { borderColor: theme.darkGreen, backgroundColor: theme.mintTint },
    optionLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    pills: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(4),
    },
    pill: {
      flex: 1,
      minHeight: moderateHeightScale(44),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(6),
    },
    pillOn: { backgroundColor: theme.darkGreen },
    pillText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    pillTextOn: { color: theme.white, fontFamily: fonts.fontBold },
  });
