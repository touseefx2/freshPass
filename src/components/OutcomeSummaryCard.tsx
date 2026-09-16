import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { OutcomeSummary } from "@/src/types/cancellationPolicy";

interface OutcomeSummaryCardProps {
  summary: OutcomeSummary;
  isBusinessView?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(8),
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(12),
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    chip: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.apptBlueBg,
    },
    chipPaid: {
      backgroundColor: theme.apptMintBg,
    },
    chipDue: {
      backgroundColor: theme.orangeBrown015,
    },
    chipFailed: {
      backgroundColor: theme.lightRed,
    },
    chipFee: {
      backgroundColor: theme.orangeBrown01,
    },
    chipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.apptBlueAccent,
    },
    chipTextPaid: {
      color: theme.apptMintAccent,
    },
    chipTextDue: {
      color: theme.appointmentStatusText,
    },
    chipTextFailed: {
      color: theme.red,
    },
    chipTextFee: {
      color: theme.selectCard,
    },
    message: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
      lineHeight: fontSize.size19,
      marginBottom: moderateHeightScale(14),
    },
    businessLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      marginBottom: moderateHeightScale(4),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(7),
      gap: moderateWidthScale(12),
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      flex: 1,
    },
    value: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "right",
    },
    valueMuted: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textAlign: "right",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(8),
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    totalLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    footer: {
      marginTop: moderateHeightScale(12),
    },
    footerText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
  });

function formatMoney(
  amount: number | null | undefined,
  currency?: string,
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

function formatMarkedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OutcomeSummaryCard({
  summary,
  isBusinessView = false,
}: OutcomeSummaryCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const feeStatusLabel = (() => {
    switch (summary.feeStatus) {
      case "none":
        return t("outcomeFeeNone");
      case "charged":
        return t("outcomeFeeCharged");
      case "kept_from_payment":
        return t("outcomeFeeDeducted");
      case "failed":
        return t("outcomeFeeNotCharged");
      case "refunded":
        return t("outcomeFeeRefunded");
      case "reversed":
        return t("outcomeFeeCancelled");
      default:
        return String(summary.feeStatus);
    }
  })();

  const paymentStatusLabel = (() => {
    switch (summary.paymentStatus) {
      case "paid":
        return t("outcomePaymentPaid");
      case "payment_due":
        return t("outcomePaymentDue");
      case "partially_refunded":
        return t("outcomePaymentPartiallyRefunded");
      case "refunded":
        return t("outcomePaymentRefunded");
      case "fee_charged":
        return t("outcomePaymentFeeCharged");
      case "charge_failed":
        return t("outcomePaymentChargeFailed");
      case "no_charge":
        return t("outcomePaymentNoCharge");
      case "membership":
        return t("outcomePaymentMembership");
      default:
        return String(summary.paymentStatus);
    }
  })();

  const visitStatusLabel = (() => {
    switch (summary.visitStatus) {
      case "used":
        return t("outcomeVisitUsed");
      case "forfeited":
        return t("outcomeVisitForfeited");
      case "returned":
        return t("outcomeVisitReturned");
      case "restored":
        return t("outcomeVisitRestored");
      default:
        return summary.visitStatus ? String(summary.visitStatus) : null;
    }
  })();

  const isMembership = summary.paymentStatus === "membership";
  const markedAtLabel = formatMarkedAt(summary.markedAt);
  const refundedAtLabel = formatMarkedAt(summary.refundedAt);

  const chipStyle =
    summary.paymentStatus === "paid" ||
    summary.paymentStatus === "membership"
      ? styles.chipPaid
      : summary.paymentStatus === "payment_due"
        ? styles.chipDue
        : summary.paymentStatus === "charge_failed" ||
            summary.paymentStatus === "no_charge"
          ? styles.chipFailed
          : summary.paymentStatus === "fee_charged"
            ? styles.chipFee
            : styles.chip;

  const chipTextStyle =
    summary.paymentStatus === "paid" ||
    summary.paymentStatus === "membership"
      ? styles.chipTextPaid
      : summary.paymentStatus === "payment_due"
        ? styles.chipTextDue
        : summary.paymentStatus === "charge_failed" ||
            summary.paymentStatus === "no_charge"
          ? styles.chipTextFailed
          : summary.paymentStatus === "fee_charged"
            ? styles.chipTextFee
            : styles.chipText;

  const footerParts: string[] = [];
  if (summary.markedByName) {
    footerParts.push(t("outcomeMarkedBy", { name: summary.markedByName }));
  }
  if (markedAtLabel) {
    footerParts.push(t("outcomeMarkedOn", { date: markedAtLabel }));
  }

  type Row = { key: string; label: string; value: string; muted?: boolean };
  const rows: Row[] = [];

  if (isMembership && visitStatusLabel) {
    rows.push({
      key: "visit",
      label: t("outcomeVisitStatus"),
      value: visitStatusLabel,
    });
  }
  if (!isMembership && summary.servicePrice != null && summary.servicePrice > 0) {
    rows.push({
      key: "service",
      label: t("outcomeServicePrice"),
      value: formatMoney(summary.servicePrice, summary.currency),
    });
  }
  if (!isMembership && (summary.feeAmount > 0 || summary.feeStatus !== "none")) {
    rows.push({
      key: "fee",
      label: t("noShowFee"),
      value: `${formatMoney(summary.feeAmount, summary.currency)}${
        summary.feePercent > 0 ? ` (${summary.feePercent}%)` : ""
      } · ${feeStatusLabel}`,
    });
  } else if (!isMembership) {
    rows.push({
      key: "fee-none",
      label: t("noShowFee"),
      value: feeStatusLabel,
    });
  }
  if (!isMembership && summary.amountPaid > 0) {
    rows.push({
      key: "paid",
      label: t("outcomeAmountPaid"),
      value: formatMoney(summary.amountPaid, summary.currency),
    });
  }
  if (!isMembership && summary.refundAmount > 0) {
    rows.push({
      key: "refund",
      label: t("outcomeRefunded"),
      value: formatMoney(summary.refundAmount, summary.currency),
    });
    if (refundedAtLabel) {
      rows.push({
        key: "refund-date",
        label: "",
        value: refundedAtLabel,
        muted: true,
      });
    }
  }
  if (summary.cardLastFour) {
    rows.push({
      key: "card",
      label: t("outcomeCard"),
      value: `•••• ${summary.cardLastFour}`,
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t("outcomeWhatHappened")}</Text>
        <View style={[styles.chip, chipStyle]}>
          <Text style={[styles.chipText, chipTextStyle]}>
            {paymentStatusLabel}
          </Text>
        </View>
      </View>

      {summary.message ? (
        <>
          {isBusinessView ? (
            <Text style={styles.businessLabel}>
              {t("outcomeWhatCustomerSees")}
            </Text>
          ) : null}
          <Text style={styles.message}>{summary.message}</Text>
        </>
      ) : null}

      {rows.map((row) =>
        row.key === "refund-date" ? (
          <View key={row.key} style={[styles.row, { paddingTop: 0 }]}>
            <Text style={styles.label} />
            <Text style={styles.valueMuted}>{row.value}</Text>
          </View>
        ) : (
          <View key={row.key} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ),
      )}

      {!isMembership ? (
        <>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("outcomeTotalPaid")}</Text>
            <Text style={styles.totalValue}>
              {formatMoney(summary.totalPaid, summary.currency)}
            </Text>
          </View>
        </>
      ) : null}

      {footerParts.length > 0 ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerParts.join(" · ")}</Text>
        </View>
      ) : null}
    </View>
  );
}
