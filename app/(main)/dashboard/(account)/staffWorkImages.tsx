import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { staffEndpoints } from "@/src/services/endpoints";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import { GalleryIcon, CameraIcon } from "@/assets/icons";
import { Skeleton } from "@/src/components/skeletons";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { prepareImagesForUpload } from "@/src/utils/prepareImageForUpload";
import { resolveApiImageUrl } from "@/src/utils/media";
import type {
  DeleteStaffWorkImagesResult,
  StaffWorkImage,
  StaffWorkImagePage,
} from "@/src/types/staffWorkImages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = moderateWidthScale(20);
const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;
const PER_PAGE = 15;

const calculateItemWidth = () => {
  const availableWidth = SCREEN_WIDTH - PADDING * 2;
  const totalGaps = GAP * (NUM_COLUMNS - 1);
  return (availableWidth - totalGaps) / NUM_COLUMNS;
};

type GridItem =
  | { type: "gallery"; id: string }
  | { type: "camera"; id: string }
  | {
      type: "photo";
      id: string;
      uri: string;
      isExisting: boolean;
      backendId?: number;
    };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: PADDING,
    },
    listContent: {
      paddingVertical: moderateHeightScale(24),
      flexGrow: 1,
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(10),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    columnWrapper: {
      justifyContent: "flex-start",
    },
    gridItem: {
      aspectRatio: 1,
      overflow: "hidden",
      marginRight: GAP,
      marginBottom: GAP,
    },
    actionButton: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.galleryPhotoBack,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
    },
    actionButtonContent: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
    },
    actionButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    photoContainer: {
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    photo: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(8),
    },
    deleteButton: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    emptyState: {
      marginTop: moderateHeightScale(40),
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textAlign: "center",
    },
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
  });

