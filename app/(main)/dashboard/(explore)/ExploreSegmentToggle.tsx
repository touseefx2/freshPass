import React, { useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fonts, fontSize } from "@/src/theme/fonts";

export type ExploreSegmentValue = "subscriptions" | "individual";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(999),
      padding: moderateWidthScale(3),
      marginHorizontal: moderateWidthScale(20),
      marginVertical: moderateHeightScale(12),
    },
    segmentOption: {
      flex: 1,
      paddingVertical: moderateHeightScale(10),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(999),
    },
    segmentOptionActive: {
      backgroundColor: theme.orangeBrown,
    },
    segmentOptionInactive: {
      backgroundColor: "transparent",
    },
    segmentOptionText: {
      fontSize: fontSize.size13,
    },
    segmentOptionTextActive: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
    segmentOptionTextInactive: {
      color: theme.segmentInactiveTabText,
      fontFamily: fonts.fontRegular,
    },
    // Light variant: soft track on cream, raised white thumb (business detail)
    lightControl: {
      flexDirection: "row",
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(14),
      padding: moderateWidthScale(4),
    },
    lightOption: {
      flex: 1,
      minHeight: moderateHeightScale(40),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(11),
    },
    lightOptionActive: {
      backgroundColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    lightOptionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    lightOptionTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

interface ExploreSegmentToggleProps {
  value: ExploreSegmentValue;
  onSelect: (value: ExploreSegmentValue) => void;
  variant?: "dark" | "light";
  style?: StyleProp<ViewStyle>;
}

export default function ExploreSegmentToggle({
  value,
  onSelect,
  variant = "dark",
  style,
}: ExploreSegmentToggleProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  if (variant === "light") {
    const options: { key: ExploreSegmentValue; label: string }[] = [
      { key: "individual", label: t("individualServices") },
      { key: "subscriptions", label: t("subscriptionsList") },
    ];
    return (
      <View style={[styles.lightControl, style]} accessibilityRole="tablist">
        {options.map((option) => {
          const active = value === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.lightOption, active && styles.lightOptionActive]}
            >
              <Text
                style={[
                  styles.lightOptionText,
                  active && styles.lightOptionTextActive,
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.segmentedControl, style]}>
      <Pressable
        onPress={() => onSelect("individual")}
        style={[
          styles.segmentOption,
          value === "individual"
            ? styles.segmentOptionActive
            : styles.segmentOptionInactive,
        ]}
      >
        <Text
          style={[
            styles.segmentOptionText,
            value === "individual"
              ? styles.segmentOptionTextActive
              : styles.segmentOptionTextInactive,
          ]}
        >
          Individual services
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSelect("subscriptions")}
        style={[
          styles.segmentOption,
          value === "subscriptions"
            ? styles.segmentOptionActive
            : styles.segmentOptionInactive,
        ]}
      >
        <Text
          style={[
            styles.segmentOptionText,
            value === "subscriptions"
              ? styles.segmentOptionTextActive
              : styles.segmentOptionTextInactive,
          ]}
        >
          Subscriptions list
        </Text>
      </Pressable>
    </View>
  );
}
