// "Invite a Pro" banner – cream/gold design matching the client sample (11-11).
// Variants: row (FreshPass Deals horizontal), strip (Last-Minute strip),
// list (Last-Minute vertical), standalone (empty-section fallback).

import React, { useMemo, useState } from "react";
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
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";

export type InviteProBannerVariant = "row" | "strip" | "list" | "standalone";

interface InviteProBannerProps {
  variant: InviteProBannerVariant;
  style?: StyleProp<ViewStyle>;
}

/** Cards between two Invite a Pro banners inside a list (guide: every 3). */
export const INVITE_BANNER_EVERY = 3;

export type WithInviteBanners<T> =
  | { kind: "item"; item: T }
  | { kind: "banner"; key: string };

/**
 * Puts a banner after the 3rd, 6th, 9th… card (also after the last card when
 * the count is a multiple of 3). Lists of 1–2 cards get none. Pass the full
 * list shown (all pages, after any de-dupe) so the count carries across pages.
 */
export function withInviteBanners<T>(items: T[]): WithInviteBanners<T>[] {
  const out: WithInviteBanners<T>[] = [];
  items.forEach((item, i) => {
    out.push({ kind: "item", item });
    if ((i + 1) % INVITE_BANNER_EVERY === 0) {
      out.push({ kind: "banner", key: `invite-banner-${i + 1}` });
    }
  });
  return out;
}

/** Text inside a fixed-height card: cap OS font scaling so nothing clips. */
const MAX_FONT_SCALE = 1.2;
/** Row/strip banners sit in a fixed-height deal row (same as the cards). */
const COMPACT_FONT_SCALE = 1.05;
/** Smallest shrink for text that must stay on its line(s). */
const MIN_TEXT_SCALE = 0.7;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.noticeCream,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      overflow: "hidden",
    },
    row: {
      width: widthScale(310),
      borderRadius: moderateWidthScale(12),
    },
    strip: {
      width: widthScale(290),
      marginRight: moderateWidthScale(12),
      marginBottom: moderateHeightScale(6),
      borderRadius: moderateWidthScale(12),
    },
    list: {
      alignSelf: "stretch",
      borderRadius: moderateWidthScale(14),
    },
    standalone: {
      marginHorizontal: moderateWidthScale(20),
      borderRadius: moderateWidthScale(14),
    },
    content: {
      flexGrow: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      gap: moderateWidthScale(12),
    },
    contentFull: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
    },
    textCol: {
      flex: 1,
    },
    textColCompact: {
      alignSelf: "stretch",
      justifyContent: "space-between",
      gap: moderateHeightScale(4),
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      marginBottom: moderateHeightScale(6),
    },
    eyebrowRowCompact: {
      marginBottom: moderateHeightScale(4),
    },
    eyebrow: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 1.2,
    },
    earnBadge: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      backgroundColor: theme.goldenBuy,
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
    },
    earnBadgeCompact: {
      top: moderateHeightScale(10),
      right: moderateWidthScale(10),
    },
    earnBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    title: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size14 * 1.3,
    },
    titleFull: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.3,
    },
    button: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
    },
    buttonCompact: {
      paddingVertical: moderateHeightScale(6),
    },
    buttonFull: {
      marginTop: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    buttonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    footer: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: "#000000",
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(4),
    },
    footerCompact: {
      marginTop: moderateHeightScale(3),
      marginBottom: 0,
    },
    footerFull: {
      marginTop: moderateHeightScale(6),
    },
    medallion: {
      flexShrink: 0,
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    medallionFull: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
    },
  });

/** Invite a Pro banner for the deal lists and empty sections. */
export default function InviteProBanner({
  variant,
  style,
}: InviteProBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((state: any) => state.user.isGuest);

  const compact = variant === "row" || variant === "strip";
  const fontScale = compact ? COMPACT_FONT_SCALE : MAX_FONT_SCALE;

  // The Earn Rewards badge floats top-right; keep the eyebrow text out from
  // under it on narrow phones / big font settings.
  const [badgeWidth, setBadgeWidth] = useState(0);
  const badgeRight = moderateWidthScale(compact ? 10 : 12);
  const textColRight =
    moderateWidthScale(14) + // content padding
    moderateWidthScale(60) + // medallion
    moderateWidthScale(12); // gap
  const eyebrowPadRight = Math.max(
    0,
    badgeRight + badgeWidth + moderateWidthScale(6) - textColRight,
  );

  const handlePress = () => {
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    router.push("/(main)/invitePro" as any);
  };

  const variantStyle =
    variant === "row"
      ? styles.row
      : variant === "strip"
        ? styles.strip
        : variant === "list"
          ? styles.list
          : styles.standalone;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[styles.base, variantStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={t("ipBannerTitle")}
      accessibilityHint={t("ipBannerA11yHint")}
    >
      {/* Earn Rewards badge — absolutely positioned top-right */}
      <View
        style={[styles.earnBadge, compact && styles.earnBadgeCompact]}
        onLayout={(e) => setBadgeWidth(e.nativeEvent.layout.width)}
      >
        <MaterialCommunityIcons
          name="gift-outline"
          size={moderateWidthScale(13)}
          color={theme.darkGreen}
        />
        <Text
          style={styles.earnBadgeText}
          numberOfLines={1}
          maxFontSizeMultiplier={fontScale}
        >
          {t("earnRewardsBadge")}
        </Text>
      </View>

      <View
        style={[styles.content, !compact && styles.contentFull]}
        pointerEvents="none"
      >
        <View style={[styles.textCol, compact && styles.textColCompact]}>
          <View>
            <View
              style={[
                styles.eyebrowRow,
                compact && styles.eyebrowRowCompact,
                { paddingRight: eyebrowPadRight },
              ]}
            >
              <MaterialCommunityIcons
                name="gift-outline"
                size={moderateWidthScale(15)}
                color={theme.orangeBrownText}
              />
              <Text
                style={styles.eyebrow}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={MIN_TEXT_SCALE}
                maxFontSizeMultiplier={fontScale}
              >
                {t("ipBannerEyebrow")}
              </Text>
            </View>
            <Text
              style={[styles.title, !compact && styles.titleFull]}
              numberOfLines={2}
              adjustsFontSizeToFit={compact}
              minimumFontScale={MIN_TEXT_SCALE}
              maxFontSizeMultiplier={compact ? fontScale : undefined}
            >
              {t("ipBannerTitle")}
            </Text>
          </View>
          <View>
            <View
              style={[
                styles.button,
                compact ? styles.buttonCompact : styles.buttonFull,
              ]}
            >
              <Text
                style={styles.buttonText}
                numberOfLines={1}
                maxFontSizeMultiplier={fontScale}
              >
                {t("ipBannerInviteCta")}
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </View>
            <Text
              style={[
                styles.footer,
                compact ? styles.footerCompact : styles.footerFull,
              ]}
              // Compact: one line, shrinks to fit the fixed-height card.
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={MIN_TEXT_SCALE}
              maxFontSizeMultiplier={fontScale}
            >
              {t("ipBannerFooter")}
            </Text>
          </View>
        </View>

        <View style={[styles.medallion, !compact && styles.medallionFull]}>
          <MaterialCommunityIcons
            name="gift-outline"
            size={moderateWidthScale(28)}
            color={theme.orangeBrown}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
