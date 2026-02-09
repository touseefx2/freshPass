import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { router } from "expo-router";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints } from "@/src/services/endpoints";
import dayjs from "dayjs";

// const DEFAULT_AI_REQUESTS_IMAGE =
//   process.env.EXPO_PUBLIC_DEFAULT_AI_REQUESTS_IMAGE || "";

const PER_PAGE = 20;

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

function formatDate(value: string): string {
  const d = dayjs(value);
  if (d.isValid()) {
    return d.format("MMM D, YYYY");
  }
  return value;
}

function formatDateTime(value: string): string {
  const d = dayjs(value);
  if (d.isValid()) {
    return d.format("MMM D, YYYY · h:mm A");
  }
  return value;
}

export default function AiRequests() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const [jobs, setJobs] = useState<AiRequestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchJobs = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await ApiService.get<AiRequestsApiResponse>(
          aiRequestsEndpoints.list({ page, per_page: PER_PAGE }),
        );

        if (response?.data) {
          const newData = response.data as AiRequestJob[];
          if (append) {
            setJobs((prev) => [...prev, ...newData]);
          } else {
            setJobs(newData);
          }
          setCurrentPage(response.meta?.current_page ?? page);
          const nextLink = response.links?.next;
          setHasMore(!!nextLink);
        } else if (!append) {
          setJobs([]);
        }
      } catch (_error) {
        if (!append) {
          setJobs([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchJobs(1, false);
  }, [fetchJobs]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchJobs(currentPage + 1, true);
  }, [loadingMore, hasMore, currentPage, fetchJobs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs(1, false);
  }, [fetchJobs]);

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

      return (
        <TouchableOpacity
          style={[styles.jobCard, styles.shadow]}
          activeOpacity={0.7}
          onPress={() => {
            router.push({
              pathname: "/aiResults",
              params: { jobId: item.job_id },
            });
          }}
        >
          <View style={styles.jobCardInner}>
            <View style={styles.jobCardAccent} />
            <View style={styles.jobCardContent}>
              <View style={styles.jobCardHeader}>
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
              <View style={styles.jobCardMetaRow}>
                <View style={styles.jobCardMetaItem}>
                  <Text style={styles.jobCardMetaLabel}>Created</Text>
                  <Text style={styles.jobCardMetaValue} numberOfLines={1}>
                    {formatDateTime(item.created_at)}
                  </Text>
                </View>
                <View style={styles.jobCardMetaItem}>
                  <Text style={styles.jobCardMetaLabel}>Expiry</Text>
                  <Text style={styles.jobCardMetaValue} numberOfLines={1}>
                    {formatDate(item.expiry_date)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, t, getStatusBadgeStyle, getStatusTextColor],
  );

  const keyExtractor = useCallback((item: AiRequestJob) => item.job_id, []);

  const theme = colors as Theme;
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [loadingMore, styles.loadingFooter, theme.primary]);

  const listEmptyComponent = useCallback(
    () =>
      !loading ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            {t("noAiRequests") || "No AI requests yet"}
          </Text>
        </View>
      ) : null,
    [loading, styles.emptyStateContainer, styles.emptyStateText, t],
  );

  if (loading && jobs.length === 0) {
    return (
      <View style={styles.safeArea}>
        <StackHeader title={t("aiRequests")} />
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
      <StackHeader title={t("aiRequests")} />
      <FlatList
        data={jobs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={listEmptyComponent}
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
