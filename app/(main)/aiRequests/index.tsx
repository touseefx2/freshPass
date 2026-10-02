import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
import { listMyReels, getGenerationStatus } from "@/src/services/reelsService";
import type { OwnerReel, GenerationStatus } from "@/src/types/reels";
import dayjs from "dayjs";
import { MaterialIcons } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";
import RetryButton from "@/src/components/retryButton";
import EmptyState from "@/src/components/emptyState";
import Logger from "@/src/services/logger";

const PER_PAGE = 20;
const POLL_INTERVAL_MS = 10000;
const REELS_POLL_MS = 8000;

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

type RequestTab = "tools" | "reels";

/** Unified row for Tools jobs and Shotstack reels */
type RequestListItem = {
  key: string;
  kind: "job" | "reel";
  title: string;
  /** UI status: completed | failed | processing */
  status: string;
  jobIdDisplay: string;
  createdAt: string;
  prompt?: string;
  reelId?: number;
  jobId?: string;
};

type RequestSection = {
  dayKey: string;
  title: string;
  count: number;
  data: RequestListItem[];
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

/** Shotstack-generated reels (listed on AI Requests → Reels) */
function isShotstackGeneratedReel(reel: OwnerReel): boolean {
  return reel.generation_status != null;
}

function mapGenerationToUiStatus(status: GenerationStatus | null | undefined): string {
  if (status === "ready") return "completed";
  if (status === "failed") return "failed";
  return "processing";
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
  items: RequestListItem[],
  t: (key: string, options?: Record<string, unknown>) => string,
): RequestSection[] {
  const sectionsByDay = new Map<string, RequestListItem[]>();
  const orderedDayKeys: string[] = [];

  for (const item of items) {
    const dayKey = dayjs(item.createdAt).format("YYYY-MM-DD");
    if (!sectionsByDay.has(dayKey)) {
      sectionsByDay.set(dayKey, []);
      orderedDayKeys.push(dayKey);
    }
    sectionsByDay.get(dayKey)!.push(item);
  }

  return orderedDayKeys.map((dayKey) => {
    const dayItems = sectionsByDay.get(dayKey) ?? [];
    const dayLabel = formatSectionDayLabel(dayKey, t);
    return {
      dayKey,
      title: t("aiHistoryDayHeader", {
        date: dayLabel,
        count: dayItems.length,
      }),
      count: dayItems.length,
      data: dayItems,
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

function jobToListItem(job: AiRequestJob): RequestListItem {
  const jobType =
    job.request_payload?.job_type ?? job.response?.job_type ?? "—";
  const title =
    typeof jobType === "string" ? jobType.replace(/_/g, " ") : String(jobType);
  const promptRaw =
    job.request_payload?.prompt ?? job.response?.prompt ?? "";
  const prompt =
    typeof promptRaw === "string"
      ? promptRaw.trim()
      : String(promptRaw ?? "").trim();

  return {
    key: `job-${job.job_id}`,
    kind: "job",
    title,
    status: (job.status ?? "processing").toLowerCase(),
    jobIdDisplay: job.job_id,
    createdAt: job.created_at,
    prompt: prompt.length > 0 ? prompt : undefined,
    jobId: job.job_id,
  };
}

function reelToListItem(
  reel: OwnerReel,
  generateReelLabel: string,
): RequestListItem {
  return {
    key: `reel-${reel.id}`,
    kind: "reel",
    title: generateReelLabel,
    status: mapGenerationToUiStatus(reel.generation_status),
    jobIdDisplay: `reel_${reel.id}`,
    createdAt: reel.created_at ?? reel.updated_at ?? new Date().toISOString(),
    prompt: reel.caption?.trim() || undefined,
    reelId: reel.id,
  };
}

export default function AiRequests() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    returnTo?: string;
    fromProcessingModal?: string;
    tab?: string;
    highlightReelId?: string;
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
  const showReelsTab = !isTryOnFlow && userRole === "business";

  const initialTab: RequestTab =
    showReelsTab && params.tab === "reels" ? "reels" : "tools";
  const [activeTab, setActiveTab] = useState<RequestTab>(initialTab);

  useEffect(() => {
    if (showReelsTab && params.tab === "reels") {
      setActiveTab("reels");
    }
  }, [params.tab, showReelsTab]);

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
  const [reels, setReels] = useState<OwnerReel[]>([]);
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
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);
        setLoadError(false);
      }

      try {
        const result = await ApiService.get<AiRequestsApiResponse>(
          aiRequestsEndpoints.list({ page, per_page: PER_PAGE }),
        );
        const raw = result?.data ?? [];
        const filtered = filterJobsForRole(raw, shouldFilterHairTryon);

        setJobs((prev) => {
          if (!append) return filtered;
          const existing = new Set(prev.map((j) => j.job_id));
          return [...prev, ...filtered.filter((j) => !existing.has(j.job_id))];
        });
        setCurrentPage(page);
        const nextUrl = result?.links?.next;
        setHasMore(Boolean(nextUrl));
        setLoadError(false);
      } catch (error) {
        Logger.error("Failed to load AI requests:", error);
        if (!silent) setLoadError(true);
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, canFetchHistory, refreshing, shouldFilterHairTryon],
  );

  const fetchReels = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      silent: boolean = false,
    ) => {
      if (!canFetchHistory || !accessToken || !showReelsTab) {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
        return;
      }

      if (!silent) {
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);
        setLoadError(false);
      }

      try {
        const { reels: pageReels, meta } = await listMyReels(page, undefined, PER_PAGE);
        const shotstackOnly = pageReels.filter(isShotstackGeneratedReel);

        setReels((prev) => {
          if (!append) return shotstackOnly;
          const existing = new Set(prev.map((r) => r.id));
          return [
            ...prev,
            ...shotstackOnly.filter((r) => !existing.has(r.id)),
          ];
        });
        setCurrentPage(meta.current_page ?? page);
        setHasMore(Boolean(meta.has_more));
        setLoadError(false);
      } catch (error) {
        Logger.error("Failed to load Shotstack reels:", error);
        if (!silent) setLoadError(true);
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, canFetchHistory, refreshing, showReelsTab],
  );

  const fetchActive = useCallback(
    (page: number = 1, append: boolean = false, silent: boolean = false) => {
      if (activeTab === "reels") {
        return fetchReels(page, append, silent);
      }
      return fetchJobs(page, append, silent);
    },
    [activeTab, fetchJobs, fetchReels],
  );

  useFocusEffect(
    useCallback(() => {
      if (!canFetchHistory) {
        setLoading(false);
        return;
      }

      setCurrentPage(1);
      setHasMore(true);
      void fetchActive(1, false);

      const intervalId = setInterval(() => {
        if (isPollingRef.current || !canFetchHistory) return;
        isPollingRef.current = true;
        fetchActive(1, false, true).finally(() => {
          isPollingRef.current = false;
        });
      }, POLL_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        isPollingRef.current = false;
      };
    }, [canFetchHistory, fetchActive]),
  );

  // Poll generation status for in-progress Shotstack reels
  useEffect(() => {
    if (activeTab !== "reels" || !showReelsTab) return;
    const inProgress = reels.filter(
      (r) =>
        r.generation_status === "pending" ||
        r.generation_status === "rendering",
    );
    if (inProgress.length === 0) return;

    let cancelled = false;
    const tick = async () => {
      for (const reel of inProgress) {
        try {
          const status = await getGenerationStatus(reel.id);
          if (cancelled) return;
          setReels((prev) =>
            prev.map((r) =>
              r.id === reel.id
                ? {
                    ...r,
                    generation_status: status.generation_status,
                    generation_error: status.generation_error,
                  }
                : r,
            ),
          );
        } catch (error) {
          Logger.error(`Generation poll failed for reel ${reel.id}:`, error);
        }
      }
    };

    const id = setInterval(() => {
      void tick();
    }, REELS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTab, reels, showReelsTab]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !canFetchHistory) return;
    void fetchActive(currentPage + 1, true);
  }, [loadingMore, hasMore, currentPage, fetchActive, canFetchHistory]);

  const handleRefresh = useCallback(() => {
    if (!canFetchHistory) return;
    setRefreshing(true);
    void fetchActive(1, false);
  }, [canFetchHistory, fetchActive]);

  const handleTabChange = useCallback(
    (tab: RequestTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      setJobs([]);
      setReels([]);
      setCurrentPage(1);
      setHasMore(true);
      setLoading(true);
      setLoadError(false);
      // useFocusEffect re-runs when fetchActive identity changes with activeTab
    },
    [activeTab],
  );

  const listItems = useMemo((): RequestListItem[] => {
    if (activeTab === "reels") {
      return reels.map((r) => reelToListItem(r, t("generateReel")));
    }
    return jobs.map(jobToListItem);
  }, [activeTab, jobs, reels, t]);

  const sections = useMemo(
    () => buildSections(listItems, t),
    [listItems, t],
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

  const formatStatusLabel = useCallback(
    (status: string) => {
      const s = (status ?? "").toLowerCase();
      if (s === "completed") return t("completed");
      if (s === "failed") return t("generationFailed");
      if (s === "processing") return t("processingText").replace(/\.\.\.$/, "");
      return status?.charAt(0).toUpperCase() + (status?.slice(1) ?? "");
    },
    [t],
  );

  const renderItem = useCallback(
    ({ item }: { item: RequestListItem }) => {
      const statusBadgeStyle = getStatusBadgeStyle(item.status);
      const statusColor = getStatusTextColor(item.status);
      const isHighlighted =
        item.kind === "reel" &&
        params.highlightReelId != null &&
        String(item.reelId) === String(params.highlightReelId);

      return (
        <TouchableOpacity
          style={[
            styles.jobCard,
            styles.shadow,
            isHighlighted && styles.jobCardHighlighted,
          ]}
          activeOpacity={0.7}
          onPress={() => {
            const titleLower = item.title.toLowerCase();
            const resultType = item.kind === "reel"
              ? "reel"
              : titleLower.includes("hair") || titleLower.includes("replicate")
                ? "hairTryon"
                : titleLower.includes("collage")
                  ? "collage"
                  : titleLower.includes("post")
                    ? "post"
                    : "reel";
            if (item.kind === "reel" && item.reelId != null) {
              router.push({
                pathname: "/aiResults",
                params: {
                  reelId: String(item.reelId),
                  resultType,
                  ...(params.returnTo ? { returnTo: params.returnTo } : {}),
                },
              });
              return;
            }
            if (item.jobId) {
              router.push({
                pathname: "/aiResults",
                params: {
                  jobId: item.jobId,
                  resultType,
                  ...(params.returnTo ? { returnTo: params.returnTo } : {}),
                },
              });
            }
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
                  {item.title}
                </Text>
                <View style={[styles.jobCardStatusBadge, statusBadgeStyle]}>
                  <Text
                    style={[styles.jobCardStatusText, { color: statusColor }]}
                  >
                    {formatStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text
                style={styles.jobCardJobIdMuted}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {t("jobId")}: {item.jobIdDisplay}
              </Text>
              {item.prompt ? (
                <View style={styles.jobCardPromptBlock}>
                  <Text
                    style={styles.jobCardPromptText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.prompt}
                  </Text>
                </View>
              ) : null}
              <View style={styles.jobCardFooter}>
                <Text style={styles.jobCardMetaLabel}>{t("aiHistoryTime")}</Text>
                <Text style={styles.jobCardMetaValue} numberOfLines={1}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      styles,
      t,
      getStatusBadgeStyle,
      getStatusTextColor,
      formatStatusLabel,
      params.returnTo,
      params.highlightReelId,
    ],
  );

  const keyExtractor = useCallback((item: RequestListItem) => item.key, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: RequestSection }) => (
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

  const renderTabs = useCallback(() => {
    if (!showReelsTab) return null;
    return (
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "tools" && styles.tabButtonActive,
          ]}
          onPress={() => handleTabChange("tools")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "tools" && styles.tabButtonTextActive,
            ]}
          >
            {t("aiRequestsTabTools")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "reels" && styles.tabButtonActive,
          ]}
          onPress={() => handleTabChange("reels")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "reels" && styles.tabButtonTextActive,
            ]}
          >
            {t("aiRequestsTabReels")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [showReelsTab, styles, activeTab, handleTabChange, t]);

  const renderListHeader = useCallback(() => {
    const errorBanner =
      loadError && listItems.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{t("aiHistoryLoadError")}</Text>
          <RetryButton
            onPress={() => void fetchActive(1, false)}
            loading={loading && !refreshing}
          />
        </View>
      ) : null;

    return (
      <View>
        {renderTabs()}
        {errorBanner}
      </View>
    );
  }, [
    loadError,
    listItems.length,
    styles.errorBanner,
    styles.errorBannerText,
    t,
    fetchActive,
    loading,
    refreshing,
    renderTabs,
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
          onActionPress={() => void fetchActive(1, false)}
        />
      );
    }

    if (activeTab === "reels") {
      return (
        <EmptyState
          icon="movie-filter"
          title={t("noReelRequests")}
          subtitle={t("reelRequestsEmptySubtitle")}
          actionTitle={t("exploreAiTools")}
          onActionPress={() => router.back()}
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
  }, [loading, isGuest, loadError, isTryOnFlow, activeTab, t, fetchActive]);

  const showInitialLoader =
    loading && listItems.length === 0 && !loadError && canFetchHistory;

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
      {showInitialLoader ? (
        <View style={styles.listContent}>
          {renderTabs()}
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
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
      )}
    </View>
  );
}
