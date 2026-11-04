import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
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
import PortfolioPhotoGrid from "@/src/components/PortfolioPhotoGrid";
import { Skeleton } from "@/src/components/skeletons";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  isBusinessSubscriptionActive,
} from "@/src/state/slices/userSlice";
import { prepareImagesForUpload } from "@/src/utils/prepareImageForUpload";
import { markGoldDone } from "@/src/utils/goldFrames";
import { resolveApiImageUrl } from "@/src/utils/media";
import type {
  DeleteStaffWorkImagesResult,
  StaffWorkImage,
  StaffWorkImagePage,
} from "@/src/types/staffWorkImages";

const PADDING = moderateWidthScale(20);
const PER_PAGE = 15;
// Order save reads all ids at once (the order call takes up to 500 ids)
const ORDER_PAGE_SIZE = 500;

/** One tile in display order; backendId is set for photos already saved */
type WorkPhoto = { id: string; uri: string; backendId?: number };

const toWorkPhoto = (photo: StaffWorkImage): WorkPhoto => ({
  id: `existing_${photo.id}`,
  uri: photo.url || resolveApiImageUrl(photo.url) || "",
  backendId: photo.id,
});

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
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );
  /** Owners need an active plan (trial counts) to add photos; staff are unchanged */
  const canUploadWork =
    userRole !== "business" || isBusinessSubscriptionActive(businessStatus);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  // Saved photo order as loaded, to tell if the user rearranged anything
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const removedIdsRef = useRef<number[]>([]);
  removedIdsRef.current = removedPhotoIds;

  const generateLocalId = () =>
    `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const fetchWorkImagesPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        // GET /api/staff/work-images?page=&per_page=15 (token decides whose photos)
        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: StaffWorkImagePage;
        }>(staffEndpoints.myWorkImages(pageToLoad, PER_PAGE));

        const pageData = response.data;
        const nextItems = (pageData?.data ?? [])
          .filter((photo) => !removedIdsRef.current.includes(photo.id))
          .map(toWorkPhoto);

        setPhotos((prev) => {
          if (!append) {
            return nextItems;
          }
          const seen = new Set(prev.map((p) => p.id));
          const unique = nextItems.filter((p) => !seen.has(p.id));
          // Older saved photos go after the last saved one, before new picks
          let insertAt = 0;
          prev.forEach((p, index) => {
            if (p.backendId != null) insertAt = index + 1;
          });
          return [
            ...prev.slice(0, insertAt),
            ...unique,
            ...prev.slice(insertAt),
          ];
        });
        setSavedOrder((prev) => {
          const ids = nextItems.map((p) => p.id);
          return append
            ? [...prev, ...ids.filter((id) => !prev.includes(id))]
            : ids;
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
          setPhotos([]);
          setSavedOrder([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showBanner, t],
  );

  useEffect(() => {
    fetchWorkImagesPage(1, false);
  }, [fetchWorkImagesPage]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    fetchWorkImagesPage(page + 1, true);
  }, [fetchWorkImagesPage, hasMore, loading, loadingMore, page]);

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
        const added: WorkPhoto[] = [];
        result.assets.forEach((asset) => {
          if (asset.uri) {
            added.push({
              id: generateLocalId(),
              uri: asset.uri,
            });
          }
        });
        if (added.length > 0) {
          setPhotos((prev) => [...prev, ...added]);
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
        setPhotos((prev) => [
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

  const handleDeletePhoto = useCallback((photo: WorkPhoto) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (photo.backendId != null) {
      const backendId = photo.backendId;
      setRemovedPhotoIds((prev) =>
        prev.includes(backendId) ? prev : [...prev, backendId],
      );
    }
  }, []);

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const distanceFromEnd =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromEnd < layoutMeasurement.height * 0.4) {
        handleLoadMore();
      }
    },
    [handleLoadMore],
  );

  const newPhotos = useMemo(
    () => photos.filter((photo) => photo.backendId == null),
    [photos],
  );

  const handleUpdate = async () => {
    if (isUpdating) {
      return;
    }

    const photosToUpload = canUploadWork ? newPhotos : [];
    if (!hasChanges) {
      return;
    }

    setIsUpdating(true);
    try {
      // Saved id for each new pick, by local id, to build the final order
      const uploadedIds = new Map<string, number>();
      if (photosToUpload.length > 0) {
        const formData = new FormData();
        const preparedPhotos = await prepareImagesForUpload(
          photosToUpload.map((photo) => photo.uri),
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

        // Staff "Upload your work" gold frame
        markGoldDone("uploadWork");

        // Only trust the mapping when every pick came back, in upload order
        const created = response.data ?? [];
        if (
          preparedPhotos.length === photosToUpload.length &&
          created.length === photosToUpload.length
        ) {
          photosToUpload.forEach((photo, index) =>
            uploadedIds.set(photo.id, created[index].id),
          );
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

      // Uploads land after the saved photos on their own, so the order only
      // needs saving after a drag/star, or when a new photo was put earlier
      const newBeforeSaved = photos.some(
        (photo, index) =>
          photo.backendId == null &&
          photos.slice(index + 1).some((p) => p.backendId != null),
      );
      if (isReordered || newBeforeSaved) {
        // Not fatal: the photos themselves are already saved
        try {
          const orderedIds = photos
            .map((photo) => photo.backendId ?? uploadedIds.get(photo.id))
            .filter((id): id is number => id != null);
          // Send the full list: photos on pages not loaded yet keep their
          // order after the ones on screen. One big page from the start
          // (the uploads/deletes above shifted the page boundaries); keeps
          // paging only if the server caps per_page lower.
          let nextPage = 1;
          let more = hasMore;
          while (more) {
            const response = await ApiService.get<{
              success: boolean;
              message: string;
              data: StaffWorkImagePage;
            }>(staffEndpoints.myWorkImages(nextPage, ORDER_PAGE_SIZE));
            (response.data?.data ?? []).forEach((photo) => {
              if (
                !orderedIds.includes(photo.id) &&
                !removedPhotoIds.includes(photo.id)
              ) {
                orderedIds.push(photo.id);
              }
            });
            more =
              response.data?.meta?.has_more === true &&
              nextPage < (response.data?.meta?.last_page ?? nextPage);
            nextPage += 1;
          }
          if (orderedIds.length > 1) {
            await ApiService.put(staffEndpoints.workImagesOrder, {
              imageIds: orderedIds,
            });
          }
        } catch (orderError) {
          Logger.error("Failed to save work images order:", orderError);
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
      const status = error?.status ?? error?.response?.status;
      const isPlanBlocked =
        status === 403 &&
        userRole === "business" &&
        photosToUpload.length > 0;
      showBanner(
        t("error"),
        isPlanBlocked
          ? t("ownerWorkImagesPlanRequired")
          : error?.message || t("failedToUpdateWorkImages"),
        "error",
        3000,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const hasAnyPhoto = photos.length > 0;
  const keptOrder = photos
    .filter((photo) => photo.backendId != null)
    .map((photo) => photo.id);
  const isReordered =
    keptOrder.join(",") !==
    savedOrder.filter((id) => keptOrder.includes(id)).join(",");
  const hasChanges =
    (canUploadWork && newPhotos.length > 0) ||
    removedPhotoIds.length > 0 ||
    isReordered;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("managePortfolioPhotos")} />
      <View style={styles.content}>
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
        ) : (
          <Animated.ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.listContent}
            onScroll={handleScroll}
            scrollEventThrottle={200}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleSec}>
              <Text style={styles.title}>{t("buildTrustWithPhotos")}</Text>
              <Text style={styles.subtitle}>
                {t("clientsBookSalonBarbersFirst")}
              </Text>
            </View>
            <PortfolioPhotoGrid
              photos={photos}
              onChangeOrder={setPhotos}
              onDelete={handleDeletePhoto}
              onPickGallery={handleSelectFromGallery}
              onTakePhoto={handleTakePhoto}
              scrollableRef={scrollRef}
              showUploadTiles={canUploadWork}
            />
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
          </Animated.ScrollView>
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
