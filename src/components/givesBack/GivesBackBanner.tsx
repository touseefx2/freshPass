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
import GivesBackHowItWorksSheet from "@/src/components/givesBack/GivesBackHowItWorksSheet";

/**
 * FreshPass Gives Back banner (client sample 11-20): gold-framed card, dark
 * green header (icon | title + description), "38 / 1,000 subscribers",
 * progress bar with joined / goal labels, "Nominate a Family" (locked until
 * the goal is reached), and How it works | My Nominations links.
 * Renders nothing while loading, on error, or when the admin turned it off.
 */

// Colors taken from the client design (fixed brand card, same in every theme)
export const GIVES_BACK_COLORS = {
  // Same dark green as the unlocked "Recommend a Family" button (client 11-19)
  header: "#283618",
  body: "#FDF5E9",
  ink: "#283618",
  muted: "#5C574E",
  tag: "#F5CC7B",
  // Gold card frame (client sample 11-20)
  border: "#E9B54F",
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
  const [howOpen, setHowOpen] = useState(false);

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
  const countText = formatCount(count);

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
        <View style={styles.headerDivider} />
        <View style={styles.headerText}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            {...ONE_LINE}
          >
            {t("givesBackTitle")}
          </Text>
          {description ? (
            <Text
              style={styles.description}
              numberOfLines={2}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tag}>
          <Text style={styles.tagText} {...ONE_LINE}>
            {t("givesBackGoalTag", { goal: goalText })}
          </Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("givesBackCountA11y", {
            count: countText,
            goal: goalText,
            percent: formatPercent(percentage),
          })}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
        >
          <Text
            style={styles.count}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {t("givesBackCountLine", { count: countText, goal: goalText })}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                // A sliver always shows, so a small count still reads as "started"
                { width: `${Math.min(100, Math.max(count > 0 ? 3 : 0, percentage))}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel} {...ONE_LINE}>
              {t("givesBackJoined", { count: countText })}
            </Text>
            <Text style={styles.progressLabel} {...ONE_LINE}>
              {t("givesBackGoalLabel", { goal: goalText })}
            </Text>
          </View>
        </View>

        {unlocked ? (
          <TouchableOpacity
            style={[styles.button, styles.buttonActive]}
            onPress={openForm}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityHint={t("givesBackRecommendHint")}
          >
            <MaterialIcons
              name="volunteer-activism"
              size={moderateWidthScale(18)}
              color={C.white}
            />
            <Text
              style={[styles.buttonText, styles.buttonTextActive]}
              {...ONE_LINE}
            >
              {t("givesBackRecommend")}
            </Text>
          </TouchableOpacity>
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
                size={moderateWidthScale(19)}
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

        <View style={styles.linksRow}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setHowOpen(true)}
            hitSlop={{ top: 6, bottom: 6 }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.link} {...ONE_LINE}>
              {t("givesBackHowItWorks")}
            </Text>
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() =>
              router.push("/(main)/givesBack/myRecommendations" as any)
            }
            hitSlop={{ top: 6, bottom: 6 }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.link} {...ONE_LINE}>
              {t("givesBackMyRecommendations")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <GivesBackHowItWorksSheet
        visible={howOpen}
        goal={goalText}
        onClose={() => setHowOpen(false)}
      />
    </View>
  );
}

const BORDER = 2;
const RADIUS = moderateWidthScale(16);

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS,
    borderWidth: BORDER,
    borderColor: C.border,
    backgroundColor: C.body,
    // Soft lift off the cream home background
    shadowColor: "#1E2A10",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(10),
    paddingHorizontal: moderateWidthScale(14),
    paddingVertical: moderateHeightScale(9),
    backgroundColor: C.header,
    borderTopLeftRadius: RADIUS - BORDER,
    borderTopRightRadius: RADIUS - BORDER,
  },
  icon: {
    width: moderateWidthScale(44),
    height: moderateWidthScale(37),
  },
  headerDivider: {
    width: 1.5,
    alignSelf: "stretch",
    marginVertical: moderateHeightScale(2),
    backgroundColor: C.whiteSoft,
  },
  headerText: { flex: 1, minWidth: 0, gap: moderateHeightScale(1) },
  title: {
    fontSize: fontSize.size16,
    fontFamily: fonts.fontBold,
    color: C.white,
  },
  description: {
    fontSize: fontSize.size11,
    fontFamily: fonts.fontRegular,
    color: C.white,
    lineHeight: fontSize.size11 * 1.3,
  },
  // ── Body
  body: {
    paddingHorizontal: moderateWidthScale(14),
    paddingTop: moderateHeightScale(10),
    paddingBottom: moderateHeightScale(2),
  },
  tag: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: moderateWidthScale(10),
    paddingVertical: moderateHeightScale(3),
    borderRadius: moderateWidthScale(999),
    backgroundColor: C.tag,
  },
  tagText: {
    fontSize: fontSize.size12,
    fontFamily: fonts.fontBold,
    color: C.ink,
  },
  count: {
    marginTop: moderateHeightScale(5),
    fontSize: fontSize.size20,
    fontFamily: fonts.fontExtraBold,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: heightScale(8),
    marginTop: moderateHeightScale(7),
    borderRadius: heightScale(4),
    backgroundColor: C.track,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: heightScale(4),
    backgroundColor: C.fill,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: moderateWidthScale(12),
    marginTop: moderateHeightScale(4),
  },
  progressLabel: {
    flexShrink: 1,
    fontSize: fontSize.size12,
    fontFamily: fonts.fontMedium,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateWidthScale(8),
    minHeight: heightScale(38),
    marginTop: moderateHeightScale(10),
    paddingHorizontal: moderateWidthScale(14),
    borderRadius: moderateWidthScale(10),
  },
  buttonLocked: { backgroundColor: C.lockedButton },
  buttonActive: { backgroundColor: C.ink },
  buttonText: {
    flexShrink: 1,
    fontSize: fontSize.size15,
    fontFamily: fonts.fontMedium,
    color: C.lockedText,
  },
  buttonTextActive: { color: C.white, fontFamily: fonts.fontBold },
  unlocks: {
    marginTop: moderateHeightScale(5),
    textAlign: "center",
    fontSize: fontSize.size11,
    fontFamily: fonts.fontRegular,
    color: C.muted,
  },
  // ── Links: How it works | My Nominations
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: moderateHeightScale(1),
  },
  linkButton: {
    flex: 1,
    minHeight: heightScale(32),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: moderateWidthScale(6),
  },
  linkDivider: {
    width: 1,
    height: moderateHeightScale(14),
    backgroundColor: C.muted,
  },
  link: {
    fontSize: fontSize.size12,
    fontFamily: fonts.fontMedium,
    color: C.ink,
    textDecorationLine: "underline",
  },
});
