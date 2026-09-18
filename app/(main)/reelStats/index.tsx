import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import ReelCommentsSheet from "@/src/components/reelCommentsSheet";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  getBusinessReelStats,
  getReelStats,
} from "@/src/services/reelsService";
import type { FunnelWindow, ReelPerformanceStats } from "@/src/types/reels";

type WindowKey = "all_time" | "last_7_days" | "last_30_days";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    chipsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(16),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    chipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: { color: theme.buttonText },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
      marginTop: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(10),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rowLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      flex: 1,
    },
    rowValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    dayLabel: {
      width: moderateWidthScale(84),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    barTrack: {
      flex: 1,
      height: moderateHeightScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.lightGreen07,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      backgroundColor: theme.buttonBack,
      borderRadius: moderateWidthScale(4),
    },
    dayValue: {
      width: moderateWidthScale(36),
      textAlign: "right",
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    linkBtn: {
      marginTop: moderateHeightScale(8),
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
    },
    linkBtnText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    topReel: {
      paddingVertical: moderateHeightScale(10),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    topReelCaption: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    topReelMeta: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

function pickWindow(window: FunnelWindow, key: WindowKey): number {
  return window[key] ?? 0;
}

export default function ReelStatsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const reelId = params.id ? Number(params.id) : null;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReelPerformanceStats | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("all_time");
  const [commentsOpen, setCommentsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = reelId
        ? await getReelStats(reelId)
        : await getBusinessReelStats();
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
  }, [reelId, showBanner, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const maxDayViews = useMemo(() => {
    if (!stats?.views_by_day?.length) return 1;
    return Math.max(1, ...stats.views_by_day.map((d) => d.views));
  }, [stats]);

  const funnelRows = useMemo(() => {
    if (!stats) return [];
    return [
      { key: "view", label: t("funnelViews") },
      { key: "profile_tap", label: t("funnelProfileTaps") },
      { key: "booking_started", label: t("funnelBookingStarted") },
      { key: "booking_completed", label: t("funnelBookingCompleted") },
      { key: "subscription_started", label: t("funnelSubscriptionStarted") },
    ] as const;
  }, [stats, t]);

  if (loading && !stats) {
    return (
      <View style={styles.safeArea}>
        <StackHeader
          title={reelId ? t("reelPerformance") : t("businessReelPerformance")}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StackHeader
        title={reelId ? t("reelPerformance") : t("businessReelPerformance")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chipsRow}>
          {(
            [
              ["all_time", "allTime"],
              ["last_7_days", "last7Days"],
              ["last_30_days", "last30Days"],
            ] as const
          ).map(([key, labelKey]) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, windowKey === key && styles.chipActive]}
              onPress={() => setWindowKey(key)}
            >
              <Text
                style={[
                  styles.chipText,
                  windowKey === key && styles.chipTextActive,
                ]}
              >
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t("funnel")}</Text>
        {funnelRows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>
              {stats
                ? pickWindow(stats.funnel[row.key], windowKey).toLocaleString()
                : "0"}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>{t("engagement")}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("likes")}</Text>
          <Text style={styles.rowValue}>
            {stats?.engagement?.likes?.toLocaleString() ?? 0}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("comments")}</Text>
          <Text style={styles.rowValue}>
            {stats?.engagement?.comments?.toLocaleString() ?? 0}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("shares")}</Text>
          <Text style={styles.rowValue}>
            {stats?.engagement?.shares?.toLocaleString() ?? 0}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("saves")}</Text>
          <Text style={styles.rowValue}>
            {stats?.engagement?.saves?.toLocaleString() ?? 0}
          </Text>
        </View>
        {reelId != null && (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => setCommentsOpen(true)}
          >
            <Text style={styles.linkBtnText}>{t("viewComments")}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>{t("bookings")}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("total")}</Text>
          <Text style={styles.rowValue}>{stats?.bookings.total ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("upcoming")}</Text>
          <Text style={styles.rowValue}>{stats?.bookings.upcoming ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("completed")}</Text>
          <Text style={styles.rowValue}>{stats?.bookings.completed ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("cancelled")}</Text>
          <Text style={styles.rowValue}>{stats?.bookings.cancelled ?? 0}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t("viewsLast30Days")}</Text>
        {(stats?.views_by_day ?? []).map((day) => (
          <View key={day.date} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{day.date.slice(5)}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${(day.views / maxDayViews) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.dayValue}>{day.views}</Text>
          </View>
        ))}

        {!reelId && !!stats?.top_reels?.length && (
          <>
            <Text style={styles.sectionTitle}>{t("topReels")}</Text>
            {stats.top_reels.map((reel) => (
              <TouchableOpacity
                key={reel.id}
                style={styles.topReel}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/reelStats" as any,
                    params: { id: String(reel.id) },
                  })
                }
              >
                <Text style={styles.topReelCaption} numberOfLines={1}>
                  {reel.caption || t("untitledReel")}
                </Text>
                <Text style={styles.topReelMeta}>
                  {t("topReelMeta", {
                    views: reel.views,
                    bookings: reel.bookings,
                    status: reel.status,
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </>
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
