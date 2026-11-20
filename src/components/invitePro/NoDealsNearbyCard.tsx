import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";

interface NoDealsNearbyCardProps {
  style?: StyleProp<ViewStyle>;
}

export default function NoDealsNearbyCard({ style }: NoDealsNearbyCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((state: any) => state.user.isGuest);

  const handleInvite = () => {
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    router.push("/(main)/invitePro" as any);
  };

  const handleExplore = () => {
    router.push("/dashboard/(explore)" as any);
  };

  return (
    <View style={[styles.outerFrame, style]}>
      <View style={styles.card}>
        {/* Decorative leaf shapes — top-right corner */}
        <View style={styles.leafLarge} />
        <View style={styles.leafMedium} />
        <View style={styles.leafSmall} />

        <View style={styles.headerRow}>
          <Text
            style={styles.eyebrow}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            accessibilityRole="header"
          >
            {t("ndcEyebrow")}
          </Text>
          <View style={styles.earnBadge}>
            <MaterialCommunityIcons
              name="gift-outline"
              size={moderateWidthScale(13)}
              color={theme.darkGreen}
            />
            <Text
              style={styles.earnBadgeText}
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {t("earnRewardsBadge")}
            </Text>
          </View>
        </View>

        <View style={styles.pinCircle}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={moderateWidthScale(22)}
            color={theme.orangeBrown}
          />
          <View style={styles.pinSparkle}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={moderateWidthScale(8)}
              color={theme.orangeBrown}
            />
          </View>
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          {t("ndcTitle")}
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
          {t("ndcSubtitle")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleInvite}
          style={styles.inviteButton}
          accessibilityRole="button"
          accessibilityLabel={t("ipBannerInviteCta")}
        >
          <Text
            style={styles.inviteButtonText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.2}
          >
            {t("ipBannerInviteCta")}
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={moderateWidthScale(16)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>

        <Text style={styles.footerText} maxFontSizeMultiplier={1.2}>
          {t("ipBannerFooter")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleExplore}
          style={styles.exploreLink}
          accessibilityRole="button"
          accessibilityLabel={t("ndcExplore")}
        >
          <Text style={styles.exploreLinkText} maxFontSizeMultiplier={1.2}>{t("ndcExplore")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    outerFrame: {
      backgroundColor: theme.noticeCream,
      borderRadius: moderateWidthScale(18),
      padding: moderateWidthScale(6),
      marginHorizontal: moderateWidthScale(20),
    },
    card: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(14),
      alignItems: "center",
      overflow: "hidden",
    },
    leafLarge: {
      position: "absolute",
      top: -moderateHeightScale(20),
      right: -moderateWidthScale(10),
      width: moderateWidthScale(120),
      height: moderateHeightScale(140),
      backgroundColor: "rgba(66, 82, 42, 0.35)",
      borderBottomLeftRadius: moderateWidthScale(80),
      transform: [{ rotate: "-5deg" }],
    },
    leafMedium: {
      position: "absolute",
      top: moderateHeightScale(10),
      right: moderateWidthScale(30),
      width: moderateWidthScale(80),
      height: moderateHeightScale(100),
      backgroundColor: "rgba(66, 82, 42, 0.25)",
      borderBottomLeftRadius: moderateWidthScale(60),
      borderTopRightRadius: moderateWidthScale(20),
      transform: [{ rotate: "-15deg" }],
    },
    leafSmall: {
      position: "absolute",
      top: -moderateHeightScale(10),
      right: moderateWidthScale(60),
      width: moderateWidthScale(60),
      height: moderateHeightScale(80),
      backgroundColor: "rgba(66, 82, 42, 0.18)",
      borderBottomLeftRadius: moderateWidthScale(50),
      transform: [{ rotate: "-25deg" }],
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      alignSelf: "stretch",
      gap: moderateWidthScale(8),
      marginHorizontal: -moderateWidthScale(8),
      marginBottom: moderateHeightScale(10),
    },
    eyebrow: {
      flexShrink: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 1.6,
      textTransform: "uppercase",
    },
    earnBadge: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      backgroundColor: theme.goldenBuy,
    },
    earnBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    pinCircle: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      backgroundColor: "rgba(221, 161, 94, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(10),
    },
    pinSparkle: {
      position: "absolute",
      top: moderateHeightScale(2),
      right: moderateWidthScale(2),
    },
    title: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontExtraBold,
      color: theme.noticeCream,
      textAlign: "center",
      lineHeight: fontSize.size19 * 1.25,
      marginBottom: moderateHeightScale(6),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      textAlign: "center",
      lineHeight: fontSize.size13 * 1.45,
      marginBottom: moderateHeightScale(12),
    },
    inviteButton: {
      maxWidth: "100%",
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(10),
    },
    inviteButtonText: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    footerText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },
    exploreLink: {
      paddingVertical: moderateHeightScale(4),
    },
    exploreLinkText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.noticeCream,
      textDecorationLine: "underline",
    },
  });
