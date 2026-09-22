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
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import Button from "@/src/components/button";
import MediaLibraryVideoTile from "@/src/components/mediaLibraryVideoTile";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import {
  deleteVideo,
  getMediaLimits,
  getVideo,
  listVideos,
  MEDIA_VIDEOS_PER_PAGE,
} from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import Logger from "@/src/services/logger";
import {
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type {
  MediaLimits,
  MediaUploadSourceType,
  MediaVideo,
} from "@/src/types/media";
import {
  formatReelLimitMessage,
  REEL_LIMIT_FALLBACK,
} from "@/src/utils/reelLimits";
import { getReelUploadGate } from "@/src/utils/reelUploadGate";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PADDING = moderateWidthScale(20);
const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;
const POLL_INTERVAL_MS = 4000;

const calculateItemWidth = () => {
  const availableWidth = SCREEN_WIDTH - PADDING * 2;
  const totalGaps = GAP * (NUM_COLUMNS - 1);
  return (availableWidth - totalGaps) / NUM_COLUMNS;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    actionsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      paddingHorizontal: PADDING,
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(12),
    },
    actionButton: {
      flex: 1,
    },
    limitCard: {
      marginHorizontal: PADDING,
      marginBottom: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    limitText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    listContent: {
      paddingHorizontal: PADDING,
      paddingBottom: moderateHeightScale(32),
      flexGrow: 1,
    },
    columnWrapper: {
      gap: GAP,
      marginBottom: GAP,
    },
    emptyWrap: {
      flex: 1,
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
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
    centerLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(48),
    },
  });

