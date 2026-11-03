import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

type Props = {
  /** Staff member the owner gave no AI reels (nothing "used up"). */
  noneGiven?: boolean;
  /** Why they can't make one (server wording per role). */
  message: string;
  /** Monthly number they had — shows "12 of 12 used"; null/0 hides the meter. */
  limit?: number | null;
  /** Short date, e.g. "Dec 1" */
  resetLabel?: string | null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(26),
      paddingBottom: moderateHeightScale(22),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    medallionOuter: {
      width: moderateWidthScale(84),
      height: moderateWidthScale(84),
      borderRadius: moderateWidthScale(42),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    medallionInner: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      marginTop: moderateHeightScale(16),
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    message: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size21,
      textAlign: "center",
    },
    meter: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(20),
      gap: moderateHeightScale(8),
    },
    meterRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    meterLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    meterValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      fontVariant: ["tabular-nums"],
    },
    track: {
      height: moderateHeightScale(8),
      borderRadius: moderateHeightScale(4),
      backgroundColor: theme.selectCard,
    },
    resetChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    resetText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

/** Shown instead of the video pickers when no AI video reels are left this month. */
export default function ReelLimitReachedCard({
  noneGiven = false,
  message,
  limit,
  resetLabel,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const title = noneGiven
    ? t("aiReelsNoneGivenTitle")
    : t("reelLimitReachedTitle");
  const showMeter = !noneGiven && typeof limit === "number" && limit > 0;

  return (
    <View style={styles.card} accessible accessibilityRole="alert">
      <View style={styles.medallionOuter}>
        <View style={styles.medallionInner}>
          <MaterialIcons
            name={noneGiven ? "lock-outline" : "hourglass-empty"}
            size={moderateWidthScale(30)}
            color={theme.orangeBrownText}
          />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {showMeter ? (
        <View style={styles.meter}>
          <View style={styles.meterRow}>
            <Text style={styles.meterLabel}>{t("monthlyReelsUsedThisMonth")}</Text>
            <Text style={styles.meterValue}>
              {t("reelLimitUsedOf", { used: limit, limit })}
            </Text>
          </View>
          <View style={styles.track} />
        </View>
      ) : null}
      {resetLabel && !noneGiven ? (
        <View style={styles.resetChip}>
          <MaterialIcons
            name="event-repeat"
            size={moderateWidthScale(16)}
            color={theme.buttonBack}
          />
          <Text style={styles.resetText}>
            {t("monthlyReelsResets", { date: resetLabel })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
