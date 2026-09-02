import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints } from "@/src/services/endpoints";
import dayjs from "dayjs";
import { MaterialIcons } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";
import RetryButton from "@/src/components/retryButton";
import EmptyState from "@/src/components/emptyState";

const PER_PAGE = 20;
const POLL_INTERVAL_MS = 10000;

const HAIR_TRYON_JOB_TYPES = new Set([
  "generate_with_replicate",
  "hair_pipeline",
]);

export type AiRequestJob = {
  job_id: string;
  user_id: number;
  request_payload: {
    job_type: string;
    [key: string]: unknown;
  };
  response?: Record<string, unknown>;
  expiry_date: string;
  status: string;
  message?: string | null;
  created_at: string;
  updated_at: string;
};

type AiRequestsApiResponse = {
  data: AiRequestJob[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    current_page_url: string;
    from: number | null;
    path: string;
    per_page: string;
    to: number | null;
  };
};

type AiRequestSection = {
  dayKey: string;
  title: string;
  count: number;
  data: AiRequestJob[];
};

function isHairTryonJob(job: AiRequestJob): boolean {
  const jobType =
    job.request_payload?.job_type ?? job.response?.job_type ?? "";
  return (
    typeof jobType === "string" && HAIR_TRYON_JOB_TYPES.has(jobType)
  );
}

function filterJobsForRole(
  jobs: AiRequestJob[],
  shouldFilterHairTryon: boolean,
): AiRequestJob[] {
  if (!shouldFilterHairTryon) return jobs;
  return jobs.filter(isHairTryonJob);
}

function formatSectionDayLabel(dayKey: string, t: (key: string) => string): string {
  const sectionDate = dayjs(dayKey);
  if (!sectionDate.isValid()) return dayKey;

  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day");

  if (sectionDate.isSame(today, "day")) {
    return t("today");
  }
  if (sectionDate.isSame(yesterday, "day")) {
    return t("yesterday");
  }
  return sectionDate.format("D MMMM YYYY");
}

function buildSections(
  jobs: AiRequestJob[],
  t: (key: string, options?: Record<string, unknown>) => string,
): AiRequestSection[] {
  const sectionsByDay = new Map<string, AiRequestJob[]>();
  const orderedDayKeys: string[] = [];

  for (const job of jobs) {
    const dayKey = dayjs(job.created_at).format("YYYY-MM-DD");
    if (!sectionsByDay.has(dayKey)) {
      sectionsByDay.set(dayKey, []);
      orderedDayKeys.push(dayKey);
    }
    sectionsByDay.get(dayKey)!.push(job);
  }

  return orderedDayKeys.map((dayKey) => {
    const dayJobs = sectionsByDay.get(dayKey) ?? [];
    const dayLabel = formatSectionDayLabel(dayKey, t);
    return {
      dayKey,
      title: t("aiHistoryDayHeader", {
        date: dayLabel,
        count: dayJobs.length,
      }),
      count: dayJobs.length,
      data: dayJobs,
    };
  });
}

function formatTime(value: string): string {
  const d = dayjs(value);
  if (d.isValid()) {
    return d.format("h:mm A");
  }
  return value;
}

