import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LeafLogo } from "@/assets/icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

/**
 * Header for the step-by-step reel flows (Create a Reel, AI auto reel,
 * template reel): FreshPass brand bar, then a cream sheet with back,
 * title and "Step N of M" plus a segmented progress bar.
 */
type Props = {
  title: string;
  /** Hidden for status screens that continue a flow (no repeated numbering). */
  step?: { current: number; total: number } | null;
  onBack: () => void;
  backDisabled?: boolean;
  /** "close" leaves the whole flow, "back" goes one step back. */
  backIcon?: "back" | "close";
  /** Optional control on the right instead of the step label. */
  right?: React.ReactNode;
};

const SIDE_W = widthScale(96);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    brandBar: {
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      paddingBottom: moderateHeightScale(26),
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    brandText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      letterSpacing: 1.2,
    },
    sheet: {
      marginTop: -moderateHeightScale(18),
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(22),
      borderTopRightRadius: moderateWidthScale(22),
      paddingTop: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(52),
      paddingHorizontal: moderateWidthScale(8),
    },
    side: {
      width: SIDE_W,
      justifyContent: "center",
    },
    sideRight: {
      alignItems: "flex-end",
      paddingRight: moderateWidthScale(12),
    },
    backBtn: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: widthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    backBtnDisabled: { opacity: 0.35 },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    progress: {
      flexDirection: "row",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(2),
      paddingBottom: moderateHeightScale(4),
    },
    segment: {
      flex: 1,
      height: heightScale(5),
      borderRadius: heightScale(3),
      backgroundColor: theme.lightGreen015,
    },
    segmentDone: {
      backgroundColor: theme.buttonBack,
    },
  });

export default function FlowHeader({
  title,
  step,
  onBack,
  backDisabled = false,
  backIcon = "back",
  right,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const stepText = step
    ? t("flowStepOf", { current: step.current, total: step.total })
    : "";

  return (
    <View>
      <View
        style={[
          styles.brandBar,
          { paddingTop: insets.top + moderateHeightScale(10) },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.brandRow}>
          <LeafLogo
            width={moderateWidthScale(22)}
            height={moderateWidthScale(26)}
            color1={theme.orangeBrown}
            color2={theme.white}
          />
          <Text style={styles.brandText}>{t("freshPass")}</Text>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.row}>
          <View style={styles.side}>
            <TouchableOpacity
              onPress={onBack}
              disabled={backDisabled}
              hitSlop={6}
              activeOpacity={0.6}
              style={[styles.backBtn, backDisabled && styles.backBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={backIcon === "close" ? t("close") : t("back")}
              accessibilityState={{ disabled: backDisabled }}
            >
              <MaterialIcons
                name={backIcon === "close" ? "close" : "chevron-left"}
                size={moderateWidthScale(backIcon === "close" ? 26 : 32)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <View style={[styles.side, styles.sideRight]}>
            {right ??
              (step ? (
                <Text
                  style={styles.stepLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {stepText}
                </Text>
              ) : null)}
          </View>
        </View>

        {step ? (
          <View
            style={styles.progress}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={stepText}
            accessibilityValue={{
              min: 0,
              max: step.total,
              now: step.current,
            }}
          >
            {Array.from({ length: step.total }, (_, i) => (
              <View
                key={i}
                style={[styles.segment, i < step.current && styles.segmentDone]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
