import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { InPersonPayment } from "@/src/types/afterVisit";
import { formatIsoDateTime, formatVisitMoney } from "./afterVisitParts";

/**
 * Appointment Details (pro side): the "I paid at the salon" claim and its
 * answer, plus Confirm payment received / Not received. Also shown with no
 * claim when a completed visit is still unpaid (walk-in paid at the till).
 */
type Props = {
  payment: InPersonPayment | null | undefined;
  customerName: string;
  amount: number | null;
  canConfirm: boolean;
  canReject: boolean;
  onConfirm: () => void;
  onReject: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Sits in the details scroll, which already pads and spaces its cards.
    card: {
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      gap: moderateHeightScale(10),
    },
    claimed: {
      backgroundColor: theme.upcomingCard,
      borderColor: theme.upcomingBorder,
    },
    confirmed: {
      backgroundColor: theme.mintTint,
      borderColor: theme.apptMintBg,
    },
    rejected: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRed30,
    },
    neutral: {
      backgroundColor: theme.white,
      borderColor: theme.borderLight,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    iconWrap: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
    },
    headerText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    title: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    body: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    actions: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(2),
    },
    action: { flex: 1 },
  });

export default function InPersonPaymentCard({
  payment,
  customerName,
  amount,
  canConfirm,
  canReject,
  onConfirm,
  onReject,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const status = payment?.status;
  if (!status && !canConfirm) return null;

  const tip = payment?.tipAmount ?? 0;
  const amountText = amount != null ? formatVisitMoney(amount) : null;
  let tone = styles.neutral;
  let icon: keyof typeof MaterialIcons.glyphMap = "storefront";
  let iconColor = theme.buttonBack;
  let title = t("ipCardDueTitle");
  const lines: string[] = [];

  if (status === "claimed") {
    tone = styles.claimed;
    iconColor = theme.selectCard;
    title = t("ipCardClaimedTitle", { name: customerName });
    lines.push(
      tip > 0
        ? t("ipCardClaimedWithTip", {
            amount: amountText ?? "",
            tip: formatVisitMoney(tip),
          })
        : t("ipCardClaimedNoTip", { amount: amountText ?? "" }),
    );
    const at = formatIsoDateTime(payment?.claimedAt);
    if (at) lines.push(at);
  } else if (status === "confirmed") {
    tone = styles.confirmed;
    icon = "check-circle";
    title = t("ipCardConfirmedTitle");
    if (tip > 0) lines.push(t("ipCardCashTip", { amount: formatVisitMoney(tip) }));
  } else if (status === "rejected") {
    tone = styles.rejected;
    icon = "money-off";
    iconColor = theme.red;
    title = t("ipCardRejectedTitle");
    lines.push(t("ipCardRejectedBody", { name: customerName }));
  } else {
    lines.push(t("ipCardDueBody"));
  }
  if (
    (status === "confirmed" || status === "rejected") &&
    payment?.resolvedByName
  ) {
    const at = formatIsoDateTime(payment.resolvedAt);
    lines.push(
      at
        ? t("ipCardResolvedByAt", { name: payment.resolvedByName, date: at })
        : t("ipCardResolvedBy", { name: payment.resolvedByName }),
    );
  }

  return (
    <View style={[styles.card, tone]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialIcons
            name={icon}
            size={moderateWidthScale(22)}
            color={iconColor}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {lines.map((line, i) => (
            <Text key={i} style={styles.body}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      {canConfirm || canReject ? (
        <View style={styles.actions}>
          {canConfirm ? (
            <FlowButton
              compact
              style={styles.action}
              label={t("aoConfirmPayment")}
              onPress={onConfirm}
            />
          ) : null}
          {canReject ? (
            <FlowButton
              compact
              variant="outline"
              danger
              style={styles.action}
              label={t("aoNotReceived")}
              onPress={onReject}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
