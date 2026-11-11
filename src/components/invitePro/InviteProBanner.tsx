// "Invite a Pro" banner – cream/gold design matching the client sample (11-11).
// Variants: row (FreshPass Deals horizontal), strip (Last-Minute strip),
// list (Last-Minute vertical), standalone (empty-section fallback).

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
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size18 * 1.3,
    },
    titleFull: {
      fontSize: fontSize.size22,
      lineHeight: fontSize.size22 * 1.2,
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
    buttonFull: {
      marginTop: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
    },
    buttonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    medallion: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    medallionFull: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
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
      <View
        style={[styles.content, !compact && styles.contentFull]}
        pointerEvents="none"
      >
        <View style={[styles.textCol, compact && styles.textColCompact]}>
          <View>
            <View style={styles.eyebrowRow}>
              <MaterialCommunityIcons
                name="gift-outline"
                size={moderateWidthScale(15)}
                color={theme.orangeBrownText}
              />
              <Text
                style={styles.eyebrow}
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {t("ipBannerEyebrow")}
              </Text>
            </View>
            <Text
              style={[styles.title, !compact && styles.titleFull]}
              numberOfLines={2}
              maxFontSizeMultiplier={compact ? MAX_FONT_SCALE : undefined}
            >
              {t("ipBannerTitle")}
            </Text>
          </View>
          <View style={[styles.button, !compact && styles.buttonFull]}>
            <Text
              style={styles.buttonText}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {t("ipBannerCta")}
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
            name="gift-outline"
            size={moderateWidthScale(compact ? 28 : 34)}
            color={theme.orangeBrown}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
