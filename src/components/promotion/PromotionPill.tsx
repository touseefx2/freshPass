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
  widthScale,
} from "@/src/theme/dimensions";

/**
 * Static "% off" pill for business cards. Shown when the list row has
 * `has_promotion: true` (an active public promotion). Same height as the
 * reviews pill so the two sit side by side.
 */
export default function PromotionPill({ visible }: { visible?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  if (!visible) return null;
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel={t("pcuHasPromotionA11y")}
    >
      <MaterialIcons
        name="local-offer"
        size={widthScale(11)}
        color={theme.darkGreen}
      />
      <Text style={styles.text} numberOfLines={1}>
        {t("pcuPercentOffPill")}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 0,
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.orangeBrown,
      backgroundColor: theme.orangeBrown,
    },
    text: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
  });
