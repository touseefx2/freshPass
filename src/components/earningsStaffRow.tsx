import React, { useMemo } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { StaffEarningsRow } from "@/src/types/businessEarnings";
import {
  formatMoneyPlain,
  getStaffInitials,
} from "@/src/services/businessEarningsService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    rowMuted: {
      opacity: 0.72,
    },
    avatar: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarMuted: {
      backgroundColor: theme.borderLight,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    body: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(4),
    },
    name: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    nameMuted: {
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen6,
    },
    removedBadge: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    figures: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(4),
    },
    figure: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    figureSecondary: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
    },
    figureNegative: {
      color: theme.red,
    },
    revenueLine: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(2),
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    meta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    approx: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
    },
  });

type Props = {
  item: StaffEarningsRow;
  currency?: string;
  isLast?: boolean;
  compact?: boolean;
  onPress?: () => void;
};

function buildRevenueLine(
  item: StaffEarningsRow,
  currency: string,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  if (item.revenue.appointmentRevenue > 0) {
    parts.push(
      `${t("earningsFilterAppointments")} ${formatMoneyPlain(item.revenue.appointmentRevenue, currency)}`,
    );
  }
  if (item.revenue.tipRevenue > 0) {
    parts.push(
      `${t("earningsFilterTips")} ${formatMoneyPlain(item.revenue.tipRevenue, currency)}`,
    );
  }
  if (item.revenue.subscriptionRevenue > 0) {
    parts.push(
      `${t("earningsFilterMemberships")} ${formatMoneyPlain(item.revenue.subscriptionRevenue, currency)}`,
    );
  }
  if (item.revenue.otherRevenue > 0) {
    parts.push(
      `${t("earningsFilterOther")} ${formatMoneyPlain(item.revenue.otherRevenue, currency)}`,
    );
  }
  return parts.join(" · ");
}

export default function EarningsStaffRow({
  item,
  currency = "USD",
  isLast = false,
  compact = false,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const revenueLine = compact ? "" : buildRevenueLine(item, currency, t);
  const content = (
    <>
      <View
        style={[
          styles.avatar,
          (item.isUnassigned || item.removed) && styles.avatarMuted,
        ]}
      >
        {item.isUnassigned ? (
          <Ionicons
            name="storefront-outline"
            size={iconScale(18)}
            color={theme.lightGreen6}
          />
        ) : item.profileImage ? (
          <Image
            source={{ uri: item.profileImage }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarText}>{getStaffInitials(item.name)}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, item.isUnassigned && styles.nameMuted]}
            numberOfLines={1}
          >
            {item.isUnassigned ? t("earningsUnassigned") : item.name}
          </Text>
          {item.removed && (
            <Text style={styles.removedBadge}>{t("earningsStaffRemoved")}</Text>
          )}
        </View>

        <View style={styles.figures}>
          <Text
            style={[
              styles.figure,
              item.netEarnings < 0 && styles.figureNegative,
            ]}
          >
            {t("earningsNet")} {formatMoneyPlain(item.netEarnings, currency)}
          </Text>
          <Text style={[styles.figure, styles.figureSecondary]}>
            {t("earningsGross")}{" "}
            {formatMoneyPlain(item.grossEarnings, currency)}
          </Text>
        </View>

        {!!revenueLine && (
          <Text style={styles.revenueLine} numberOfLines={2}>
            {revenueLine}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {t("earningsPaymentsCount", { count: item.transactionsCount })}
          </Text>
          {item.transactionsMissingFeeData > 0 && (
            <Text style={styles.approx}>{t("earningsNetApproximate")}</Text>
          )}
        </View>
      </View>
    </>
  );

  if (onPress && !item.isUnassigned && item.staffId != null) {
    return (
      <TouchableOpacity
        style={[
          styles.row,
          isLast && styles.rowLast,
          item.isUnassigned && styles.rowMuted,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isLast && styles.rowLast,
        item.isUnassigned && styles.rowMuted,
      ]}
    >
      {content}
    </View>
  );
}
