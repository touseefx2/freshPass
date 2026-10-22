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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { OwnerJobCard } from "@/src/components/jobs/jobCards";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  fetchMyJobPosts,
  subscribeToJobPostChanges,
} from "@/src/services/jobService";
import type { JobPost, JobPostFilter } from "@/src/types/jobs";
import {
  JOB_FILTER_LABEL_KEYS,
  JOB_POST_FILTERS,
  getJobErrorMessage,
  hasMoreJobPages,
} from "@/src/utils/jobHelpers";

/**
 * Owner's job posts ("Hiring"): Post a job, status tabs, one card per post
 * with its applicants count. A post opens the manage screen.
 */
const PAGE_SIZE = 20;

const EDITOR_PATH =
  "/(main)/dashboard/(account)/(businessProfileSettings)/jobPostEditor";
const DETAIL_PATH =
  "/(main)/dashboard/(account)/(businessProfileSettings)/jobPostDetail";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    top: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(6),
    },
    intro: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(8),
    },
    chips: {
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(12),
    },
    chip: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(4),
      gap: moderateHeightScale(14),
    },
    emptyContent: { flexGrow: 1 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    footerLoader: { paddingVertical: moderateHeightScale(16) },
  });

export default function JobPostsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [filter, setFilter] = useState<JobPostFilter>("all");
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Answers for an older filter / refresh are dropped
  const requestRef = useRef(0);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh") => {
      const request = ++requestRef.current;
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const { posts: list, meta } = await fetchMyJobPosts({
          status: filter,
          page: 1,
          per_page: PAGE_SIZE,
        });
        if (request !== requestRef.current) return;
        setPosts(list);
        setPage(1);
        setHasMore(hasMoreJobPages(meta));
      } catch (err) {
        if (request !== requestRef.current) return;
        const message = getJobErrorMessage(err, t("somethingWentWrong"));
        // A failed pull-to-refresh keeps the rows that are already shown
        if (mode === "refresh" && postsRef.current.length > 0) {
          showBannerRef.current(t("jobPostsLoadFailed"), message, "error");
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
    [filter, t],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { posts: list, meta } = await fetchMyJobPosts({
        status: filter,
        page: nextPage,
        per_page: PAGE_SIZE,
      });
      if (request !== requestRef.current) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...list.filter((p) => !seen.has(p.id))];
      });
      setPage(nextPage);
      setHasMore(hasMoreJobPages(meta));
    } catch {
      // Keep what is loaded; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  }, [filter, hasMore, loading, loadingMore, page, refreshing]);

  // First page whenever the status tab changes
  useEffect(() => {
    setPosts([]);
    void loadFirstPage("initial");
  }, [loadFirstPage]);

  // Saved / closed / deleted on another screen: patch the row in place
  useEffect(
    () =>
      subscribeToJobPostChanges((change) => {
        if (change.type === "deleted") {
          setPosts((prev) => prev.filter((p) => p.id !== change.id));
          return;
        }
        const { post } = change;
        const fits = filter === "all" || post.status === filter;
        setPosts((prev) => {
          const index = prev.findIndex((p) => p.id === post.id);
          if (!fits)
            return index < 0 ? prev : prev.filter((p) => p.id !== post.id);
          // Keep the count when the save answer leaves it out
          const merged =
            index >= 0 && post.applicationsCount == null
              ? { ...post, applicationsCount: prev[index].applicationsCount }
              : post;
          if (index < 0) return [merged, ...prev];
          const next = [...prev];
          next[index] = merged;
          return next;
        });
      }),
    [filter],
  );

  const openEditor = useCallback(() => {
    router.push(EDITOR_PATH as any);
  }, [router]);

  const openPost = useCallback(
    (post: JobPost) => {
      router.push({
        pathname: DETAIL_PATH as any,
        params: { id: String(post.id) },
      });
    },
    [router],
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <EmptyState
          icon="error-outline"
          title={t("jobPostsLoadFailed")}
          subtitle={error}
          actionTitle={t("orderRetry")}
          onActionPress={() => void loadFirstPage("initial")}
        />
      );
    }
    if (filter === "all") {
      return (
        <EmptyState
          icon="work-outline"
          title={t("jobPostsEmptyTitle")}
          subtitle={t("jobPostsEmptySubtitle")}
        />
      );
    }
    return (
      <EmptyState
        icon="work-outline"
        title={t("jobPostsEmptyFilteredTitle")}
        subtitle={t("jobPostsEmptyFilteredSubtitle", {
          status: t(JOB_FILTER_LABEL_KEYS[filter]),
        })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("jobHiringTitle")} />
      <View style={styles.top}>
        <Text style={styles.intro}>{t("jobPostsIntro")}</Text>
        <FlowButton
          label={t("jobPostAJob")}
          icon="add"
          compact
          onPress={openEditor}
        />
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {JOB_POST_FILTERS.map((key) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(JOB_FILTER_LABEL_KEYS[key])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {loading && posts.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OwnerJobCard post={item} onPress={() => openPost(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && styles.emptyContent,
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