export default function StaffWorkImagesManageScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<StaffWorkImage[]>([]);
  const [newPhotos, setNewPhotos] = useState<
    Array<{ id: string; uri: string }>
  >([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);

  const removedIdsRef = useRef<number[]>([]);
  removedIdsRef.current = removedPhotoIds;

  const itemWidth = useMemo(() => calculateItemWidth(), []);

  const generateLocalId = () =>
    `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const fetchWorkImagesPage = useCallback(
    async (id: number, pageToLoad: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        // GET /api/staff/{staffId}/images?page=&per_page=15
        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: StaffWorkImagePage;
        }>(staffEndpoints.images(id, pageToLoad, PER_PAGE));

        const pageData = response.data;
        const nextItems = (pageData?.data ?? []).filter(
          (photo) => !removedIdsRef.current.includes(photo.id),
        );

        setExistingPhotos((prev) => {
          if (!append) {
            return nextItems;
          }
          const seen = new Set(prev.map((p) => p.id));
          const unique = nextItems.filter((p) => !seen.has(p.id));
          return [...prev, ...unique];
        });
        setPage(pageData?.meta?.current_page ?? pageToLoad);
        setHasMore(pageData?.meta?.has_more === true);
      } catch (error: any) {
        Logger.error("Failed to fetch staff work images:", error);
        if (!append) {
          showBanner(
            t("error"),
            error?.message || t("failedToLoadWorkImages"),
            "error",
            3000,
          );
          setExistingPhotos([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showBanner, t],
  );

  const resolveStaffAndLoad = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: { id?: number; staff?: { id?: number } } | null;
      }>(staffEndpoints.profile);

      const resolvedId =
        response.data?.id ?? response.data?.staff?.id ?? null;

      if (!resolvedId) {
        showBanner(t("error"), t("failedToLoadWorkImages"), "error", 3000);
        setExistingPhotos([]);
        setLoading(false);
        return;
      }

      setStaffId(resolvedId);
      await fetchWorkImagesPage(resolvedId, 1, false);
    } catch (error: any) {
      Logger.error("Failed to resolve staff profile for work images:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToLoadWorkImages"),
        "error",
        3000,
      );
      setExistingPhotos([]);
      setLoading(false);
    }
  }, [fetchWorkImagesPage, showBanner, t]);

  useEffect(() => {
    resolveStaffAndLoad();
  }, [resolveStaffAndLoad]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || staffId == null) {
      return;
    }
    fetchWorkImagesPage(staffId, page + 1, true);
  }, [
    fetchWorkImagesPage,
    hasMore,
    loading,
    loadingMore,
    page,
    staffId,
  ]);

  const handleSelectFromGallery = useCallback(async () => {
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });

      if (!result.canceled && result.assets) {
        const added: Array<{ id: string; uri: string }> = [];
        result.assets.forEach((asset) => {
          if (asset.uri) {
            added.push({
              id: generateLocalId(),
              uri: asset.uri,
            });
          }
        });
        if (added.length > 0) {
          setNewPhotos((prev) => [...prev, ...added]);
        }
      }
    } catch (error) {
      Logger.error("Error selecting image from gallery:", error);
      Alert.alert(t("error"), t("failedToSelectImageFromGallery"));
    }
  }, [t]);

  const handleTakePhoto = useCallback(async () => {
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setNewPhotos((prev) => [
          ...prev,
          {
            id: generateLocalId(),
            uri: result.assets[0].uri,
          },
        ]);
      }
    } catch (error) {
      Logger.error("Error taking photo:", error);
      Alert.alert(t("error"), t("failedToTakePhoto"));
    }
  }, [t]);

  const handleDeletePhoto = useCallback((item: GridItem) => {
    if (item.type !== "photo") {
      return;
    }

    if (item.isExisting && item.backendId != null) {
      setExistingPhotos((prev) => prev.filter((p) => p.id !== item.backendId));
      setRemovedPhotoIds((prev) =>
        prev.includes(item.backendId as number)
          ? prev
          : [...prev, item.backendId as number],
      );
    } else {
      setNewPhotos((prev) => prev.filter((p) => p.id !== item.id));
    }
  }, []);

  const gridData: GridItem[] = useMemo(() => {
    return [
      { type: "gallery", id: "gallery" },
      { type: "camera", id: "camera" },
      ...existingPhotos.map((photo) => ({
        type: "photo" as const,
        id: `existing_${photo.id}`,
        uri: photo.url || resolveApiImageUrl(photo.url) || "",
        isExisting: true,
        backendId: photo.id,
      })),
      ...newPhotos.map((photo) => ({
        type: "photo" as const,
        id: photo.id,
        uri: photo.uri,
        isExisting: false,
      })),
    ];
  }, [existingPhotos, newPhotos]);

  const renderItem = useCallback(
    ({ item, index }: { item: GridItem; index: number }) => {
      const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
      const itemStyle = [
        styles.gridItem,
        { width: itemWidth },
        isLastInRow && { marginRight: 0 },
      ];

      if (item.type === "gallery") {
        return (
          <TouchableOpacity
            style={itemStyle}
            onPress={handleSelectFromGallery}
            activeOpacity={0.7}
          >
            <View style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <GalleryIcon color={theme.darkGreen} />
                <Text style={styles.actionButtonText}>
                  {t("fromGalleryLower")}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }

      if (item.type === "camera") {
        return (
          <TouchableOpacity
            style={itemStyle}
            onPress={handleTakePhoto}
            activeOpacity={0.7}
          >
            <View style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <CameraIcon color={theme.darkGreen} />
                <Text style={styles.actionButtonText}>
                  {t("fromCameraLower")}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <View style={itemStyle}>
          <View style={styles.photoContainer}>
            <Image source={{ uri: item.uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePhoto(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="delete-outline"
                size={moderateWidthScale(20)}
                color={theme.red}
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      itemWidth,
      theme,
      styles,
      t,
      handleSelectFromGallery,
      handleTakePhoto,
      handleDeletePhoto,
    ],
  );

  const handleUpdate = async () => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      if (newPhotos.length > 0) {
        const formData = new FormData();
        const preparedPhotos = await prepareImagesForUpload(
          newPhotos.map((photo) => photo.uri),
          "work_image",
        );

        if (preparedPhotos.length === 0) {
          showBanner(
            t("error"),
            t("failedToPrepareWorkImages"),
            "error",
            3000,
          );
          return;
        }

        preparedPhotos.forEach((file) => {
          formData.append("images[]", file as any);
        });

        const response = await ApiService.post<{
          success: boolean;
          message: string;
          data?: StaffWorkImage[];
        }>(staffEndpoints.workImages, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (!response.success) {
          showBanner(
            t("error"),
            response.message || t("failedToUpdateWorkImages"),
            "error",
            3000,
          );
          return;
        }
      }

      if (removedPhotoIds.length > 0) {
        try {
          const deleteResponse = await ApiService.delete<{
            success: boolean;
            message: string;
            data?: DeleteStaffWorkImagesResult;
          }>(staffEndpoints.workImages, {
            data: { imageIds: removedPhotoIds },
          });

          if (
            deleteResponse.data?.not_found &&
            deleteResponse.data.not_found.length > 0
          ) {
            showBanner(
              t("success"),
              t("someWorkImagesAlreadyRemoved"),
              "success",
              3000,
            );
          }
        } catch (deleteError: any) {
          if (
            deleteError?.status !== 404 &&
            deleteError?.response?.status !== 404
          ) {
            throw deleteError;
          }
        }
      }

      showBanner(
        t("success"),
        t("workImagesUpdatedSuccessfully"),
        "success",
        3000,
      );
      router.back();
    } catch (error: any) {
      Logger.error("Failed to update staff work images:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToUpdateWorkImages"),
        "error",
        3000,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const hasAnyPhoto = existingPhotos.length > 0 || newPhotos.length > 0;
  const hasChanges = newPhotos.length > 0 || removedPhotoIds.length > 0;

  const listHeader = useMemo(
    () => (
      <View style={styles.titleSec}>
        <Text style={styles.title}>{t("buildTrustWithPhotos")}</Text>
        <Text style={styles.subtitle}>{t("clientsBookSalonBarbersFirst")}</Text>
      </View>
    ),
    [styles, t],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("managePortfolioPhotos")} />
      <View style={styles.content}>
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
        ) : (
          <FlatList
            data={gridData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={listHeader}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              <>
                {!hasAnyPhoto ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {t("youDidntSelectAnythingYet")}
                    </Text>
                  </View>
                ) : null}
                {loadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={theme.darkGreen} />
                  </View>
                ) : null}
              </>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          <Button
            title={t("updatePhotos")}
            onPress={handleUpdate}
            disabled={isUpdating || !hasChanges}
            loading={isUpdating}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
