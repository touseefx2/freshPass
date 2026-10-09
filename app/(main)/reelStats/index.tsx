import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import ReelCommentsSheet from "@/src/components/reelCommentsSheet";
import TextWithEmoji from "@/src/components/textWithEmoji";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  getBusinessReelStats,
  getReelStats,
} from "@/src/services/reelsService";
import type { FunnelWindow, ReelPerformanceStats } from "@/src/types/reels";

type WindowKey = "all_time" | "last_7_days" | "last_30_days";
type FunnelKey = keyof ReelPerformanceStats["funnel"];
type FeatherName = React.ComponentProps<typeof Feather>["name"];

const CHART_HEIGHT = moderateHeightScale(120);
const SPARK_HEIGHT = moderateHeightScale(36);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(48),
      gap: moderateHeightScale(16),
    },

    // Period segmented control
    segment: {
      flexDirection: "row",
      padding: moderateWidthScale(4),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
    },
    segmentItem: {
      flex: 1,
      minHeight: moderateHeightScale(40),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(10),
    },
    segmentItemActive: {
      backgroundColor: theme.darkGreen,
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segmentText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    segmentTextActive: { color: theme.white, fontFamily: fonts.fontBold },

    // Hero
    hero: {
      borderRadius: moderateWidthScale(24),
      padding: moderateWidthScale(20),
      overflow: "hidden",
    },
    heroGlow: {
      position: "absolute",
      width: moderateWidthScale(220),
      height: moderateWidthScale(220),
      borderRadius: moderateWidthScale(110),
      right: -moderateWidthScale(70),
      top: -moderateWidthScale(90),
      backgroundColor: theme.white15,
      opacity: 0.35,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    heroLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white80,
    },
    heroPill: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white15,
    },
    heroPillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    heroValue: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size36,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    spark: {
      marginTop: moderateHeightScale(12),
      height: SPARK_HEIGHT,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(2),
    },
    sparkBar: {
      flex: 1,
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.white50,
    },
    heroStats: {
      marginTop: moderateHeightScale(16),
      paddingTop: moderateHeightScale(14),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.white50,
      flexDirection: "row",
    },
    heroStat: { flex: 1 },
    heroStatDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.white50,
      marginHorizontal: moderateWidthScale(12),
    },
    heroStatValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    heroStatLabel: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },

    // Cards
    card: {
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(16),
      shadowColor: theme.darkGreen,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(14),
    },
    cardTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    metaPill: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },

    // Funnel
    stage: { gap: moderateHeightScale(12) },
    stageGap: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(16),
    },
    stageHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    stageIcon: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    stageTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    metricTop: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    metricLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    metricValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    metricTrack: {
      marginTop: moderateHeightScale(6),
      height: moderateHeightScale(6),
      borderRadius: moderateWidthScale(3),
      backgroundColor: theme.lightGreen07,
      overflow: "hidden",
    },
    metricFill: { height: "100%", borderRadius: moderateWidthScale(3) },
    metricPct: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },

    // Tiles (watch + engagement)
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    tile: {
      flexGrow: 1,
      flexBasis: "45%",
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
    },
    tileIcon: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(12),
    },
    tileValue: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    tileLabel: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    tileTrack: {
      marginTop: moderateHeightScale(8),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.lightGreen1,
      overflow: "hidden",
    },
    engageRow: { flexDirection: "row", gap: moderateWidthScale(8) },
    engageTile: {
      flex: 1,
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
    },
    engageValue: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    engageLabel: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    rowBtn: {
      marginTop: moderateHeightScale(12),
      minHeight: moderateHeightScale(46),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
    },
    rowBtnLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    rowBtnText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Bookings
    bookTotalRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(8),
    },
    bookTotal: {
      fontSize: fontSize.size30,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    stackBar: {
      marginTop: moderateHeightScale(12),
      height: moderateHeightScale(10),
      borderRadius: moderateWidthScale(5),
      flexDirection: "row",
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
      gap: 2,
    },
    legend: { marginTop: moderateHeightScale(14), gap: moderateHeightScale(10) },
    legendRow: { flexDirection: "row", alignItems: "center" },
    legendDot: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(3),
      marginRight: moderateWidthScale(10),
    },
    legendLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    legendValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },

    // Views chart
    chartSummary: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(14),
    },
    chartBig: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    chartSub: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    chart: {
      height: CHART_HEIGHT,
      flexDirection: "row",
      alignItems: "flex-end",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderNormal,
    },
    chartGrid: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: theme.borderLight,
    },
    chartCol: {
      flex: 1,
      height: "100%",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: 1,
    },
    chartBar: {
      width: "100%",
      maxWidth: moderateWidthScale(10),
      borderTopLeftRadius: moderateWidthScale(3),
      borderTopRightRadius: moderateWidthScale(3),
    },
    chartAxis: {
      marginTop: moderateHeightScale(8),
      flexDirection: "row",
      justifyContent: "space-between",
    },
    chartAxisText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    chartEmpty: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(6),
    },

    // Top reels
    topReel: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    topReelDivider: { borderTopWidth: 1, borderTopColor: theme.borderLight },
    rank: {
      width: moderateWidthScale(22),
      textAlign: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontExtraBold,
      color: theme.lightGreen5,
    },
    thumb: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(58),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.galleryPhotoBack,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    topReelBody: { flex: 1 },
    topReelCaption: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    topReelMetaRow: {
      marginTop: moderateHeightScale(6),
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    topReelMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    topReelMetaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    statusPill: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },
    statusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreenLight,
    },

    // Loading skeleton
    skeleton: { backgroundColor: theme.lightGreen07 },
  });

