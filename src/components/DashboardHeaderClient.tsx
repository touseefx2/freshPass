import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
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
import { canUseModeSwitch } from "@/src/state/slices/userSlice";
import { useCartBadgeCount } from "@/src/hooks/useMarketCart";

// Header geometry (same numbers as the styles below / ModeSwitchLogo)
const SIDE_PADDING = moderateWidthScale(20);
const PILL_WIDTH = widthScale(44);
const PILL_GAP = moderateWidthScale(8);
const LOGO_WIDTH = widthScale(156);
// ModeSwitchLogo: 24pt chevron + 8pt gap on the right (and a mirror spacer)
const CHEVRON_EXTRA = moderateWidthScale(24) + moderateWidthScale(8);
// Free space between the logo row and the bag pill — larger than the logo's
// right hitSlop (8) + the bag's left hitSlop (2) so the two never overlap
const LOGO_CLEARANCE = moderateWidthScale(12);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    logoImage: {
      width: widthScale(156),
      height: heightScale(36),
      resizeMode: "contain",
    },
    notificationContainer: {},
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white15,
      position: "absolute",
      right: moderateWidthScale(20),
      bottom: moderateHeightScale(18),
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
    // Same pill as the bell, one pill + gap to its left
    bagIconContainer: {
      right: SIDE_PADDING + PILL_WIDTH + PILL_GAP,
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
  const canSwitch = useAppSelector((state) => canUseModeSwitch(state.user));
  const cartCount = useCartBadgeCount();
  // Catalog sits in the main stack (no tab bar), like businessDetail
  const catalogRoute = "/(main)/marketplace";
  const { width: screenWidth } = useWindowDimensions();

  // Two pills on the right leave less room than one: keep the logo centered
  // when it fits, otherwise slide it left (and shrink it on the narrowest
  // phones) so neither the logo nor its mode chevron sits under the bag.
  const logoLayout = useMemo(() => {
    const maxRight =
      screenWidth - SIDE_PADDING - 2 * PILL_WIDTH - PILL_GAP - LOGO_CLEARANCE;
    const extra = canSwitch ? CHEVRON_EXTRA : 0;
    const centeredLogoLeft = (screenWidth - LOGO_WIDTH) / 2;
    const centeredRight = centeredLogoLeft + LOGO_WIDTH + extra;
    if (centeredRight <= maxRight) {
      return { shift: 0, logoWidth: LOGO_WIDTH };
    }
    const logoWidth = Math.max(
      0,
      Math.min(LOGO_WIDTH, maxRight - extra - SIDE_PADDING),
    );
    // Row stays centered on screen; shrinking trims both sides evenly
    const shrunkRight = (screenWidth + logoWidth) / 2 + extra;
    return { shift: Math.max(0, shrunkRight - maxRight), logoWidth };
  }, [canSwitch, screenWidth]);

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + moderateHeightScale(10) },
      ]}
    >
      <View
        style={
          logoLayout.shift > 0
            ? { transform: [{ translateX: -logoLayout.shift }] }
            : undefined
        }
      >
        <ModeSwitchLogo centered>
          <Image
            source={IMAGES.logo3d}
            style={[
              styles.logoImage,
              logoLayout.logoWidth < LOGO_WIDTH && {
                width: logoLayout.logoWidth,
              },
            ]}
          />
        </ModeSwitchLogo>
      </View>

      <TouchableOpacity
        onPress={() => router.push(catalogRoute as any)}
        activeOpacity={0.7}
        style={[styles.iconContainer, styles.bagIconContainer]}
        // Left kept tiny so it never reaches the logo; right stays short of
        // the bell's own slop
        hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
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
        // Left kept small so it never reaches the logo chevron's own slop
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
  );
}
