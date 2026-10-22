import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import { ApplicationCard } from "@/src/components/jobs/jobCards";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchMyJobApplications } from "@/src/services/jobService";
import type { JobApplication } from "@/src/types/jobs";
import {
  getJobErrorMessage,
  hasMoreJobPages,
  jobChatParams,
} from "@/src/utils/jobHelpers";

/**
 * Customer's "My job applications": every post they applied to, with its
 * status now (Open / Closed / Expired). Talking happens in the chat.
 */
const PAGE_SIZE = 20;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    emptyContent: { flexGrow: 1 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    footerLoader: { paddingVertical: moderateHeightScale(16) },
  });

export default function MyJobApplicationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers for an older refresh are dropped
  const requestRef = useRef(0);
  const listRef = useRef(applications);
  listRef.current = applications;
  const pageRef = useRef(page);
  pageRef.current = page;
  const firstFocusRef = useRef(true);
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      const request = ++requestRef.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      try {
        const { applications: list, meta } = await fetchMyJobApplications({
          page: 1,
          per_page: PAGE_SIZE,
        });
        if (request !== requestRef.current) return;
        setApplications(list);
        setPage(1);
        setHasMore(hasMoreJobPages(meta));
      } catch (err) {
        if (request !== requestRef.current) return;
        const message = getJobErrorMessage(err, t("somethingWentWrong"));
        if (listRef.current.length > 0) {
          if (mode === "refresh") {
            showBannerRef.current(
              t("jobApplicationsLoadFailed"),
              message,
              "error",
            );
          }
        } else {
          setError(message);
        }
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { applications: list, meta } = await fetchMyJobApplications({
        page: nextPage,
        per_page: PAGE_SIZE,
      });
      if (request !== requestRef.current) return;
      setApplications((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...list.filter((a) => !seen.has(a.id))];
      });
      setPage(nextPage);
      setHasMore(hasMoreJobPages(meta));
    } catch {
      // Keep what is loaded; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, refreshing]);

  useEffect(() => {
    void loadFirstPage("initial");
  }, [loadFirstPage]);

  // Back from a post or the chat: statuses may have changed
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (pageRef.current === 1) void loadFirstPage("silent");
    }, [loadFirstPage]),
  );

  const renderItem = ({ item }: { item: JobApplication }) => {
    const post = item.jobPost;
    const business = post?.business;
    return (
      <ApplicationCard
        application={item}
        onMessage={
          business?.ownerId
            ? () =>
                router.push({
                  pathname: "/(main)/chatBox",
                  params: jobChatParams({
                    id: business.ownerId as number,
                    name: business.title,
                    image: business.logoUrl,
                  }),
                })
            : null
        }
        // Only open posts can be viewed (the post screen 404s otherwise)
        onOpenPost={
          post && post.status === "open"
            ? () =>
                router.push({
                  pathname: "/(main)/jobs/detail" as any,
                  params: { id: String(post.id) },
                })
            : null
        }
      />
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <EmptyState
          icon="error-outline"
          title={t("jobApplicationsLoadFailed")}
          subtitle={error}
          actionTitle={t("orderRetry")}
          onActionPress={() => void loadFirstPage("initial")}
        />
      );
    }
    return (
      <EmptyState
        icon="work-outline"
        title={t("jobMyApplicationsEmptyTitle")}
        subtitle={t("jobMyApplicationsEmptySubtitle")}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("jobMyApplications")} />
      {loading && applications.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            applications.length === 0 && styles.emptyContent,
            { paddingBottom: insets.bottom + moderateHeightScale(24) },
          ]}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.darkGreen} />
              </View>
            ) : null
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadFirstPage("refresh")}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
