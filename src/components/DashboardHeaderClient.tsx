import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IMAGES } from "@/src/constant/images";
import { NotificationIcon } from "@/assets/icons";
import { fontSize, fonts } from "../theme/fonts";
import { router } from "expo-router";
import ModeSwitchLogo from "@/src/components/ModeSwitchLogo";
import { useCartBadgeCount } from "@/src/hooks/useMarketCart";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Logo left, bag + bell right — same as the business header (user 11-05)
    headerContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.darkGreen,
    },
    logoWrap: {
      flexShrink: 1,
    },
    iconsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    logoImage: {
      width: widthScale(156),
      height: heightScale(36),
      resizeMode: "contain",
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white15,
      width: widthScale(44),
      height: heightScale(30),
      borderRadius: moderateWidthScale(999),
    },
    badgeContainer: {
      position: "absolute",
      top: moderateHeightScale(-2),
      right: moderateWidthScale(2),
      backgroundColor: theme.red,
      borderRadius: moderateWidthScale(999),
      minWidth: moderateWidthScale(18),
      height: moderateHeightScale(16),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(4),
    },
    badgeText: {
      color: theme.white,
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    // Orange so the cart count never reads as an unread notification
    cartBadgeContainer: {
      backgroundColor: theme.selectCard,
    },
  });

export default function DashboardHeaderClient() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const unreadCount = useAppSelector((state) => state.user.unreadCount);
  const cartCount = useCartBadgeCount();
  // Catalog sits in the main stack (no tab bar), like businessDetail
  const catalogRoute = "/(main)/marketplace";

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + moderateHeightScale(10) },
      ]}
    >
      <View style={styles.logoWrap}>
        <ModeSwitchLogo>
          <Image source={IMAGES.logo3d} style={styles.logoImage} />
        </ModeSwitchLogo>
      </View>

      <View style={styles.iconsRow}>
        <TouchableOpacity
          onPress={() => router.push(catalogRoute as any)}
          activeOpacity={0.7}
          style={styles.iconContainer}
          // Right stays short of the bell's own slop (pills are 8pt apart)
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 2 }}
          accessibilityRole="button"
          accessibilityLabel={
            cartCount > 0
              ? t("mpHomeHeaderShopWithCount", { count: cartCount })
              : t("mpHomeHeaderShop")
          }
        >
          <MaterialCommunityIcons
            name="shopping-outline"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
          {cartCount > 0 && (
            <View
              style={[styles.badgeContainer, styles.cartBadgeContainer]}
              pointerEvents="none"
            >
              <Text style={styles.badgeText}>
                {cartCount > 9 ? "9+" : cartCount.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/notification" as any)}
          style={styles.iconContainer}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <NotificationIcon width={24} height={22} color={theme.white} />
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
