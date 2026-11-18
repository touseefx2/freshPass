import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { FlowCard } from "@/src/components/reelFlow/flowParts";
import { formatDeadlineDate } from "@/src/components/shopOrderParts";
import { getReturnPolicySummaryKeys } from "@/src/utils/shopOrderHelpers";

type IconName = keyof typeof MaterialIcons.glyphMap;

export interface ReturnPolicyCardPolicy {
  enabled: boolean;
  windowDays: number | null;
  text: string | null;
  shippingPaidBy: "buyer" | "seller" | null;
}

const ICON_SIZE = widthScale(36);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: moderateHeightScale(10),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    card: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(6),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(50),
      paddingVertical: moderateHeightScale(6),
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginLeft: ICON_SIZE + moderateWidthScale(12),
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: ICON_SIZE / 2,
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.35,
    },
    rowTextStrong: {
      fontFamily: fonts.fontBold,
    },
    details: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size14 * 1.5,
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(10),
    },
  });

function PolicyRow({
  icon,
  text,
  strong = false,
  iconColor,
  styles,
}: {
  icon: IconName;
  text: string;
  strong?: boolean;
  iconColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row} accessible>
      <View
        style={styles.icon}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <MaterialIcons name={icon} size={moderateWidthScale(19)} color={iconColor} />
      </View>
      <Text style={[styles.rowText, strong && styles.rowTextStrong]}>{text}</Text>
    </View>
  );
}

/**
 * Return policy of a product (or the snapshot frozen on an order).
 * Enabled → "14-day returns", who pays return shipping, the seller's text and
 * (orders) the last day to ask for a return. Disabled → "no returns" plus the
 * reminder that problems can still be reported.
 */
export function ReturnPolicyCard({
  policy,
  deadlineAt = null,
  showReportNote = true,
  withTitle = true,
  style,
}: {
  policy: ReturnPolicyCardPolicy;
  deadlineAt?: string | null;
  showReportNote?: boolean;
  withTitle?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const summary = getReturnPolicySummaryKeys(policy);
  const details = policy.enabled ? policy.text?.trim() || null : null;
  const deadline = policy.enabled ? formatDeadlineDate(deadlineAt) : "";

  const rows: { icon: IconName; text: string; strong?: boolean }[] = [];
  if (policy.enabled) {
    if (policy.windowDays != null) {
      rows.push({
        icon: "assignment-return",
        text: t(summary.windowKey, { count: policy.windowDays }),
        strong: true,
      });
    }
    if (summary.shippingKey) {
      rows.push({
        icon: policy.shippingPaidBy === "seller" ? "local-shipping" : "payments",
        text: t(summary.shippingKey),
      });
    }
    if (deadline) {
      rows.push({
        icon: "event",
        text: t("mpReturnPolicyReturnBy", { date: deadline }),
      });
    }
  } else {
    rows.push({ icon: "block", text: t(summary.windowKey), strong: true });
    if (showReportNote) {
      rows.push({ icon: "report-problem", text: t("mpReturnPolicyReportNote") });
    }
  }

  return (
    <View style={[styles.wrap, style]}>
      {withTitle ? (
        <Text style={styles.title} accessibilityRole="header">
          {t("mpReturnPolicyTitle")}
        </Text>
      ) : null}
      <FlowCard style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={`${row.icon}-${i}`}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <PolicyRow
              icon={row.icon}
              text={row.text}
              strong={row.strong}
              iconColor={theme.selectCard}
              styles={styles}
            />
          </React.Fragment>
        ))}
        {details ? <Text style={styles.details}>{details}</Text> : null}
      </FlowCard>
    </View>
  );
}

export default ReturnPolicyCard;
