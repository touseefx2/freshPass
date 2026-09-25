import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseIcon } from "@/assets/icons";
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
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  deleteReel,
  getBusinessReelStats,
  listMyReels,
  publishReel,
  REELS_MINE_PER_PAGE,
  unpublishReel,
} from "@/src/services/reelsService";
import {
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import type { MediaLimits, MediaUploadSourceType } from "@/src/types/media";
import type { OwnerReel, ReelPerformanceStats } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  formatReelLimitMessage,
  REEL_LIMIT_FALLBACK,
} from "@/src/utils/reelLimits";
import { getReelUploadGate } from "@/src/utils/reelUploadGate";

const FAB_SIZE = 56;
const FAB_BOTTOM_EXTRA = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    statsCard: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(14),
      marginBottom: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    statsMain: { flex: 1 },
    statsTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(10),
    },
    statsTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    metricsRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    metric: {
      flex: 1,
      alignItems: "flex-start",
    },
    metricDivider: {
      width: 1,
      backgroundColor: theme.lightGreen015,
      marginHorizontal: moderateWidthScale(10),
    },
    metricValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    metricLabel: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tipRow: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(10),
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown015,
    },
    tipText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size16,
    },
    filterTrack: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
      flexDirection: "row",
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(4),
      gap: moderateWidthScale(2),
    },
    filterSeg: {
      flex: 1,
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
    },
    filterSegActive: {
      backgroundColor: theme.white,
    },
    filterSegText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    filterSegTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(120),
      flexGrow: 1,
    },
    fabBackdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 18,
    },
    fabMenu: {
      position: "absolute",
      right: moderateWidthScale(20),
      alignItems: "flex-end",
      gap: moderateHeightScale(10),
      zIndex: 19,
    },
    fabMenuOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(14),
      backgroundColor: theme.darkGreenLight,
      borderRadius: moderateWidthScale(12),
      borderWidth: 3,
      borderTopColor: theme.white,
      borderLeftColor: theme.white,
      borderRightColor: theme.orangeBrown,
      borderBottomColor: theme.orangeBrown,
      minWidth: widthScale(140),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.38,
      shadowRadius: moderateWidthScale(6),
      elevation: 8,
    },
    fabMenuOptionIcon: {
      width: widthScale(24),
      height: widthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    fabMenuOptionLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
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
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(48),
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyTitle: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size16,
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
    },
    retryIconBtn: {
      marginTop: moderateHeightScale(14),
      padding: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
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

export default function MediaLibraryMyReelsTab() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [reels, setReels] = useState<OwnerReel[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<ReelPerformanceStats | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [limits, setLimits] = useState<MediaLimits | null>(null);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);

  const fabBottom =
    Math.max(insets.bottom, moderateHeightScale(12)) +
    moderateHeightScale(FAB_BOTTOM_EXTRA);

  const fetchSummary = useCallback(async () => {
    try {
      const stats = await getBusinessReelStats();
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
        );
        setReels((prev) =>
          append
            ? [
                ...prev,
                ...pageReels.filter((r) => !prev.some((x) => x.id === r.id)),
              ]
            : pageReels,
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

  const ensureCanUploadReel = useCallback((): boolean => {
    const gate = getReelUploadGate(businessStatus);
    if (gate === "stripe") {
      dispatch(setStripeConnectModalVisible(true));
      return false;
    }
    if (gate === "plan") {
      setBuyPlanModalVisible(true);
      return false;
    }
    return true;
  }, [businessStatus, dispatch]);

  const handleViewPlans = useCallback(() => {
    setBuyPlanModalVisible(false);
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const limitMessage = useMemo(
    () => (limits ? formatReelLimitMessage(limits, t) : null),
    [limits, t],
  );

  const maxSeconds = limits?.max_seconds ?? REEL_LIMIT_FALLBACK.max_seconds;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchPage(page + 1, true);
  }, [fetchPage, hasMore, loadingMore, loading, page]);

  const refresh = useCallback(() => {
    fetchSummary();
    fetchPage(1, false);
  }, [fetchPage, fetchSummary]);

  const openEditor = useCallback(
    (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
      seconds: number,
    ) => {
      if (!asset.uri) return;
      router.push({
        pathname: "/(main)/editVideo" as any,
        params: {
          uri: encodeURIComponent(asset.uri),
          mimeType: asset.mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          maxSeconds: String(seconds),
        },
      });
    },
    [router],
  );

  const handleRecord = useCallback(async () => {
    if (!ensureCanUploadReel()) return;
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;

    let seconds = maxSeconds;
    try {
      const data = await getMediaLimits();
      setLimits(data);
      seconds = data.max_seconds;
    } catch {
      // keep last known / default
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: seconds,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });
      if (!result.canceled && result.assets?.[0]) {
        openEditor(result.assets[0], "camera", seconds);
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [ensureCanUploadReel, maxSeconds, openEditor, showBanner, t]);

  const handleUpload = useCallback(async () => {
    if (!ensureCanUploadReel()) return;
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;

    let seconds = maxSeconds;
    try {
      const data = await getMediaLimits();
      setLimits(data);
      seconds = data.max_seconds;
    } catch {
      // keep last known / default
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 1,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });
      if (!result.canceled && result.assets?.[0]) {
        openEditor(result.assets[0], "device", seconds);
      }
    } catch (error) {
      Logger.error("Error selecting video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [ensureCanUploadReel, maxSeconds, openEditor, showBanner, t]);

  const openAddMenu = useCallback(() => {
    if (!fabOpen && !ensureCanUploadReel()) return;
    setFabOpen((open) => !open);
  }, [ensureCanUploadReel, fabOpen]);

  const closeFabMenu = useCallback(() => {
    setFabOpen(false);
  }, []);

  const onRecordPress = useCallback(() => {
    setFabOpen(false);
    void handleRecord();
  }, [handleRecord]);

  const onUploadPress = useCallback(() => {
    setFabOpen(false);
    void handleUpload();
  }, [handleUpload]);

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
      const canEdit = item.status !== "removed";
      const canToggle =
        item.status === "draft" || item.status === "published";
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
        labels.push(t("delete"), t("cancel"));
        keys.push("delete", "cancel");
        const destructiveIndex = keys.indexOf("delete");
        const cancelIndex = keys.indexOf("cancel");
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: labels,
            destructiveButtonIndex: destructiveIndex,
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
      buttons.push({
        text: t("delete"),
        style: "destructive",
        onPress: () => run("delete"),
      });
      buttons.push({ text: t("cancel"), style: "cancel" });
      Alert.alert(t("editReel"), undefined, buttons);
    },
    [confirmDelete, handlePublishToggle, router, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: OwnerReel }) => {
      const thumb =
        resolveApiImageUrl(
          (item.video as any)?.thumbnail_url ?? null,
        ) || null;
      const openPreview = () => {
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
            // Published → owner library viewer (vertical published stack, no report / no category swipe).
            // Drafts & others → single-reel preview.
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

      return (
        <View style={styles.card}>
          <TouchableOpacity
            onPress={openPreview}
            activeOpacity={0.85}
            style={styles.thumbWrap}
          >
            {thumb ? (
              <AppImage uri={thumb} style={styles.thumb} />
            ) : (
              <View
                style={[
                  styles.thumb,
                  { alignItems: "center", justifyContent: "center" },
                ]}
              >
                <MaterialIcons
                  name="videocam"
                  size={moderateWidthScale(24)}
                  color={theme.lightGreen}
                />
              </View>
            )}
            <View style={[styles.statusBadge, statusBadgeStyle]}>
              <Text style={styles.statusBadgeText}>{item.status}</Text>
            </View>
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
            </View>

            <View style={styles.iconActions}>
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
              {item.status !== "removed" && (
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
              )}
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
            </View>
          </View>
        </View>
      );
    },
    [
      confirmDelete,
      openReelMoreMenu,
      router,
      showBanner,
      styles,
      t,
      theme,
    ],
  );

  return (
    <View style={styles.root}>
      <TouchableOpacity
        style={styles.statsCard}
        activeOpacity={0.85}
        onPress={() => router.push("/(main)/reelStats" as any)}
      >
        <View style={styles.statsMain}>
          <View style={styles.statsTitleRow}>
            <MaterialIcons
              name="insights"
              size={moderateWidthScale(16)}
              color={theme.darkGreen}
            />
            <Text style={styles.statsTitle}>{t("reelPerformance")}</Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {summary?.reels?.published ?? "–"}
              </Text>
              <Text style={styles.metricLabel}>{t("published")}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {summary?.reels?.total ?? "–"}
              </Text>
              <Text style={styles.metricLabel}>{t("all")}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {summary?.funnel.view.all_time ?? "–"}
              </Text>
              <Text style={styles.metricLabel}>{t("views")}</Text>
            </View>
          </View>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={moderateWidthScale(22)}
          color={theme.lightGreen}
        />
      </TouchableOpacity>

      {limitMessage ? (
        <View style={styles.tipRow}>
          <MaterialIcons
            name="info-outline"
            size={moderateWidthScale(16)}
            color={theme.selectCard}
          />
          <Text style={styles.tipText}>{limitMessage}</Text>
        </View>
      ) : null}

      <View style={styles.filterTrack}>
        {filters.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterSeg, filter === key && styles.filterSegActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterSegText,
                filter === key && styles.filterSegTextActive,
              ]}
              numberOfLines={1}
            >
              {t(
                key === "all"
                  ? "all"
                  : key === "draft"
                    ? "draft"
                    : key === "published"
                      ? "published"
                      : "removed",
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && reels.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons
                name="movie-filter"
                size={moderateWidthScale(40)}
                color={theme.lightGreen}
              />
              <Text style={styles.emptyTitle}>{t("noReelsYet")}</Text>
              <Text style={styles.emptySubtitle}>{t("noReelsSubtitle")}</Text>
              <TouchableOpacity
                style={styles.retryIconBtn}
                onPress={refresh}
                hitSlop={12}
                accessibilityLabel={t("refresh")}
              >
                <MaterialIcons
                  name="refresh"
                  size={moderateWidthScale(28)}
                  color={theme.darkGreen}
                />
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

      {fabOpen ? (
        <TouchableWithoutFeedback onPress={closeFabMenu}>
          <View style={styles.fabBackdrop} />
        </TouchableWithoutFeedback>
      ) : null}

      {fabOpen ? (
        <View
          style={[
            styles.fabMenu,
            {
              bottom:
                fabBottom +
                heightScale(FAB_SIZE) +
                moderateHeightScale(12),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fabMenuOption}
            onPress={onRecordPress}
            activeOpacity={0.9}
          >
            <View style={styles.fabMenuOptionIcon}>
              <MaterialIcons
                name="videocam"
                size={moderateWidthScale(22)}
                color={theme.white}
              />
            </View>
            <Text style={styles.fabMenuOptionLabel}>{t("recordVideo")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuOption}
            onPress={onUploadPress}
            activeOpacity={0.9}
          >
            <View style={styles.fabMenuOptionIcon}>
              <MaterialIcons
                name="file-upload"
                size={moderateWidthScale(22)}
                color={theme.white}
              />
            </View>
            <Text style={styles.fabMenuOptionLabel}>{t("uploadVideo")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={openAddMenu}
        activeOpacity={0.9}
        accessibilityLabel={t("uploadVideo")}
      >
        <View style={styles.fabInner}>
          {fabOpen ? (
            <CloseIcon width={22} height={22} color={theme.white} opacity={1} />
          ) : (
            <MaterialIcons
              name="add"
              size={moderateWidthScale(30)}
              color={theme.buttonText}
            />
          )}
        </View>
      </TouchableOpacity>

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />
    </View>
  );
}
