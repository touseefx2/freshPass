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

        <Text
          style={styles.eyebrow}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header"
        >
          {t("ndcEyebrow")}
        </Text>

        <View style={styles.pinCircle}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={moderateWidthScale(28)}
            color={theme.orangeBrown}
          />
          <View style={styles.pinSparkle}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={moderateWidthScale(10)}
              color={theme.orangeBrown}
            />
          </View>
        </View>

        <Text style={styles.title}>{t("ndcTitle")}</Text>
        <Text style={styles.subtitle}>{t("ndcSubtitle")}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleInvite}
          style={styles.inviteButton}
          accessibilityRole="button"
          accessibilityLabel={t("ipBannerCta")}
        >
          <Text style={styles.inviteButtonText}>{t("ipBannerCta")}</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={moderateWidthScale(18)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleExplore}
          style={styles.exploreLink}
          accessibilityRole="button"
          accessibilityLabel={t("ndcExplore")}
        >
          <Text style={styles.exploreLinkText}>{t("ndcExplore")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    outerFrame: {
      backgroundColor: theme.noticeCream,
      borderRadius: moderateWidthScale(20),
      padding: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(20),
    },
    card: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(22),
      paddingBottom: moderateHeightScale(20),
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
    eyebrow: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: moderateHeightScale(14),
    },
    pinCircle: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: "rgba(221, 161, 94, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(14),
    },
    pinSparkle: {
      position: "absolute",
      top: moderateHeightScale(2),
      right: moderateWidthScale(2),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontExtraBold,
      color: theme.noticeCream,
      textAlign: "center",
      lineHeight: fontSize.size22 * 1.25,
      marginBottom: moderateHeightScale(8),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      textAlign: "center",
      lineHeight: fontSize.size14 * 1.45,
      marginBottom: moderateHeightScale(18),
    },
    inviteButton: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(32),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(14),
    },
    inviteButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    exploreLink: {
      paddingVertical: moderateHeightScale(4),
    },
    exploreLinkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.noticeCream,
      textDecorationLine: "underline",
    },
  });
