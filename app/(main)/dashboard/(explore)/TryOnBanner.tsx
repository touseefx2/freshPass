import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AdditionalServiceItem } from "@/src/state/slices/generalSlice";

interface TryOnBannerProps {
  onPress: () => void;
  onDismiss: () => void;
  service?: AdditionalServiceItem | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.darkGreenLight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(6),
      borderTopLeftRadius: moderateWidthScale(12),
      borderTopRightRadius: moderateWidthScale(12),
      width: "100%",
      position: "relative",
    },
    closeButton: {
      position: "absolute",
      // top: moderateHeightScale(8),
      // left: moderateWidthScale(12),
      zIndex: 1,
      padding: moderateWidthScale(4),
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    description: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    button: {
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(6),
      maxWidth: "32%",
    },
    buttonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function TryOnBanner({
  onPress,
  onDismiss,
  service,
}: TryOnBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onDismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="close"
          size={moderateWidthScale(20)}
          color={theme.white}
        />
      </TouchableOpacity>

      <View style={{ maxWidth: "65%", marginLeft: moderateWidthScale(18) }}>
        <Text style={styles.title}>{t("tryAiHairTryOn")}</Text>
        <Text style={styles.description}>{t("tryOnBannerDescription")}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{t("tryNow")}</Text>
      </TouchableOpacity>
    </View>
  );
}
