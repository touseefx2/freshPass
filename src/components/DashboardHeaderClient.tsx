import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useAppSelector, useTheme, } from "@/src/hooks/hooks";
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen
    },
    logoImage: {
      width: widthScale(156),
      height: heightScale(36),
      resizeMode: "contain",
    },
    notificationContainer: {

    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white15,
      position: "absolute",
      right: 20,
      bottom: 50,
      top: 50,
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

  });

export default function DashboardHeaderClient() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const unreadCount = useAppSelector((state) => state.user.unreadCount);

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + moderateHeightScale(10), },
      ]}
    >
      <Image
        source={IMAGES.logo3d}
        style={styles.logoImage}
      />

      <View style={styles.iconContainer} >
        <NotificationIcon width={24} height={22} color={theme.white} />
        {unreadCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>

    </View>
  );
}
