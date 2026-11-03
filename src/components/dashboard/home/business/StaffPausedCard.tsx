import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(14),
      borderLeftWidth: 4,
      borderLeftColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    copy: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    text: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
  });

/**
 * Staff home: the business moved to a Solo plan, so this member is paused
 * (kept on the team, not bookable) until it moves back to Business.
 */
export default function StaffPausedCard() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const isPaused = useAppSelector(
    (state) => state.user.businessStatus?.is_paused === true,
  );
  const businessName = useAppSelector(
    (state) =>
      state.user.businessStatus?.business_name || state.user.business_name,
  );

  if (!isPaused) return null;

  return (
    <View style={styles.card}>
      <Feather
        name="pause-circle"
        size={moderateWidthScale(22)}
        color={theme.darkGreen}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{t("teamPausedTitle")}</Text>
        <Text style={styles.text}>
          {businessName
            ? t("staffPausedMessage", { business: businessName })
            : t("staffPausedMessageNoName")}
        </Text>
      </View>
    </View>
  );
}
