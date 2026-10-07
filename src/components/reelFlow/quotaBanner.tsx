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
  remaining: number;
  blockedMessage: string | null;
  resetLabel: string | null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      backgroundColor: theme.lightGreen07,
      borderColor: theme.borderLight,
    },
    low: {
      backgroundColor: theme.upcomingCard,
      borderColor: theme.upcomingBorder,
    },
    empty: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRedBorder,
    },
    text: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
  });

/** Monthly AI / template reels left (shared limit with staff). */
export default function QuotaBanner({
  remaining,
  blockedMessage,
  resetLabel,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const none = remaining <= 0;
  const few = remaining > 0 && remaining <= 2;

  return (
    <View
      style={[styles.banner, few && styles.low, none && styles.empty]}
      accessibilityRole={none ? "alert" : undefined}
    >
      <MaterialIcons
        name={none ? "block" : few ? "warning-amber" : "info-outline"}
        size={moderateWidthScale(22)}
        color={none ? theme.red : few ? theme.selectCard : theme.buttonBack}
      />
      <Text style={styles.text}>
        {none
          ? blockedMessage || t("autoReelNoReelsLeft")
          : [
              t("autoReelReelsLeft", { count: remaining }),
              resetLabel ? t("monthlyReelsResets", { date: resetLabel }) : null,
            ]
              .filter(Boolean)
              .join(" ")}
      </Text>
    </View>
  );
}
