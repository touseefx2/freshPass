import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import TextWithEmoji from "@/src/components/textWithEmoji";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { getMediaLimits } from "@/src/services/mediaLibraryService";
import {
  deleteReel,
  getBusinessReelStats,
  getGenerationStatus,
  listMyReels,
  publishReel,
  REELS_MINE_PER_PAGE,
  unpublishReel,
} from "@/src/services/reelsService";
import {
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import type { MediaLimits } from "@/src/types/media";
import type { OwnerReel, ReelPerformanceStats } from "@/src/types/reels";
import { canChangeReel } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  formatReelLimitMessage,
} from "@/src/utils/reelLimits";
import { getReelUploadGate } from "@/src/utils/reelUploadGate";

const FAB_SIZE = 56;
const FAB_BOTTOM_EXTRA = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    statsCard: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(16),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    metricsRow: {
      flexDirection: "row",
      paddingVertical: moderateHeightScale(16),
    },
    metric: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(16),
    },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    metricLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    metricLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    metricValue: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    statsFooter: {
      minHeight: moderateHeightScale(48),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(16),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    statsFooterIcon: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.apptMintBg,
      alignItems: "center",
      justifyContent: "center",
    },
    statsFooterText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionHeader: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(24),
    },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tipRow: {
      marginTop: moderateHeightScale(4),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    tipText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    viewOnlyChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
    },
    viewOnlyChipText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    filterTrack: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(14),
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    filterSeg: {
      flex: 1,
      minHeight: moderateHeightScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    filterSegText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    filterSegTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    filterIndicator: {
      position: "absolute",
      bottom: -1,
      left: "18%",
      right: "18%",
      height: 3,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      backgroundColor: theme.buttonBack,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(120),
      flexGrow: 1,
    },
    fab: {
      position: "absolute",
      right: moderateWidthScale(20),
      width: widthScale(FAB_SIZE),
      height: heightScale(FAB_SIZE),
      borderRadius: moderateWidthScale(FAB_SIZE / 2),
      backgroundColor: theme.darkGreenLight,
      padding: moderateWidthScale(2),
      borderWidth: 3,
      borderTopColor: theme.white,
      borderLeftColor: theme.white,
      borderRightColor: theme.orangeBrown,
      borderBottomColor: theme.orangeBrown,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
      zIndex: 20,
    },
    fabInner: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(FAB_SIZE / 2),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.white,
    },
    thumbWrap: {
      position: "relative",
    },
    thumb: {
      width: widthScale(78),
      height: widthScale(104),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.grey15,
    },
    statusBadge: {
      position: "absolute",
      left: moderateWidthScale(6),
      bottom: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.darkGreen,
    },
    statusBadgeDraft: {
      backgroundColor: theme.selectCard,
    },
    statusBadgeRemoved: {
      backgroundColor: theme.lightGreen4,
    },
    genOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen4,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(4),
    },
    genOverlayFailed: {
      backgroundColor: theme.selectCard,
    },
    genOverlayText: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size9,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
    },
    cardHighlight: {
      borderColor: theme.buttonBack,
      borderWidth: 2,
    },
    statusBadgeText: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    cardBody: {
      flex: 1,
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(2),
    },
    caption: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    categoryMeta: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    iconActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(10),
    },
    iconBtn: {
      width: widthScale(34),
      height: widthScale(34),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnDanger: {
      backgroundColor: theme.orangeBrown015,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyArt: {
      width: moderateWidthScale(170),
      height: moderateWidthScale(112),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyReel: {
      position: "absolute",
      width: moderateWidthScale(58),
      height: moderateWidthScale(96),
      borderRadius: moderateWidthScale(12),
      borderWidth: 2,
      borderColor: theme.white,
    },
    emptyReelCenter: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(106),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.darkGreen,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    emptyPlay: {
      width: moderateWidthScale(30),
      height: moderateWidthScale(30),
      borderRadius: moderateWidthScale(15),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      marginTop: moderateHeightScale(20),
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySubtitle: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size19,
      maxWidth: moderateWidthScale(270),
    },
    emptyCta: {
      marginTop: moderateHeightScale(20),
      minHeight: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(20),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    emptyCtaText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    centerLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(48),
    },
    footerLoader: { paddingVertical: moderateHeightScale(16) },
  });

type StatusFilter = "all" | "draft" | "published" | "removed";

const GEN_POLL_MS = 8000;

type MediaLibraryMyReelsTabProps = {
  highlightReelId?: string;
};

export default function MediaLibraryMyReelsTab({
  highlightReelId,
}: MediaLibraryMyReelsTabProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );
  const listRef = useRef<FlatList<OwnerReel>>(null);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [reels, setReels] = useState<OwnerReel[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<ReelPerformanceStats | null>(null);
  const [limits, setLimits] = useState<MediaLimits | null>(null);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);

  const highlightedId = highlightReelId ? Number(highlightReelId) : null;

  const fabBottom =
    Math.max(insets.bottom, moderateHeightScale(12)) +
    moderateHeightScale(FAB_BOTTOM_EXTRA);

  // Everyone (owner and staff) sees only their own reels here — card matches the list
  const fetchSummary = useCallback(async () => {
    try {
      const stats = await getBusinessReelStats(true);
      setSummary(stats);
    } catch (error) {
      Logger.error("Failed to load business reel stats:", error);
    }
  }, []);

  const fetchPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const status = filter === "all" ? undefined : filter;
        const { reels: pageReels, meta } = await listMyReels(
          pageToLoad,
          status,
          REELS_MINE_PER_PAGE,
          true,
        );
        // Shotstack drafts / in-progress live on AI Requests → Reels, not Media Library
        const libraryReels = pageReels.filter((r) => {
          const gs = r.generation_status;
          if (gs == null) return true;
          if (gs === "pending" || gs === "rendering" || gs === "failed") {
            return false;
          }
          // ready draft → AI Requests until published
          if (gs === "ready" && r.status !== "published") return false;
          return true;
        });
        setReels((prev) =>
          append
            ? [
                ...prev,
                ...libraryReels.filter((r) => !prev.some((x) => x.id === r.id)),
              ]
            : libraryReels,
        );
        setPage(meta.current_page ?? pageToLoad);
        setHasMore(Boolean(meta.has_more));
      } catch (error: any) {
        Logger.error("Failed to list my reels:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadReels"),
          "error",
          3000,
        );
        if (!append) setReels([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, showBanner, t],
  );

  const fetchLimits = useCallback(async () => {
    try {
      const data = await getMediaLimits();
      setLimits(data);
    } catch (error) {
      Logger.error("Failed to load media limits:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
      fetchPage(1, false);
      void fetchLimits();
    }, [fetchPage, fetchSummary, fetchLimits]),
  );

  // Auto-refresh Shotstack reels that are still generating
  useEffect(() => {
    const inProgress = reels.filter(
      (r) =>
        r.generation_status === "pending" ||
        r.generation_status === "rendering",
    );
    if (inProgress.length === 0) return;

    let cancelled = false;
    const tick = async () => {
      let needsRefresh = false;
      for (const reel of inProgress) {
        try {
          const status = await getGenerationStatus(reel.id);
          if (
            status.generation_status === "ready" ||
            status.generation_status === "failed"
          ) {
            needsRefresh = true;
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
          }
        } catch (error) {
          Logger.error(`Generation poll failed for reel ${reel.id}:`, error);
        }
      }
      if (!cancelled && needsRefresh) {
        void fetchPage(1, false);
        void fetchSummary();
      }
    };

    const id = setInterval(() => {
      void tick();
    }, GEN_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchPage, fetchSummary, reels]);

  useEffect(() => {
    if (highlightedId == null || loading || reels.length === 0) return;
    const index = reels.findIndex((r) => r.id === highlightedId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedId, loading, reels]);

  const ensureCanUploadReel = useCallback((): boolean => {
    const gate = getReelUploadGate(businessStatus, userRole);
    if (gate === "stripe") {
      dispatch(setStripeConnectModalVisible(true));
      return false;
    }
    if (gate === "plan") {
      setBuyPlanModalVisible(true);
      return false;
    }
    return true;
  }, [businessStatus, userRole, dispatch]);

  const handleViewPlans = useCallback(() => {
    setBuyPlanModalVisible(false);
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const limitMessage = useMemo(
    () => (limits ? formatReelLimitMessage(limits, t) : null),
    [limits, t],
  );



  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchPage(page + 1, true);
  }, [fetchPage, hasMore, loadingMore, loading, page]);

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([fetchSummary(), fetchPage(1, false)]);
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchPage, fetchSummary]);

  /** + is "Upload a Reel": the step-by-step Reel Studio, from "Add your video". */
  const openReelStudio = useCallback(() => {
    if (!ensureCanUploadReel()) return;
    router.push("/(main)/reelStudio" as any);
  }, [ensureCanUploadReel, router]);


  const confirmDelete = useCallback(
    (reel: OwnerReel) => {
      Alert.alert(t("deleteReel"), t("deleteReelConfirm"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReel(reel.id);
              setReels((prev) => prev.filter((r) => r.id !== reel.id));
              showBanner(t("success"), t("reelDeleted"), "success", 2500);
              fetchSummary();
            } catch (error: any) {
              showBanner(
                t("error"),
                error?.message || t("failedToDeleteReel"),
                "error",
                3000,
              );
            }
          },
        },
      ]);
    },
    [fetchSummary, showBanner, t],
  );

  const handlePublishToggle = useCallback(
    async (reel: OwnerReel) => {
      try {
        const updated =
          reel.status === "published"
            ? await unpublishReel(reel.id)
            : await publishReel(reel.id);
        setReels((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        showBanner(
          t("success"),
          updated.status === "published"
            ? t("reelPublished")
            : t("reelUnpublished"),
          "success",
          2500,
        );
        fetchSummary();
      } catch (error: any) {
        showBanner(
          t("error"),
          error?.message || t("failedToUpdateReel"),
          "error",
          3000,
        );
      }
    },
    [fetchSummary, showBanner, t],
  );

  const filters: StatusFilter[] = ["all", "draft", "published", "removed"];

  const openReelMoreMenu = useCallback(
    (item: OwnerReel, openPreview: () => void) => {
      // Staff can only change reels they made (backend answers 403 otherwise)
      const canChange = canChangeReel(item, userRole);
      const canEdit = canChange && item.status !== "removed";
      const canToggle =
        canChange && (item.status === "draft" || item.status === "published");
      const canStats = item.status === "published";
      const toggleLabel =
        item.status === "published" ? t("unpublish") : t("publish");

      const run = (action: string) => {
        if (action === "view") openPreview();
        else if (action === "edit") {
          router.push({
            pathname: "/(main)/publishReel" as any,
            params: { reelId: String(item.id) },
          });
        } else if (action === "toggle") handlePublishToggle(item);
        else if (action === "stats") {
          router.push({
            pathname: "/(main)/reelStats" as any,
            params: { id: String(item.id) },
          });
        } else if (action === "delete") confirmDelete(item);
      };

      if (Platform.OS === "ios") {
        const labels: string[] = [t("viewReel")];
        const keys: string[] = ["view"];
        if (canEdit) {
          labels.push(t("edit"));
          keys.push("edit");
        }
        if (canToggle) {
          labels.push(toggleLabel);
          keys.push("toggle");
        }
        if (canStats) {
          labels.push(t("viewPerformance"));
          keys.push("stats");
        }
        if (canChange) {
          labels.push(t("delete"));
          keys.push("delete");
        }
        labels.push(t("cancel"));
        keys.push("cancel");
        const destructiveIndex = keys.indexOf("delete");
        const cancelIndex = keys.indexOf("cancel");
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: labels,
            destructiveButtonIndex:
              destructiveIndex >= 0 ? destructiveIndex : undefined,
            cancelButtonIndex: cancelIndex,
          },
          (buttonIndex) => {
            const key = keys[buttonIndex];
            if (key && key !== "cancel") run(key);
          },
        );
        return;
      }

      const buttons: {
        text: string;
        style?: "cancel" | "destructive";
        onPress?: () => void;
      }[] = [{ text: t("viewReel"), onPress: () => run("view") }];
      if (canEdit) {
        buttons.push({ text: t("edit"), onPress: () => run("edit") });
      }
      if (canToggle) {
        buttons.push({ text: toggleLabel, onPress: () => run("toggle") });
      }
      if (canStats) {
        buttons.push({
          text: t("viewPerformance"),
          onPress: () => run("stats"),
        });
      }
      if (canChange) {
        buttons.push({
          text: t("delete"),
          style: "destructive",
          onPress: () => run("delete"),
        });
      }
      buttons.push({ text: t("cancel"), style: "cancel" });
      Alert.alert(t("editReel"), undefined, buttons);
    },
    [confirmDelete, handlePublishToggle, router, t, userRole],
  );

  const renderItem = useCallback(
    ({ item }: { item: OwnerReel }) => {
      const genStatus = item.generation_status ?? null;
      const isGenerating =
        genStatus === "pending" || genStatus === "rendering";
      const isGenFailed = genStatus === "failed";
      const thumb =
        resolveApiImageUrl(
          (item.video as any)?.thumbnail_url ?? null,
        ) || null;

      const openPreview = () => {
        if (isGenerating) {
          router.push({
            pathname: "/(main)/reelGeneration" as any,
            params: { reelId: String(item.id) },
          });
          return;
        }
        if (isGenFailed) {
          Alert.alert(
            t("generationFailed"),
            item.generation_error || t("generationFailedHint"),
            [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("tryAgain"),
                onPress: () =>
                  router.push("/(main)/templateReels" as any),
              },
            ],
          );
          return;
        }
        if (item.status === "removed") {
          showBanner(
            t("draft"),
            t("publishToPreviewReel"),
            "warning",
            3000,
          );
          return;
        }
        router.push({
          pathname: "/(main)/reelsFeed" as any,
          params: {
            first_reel_id: String(item.id),
            mode: item.status === "published" ? "owner" : "preview",
          },
        });
      };

      const statusBadgeStyle =
        item.status === "draft"
          ? styles.statusBadgeDraft
          : item.status === "removed"
            ? styles.statusBadgeRemoved
            : null;

      const isHighlighted =
        highlightedId != null && item.id === highlightedId;

      return (
        <View
          style={[styles.card, isHighlighted ? styles.cardHighlight : null]}
        >
          <TouchableOpacity
            onPress={openPreview}
            activeOpacity={0.85}
            style={styles.thumbWrap}
          >
            {thumb && !isGenerating ? (
              <AppImage uri={thumb} style={styles.thumb} />
            ) : (
              <View
                style={[
                  styles.thumb,
                  { alignItems: "center", justifyContent: "center" },
                ]}
              >
                <MaterialIcons
                  name={isGenFailed ? "error-outline" : "videocam"}
                  size={moderateWidthScale(24)}
                  color={theme.lightGreen}
                />
              </View>
            )}
            {isGenerating ? (
              <View style={styles.genOverlay}>
                <ActivityIndicator color={theme.white} size="small" />
                <Text style={styles.genOverlayText}>
                  {genStatus === "pending"
                    ? t("reelQueued")
                    : t("reelGenerating")}
                </Text>
              </View>
            ) : null}
            {isGenFailed ? (
              <View style={[styles.genOverlay, styles.genOverlayFailed]}>
                <MaterialIcons
                  name="error-outline"
                  size={moderateWidthScale(20)}
                  color={theme.white}
                />
                <Text style={styles.genOverlayText}>{t("generationFailed")}</Text>
              </View>
            ) : null}
            {!isGenerating && !isGenFailed ? (
              <View style={[styles.statusBadge, statusBadgeStyle]}>
                <Text style={styles.statusBadgeText}>{item.status}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.cardBody}>
            <View>
              <TextWithEmoji style={styles.caption} numberOfLines={2}>
                {item.caption || t("untitledReel")}
              </TextWithEmoji>
              {!!item.category?.name && (
                <Text style={styles.categoryMeta} numberOfLines={1}>
                  {item.category.name}
                </Text>
              )}
              {isGenFailed && item.generation_error ? (
                <Text style={styles.categoryMeta} numberOfLines={2}>
                  {item.generation_error}
                </Text>
              ) : null}
            </View>

            <View style={styles.iconActions}>
              {isGenerating ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={openPreview}
                  hitSlop={6}
                  accessibilityLabel={t("generatingReel")}
                >
                  <MaterialIcons
                    name="hourglass-top"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              ) : null}
              {isGenFailed ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={openPreview}
                  hitSlop={6}
                  accessibilityLabel={t("tryAgain")}
                >
                  <MaterialIcons
                    name="refresh"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              ) : null}
              {!isGenerating && !isGenFailed ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={openPreview}
                  hitSlop={6}
                  accessibilityLabel={t("viewReel")}
                >
                  <MaterialIcons
                    name="play-arrow"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              ) : null}
              {item.status !== "removed" &&
              !isGenerating &&
              canChangeReel(item, userRole) ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  hitSlop={6}
                  accessibilityLabel={t("edit")}
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/publishReel" as any,
                      params: { reelId: String(item.id) },
                    })
                  }
                >
                  <MaterialIcons
                    name="edit"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              ) : null}
              {item.status === "published" && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  hitSlop={6}
                  accessibilityLabel={t("viewPerformance")}
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/reelStats" as any,
                      params: { id: String(item.id) },
                    })
                  }
                >
                  <MaterialIcons
                    name="insights"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconBtn}
                hitSlop={6}
                accessibilityLabel={t("editReel")}
                onPress={() => openReelMoreMenu(item, openPreview)}
              >
                <MaterialIcons
                  name="more-horiz"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              {canChangeReel(item, userRole) ? (
                <TouchableOpacity
                  style={[styles.iconBtn, styles.iconBtnDanger]}
                  hitSlop={6}
                  accessibilityLabel={t("delete")}
                  onPress={() => confirmDelete(item)}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={moderateWidthScale(16)}
                    color={theme.selectCard}
                  />
                </TouchableOpacity>
              ) : (
                // Staff viewing a teammate's / the owner's reel
                <View
                  style={styles.viewOnlyChip}
                  accessibilityLabel={t("reelViewOnlyHint")}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={moderateWidthScale(11)}
                    color={theme.lightGreen}
                  />
                  <Text style={styles.viewOnlyChipText}>{t("reelViewOnly")}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    },
    [
      confirmDelete,
      highlightedId,
      openReelMoreMenu,
      router,
      showBanner,
      styles,
      t,
      theme,
      userRole,
    ],
  );

  return (
    <View style={styles.root}>
      <View style={styles.statsCard}>
        <View style={styles.metricsRow}>
          {(
            [
              ["visibility", "views", summary?.funnel?.view?.all_time],
              ["check-circle-outline", "published", summary?.reels?.published],
              ["video-library", "total", summary?.reels?.total],
            ] as const
          ).map(([icon, labelKey, v], i) => (
            <React.Fragment key={labelKey}>
              {i > 0 && <View style={styles.metricDivider} />}
              <View
                style={styles.metric}
                accessible
                accessibilityLabel={`${t(labelKey)}: ${v ?? 0}`}
              >
                <View style={styles.metricLabelRow}>
                  <MaterialIcons
                    name={icon}
                    size={moderateWidthScale(13)}
                    color={theme.lightGreen}
                  />
                  <Text style={styles.metricLabel} numberOfLines={1}>
                    {t(labelKey)}
                  </Text>
                </View>
                <Text style={styles.metricValue}>
                  {v == null ? "–" : v.toLocaleString()}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity
          style={styles.statsFooter}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/(main)/reelStats" as any,
              params: { mine: "1" },
            })
          }
        >
          <View style={styles.statsFooterIcon}>
            <MaterialIcons
              name="insights"
              size={moderateWidthScale(16)}
              color={theme.buttonBack}
            />
          </View>
          <Text style={styles.statsFooterText}>{t("viewPerformance")}</Text>
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(22)}
            color={theme.lightGreen}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("myReels")}</Text>
        {limitMessage ? (
          <View style={styles.tipRow}>
            <MaterialIcons
              name="info-outline"
              size={moderateWidthScale(13)}
              color={theme.lightGreen}
            />
            <Text style={styles.tipText}>{limitMessage}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.filterTrack} accessibilityRole="tablist">
        {filters.map((key) => {
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.filterSeg}
              onPress={() => setFilter(key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.filterSegText, active && styles.filterSegTextActive]}
                numberOfLines={1}
              >
                {t(key)}
              </Text>
              {active && <View style={styles.filterIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && reels.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={reels}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          onScrollToIndexFailed={() => {}}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onPullRefresh}
              tintColor={theme.darkGreen}
              colors={[theme.buttonBack]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyArt} accessibilityElementsHidden>
                <View
                  style={[
                    styles.emptyReel,
                    {
                      backgroundColor: theme.apptPeachBg,
                      transform: [
                        { translateX: -moderateWidthScale(44) },
                        { rotate: "-10deg" },
                      ],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.emptyReel,
                    {
                      backgroundColor: theme.apptMintBg,
                      transform: [
                        { translateX: moderateWidthScale(44) },
                        { rotate: "10deg" },
                      ],
                    },
                  ]}
                />
                <View style={styles.emptyReelCenter}>
                  <View style={styles.emptyPlay}>
                    <MaterialIcons
                      name="play-arrow"
                      size={moderateWidthScale(20)}
                      color={theme.white}
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.emptyTitle}>{t("noReelsYet")}</Text>
              <Text style={styles.emptySubtitle}>{t("noReelsSubtitle")}</Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={openReelStudio}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="add"
                  size={moderateWidthScale(18)}
                  color={theme.buttonText}
                />
                <Text style={styles.emptyCtaText}>{t("createReel")}</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.darkGreen} />
              </View>
            ) : null
          }
        />
      )}

      {/* Empty state has its own Create button — avoid a duplicate + */}
      {(loading || reels.length > 0) && (
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={openReelStudio}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("simpleReelTitle")}
        >
          <View style={styles.fabInner}>
            <MaterialIcons
              name="add"
              size={moderateWidthScale(30)}
              color={theme.buttonText}
            />
          </View>
        </TouchableOpacity>
      )}

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />
    </View>
  );
}