export default function AiRequests() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    returnTo?: string;
    fromProcessingModal?: string;
  }>();
  const accessToken = useAppSelector((state) => state.user.accessToken);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const userRole = useAppSelector((state) => state.user.userRole);
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const isTryOnFlow =
    params.returnTo === "booking" || params.returnTo === "chat";
  const fromProcessingModal = params.fromProcessingModal === "1";
  const headerTitle = isTryOnFlow ? t("tryOnList") : t("aiRequests");
  const shouldFilterHairTryon = isTryOnFlow || userRole !== "business";
  const canFetchHistory = Boolean(accessToken) && !isGuest;

  const handleRobotPress = useCallback(() => {
    if (fromProcessingModal) {
      if (router.canDismiss()) {
        router.dismiss(2);
      } else {
        router.back();
        router.back();
      }
      return;
    }
    router.back();
  }, [fromProcessingModal]);

  const [jobs, setJobs] = useState<AiRequestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isPollingRef = useRef(false);

  const fetchJobs = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      silent: boolean = false,
    ) => {
      if (!canFetchHistory || !accessToken) {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
        return;
      }

      if (!silent) {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
      }

      try {
        const response = await ApiService.get<AiRequestsApiResponse>(
          aiRequestsEndpoints.list({ page, per_page: PER_PAGE }),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (response?.data) {
          const newData = filterJobsForRole(
            response.data as AiRequestJob[],
            shouldFilterHairTryon,
          );
          if (append) {
            setJobs((prev) => [...prev, ...newData]);
          } else {
            setJobs(newData);
          }
          setCurrentPage(response.meta?.current_page ?? page);
          const nextLink = response.links?.next;
          setHasMore(!!nextLink);
          setLoadError(false);
        } else if (!append) {
          setJobs([]);
          setLoadError(false);
        }
      } catch {
        if (!silent) {
          setLoadError(true);
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, canFetchHistory, shouldFilterHairTryon],
  );

  useFocusEffect(
    useCallback(() => {
      if (!canFetchHistory) {
        setLoading(false);
        return;
      }

      fetchJobs(1, false);

      const intervalId = setInterval(() => {
        if (isPollingRef.current || !canFetchHistory) return;
        isPollingRef.current = true;
        fetchJobs(1, false, true).finally(() => {
          isPollingRef.current = false;
        });
      }, POLL_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        isPollingRef.current = false;
      };
    }, [canFetchHistory, fetchJobs]),
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !canFetchHistory) return;
    fetchJobs(currentPage + 1, true);
  }, [loadingMore, hasMore, currentPage, fetchJobs, canFetchHistory]);

  const handleRefresh = useCallback(() => {
    if (!canFetchHistory) return;
    setRefreshing(true);
    fetchJobs(1, false);
  }, [canFetchHistory, fetchJobs]);

  const sections = useMemo(
    () => buildSections(jobs, t),
    [jobs, t],
  );

  const getStatusBadgeStyle = useCallback(
    (status: string) => {
      const s = (status ?? "").toLowerCase();
      if (s === "completed") return styles.jobCardStatusBadgeCompleted;
      if (s === "failed") return styles.jobCardStatusBadgeFailed;
      return styles.jobCardStatusBadgeProcessing;
    },
    [styles],
  );

  const getStatusTextColor = useCallback(
    (status: string) => {
      const s = (status ?? "").toLowerCase();
      if (s === "completed") return (colors as Theme).primary;
      if (s === "failed") return (colors as Theme).red;
      return (colors as Theme).borderDark;
    },
    [colors],
  );

  const renderItem = useCallback(
    ({ item }: { item: AiRequestJob }) => {
      const jobType =
        item.request_payload?.job_type ?? item.response?.job_type ?? "—";
      const jobTypeDisplay =
        typeof jobType === "string" ? jobType.replace(/_/g, " ") : jobType;
      const statusLabel =
        item.status?.charAt(0).toUpperCase() + (item.status?.slice(1) ?? "");
      const statusBadgeStyle = getStatusBadgeStyle(item.status);
      const statusColor = getStatusTextColor(item.status);
      const promptRaw =
        item.request_payload?.prompt ?? item.response?.prompt ?? "";
      const prompt =
        typeof promptRaw === "string"
          ? promptRaw.trim()
          : String(promptRaw ?? "").trim();

      return (
        <TouchableOpacity
          style={[styles.jobCard, styles.shadow]}
          activeOpacity={0.7}
          onPress={() => {
            router.push({
              pathname: "/aiResults",
              params: {
                jobId: item.job_id,
                ...(params.returnTo ? { returnTo: params.returnTo } : {}),
              },
            });
          }}
        >
          <View style={styles.jobCardInner}>
            <View style={styles.jobCardAccent} />
            <View style={styles.jobCardContent}>
              <View style={styles.jobCardTopRow}>
                <Text
                  style={styles.jobCardTypeTitle}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {jobTypeDisplay}
                </Text>
                <View style={[styles.jobCardStatusBadge, statusBadgeStyle]}>
                  <Text
                    style={[styles.jobCardStatusText, { color: statusColor }]}
                  >
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <Text
                style={styles.jobCardJobIdMuted}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {t("jobId")}: {item.job_id}
              </Text>
              {prompt.length > 0 ? (
                <View style={styles.jobCardPromptBlock}>
                  <Text
                    style={styles.jobCardPromptText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {prompt}
                  </Text>
                </View>
              ) : null}
              <View style={styles.jobCardFooter}>
                <Text style={styles.jobCardMetaLabel}>{t("aiHistoryTime")}</Text>
                <Text style={styles.jobCardMetaValue} numberOfLines={1}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, t, getStatusBadgeStyle, getStatusTextColor, params.returnTo],
  );

  const keyExtractor = useCallback((item: AiRequestJob) => item.job_id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: AiRequestSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [styles.sectionHeader, styles.sectionHeaderText],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [loadingMore, styles.loadingFooter, theme.primary]);

  const renderListHeader = useCallback(() => {
    if (!loadError || jobs.length === 0) return null;
    return (
      <View style={styles.errorBanner}>
        <Text style={styles.errorBannerText}>{t("aiHistoryLoadError")}</Text>
        <RetryButton
          onPress={() => fetchJobs(1, false)}
          loading={loading && !refreshing}
        />
      </View>
    );
  }, [
    loadError,
    jobs.length,
    styles.errorBanner,
    styles.errorBannerText,
    t,
    fetchJobs,
    loading,
    refreshing,
  ]);

  const listEmptyComponent = useCallback(() => {
    if (loading) return null;

    if (isGuest) {
      return (
        <EmptyState
          icon="lock-outline"
          title={t("aiHistorySignInRequired")}
          subtitle={t("aiHistorySignInSubtitle")}
        />
      );
    }

    if (loadError) {
      return (
        <EmptyState
          icon="wifi-off"
          title={t("aiHistoryLoadErrorTitle")}
          subtitle={t("aiHistoryLoadError")}
          actionTitle={t("retry")}
          onActionPress={() => fetchJobs(1, false)}
        />
      );
    }

    return (
      <EmptyState
        icon={isTryOnFlow ? "content-cut" : "auto-awesome"}
        title={isTryOnFlow ? t("noTryOnRequests") : t("noAiRequests")}
        subtitle={
          isTryOnFlow
            ? t("tryOnRequestsEmptySubtitle")
            : t("aiRequestsEmptySubtitle")
        }
        actionTitle={isTryOnFlow ? undefined : t("exploreAiTools")}
        onActionPress={isTryOnFlow ? undefined : () => router.back()}
      />
    );
  }, [loading, isGuest, loadError, isTryOnFlow, t, fetchJobs]);

  if (loading && jobs.length === 0 && !loadError && canFetchHistory) {
    return (
      <View style={styles.safeArea}>
        <StackHeader
          title={headerTitle}
          rightIcon={
            isTryOnFlow ? undefined : (
              <MaterialIcons
                name="smart-toy"
                size={moderateWidthScale(22)}
                color={theme.white}
              />
            )
          }
          onRightPress={handleRobotPress}
        />
        <View style={styles.listContent}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader
        title={headerTitle}
        rightIcon={
          isTryOnFlow ? undefined : (
            <MaterialIcons
              name="smart-toy"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          )
        }
        onRightPress={handleRobotPress}
      />
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={renderListHeader}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />
    </View>
  );
}
