import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";
import {
  fetchGivesBackBanner,
  getCachedGivesBackBanner,
  type GivesBackBanner as BannerData,
} from "@/src/services/givesBackService";
import Logger from "@/src/services/logger";

/**
 * FreshPass Gives Back banner (client design 11-19): dark green header with
 * the hands + family icon, subscriber goal count + progress, and
 * "Recommend a Family" (locked until the goal is reached).
 * Renders nothing while loading, on error, or when the admin turned it off.
 */

// Colors taken from the client design (fixed brand card, same in every theme)
export const GIVES_BACK_COLORS = {
  header: "#2F4222",
  body: "#FDF5E9",
  ink: "#283618",
  muted: "#5C574E",
  tag: "#F5CC7B",
  fill: "#E2A023",
  track: "#D9D9C3",
  lockedButton: "#CACAC9",
  lockedText: "#48484A",
  white: "#FFFFFF",
  whiteSoft: "rgba(255, 255, 255, 0.85)",
} as const;

const C = GIVES_BACK_COLORS;

/** 6842 → "6,842" (Hermes-safe, no Intl needed) */
export const formatCount = (value: number) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Large system text sizes grow the card, but never past this (keeps the
// layout the same on small Android phones with big font settings)
const MAX_FONT_SCALE = 1.25;
const ONE_LINE = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.75,
  maxFontSizeMultiplier: MAX_FONT_SCALE,
} as const;

/** 68.4 → "68.4%", 100 → "100%" */
const formatPercent = (value: number) => `${Number(value.toFixed(1))}%`;

type Props = {
  /** Bumped by pull-to-refresh on the home screen */
  refreshKey?: number;
  style?: StyleProp<ViewStyle>;
};

