import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs, { type Dayjs } from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import FlowButton from "@/src/components/reelFlow/flowButton";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import { JobFactChips, JobStatusBadge } from "@/src/components/jobs/jobBadges";
import { ApplicantCard } from "@/src/components/jobs/jobCards";
import { ClosingDateSheet } from "@/src/components/jobs/closingDatePicker";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { resetToDashboardHome } from "@/src/utils/navigation";
import {
  deleteJobPost,
  fetchJobPostApplications,
  fetchMyJobPost,
  subscribeToJobPostChanges,
  updateJobPost,
} from "@/src/services/jobService";
import type { JobApplication, JobPost } from "@/src/types/jobs";
import {
  JOB_DATE_FORMAT,
  JOB_DEFAULT_DAYS_AHEAD,
  JOB_MAX_DAYS_AHEAD,
  formatJobDate,
  formatJobPay,
  getJobErrorMessage,
  getJobErrorStatus,
  hasMoreJobPages,
  isJobDatePast,
  jobChatParams,
} from "@/src/utils/jobHelpers";

/**
 * Owner's view of one job post: what customers see, close / reopen /
 * extend / edit / delete, and everyone who applied (tap → chat).
 */
const PAGE_SIZE = 20;
const EDITOR_PATH =
  "/(main)/dashboard/(account)/(businessProfileSettings)/jobPostEditor";

