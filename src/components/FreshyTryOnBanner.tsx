import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IMAGES } from "@/src/constant/images";

interface FreshyTryOnBannerProps {
  onPress: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(14),
      marginHorizontal: moderateWidthScale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(14),
      paddingRight: moderateWidthScale(10),
      overflow: "hidden",
    },
    leftContent: {
      flex: 1,
      paddingRight: moderateWidthScale(10),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    sparkleIcon: {
      marginRight: moderateWidthScale(5),
    },
    headerText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: moderateHeightScale(23),
      marginBottom: moderateHeightScale(10),
    },
    button: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
    },
    buttonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    arrow: {
      marginLeft: moderateWidthScale(6),
      fontSize: fontSize.size14,
      color: theme.darkGreen,
      fontFamily: fonts.fontBold,
    },
    imagesContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    imageWrapper: {
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      position: "relative",
    },
    photo: {
      width: moderateWidthScale(75),
      height: moderateHeightScale(88),
      borderRadius: moderateWidthScale(10),
    },
    imageLabel: {
      position: "absolute",
      bottom: moderateHeightScale(5),
      alignSelf: "center",
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
    },
    imageLabelText: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    afterSparkle: {
      position: "absolute",
      top: moderateHeightScale(-2),
      right: moderateWidthScale(-2),
    },
  });

export default function FreshyTryOnBanner({ onPress }: FreshyTryOnBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.leftContent}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="creation"
            size={moderateWidthScale(14)}
            color={theme.orangeBrown}
            style={styles.sparkleIcon}
          />
          <Text style={styles.headerText}>{t("freshyAiTryOnLabel")}</Text>
        </View>
        <Text style={styles.title}>{t("freshyTryOnTitle")}</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>{t("freshyTryOnButton")}</Text>
          <Text style={styles.arrow}>{"→"}</Text>
        </View>
      </View>

      <View style={styles.imagesContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={IMAGES.tryOnBefore}
            style={styles.photo}
            resizeMode="cover"
          />
          <View style={styles.imageLabel}>
            <Text style={styles.imageLabelText}>{t("before")}</Text>
          </View>
        </View>
        <View style={styles.imageWrapper}>
          <Image
            source={IMAGES.tryOnAfter}
            style={styles.photo}
            resizeMode="cover"
          />
          <View style={styles.imageLabel}>
            <Text style={styles.imageLabelText}>{t("after")}</Text>
          </View>
          <MaterialCommunityIcons
            name="creation"
            size={moderateWidthScale(16)}
            color={theme.orangeBrown}
            style={styles.afterSparkle}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