export default function GivesBackBanner({ refreshKey = 0, style }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [banner, setBanner] = useState<BannerData | null>(
    getCachedGivesBackBanner,
  );
  const loadingRef = useRef(false);

  const load = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    fetchGivesBackBanner()
      .then(setBanner)
      .catch((error) => Logger.warn("Gives Back banner failed:", error))
      .finally(() => {
        loadingRef.current = false;
      });
  }, []);

  // Every home visit (count + unlocked may change)
  useFocusEffect(load);

  const firstRefresh = useRef(true);
  useEffect(() => {
    if (firstRefresh.current) {
      firstRefresh.current = false;
      return;
    }
    load();
  }, [refreshKey, load]);

  if (!banner || !banner.enabled) return null;

  const { goal, count, percentage, unlocked, description } = banner;
  const goalText = formatCount(goal);

  const openForm = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(main)/givesBack" as any);
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Image
          source={IMAGES.givesBackIcon}
          style={styles.icon}
          contentFit="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <View style={styles.headerText}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {t("givesBackTitle")}
          </Text>
          {description ? (
            <Text
              style={styles.description}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tag}>
          <Text
            style={styles.tagText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {t("givesBackGoalTag", { goal: goalText })}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={t("givesBackCountA11y", {
            count: formatCount(count),
            goal: goalText,
            percent: formatPercent(percentage),
          })}
        >
          <Text
            style={styles.count}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {formatCount(count)} / {goalText}
          </Text>
          <Text
            style={styles.countLabel}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {t("givesBackSubscribers")}
          </Text>
        </View>

        <View
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
        >
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, Math.max(0, percentage))}%` },
              ]}
            />
          </View>
          <Text style={styles.percent} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {formatPercent(percentage)}
          </Text>
        </View>

        {unlocked ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.buttonActive]}
              onPress={openForm}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityHint={t("givesBackRecommendHint")}
            >
              <MaterialIcons
                name="volunteer-activism"
                size={moderateWidthScale(22)}
                color={C.white}
              />
              <Text
                style={[styles.buttonText, styles.buttonTextActive]}
                {...ONE_LINE}
              >
                {t("givesBackRecommend")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                router.push("/(main)/givesBack/myRecommendations" as any)
              }
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.link} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {t("givesBackMyRecommendations")}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View
              style={[styles.button, styles.buttonLocked]}
              accessible
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel={`${t("givesBackRecommend")}. ${t(
                "givesBackUnlocksAt",
                { goal: goalText },
              )}`}
            >
              <MaterialIcons
                name="lock-outline"
                size={moderateWidthScale(24)}
                color={C.lockedText}
              />
              <Text style={styles.buttonText} {...ONE_LINE}>
                {t("givesBackRecommend")}
              </Text>
            </View>
            <Text
              style={styles.unlocks}
              importantForAccessibility="no"
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {t("givesBackUnlocksAt", { goal: goalText })}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: moderateWidthScale(20),
    backgroundColor: C.body,
    // Lifted off the cream home background (client 11-19: "a bit elevated")
    shadowColor: "#1E2A10",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(14),
    paddingHorizontal: moderateWidthScale(18),
    paddingVertical: moderateHeightScale(18),
    backgroundColor: C.header,
    borderTopLeftRadius: moderateWidthScale(20),
    borderTopRightRadius: moderateWidthScale(20),
  },
  icon: {
    width: moderateWidthScale(74),
    height: moderateWidthScale(62),
  },
  headerText: { flex: 1, minWidth: 0, gap: moderateHeightScale(4) },
  title: {
    fontSize: fontSize.size20,
    fontFamily: fonts.fontBold,
    color: C.white,
  },
  description: {
    fontSize: fontSize.size14,
    fontFamily: fonts.fontRegular,
    color: C.whiteSoft,
    lineHeight: fontSize.size14 * 1.35,
  },
  // ── Body
  body: {
    paddingHorizontal: moderateWidthScale(16),
    paddingTop: moderateHeightScale(16),
    paddingBottom: moderateHeightScale(16),
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: moderateWidthScale(12),
    paddingVertical: moderateHeightScale(5),
    borderRadius: moderateWidthScale(999),
    backgroundColor: C.tag,
  },
  tagText: {
    fontSize: fontSize.size13,
    fontFamily: fonts.fontBold,
    color: C.ink,
  },
  count: {
    marginTop: moderateHeightScale(10),
    fontSize: fontSize.size34,
    fontFamily: fonts.fontExtraBold,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  countLabel: {
    marginTop: moderateHeightScale(1),
    fontSize: fontSize.size15,
    fontFamily: fonts.fontRegular,
    color: C.muted,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(12),
    marginTop: moderateHeightScale(14),
  },
  track: {
    flex: 1,
    height: heightScale(11),
    borderRadius: heightScale(6),
    backgroundColor: C.track,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: heightScale(6),
    backgroundColor: C.fill,
  },
  percent: {
    fontSize: fontSize.size16,
    fontFamily: fonts.fontBold,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateWidthScale(10),
    minHeight: heightScale(48),
    marginTop: moderateHeightScale(18),
    paddingHorizontal: moderateWidthScale(16),
    borderRadius: moderateWidthScale(14),
  },
  buttonLocked: { backgroundColor: C.lockedButton },
  buttonActive: { backgroundColor: C.ink },
  buttonText: {
    flexShrink: 1,
    fontSize: fontSize.size17,
    fontFamily: fonts.fontBold,
    color: C.lockedText,
  },
  buttonTextActive: { color: C.white },
  unlocks: {
    marginTop: moderateHeightScale(10),
    textAlign: "center",
    fontSize: fontSize.size14,
    fontFamily: fonts.fontRegular,
    color: C.muted,
  },
  linkButton: {
    alignSelf: "center",
    marginTop: moderateHeightScale(10),
    paddingVertical: moderateHeightScale(4),
  },
  link: {
    fontSize: fontSize.size14,
    fontFamily: fonts.fontMedium,
    color: C.ink,
    textDecorationLine: "underline",
  },
});
