import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";

interface MarketplaceBannerProps {
  onPress: () => void;
}

// darkGreen (#283618) at 0 alpha — fading to "transparent" greys out on iOS
const DARK_GREEN_CLEAR = "rgba(40, 54, 24, 0)";
const DARK_GREEN_SOFT = "rgba(40, 54, 24, 0.5)";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Same margin / radius family as FreshyTryOnBanner
    container: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(14),
      marginHorizontal: moderateWidthScale(16),
      overflow: "hidden",
    },
    art: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: "54%",
    },
    artImage: {
      width: "100%",
      height: "100%",
    },
    // Left edge of the shelf photo melts into the card
    artFade: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: "24%",
    },
    content: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingLeft: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      gap: moderateWidthScale(10),
    },
    bagIcon: {
      marginTop: moderateHeightScale(1),
    },
    textCol: {
      maxWidth: "66%",
    },
    title: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: fontSize.size17 * 1.25,
    },
    subtitle: {
      maxWidth: "78%",
      marginTop: moderateHeightScale(3),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      lineHeight: fontSize.size12 * 1.4,
    },
    button: {
      marginTop: moderateHeightScale(10),
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
    },
  });

/** Home banner (after FreshPass Deals) that opens the Marketplace catalog. */
export default function MarketplaceBanner({ onPress }: MarketplaceBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const title = t("mpHomeBannerTitle");
  const subtitle = t("mpHomeBannerSubtitle");

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint={t("mpHomeBannerA11yHint")}
    >
      <View style={styles.art} pointerEvents="none">
        <Image
          source={IMAGES.marketplaceBanner}
          style={styles.artImage}
          contentFit="cover"
          contentPosition="right center"
          accessible={false}
        />
        <LinearGradient
          colors={[theme.darkGreen, DARK_GREEN_SOFT, DARK_GREEN_CLEAR]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.artFade}
        />
      </View>

      <View style={styles.content}>
        <MaterialCommunityIcons
          name="shopping-outline"
          size={moderateWidthScale(30)}
          color={theme.background}
          style={styles.bagIcon}
        />
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
          <View style={styles.button}>
            <Text style={styles.buttonText}>{t("shopNow")}</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={moderateWidthScale(16)}
              color={theme.darkGreen}
              style={styles.arrow}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
