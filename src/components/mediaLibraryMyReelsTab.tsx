import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseIcon } from "@/assets/icons";
import { useTheme } from "@/src/hooks/hooks";
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
import type { MediaUploadSourceType } from "@/src/types/media";
import type { OwnerReel, ReelPerformanceStats } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

const FAB_SIZE = 56;
const FAB_BOTTOM_EXTRA = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    headerCard: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(8),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    headerMeta: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.background,
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
    chipTextActive: {
      color: theme.buttonText,
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
      padding: moderateWidthScale(10),
      marginBottom: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.background,
    },
    thumb: {
      width: widthScale(72),
      height: widthScale(96),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.grey15,
    },
    cardBody: { flex: 1 },
    caption: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    status: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "capitalize",
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(8),
    },
    actionBtn: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen07,
    },
    actionBtnText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
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

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [reels, setReels] = useState<OwnerReel[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<ReelPerformanceStats | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
      fetchPage(1, false);
    }, [fetchPage, fetchSummary]),
  );

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
    ) => {
      if (!asset.uri) return;
      router.push({
        pathname: "/(main)/editVideo" as any,
        params: {
          uri: encodeURIComponent(asset.uri),
          mimeType: asset.mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
        },
      });
    },
    [router],
  );

  const handleRecord = useCallback(async () => {
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: 180,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });
      if (!result.canceled && result.assets?.[0]) {
        openEditor(result.assets[0], "camera");
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [openEditor, showBanner, t]);

  const handleUpload = useCallback(async () => {
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;

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
        openEditor(result.assets[0], "device");
      }
    } catch (error) {
      Logger.error("Error selecting video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [openEditor, showBanner, t]);

  const openAddMenu = useCallback(() => {
    setFabOpen((open) => !open);
  }, []);

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

  const renderItem = useCallback(
    ({ item }: { item: OwnerReel }) => {
      const thumb =
        resolveApiImageUrl(
          (item.video as any)?.thumbnail_url ?? null,
        ) || null;
      return (
        <View style={styles.card}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { alignItems: "center", justifyContent: "center" }]}>
              <MaterialIcons
                name="videocam"
                size={moderateWidthScale(24)}
                color={theme.lightGreen}
              />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.caption} numberOfLines={2}>
              {item.caption || t("untitledReel")}
            </Text>
            <Text style={styles.status}>{item.status}</Text>
            <View style={styles.actionsRow}>
              {item.status !== "removed" && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/publishReel" as any,
                      params: { reelId: String(item.id) },
                    })
                  }
                >
                  <Text style={styles.actionBtnText}>{t("edit")}</Text>
                </TouchableOpacity>
              )}
              {(item.status === "draft" || item.status === "published") && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handlePublishToggle(item)}
                >
                  <Text style={styles.actionBtnText}>
                    {item.status === "published"
                      ? t("unpublish")
                      : t("publish")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/reelStats" as any,
                    params: { id: String(item.id) },
                  })
                }
              >
                <Text style={styles.actionBtnText}>{t("viewPerformance")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => confirmDelete(item)}
              >
                <Text style={styles.actionBtnText}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [confirmDelete, handlePublishToggle, router, styles, t, theme],
  );

  return (
    <View style={styles.root}>
      <TouchableOpacity
        style={styles.headerCard}
        activeOpacity={0.85}
        onPress={() => router.push("/(main)/reelStats" as any)}
      >
        <Text style={styles.headerTitle}>{t("reelPerformance")}</Text>
        <Text style={styles.headerMeta}>
          {summary
            ? t("reelPerformanceSummary", {
                published: summary.reels?.published ?? 0,
                total: summary.reels?.total ?? 0,
                views: summary.funnel.view.all_time,
              })
            : t("tapToViewPerformance")}
        </Text>
      </TouchableOpacity>

      <View style={styles.chipsRow}>
        {filters.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text
              style={[
                styles.chipText,
                filter === key && styles.chipTextActive,
              ]}
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
    </View>
  );
}
