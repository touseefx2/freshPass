import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import CustomToggle from "@/src/components/customToggle";
import { centsToDollars, formatRewardMoney } from "@/src/utils/rewardMath";

export interface RewardBalanceToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  balanceCents: number;
  /** Dollars applied (estimate before paying / real after); shown when on */
  appliedAmount?: number | null;
  /** "light" = cream/white FlowCard screens · "onDark" = photo / dark green */
  variant?: "light" | "onDark";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: Math.max(56, moderateHeightScale(56)),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
    },
    rowLight: {
      backgroundColor: theme.noticeCream,
      borderColor: theme.borderLight,
    },
    rowLightOn: {
      borderColor: theme.goldBorder,
    },
    rowDark: {
      backgroundColor: theme.white15,
      borderColor: theme.white15,
    },
    rowDarkOn: {
      borderColor: theme.goldBorder,
    },
    disabled: {
      opacity: 0.5,
    },
    iconWrap: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrapLight: {
      backgroundColor: theme.tileGoldCream,
    },
    iconWrapDark: {
      backgroundColor: theme.orangeBrown30,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontSemiBold,
      lineHeight: fontSize.size15 * 1.3,
    },
    titleLight: {
      color: theme.darkGreen,
    },
    titleDark: {
      color: theme.white,
    },
    subtitle: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      lineHeight: fontSize.size13 * 1.35,
      fontVariant: ["tabular-nums"],
    },
    subtitleLight: {
      color: theme.lightGreen,
    },
    subtitleLightApplied: {
      color: theme.successGreen,
      fontFamily: fonts.fontMedium,
    },
    subtitleDark: {
      color: theme.white85,
    },
    subtitleDarkApplied: {
      color: theme.white,
      fontFamily: fonts.fontMedium,
    },
  });

/**
 * The one shared "Use my reward balance" row (try-on + appointment payments).
 * The whole row is the switch; the visual toggle only mirrors `value`.
 */
export default function RewardBalanceToggle({
  value,
  onValueChange,
  balanceCents,
  appliedAmount,
  variant = "light",
  disabled = false,
  style,
}: RewardBalanceToggleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const onDark = variant === "onDark";

  const showApplied =
    value && typeof appliedAmount === "number" && appliedAmount > 0;
  const subtitle = showApplied
    ? t("rwBalanceApplied", { amount: formatRewardMoney(appliedAmount) })
    : t("rwBalanceAvailable", {
        amount: formatRewardMoney(centsToDollars(balanceCents)),
      });
  const title = t("rwUseBalance");

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      style={[
        styles.row,
        onDark ? styles.rowDark : styles.rowLight,
        value && (onDark ? styles.rowDarkOn : styles.rowLightOn),
        disabled && styles.disabled,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          onDark ? styles.iconWrapDark : styles.iconWrapLight,
        ]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <MaterialCommunityIcons
          name="gift-outline"
          size={moderateWidthScale(20)}
          color={onDark ? theme.orangeBrown : theme.orangeBrownText}
        />
      </View>
      <View style={styles.textCol}>
        <Text
          style={[styles.title, onDark ? styles.titleDark : styles.titleLight]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            onDark
              ? showApplied
                ? styles.subtitleDarkApplied
                : styles.subtitleDark
              : showApplied
                ? styles.subtitleLightApplied
                : styles.subtitleLight,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      {/* Row owns the touch; the toggle only animates to `value`. */}
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <CustomToggle
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          inactiveTrackColor={onDark ? theme.white50 : undefined}
        />
      </View>
    </TouchableOpacity>
  );
}
