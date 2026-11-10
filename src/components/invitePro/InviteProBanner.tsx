// "Invite a Pro" banner for the deal lists (guide section 1).
// - row:        inside the horizontal FreshPass Deals row (same 310 × 132
//               footprint and radius as the deal cards, so the row stays even)
// - strip:      inside the horizontal Last-Minute strip (290 wide like the
//               compact SlotOfferCard; spacing via marginRight)
// - list:       inside the vertical Last-Minute "See all" list (full width)
// - standalone: shown on its own instead of a list when nothing is nearby
// Same family as FreshyTryOnBanner / MarketplaceBanner (dark green surface,
// orangeBrown eyebrow + CTA pill, white title), but with a gold hairline,
// a soft gradient and an icon medallion instead of a photo, so it never
// reads as a deal card.

import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import { formatRewardMoney } from "@/src/utils/rewardMath";

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

/** The invite reward from the guide ($30), shown as "$30". */
const INVITE_REWARD_DOLLARS = 30;

/** Text inside a fixed-height card: cap OS font scaling so nothing clips. */
const MAX_FONT_SCALE = 1.2;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.darkGreen,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      overflow: "hidden",
    },
    row: {
      width: widthScale(310),
      height: heightScale(132),
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
    // Soft orange glow behind the medallion (decorative)
    glow: {
      position: "absolute",
      right: -moderateWidthScale(36),
      top: -moderateWidthScale(36),
      width: moderateWidthScale(150),
      height: moderateWidthScale(150),
      borderRadius: moderateWidthScale(75),
      backgroundColor: theme.orangeBrown015,
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
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
    },
    textCol: {
      flex: 1,
    },
    textColCompact: {
      alignSelf: "stretch",
      justifyContent: "space-between",
      gap: moderateHeightScale(6),
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      marginBottom: moderateHeightScale(6),
    },
    eyebrow: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: fontSize.size15 * 1.3,
      fontVariant: ["tabular-nums"],
    },
    titleFull: {
      fontSize: fontSize.size17,
      lineHeight: fontSize.size17 * 1.25,
    },
    subtitle: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      lineHeight: fontSize.size12 * 1.4,
      fontVariant: ["tabular-nums"],
    },
    button: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
    },
    buttonFull: {
      marginTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    buttonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    medallion: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      backgroundColor: theme.orangeBrown30,
      borderWidth: 1,
      borderColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    medallionFull: {
      width: moderateWidthScale(68),
      height: moderateWidthScale(68),
      borderRadius: moderateWidthScale(34),
    },
  });

/** Invite a Pro banner for the FreshPass Deals and Last-Minute Deals lists. */
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
  const amount = formatRewardMoney(INVITE_REWARD_DOLLARS).replace(/\.00$/, "");

  const eyebrow = t("ipBannerEyebrow");
  const title = compact
    ? t("ipBannerCompactTitle", { amount })
    : variant === "standalone"
      ? t("ipBannerEmptyTitle")
      : t("ipBannerTitle");
  const subtitle = compact ? null : t("ipBannerSubtitle", { amount });
  const cta = t("ipBannerCta");

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
      accessibilityLabel={[title, subtitle].filter(Boolean).join(". ")}
      accessibilityHint={t("ipBannerA11yHint")}
    >
      <LinearGradient
        colors={[theme.darkGreen, theme.darkGreenDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.glow} pointerEvents="none" />

      <View
        style={[styles.content, !compact && styles.contentFull]}
        pointerEvents="none"
      >
        <View style={[styles.textCol, compact && styles.textColCompact]}>
          <View>
            <View style={styles.eyebrowRow}>
              <MaterialCommunityIcons
                name="gift-outline"
                size={moderateWidthScale(13)}
                color={theme.orangeBrown}
              />
              <Text
                style={styles.eyebrow}
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {eyebrow}
              </Text>
            </View>
            <Text
              style={[styles.title, !compact && styles.titleFull]}
              numberOfLines={2}
              maxFontSizeMultiplier={compact ? MAX_FONT_SCALE : undefined}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={3}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.button, !compact && styles.buttonFull]}>
            <Text
              style={styles.buttonText}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {cta}
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={moderateWidthScale(16)}
              color={theme.darkGreen}
            />
          </View>
        </View>

        <View style={[styles.medallion, !compact && styles.medallionFull]}>
          <MaterialCommunityIcons
            name="store-plus-outline"
            size={moderateWidthScale(compact ? 28 : 32)}
            color={theme.orangeBrown}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