/** Older servers may not send every funnel key — read as zero. */
function pickWindow(window: FunnelWindow | undefined, key: WindowKey): number {
  return window?.[key] ?? 0;
}

/** 1234 → "1,234", 12_400 → "12.4K", 3_200_000 → "3.2M". */
function formatCount(value: number): string {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${+(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 1000) / 10);
}

export default function ReelStatsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string; mine?: string }>();
  const reelId = params.id ? Number(params.id) : null;
  // Owner's "My reels" → only their own; staff always get their own from the server
  const userRole = useAppSelector((s) => s.user.userRole);
  const mineOnly = params.mine === "1";
  const isOwnStats = mineOnly || userRole === "staff";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReelPerformanceStats | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("all_time");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const title = reelId
    ? t("reelPerformance")
    : isOwnStats
      ? t("myReelPerformance")
      : t("businessReelPerformance");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = reelId
        ? await getReelStats(reelId)
        : await getBusinessReelStats(mineOnly);
      setStats(data);
    } catch (error: any) {
      Logger.error("Failed to load reel stats:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToLoadStats"),
        "error",
        3000,
      );
    } finally {
      setLoading(false);
    }
  }, [mineOnly, reelId, showBanner, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const windows = [
    ["all_time", "allTime"],
    ["last_7_days", "last7Days"],
    ["last_30_days", "last30Days"],
  ] as const;
  const windowLabel = t(windows.find(([k]) => k === windowKey)![1]);

  const value = useCallback(
    (key: FunnelKey) => pickWindow(stats?.funnel?.[key], windowKey),
    [stats, windowKey],
  );
  const views = value("view");

  const days = useMemo(() => stats?.views_by_day ?? [], [stats]);
  const maxDayViews = useMemo(
    () => Math.max(1, ...days.map((d) => d.views)),
    [days],
  );
  const total30 = useMemo(
    () => days.reduce((sum, d) => sum + d.views, 0),
    [days],
  );
  const peakIndex = useMemo(() => {
    if (!total30) return -1;
    return days.reduce(
      (best, d, i) => (d.views > days[best].views ? i : best),
      0,
    );
  }, [days, total30]);

  const formatDay = useCallback(
    (date: string) => {
      const d = new Date(`${date}T00:00:00`);
      if (Number.isNaN(d.getTime())) return date.slice(5);
      try {
        return d.toLocaleDateString(i18n.language, {
          month: "short",
          day: "numeric",
        });
      } catch {
        return date.slice(5);
      }
    },
    [i18n.language],
  );

  const stages = useMemo(
    () =>
      [
        {
          key: "discovery",
          title: t("reelStatsDiscovery"),
          icon: "eye" as FeatherName,
          color: theme.buttonBack,
          tint: theme.apptMintBg,
          rows: [
            { key: "view", label: t("funnelViews") },
            { key: "look_tap", label: t("funnelLookTaps") },
            { key: "profile_tap", label: t("funnelProfileTaps") },
          ],
        },
        {
          key: "booking",
          title: t("reelStatsBookingStage"),
          icon: "calendar" as FeatherName,
          color: theme.selectCard,
          tint: theme.apptPeachBg,
          rows: [
            { key: "service_view", label: t("funnelServiceViews") },
            { key: "booking_started", label: t("funnelBookingStarted") },
            { key: "booking_completed", label: t("funnelBookingCompleted") },
          ],
        },
        {
          key: "membership",
          title: t("reelStatsMembershipStage"),
          icon: "award" as FeatherName,
          color: theme.apptGoldAccent,
          tint: theme.apptGoldBg,
          rows: [
            { key: "membership_view", label: t("funnelMembershipViews") },
            {
              key: "subscription_started",
              label: t("funnelSubscriptionStarted"),
            },
            {
              key: "subscription_completed",
              label: t("funnelSubscriptionCompleted"),
            },
          ],
        },
      ] as const,
    [t, theme],
  );

  if (loading && !stats) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={title} />
        <View style={styles.content}>
          {[48, 200, 320, 180].map((h, i) => (
            <View
              key={i}
              style={[
                styles.skeleton,
                {
                  height: moderateHeightScale(h),
                  borderRadius: moderateWidthScale(i === 0 ? 14 : 20),
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  const watch = stats?.watch;
  const completion = Math.min(100, watch?.avg_completion_pct ?? 0);
  const bookingsDone = value("booking_completed");
  const bookings = stats?.bookings ?? {
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  };
  const bookingSegments = [
    { key: "completed", color: theme.buttonBack, value: bookings.completed },
    { key: "upcoming", color: theme.orangeBrown, value: bookings.upcoming },
    { key: "cancelled", color: theme.lightRed30, value: bookings.cancelled },
  ] as const;
  const selected = selectedDay != null ? days[selectedDay] : null;
  const sparkDays = days.slice(-30);

  return (
    <View style={styles.safeArea}>
      <StackHeader title={title} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Period */}
        <View style={styles.segment} accessibilityRole="tablist">
          {windows.map(([key, labelKey]) => {
            const active = windowKey === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setWindowKey(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}
                >
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hero */}
        <LinearGradient
          colors={[theme.darkGreenLight, theme.darkGreen, theme.darkGreenDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroLabelRow}>
              <Feather name="play-circle" size={14} color={theme.white80} />
              <Text style={styles.heroLabel}>{t("reelStatsTotalViews")}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{windowLabel}</Text>
            </View>
          </View>
          <Text style={styles.heroValue}>{formatCount(views)}</Text>

          {total30 > 0 && (
            <View style={styles.spark} accessibilityElementsHidden>
              {sparkDays.map((d, i) => (
                <View
                  key={d.date}
                  style={[
                    styles.sparkBar,
                    {
                      height: Math.max(
                        2,
                        (d.views / maxDayViews) * SPARK_HEIGHT,
                      ),
                      backgroundColor:
                        i === sparkDays.length - 1
                          ? theme.white
                          : theme.white50,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {formatCount(value("look_tap"))}
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t("reelStatsLookTaps")}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {formatCount(bookingsDone)}
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t("reelStatsBooked")}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {pct(bookingsDone, views)}%
              </Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                {t("reelStatsConversion")}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Funnel */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("funnel")}</Text>
            <View style={styles.metaPill}>
              <Text style={styles.cardMeta}>{windowLabel}</Text>
            </View>
          </View>
          {stages.map((stage, si) => (
            <View key={stage.key}>
              {si > 0 && <View style={styles.stageGap} />}
              <View style={styles.stage}>
                <View style={styles.stageHeader}>
                  <View
                    style={[styles.stageIcon, { backgroundColor: stage.tint }]}
                  >
                    <Feather name={stage.icon} size={14} color={stage.color} />
                  </View>
                  <Text style={styles.stageTitle}>{stage.title}</Text>
                </View>
                {stage.rows.map((row) => {
                  const v = value(row.key);
                  const share = pct(v, views);
                  return (
                    <View
                      key={row.key}
                      accessible
                      accessibilityLabel={`${row.label}: ${v}`}
                    >
                      <View style={styles.metricTop}>
                        <Text style={styles.metricLabel} numberOfLines={1}>
                          {row.label}
                        </Text>
                        {row.key !== "view" && (
                          <Text style={styles.metricPct}>
                            {t("reelStatsPctOfViews", { value: share })}
                          </Text>
                        )}
                        <Text style={styles.metricValue}>{formatCount(v)}</Text>
                      </View>
                      <View style={styles.metricTrack}>
                        <View
                          style={[
                            styles.metricFill,
                            {
                              width: `${row.key === "view" ? (views ? 100 : 0) : share}%`,
                              backgroundColor: stage.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Watch time */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("watchTime")}</Text>
            <View style={styles.metaPill}>
              <Text style={styles.cardMeta}>{t("allTime")}</Text>
            </View>
          </View>
          <View style={styles.grid}>
            {(
              [
                ["play", "watchPlays", formatCount(watch?.plays ?? 0)],
                [
                  "clock",
                  "watchAvgTime",
                  t("watchSecondsShort", {
                    value: (watch?.avg_watch_seconds ?? 0).toFixed(1),
                  }),
                ],
                ["percent", "watchAvgCompletion", `${completion}%`],
                [
                  "check-circle",
                  "watchFullWatches",
                  formatCount(watch?.full_watches ?? 0),
                ],
              ] as const
            ).map(([icon, labelKey, display]) => (
              <View key={labelKey} style={styles.tile}>
                <View style={styles.tileIcon}>
                  <Feather name={icon} size={16} color={theme.darkGreenLight} />
                </View>
                <Text style={styles.tileValue} numberOfLines={1}>
                  {display}
                </Text>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {t(labelKey)}
                </Text>
                {labelKey === "watchAvgCompletion" && (
                  <View style={styles.tileTrack}>
                    <View
                      style={[
                        styles.metricFill,
                        {
                          width: `${completion}%`,
                          backgroundColor: theme.buttonBack,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Engagement */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("engagement")}</Text>
          </View>
          <View style={styles.engageRow}>
            {(
              [
                ["heart", "likes", stats?.engagement?.likes ?? 0],
                ["message-circle", "comments", stats?.engagement?.comments ?? 0],
                ["send", "shares", stats?.engagement?.shares ?? 0],
                ["bookmark", "saves", stats?.engagement?.saves ?? 0],
              ] as const
            ).map(([icon, labelKey, v]) => (
              <View
                key={labelKey}
                style={styles.engageTile}
                accessible
                accessibilityLabel={`${t(labelKey)}: ${v}`}
              >
                <Feather name={icon} size={18} color={theme.darkGreenLight} />
                <Text style={styles.engageValue}>{formatCount(v)}</Text>
                <Text style={styles.engageLabel} numberOfLines={1}>
                  {t(labelKey)}
                </Text>
              </View>
            ))}
          </View>
          {reelId != null && (
            <TouchableOpacity
              style={styles.rowBtn}
              activeOpacity={0.7}
              onPress={() => setCommentsOpen(true)}
              accessibilityRole="button"
            >
              <View style={styles.rowBtnLeft}>
                <Feather
                  name="message-square"
                  size={16}
                  color={theme.darkGreen}
                />
                <Text style={styles.rowBtnText}>{t("viewComments")}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.lightGreen} />
            </TouchableOpacity>
          )}
        </View>

        {/* Bookings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("bookings")}</Text>
          </View>
          <View style={styles.bookTotalRow}>
            <Text style={styles.bookTotal}>{formatCount(bookings.total)}</Text>
            <Text style={styles.cardMeta}>{t("total")}</Text>
          </View>
          <View style={styles.stackBar} accessibilityElementsHidden>
            {bookingSegments.map((s) =>
              s.value > 0 ? (
                <View
                  key={s.key}
                  style={{ flex: s.value, backgroundColor: s.color }}
                />
              ) : null,
            )}
          </View>
          <View style={styles.legend}>
            {bookingSegments.map((s) => (
              <View key={s.key} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendLabel}>{t(s.key)}</Text>
                <Text style={styles.legendValue}>{formatCount(s.value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Views — last 30 days */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("viewsLast30Days")}</Text>
          </View>
          <View style={styles.chartSummary}>
            <View>
              <Text style={styles.chartBig}>
                {formatCount(selected ? selected.views : total30)}
              </Text>
              <Text style={styles.chartSub}>
                {selected ? formatDay(selected.date) : t("reelStatsTotalViews")}
              </Text>
            </View>
            {peakIndex >= 0 && !selected && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.metricValue}>
                  {formatCount(days[peakIndex].views)}
                </Text>
                <Text style={styles.chartSub}>
                  {t("reelStatsPeak")} · {formatDay(days[peakIndex].date)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.chart}>
            {!!total30 && [0.5, 1].map((f) => (
              <View
                key={f}
                style={[styles.chartGrid, { bottom: CHART_HEIGHT * f - 1 }]}
              />
            ))}
            {!!total30 && days.map((d, i) => {
              const isSel = selectedDay === i;
              const dim = selectedDay != null && !isSel;
              return (
                <TouchableOpacity
                  key={d.date}
                  style={styles.chartCol}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDay(isSel ? null : i)}
                  accessibilityLabel={`${formatDay(d.date)}: ${d.views}`}
                  hitSlop={{ top: 8, bottom: 8 }}
                >
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max(
                          3,
                          (d.views / maxDayViews) * (CHART_HEIGHT - 8),
                        ),
                        backgroundColor:
                          d.views === 0
                            ? theme.lightGreen1
                            : isSel || i === peakIndex
                              ? theme.darkGreen
                              : theme.buttonBack,
                        opacity: dim ? 0.35 : 1,
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
            {!total30 && (
              <View style={styles.chartEmpty} pointerEvents="none">
                <Feather name="bar-chart-2" size={20} color={theme.lightGreen4} />
                <Text style={styles.chartSub}>{t("reelStatsNoViews")}</Text>
              </View>
            )}
          </View>
          {days.length > 0 && (
            <View style={styles.chartAxis}>
              <Text style={styles.chartAxisText}>{formatDay(days[0].date)}</Text>
              <Text style={styles.chartAxisText}>
                {formatDay(days[Math.floor(days.length / 2)].date)}
              </Text>
              <Text style={styles.chartAxisText}>
                {formatDay(days[days.length - 1].date)}
              </Text>
            </View>
          )}
          {!!total30 && (
            <Text
              style={[
                styles.chartSub,
                { marginTop: moderateHeightScale(10), textAlign: "center" },
              ]}
            >
              {t("reelStatsTapBar")}
            </Text>
          )}
        </View>

        {/* Top reels */}
        {!reelId && !!stats?.top_reels?.length && (
          <View style={styles.card}>
            <View style={[styles.cardHeader, { marginBottom: 4 }]}>
              <Text style={styles.cardTitle}>{t("topReels")}</Text>
            </View>
            {stats.top_reels.map((reel, i) => (
              <TouchableOpacity
                key={reel.id}
                activeOpacity={0.7}
                style={[styles.topReel, i > 0 && styles.topReelDivider]}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/reelStats" as any,
                    params: { id: String(reel.id) },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={styles.thumb}>
                  {reel.thumbnail_url ? (
                    <Image
                      source={{ uri: reel.thumbnail_url }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <Feather name="film" size={16} color={theme.darkGreenLight} />
                  )}
                </View>
                <View style={styles.topReelBody}>
                  <TextWithEmoji style={styles.topReelCaption} numberOfLines={1}>
                    {reel.caption || t("untitledReel")}
                  </TextWithEmoji>
                  <View style={styles.topReelMetaRow}>
                    <View style={styles.topReelMeta}>
                      <Feather name="eye" size={12} color={theme.lightGreen} />
                      <Text style={styles.topReelMetaText}>
                        {formatCount(reel.views)}
                      </Text>
                    </View>
                    <View style={styles.topReelMeta}>
                      <Feather name="calendar" size={12} color={theme.lightGreen} />
                      <Text style={styles.topReelMetaText}>
                        {formatCount(reel.bookings)}
                      </Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{t(reel.status)}</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={theme.lightGreen4} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {reelId != null ? (
        <ReelCommentsSheet
          visible={commentsOpen}
          reelId={commentsOpen ? reelId : null}
          initialCount={stats?.engagement?.comments ?? 0}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
    </View>
  );
}