export default function MediaLibraryVideosTab() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );

  const itemWidth = useMemo(() => calculateItemWidth(), []);

  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [limits, setLimits] = useState<MediaLimits | null>(null);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);

  const pollTimersRef = useRef<Map<number, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const videosRef = useRef(videos);
  videosRef.current = videos;

  const stopPolling = useCallback((id: number) => {
    const timer = pollTimersRef.current.get(id);
    if (timer) {
      clearInterval(timer);
      pollTimersRef.current.delete(id);
    }
  }, []);

  const stopAllPolling = useCallback(() => {
    pollTimersRef.current.forEach((timer) => clearInterval(timer));
    pollTimersRef.current.clear();
  }, []);

  const upsertVideo = useCallback((updated: MediaVideo) => {
    setVideos((prev) => {
      const index = prev.findIndex((v) => v.id === updated.id);
      if (index === -1) return [updated, ...prev];
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const startPolling = useCallback(
    (id: number) => {
      if (pollTimersRef.current.has(id)) return;

      const timer = setInterval(async () => {
        try {
          const latest = await getVideo(id);
          upsertVideo(latest);
          if (latest.status === "ready" || latest.status === "failed") {
            stopPolling(id);
          }
        } catch (error) {
          Logger.error(`Failed to poll media ${id}:`, error);
        }
      }, POLL_INTERVAL_MS);

      pollTimersRef.current.set(id, timer);
    },
    [stopPolling, upsertVideo],
  );

  useEffect(() => {
    videos.forEach((video) => {
      if (video.status === "processing") {
        startPolling(video.id);
      } else {
        stopPolling(video.id);
      }
    });
  }, [videos, startPolling, stopPolling]);

  useEffect(() => {
    return () => stopAllPolling();
  }, [stopAllPolling]);

  const fetchPage = useCallback(
    async (pageToLoad: number, append: boolean, silent = false) => {
      if (append) setLoadingMore(true);
      else if (!silent) setLoading(true);

      try {
        const { videos: pageVideos, meta } = await listVideos(
          pageToLoad,
          MEDIA_VIDEOS_PER_PAGE,
        );
        setVideos((prev) =>
          append
            ? [
                ...prev,
                ...pageVideos.filter(
                  (v) => !prev.some((existing) => existing.id === v.id),
                ),
              ]
            : pageVideos,
        );
        setPage(meta.current_page);
        setHasMore(Boolean(meta.has_more));
      } catch (error: any) {
        Logger.error("Failed to list media videos:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadVideos"),
          "error",
          3000,
        );
        if (!append) setVideos([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showBanner, t],
  );

  useFocusEffect(
    useCallback(() => {
      const hasCache = videosRef.current.length > 0;
      fetchPage(1, false, hasCache);
      void getMediaLimits()
        .then(setLimits)
        .catch((error) => {
          Logger.error("Failed to load media limits:", error);
        });
    }, [fetchPage]),
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchPage(page + 1, true);
  }, [fetchPage, hasMore, loadingMore, loading, page]);

  const maxSeconds = limits?.max_seconds ?? REEL_LIMIT_FALLBACK.max_seconds;
  const limitMessage = useMemo(
    () => (limits ? formatReelLimitMessage(limits, t) : null),
    [limits, t],
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

  const afterPick = useCallback(
    (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
      seconds: number,
    ) => {
      openEditor(asset, sourceType, seconds);
    },
    [openEditor],
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
        afterPick(result.assets[0], "camera", seconds);
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [afterPick, ensureCanUploadReel, maxSeconds, showBanner, t]);

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
        afterPick(result.assets[0], "device", seconds);
      }
    } catch (error) {
      Logger.error("Error selecting video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [afterPick, ensureCanUploadReel, maxSeconds, showBanner, t]);

  const confirmDelete = useCallback(
    (video: MediaVideo) => {
      Alert.alert(t("deleteVideo"), t("deleteVideoConfirm"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              stopPolling(video.id);
              await deleteVideo(video.id);
              setVideos((prev) => prev.filter((v) => v.id !== video.id));
              showBanner(t("success"), t("videoDeleted"), "success", 2500);
            } catch (error: any) {
              Logger.error("Failed to delete media video:", error);
              const status = error?.response?.status || error?.status;
              const idsError =
                error?.response?.data?.errors?.ids?.[0] ||
                error?.response?.data?.message ||
                error?.message;
              if (status === 422 || video.reel_id) {
                Alert.alert(
                  t("cannotDeleteVideo"),
                  idsError || t("videoUsedByReel"),
                  [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("openMyReels"),
                      onPress: () => {
                        router.push({
                          pathname: "/(main)/aiTools/toolList",
                          params: { tab: "myReels" },
                        });
                      },
                    },
                  ],
                );
                return;
              }
              if (status === 404) {
                setVideos((prev) => prev.filter((v) => v.id !== video.id));
                return;
              }
              showBanner(
                t("error"),
                idsError || t("failedToDeleteVideo"),
                "error",
                3000,
              );
            }
          },
        },
      ]);
    },
    [router, showBanner, stopPolling, t],
  );

  const openPublish = useCallback(
    (video: MediaVideo) => {
      if (video.status !== "ready") {
        showBanner(t("error"), t("videoNotReadyToPublish"), "warning", 2500);
        return;
      }
      if (video.reel_id) {
        router.push({
          pathname: "/(main)/publishReel" as any,
          params: { reelId: String(video.reel_id) },
        });
        return;
      }
      router.push({
        pathname: "/(main)/publishReel" as any,
        params: { mediaAssetId: String(video.id) },
      });
    },
    [router, showBanner, t],
  );

  const handleTileMenu = useCallback(
    (video: MediaVideo) => {
      const buttons: {
        text: string;
        style?: "cancel" | "destructive" | "default";
        onPress?: () => void;
      }[] = [];
      if (video.status === "ready") {
        buttons.push({
          text: video.reel_id ? t("editReel") : t("publishReel"),
          onPress: () => openPublish(video),
        });
      }
      buttons.push({
        text: t("delete"),
        style: "destructive",
        onPress: () => confirmDelete(video),
      });
      buttons.push({ text: t("cancel"), style: "cancel" });
      Alert.alert(t("videoOptions"), undefined, buttons);
    },
    [confirmDelete, openPublish, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: MediaVideo }) => (
      <MediaLibraryVideoTile
        video={item}
        width={itemWidth}
        onLongPress={handleTileMenu}
        onDeletePress={confirmDelete}
        onPublishPress={openPublish}
      />
    ),
    [confirmDelete, handleTileMenu, itemWidth, openPublish],
  );

  return (
    <View style={styles.root}>
      {limitMessage ? (
        <View style={styles.limitCard}>
          <Text style={styles.limitText}>{limitMessage}</Text>
        </View>
      ) : null}
      <View style={styles.actionsRow}>
        <View style={styles.actionButton}>
          <Button
            title={t("recordVideo")}
            onPress={handleRecord}
            leftIcon={
              <MaterialIcons
                name="videocam"
                size={moderateWidthScale(18)}
                color={theme.buttonText}
              />
            }
          />
        </View>
        <View style={styles.actionButton}>
          <Button
            title={t("uploadVideo")}
            onPress={handleUpload}
            leftIcon={
              <MaterialIcons
                name="upload-file"
                size={moderateWidthScale(18)}
                color={theme.buttonText}
              />
            }
          />
        </View>
      </View>

      {loading && videos.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          renderItem={renderItem}
          columnWrapperStyle={videos.length > 0 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons
                name="video-library"
                size={moderateWidthScale(40)}
                color={theme.lightGreen}
              />
              <Text style={styles.emptyTitle}>{t("noVideosYet")}</Text>
              <Text style={styles.emptySubtitle}>{t("noVideosSubtitle")}</Text>
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

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />
    </View>
  );
}