type IconName = keyof typeof MaterialIcons.glyphMap;
type DateSheetMode = "extend" | "reopen" | null;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    header: { gap: moderateHeightScale(16) },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(22),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.07,
      shadowRadius: moderateWidthScale(12),
      elevation: 2,
    },
    summary: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(12),
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    liveText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size28,
    },
    pay: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      fontVariant: ["tabular-nums"],
    },
    payNote: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    stats: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    stat: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    statIcon: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    statText: { flex: 1, minWidth: 0 },
    statLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    actions: { gap: moderateHeightScale(10) },
    actionRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    actionHalf: { flex: 1 },
    actionLabel: { fontSize: fontSize.size15 },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(6),
    },
    footer: {
      marginTop: moderateHeightScale(10),
      gap: moderateHeightScale(10),
    },
    footerLoader: { paddingVertical: moderateHeightScale(12) },
    deleteHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function JobPostDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string; posted?: string }>();
  const postId = params.id ?? "";
  // Opened right after publishing: offer a one-tap way back to Home
  const justPosted = params.posted === "1";

  const [post, setPost] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [applicantsPage, setApplicantsPage] = useState(1);
  const [applicantsMore, setApplicantsMore] = useState(false);
  const [applicantsTotal, setApplicantsTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [busy, setBusy] = useState<"close" | "reopen" | "delete" | null>(null);
  const [dateSheet, setDateSheet] = useState<DateSheetMode>(null);
  const [dateSaving, setDateSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const requestRef = useRef(0);
  const postRef = useRef(post);
  postRef.current = post;
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const loadPost = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!postId) {
        setGone(true);
        setLoading(false);
        return;
      }
      if (mode === "initial") setLoading(true);
      setError(null);
      try {
        setPost(await fetchMyJobPost(postId));
      } catch (err) {
        if (getJobErrorStatus(err) === 404) setGone(true);
        else if (!postRef.current) {
          setError(getJobErrorMessage(err, t("somethingWentWrong")));
        } else if (mode === "refresh") {
          showBannerRef.current(
            t("jobPostsLoadFailed"),
            getJobErrorMessage(err, t("somethingWentWrong")),
            "error",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [postId, t],
  );

  const loadApplicants = useCallback(async () => {
    if (!postId) return;
    const request = ++requestRef.current;
    setApplicantsLoading(true);
    try {
      const { applications, meta } = await fetchJobPostApplications(postId, {
        page: 1,
        per_page: PAGE_SIZE,
      });
      if (request !== requestRef.current) return;
      setApplicants(applications);
      setApplicantsPage(1);
      setApplicantsMore(hasMoreJobPages(meta));
      setApplicantsTotal(
        typeof meta?.total === "number" ? meta.total : applications.length,
      );
    } catch {
      // The post itself still shows; pull to refresh retries
    } finally {
      if (request === requestRef.current) setApplicantsLoading(false);
    }
  }, [postId]);

  const loadMoreApplicants = useCallback(async () => {
    if (!applicantsMore || applicantsLoading || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const nextPage = applicantsPage + 1;
      const { applications, meta } = await fetchJobPostApplications(postId, {
        page: nextPage,
        per_page: PAGE_SIZE,
      });
      if (request !== requestRef.current) return;
      setApplicants((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...applications.filter((a) => !seen.has(a.id))];
      });
      setApplicantsPage(nextPage);
      setApplicantsMore(hasMoreJobPages(meta));
    } catch {
      // Scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  }, [applicantsLoading, applicantsMore, applicantsPage, loadingMore, postId]);

  useEffect(() => {
    void loadPost("initial");
    void loadApplicants();
  }, [loadApplicants, loadPost]);

  // Saved in the editor → show the new version here too
  useEffect(
    () =>
      subscribeToJobPostChanges((change) => {
        if (
          change.type === "saved" &&
          String(change.post.id) === String(postId)
        ) {
          setPost((prev) =>
            prev && change.post.applicationsCount == null
              ? { ...change.post, applicationsCount: prev.applicationsCount }
              : change.post,
          );
        }
      }),
    [postId],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPost("refresh"), loadApplicants()]);
    setRefreshing(false);
  }, [loadApplicants, loadPost]);

  const saveStatus = useCallback(
    async (
      payload: Parameters<typeof updateJobPost>[1],
      kind: "close" | "reopen",
    ) => {
      if (!post) return false;
      setBusy(kind);
      try {
        await updateJobPost(post.id, payload);
        showBannerRef.current(
          kind === "close"
            ? t("jobClosedBannerTitle")
            : t("jobReopenedBannerTitle"),
          kind === "close"
            ? t("jobClosedBannerBody")
            : t("jobReopenedBannerBody"),
          "success",
        );
        return true;
      } catch (err) {
        showBannerRef.current(
          t("jobSaveFailed"),
          getJobErrorMessage(err, t("somethingWentWrong")),
          "error",
        );
        return false;
      } finally {
        setBusy(null);
      }
    },
    [post, t],
  );

  const confirmClose = useCallback(() => {
    Alert.alert(t("jobCloseConfirmTitle"), t("jobCloseConfirmBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("jobCloseAction"),
        onPress: () => void saveStatus({ status: "closed" }, "close"),
      },
    ]);
  }, [saveStatus, t]);

  const reopen = useCallback(() => {
    if (!post) return;
    // An expired date needs a new one in the same request
    if (post.status === "expired" || isJobDatePast(post.expiresAt)) {
      setDateError(null);
      setDateSheet("reopen");
      return;
    }
    void saveStatus({ status: "open" }, "reopen");
  }, [post, saveStatus]);

  const confirmDate = useCallback(
    async (date: Dayjs) => {
      if (!post || !dateSheet) return;
      setDateSaving(true);
      setDateError(null);
      try {
        await updateJobPost(
          post.id,
          dateSheet === "reopen"
            ? { status: "open", expires_at: date.format(JOB_DATE_FORMAT) }
            : { expires_at: date.format(JOB_DATE_FORMAT) },
        );
        setDateSheet(null);
        showBannerRef.current(
          dateSheet === "reopen"
            ? t("jobReopenedBannerTitle")
            : t("jobExtendedBannerTitle"),
          t("jobClosesOn", { date: date.format("MMM D, YYYY") }),
          "success",
        );
      } catch (err) {
        setDateError(getJobErrorMessage(err, t("jobSaveFailed")));
      } finally {
        setDateSaving(false);
      }
    },
    [dateSheet, post, t],
  );

  const confirmDelete = useCallback(() => {
    if (!post) return;
    Alert.alert(t("jobDeleteConfirmTitle"), t("jobDeleteConfirmBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          try {
            await deleteJobPost(post.id);
            showBannerRef.current(
              t("jobDeletedTitle"),
              t("jobDeletedBody"),
              "success",
            );
            router.back();
          } catch (err) {
            setBusy(null);
            showBannerRef.current(
              t("jobDeleteFailed"),
              getJobErrorMessage(err, t("somethingWentWrong")),
              "error",
            );
          }
        },
      },
    ]);
  }, [post, router, t]);

  const openEditor = useCallback(() => {
    if (!post) return;
    router.push({
      pathname: EDITOR_PATH as any,
      params: { id: String(post.id) },
    });
  }, [post, router]);

  const messageApplicant = useCallback(
    (application: JobApplication) => {
      const applicant = application.applicant;
      if (!applicant) return;
      router.push({
        pathname: "/(main)/chatBox",
        params: jobChatParams({
          id: applicant.id,
          name: applicant.name || application.fullName,
          image: applicant.avatar,
        }),
      });
    },
    [router],
  );

  // ── States ──────────────────────────────────────────────────────────

  if (loading && !post) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobManageTitle")} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (gone || !post) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("jobManageTitle")} />
        {gone ? (
          <EmptyState
            icon="work-off"
            title={t("jobPostGoneTitle")}
            subtitle={t("jobPostGoneSubtitle")}
            actionTitle={t("goBack")}
            onActionPress={() => router.back()}
          />
        ) : (
          <EmptyState
            icon="error-outline"
            title={t("jobPostsLoadFailed")}
            subtitle={error ?? undefined}
            actionTitle={t("orderRetry")}
            onActionPress={() => void loadPost("initial")}
          />
        )}
      </View>
    );
  }

  const isRemoved = post.status === "removed";
  const isOpen = post.status === "open";
  const pay = formatJobPay(post, t);
  const count = applicantsTotal ?? post.applicationsCount ?? applicants.length;

  const stat = (icon: IconName, label: string, value: string) => (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(18)}
          color={theme.buttonBack}
        />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );

  const dateValue = isOpen
    ? formatJobDate(post.expiresAt)
    : post.status === "expired"
      ? t("jobStatusExpired")
      : isRemoved
        ? t("jobStatusRemoved")
        : t("jobStatusClosed");

  const header = (
    <View style={styles.header}>
      <View style={styles.card}>
        <View style={styles.summary}>
          <View style={styles.statusRow}>
            <JobStatusBadge status={post.status} />
            <Text style={styles.liveText}>
              {isOpen
                ? t("jobLiveOnProfile")
                : isRemoved
                  ? t("jobHiddenRemoved")
                  : t("jobHiddenFromProfile")}
            </Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {post.title}
          </Text>
          <JobFactChips post={post} />
          {pay ? <Text style={styles.pay}>{pay}</Text> : null}
          {post.compensationNote ? (
            <Text style={styles.payNote}>{post.compensationNote}</Text>
          ) : null}
        </View>
        <View style={styles.stats}>
          {stat("people-outline", t("jobApplicants"), String(count))}
          <View style={styles.statDivider} />
          {stat(
            isOpen ? "event" : "event-busy",
            isOpen ? t("jobCloses") : t("jobStatus"),
            dateValue,
          )}
        </View>
      </View>

      {isRemoved ? (
        <InfoNote
          tone="error"
          icon="report-gmailerrorred"
          title={t("jobRemovedTitle")}
          text={
            post.removedReason
              ? t("jobRemovedBody", { reason: post.removedReason })
              : t("jobRemovedBodyNoReason")
          }
        />
      ) : (
        <View style={styles.actions}>
          <View style={styles.actionRow}>
            <FlowButton
              variant="outline"
              compact
              icon="edit"
              label={t("edit")}
              labelStyle={styles.actionLabel}
              style={styles.actionHalf}
              onPress={openEditor}
              disabled={!!busy}
            />
            {isOpen ? (
              <FlowButton
                variant="outline"
                compact
                icon="lock-outline"
                label={t("jobCloseEarly")}
                labelStyle={styles.actionLabel}
                style={styles.actionHalf}
                onPress={confirmClose}
                loading={busy === "close"}
                disabled={!!busy}
              />
            ) : (
              <FlowButton
                compact
                icon="replay"
                label={t("jobReopen")}
                labelStyle={styles.actionLabel}
                style={styles.actionHalf}
                onPress={reopen}
                loading={busy === "reopen"}
                disabled={!!busy}
              />
            )}
          </View>
          {isOpen ? (
            <FlowButton
              variant="outline"
              compact
              icon="event-repeat"
              label={t("jobExtendDate")}
              labelStyle={styles.actionLabel}
              onPress={() => {
                setDateError(null);
                setDateSheet("extend");
              }}
              disabled={!!busy}
            />
          ) : null}
        </View>
      )}

      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t("jobApplicantsCountTitle", { count })}
      </Text>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {loadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.darkGreen} />
        </View>
      ) : null}
      <FlowButton
        variant="text"
        danger
        compact
        icon="delete-outline"
        label={t("jobDeletePost")}
        onPress={confirmDelete}
        loading={busy === "delete"}
        disabled={!!busy}
      />
      <Text style={styles.deleteHint}>{t("jobDeleteHint")}</Text>
    </View>
  );

  const initialDate =
    dateSheet === "extend" && post.expiresAt && !isJobDatePast(post.expiresAt)
      ? dayjs(post.expiresAt).add(JOB_DEFAULT_DAYS_AHEAD, "day")
      : dayjs().add(JOB_DEFAULT_DAYS_AHEAD, "day");

  return (
    <View style={styles.container}>
      <StackHeader title={t("jobManageTitle")} />
      <FlatList
        data={applicants}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ApplicantCard
            application={item}
            onMessage={item.applicant ? () => messageApplicant(item) : null}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          applicantsLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : (
            <EmptyState
              compact
              icon="person-search"
              title={t("jobNoApplicantsTitle")}
              subtitle={
                isOpen ? t("jobNoApplicantsOpen") : t("jobNoApplicantsClosed")
              }
            />
          )
        }
        ListFooterComponent={footer}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              (justPosted ? 0 : insets.bottom) + moderateHeightScale(24),
          },
        ]}
        onEndReached={() => void loadMoreApplicants()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {justPosted ? (
        <FlowFooter
          primary={{
            label: t("goToHome"),
            icon: "home",
            onPress: resetToDashboardHome,
          }}
        />
      ) : null}

      <ClosingDateSheet
        visible={dateSheet != null}
        title={
          dateSheet === "reopen" ? t("jobReopenTitle") : t("jobExtendTitle")
        }
        subtitle={
          dateSheet === "reopen"
            ? t("jobReopenSubtitle")
            : t("jobExtendSubtitle")
        }
        confirmLabel={
          dateSheet === "reopen" ? t("jobReopen") : t("jobExtendConfirm")
        }
        initialDate={
          initialDate.isAfter(dayjs().add(JOB_MAX_DAYS_AHEAD, "day"), "day")
            ? dayjs().add(JOB_MAX_DAYS_AHEAD, "day")
            : initialDate
        }
        saving={dateSaving}
        error={dateError}
        onConfirm={(date) => void confirmDate(date)}
        onClose={() => setDateSheet(null)}
      />
    </View>
  );
}
