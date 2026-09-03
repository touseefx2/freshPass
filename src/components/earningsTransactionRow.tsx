import React, { useMemo } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import dayjs from "dayjs";
import type { EarningsTransaction } from "@/src/types/businessEarnings";
import {
  formatMoneyPlain,
  isViewableReceiptUrl,
} from "@/src/services/businessEarningsService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      marginBottom: moderateHeightScale(10),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(6),
    },
    title: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    badge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(6),
    },
    badgePaid: {
      backgroundColor: theme.lightGreen1,
    },
    badgeRefunded: {
      backgroundColor: theme.lightRed,
    },
    badgePartial: {
      backgroundColor: theme.orangeBrown01,
    },
    badgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    badgeTextRefunded: {
      color: theme.red,
    },
    badgeTextPartial: {
      color: theme.selectCard,
    },
    meta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
      marginBottom: moderateHeightScale(2),
    },
    amountsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
    },
    amountBlock: {
      minWidth: moderateWidthScale(70),
    },
    amountLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(2),
    },
    amountValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    amountNegative: {
      color: theme.red,
    },
    receiptBtn: {
      marginTop: moderateHeightScale(10),
      alignSelf: "flex-start",
    },
    receiptText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
      textDecorationLine: "underline",
    },
  });

type Props = {
  item: EarningsTransaction;
  currency?: string;
};

export default function EarningsTransactionRow({
  item,
  currency = "USD",
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const statusLabel =
    item.status === "refunded"
      ? t("earningsStatusRefunded")
      : item.status === "partially_refunded"
        ? t("earningsStatusPartialRefund")
        : t("earningsStatusPaid");

  const badgeStyle =
    item.status === "refunded"
      ? styles.badgeRefunded
      : item.status === "partially_refunded"
        ? styles.badgePartial
        : styles.badgePaid;

  const badgeTextStyle =
    item.status === "refunded"
      ? styles.badgeTextRefunded
      : item.status === "partially_refunded"
        ? styles.badgeTextPartial
        : undefined;

  const paidLabel =
    item.paidAt && dayjs(item.paidAt).isValid()
      ? dayjs(item.paidAt).format("MMM D, YYYY · h:mm A")
      : item.paidAt ?? "";

  const feeOrDash = (value: number | null) =>
    value === null ? "—" : formatMoneyPlain(value, currency);

  const canViewReceipt = isViewableReceiptUrl(item.receiptUrl);

  const openReceipt = () => {
    if (canViewReceipt && item.receiptUrl) {
      Linking.openURL(item.receiptUrl);
    }
  };

  const attributionParts: string[] = [item.sourceLabel];
  if (item.staffName) attributionParts.push(item.staffName);
  if (item.tipRecipientName && item.tipRecipientName !== item.staffName) {
    attributionParts.push(item.tipRecipientName);
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {item.description || item.sourceLabel}
        </Text>
        <View style={[styles.badge, badgeStyle]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel}</Text>
        </View>
      </View>

      {!!item.customerName && (
        <Text style={styles.meta} numberOfLines={1}>
          {item.customerName}
        </Text>
      )}
      <Text style={styles.meta} numberOfLines={1}>
        {attributionParts.join(" · ")}
      </Text>
      {!!paidLabel && (
        <Text style={styles.meta} numberOfLines={1}>
          {paidLabel}
          {item.cardLastFour ? ` · •••• ${item.cardLastFour}` : ""}
        </Text>
      )}

      <View style={styles.amountsRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{t("earningsAmount")}</Text>
          <Text style={styles.amountValue}>
            {formatMoneyPlain(item.amount, currency)}
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{t("earningsStripeFee")}</Text>
          <Text style={styles.amountValue}>{feeOrDash(item.stripeFee)}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{t("earningsPlatformFee")}</Text>
          <Text style={styles.amountValue}>{feeOrDash(item.platformFee)}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{t("earningsNet")}</Text>
          <Text
            style={[
              styles.amountValue,
              item.netAmount < 0 && styles.amountNegative,
            ]}
          >
            {formatMoneyPlain(item.netAmount, currency)}
          </Text>
        </View>
      </View>

      {canViewReceipt && (
        <TouchableOpacity
          style={styles.receiptBtn}
          onPress={openReceipt}
          activeOpacity={0.7}
        >
          <Text style={styles.receiptText}>{t("earningsViewReceipt")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
