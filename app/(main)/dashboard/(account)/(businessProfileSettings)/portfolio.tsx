import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, Platform } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { businessEndpoints } from "@/src/services/endpoints";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import PortfolioPhotoGrid from "@/src/components/PortfolioPhotoGrid";
import { Skeleton } from "@/src/components/skeletons";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { prepareImagesForUpload } from "@/src/utils/prepareImageForUpload";
import { resolveApiImageUrl } from "@/src/utils/media";

const PADDING = moderateWidthScale(20);

type PortfolioPhoto = {
  id: number;
  name?: string;
  path?: string;
  url?: string;
  mime_type?: string;
  size?: number;
};

/** One tile in display order; backendId is set for photos already saved */
type PortfolioItem = { id: string; uri: string; backendId?: number };

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
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
      flexGrow: 1,
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
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
      position: "absolute",
      top: "60%",
      alignSelf: "center",
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
  });

export default function ManagePortfolioPhotosScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [photos, setPhotos] = useState<PortfolioItem[]>([]);
  // Saved photo order as loaded, to tell if the user rearranged anything
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const generateLocalId = () => {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          portfolio_photos: PortfolioPhoto[];
        };
      }>(businessEndpoints.moduleData("portfolio"));

      const loaded: PortfolioItem[] = (
        (response.success && response.data?.portfolio_photos) ||
        []
      ).map((photo) => ({
        id: `existing_${photo.id}`,
        uri: photo.url || resolveApiImageUrl(photo.path) || "",
        backendId: photo.id,
      }));
      setPhotos(loaded);
      setSavedOrder(loaded.map((photo) => photo.id));
    } catch (error: any) {
      Logger.error("Failed to fetch portfolio module data:", error);
      showBanner(
        "Error",
        error?.message || "Failed to fetch portfolio photos. Please try again.",
        "error",
        3000,
      );
      setPhotos([]);
      setSavedOrder([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

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
        const added: PortfolioItem[] = [];
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
      Alert.alert(
        "Error",
        "Failed to select image from gallery. Please try again.",
      );
    }
  }, []);

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
  }, []);

  const handleDeletePhoto = useCallback((photo: PortfolioItem) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (photo.backendId != null) {
      const backendId = photo.backendId;
      setRemovedPhotoIds((prev) =>
        prev.includes(backendId) ? prev : [...prev, backendId],
      );
    }
  }, []);

  const newPhotos = useMemo(
    () => photos.filter((photo) => photo.backendId == null),
    [photos],
  );

  const handleUpdate = async () => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      let response;

      // Display order of saved photos (first = main photo). The backend puts
      // new uploads after these, so a new photo placed earlier needs a
      // second call once it has an id.
      const portfolioOrder = photos
        .map((photo) => photo.backendId)
        .filter((id): id is number => id != null);

      if (newPhotos.length > 0) {
        // When adding new photos, use multipart/form-data (JPEG-converted for iPhone HEIC)
        const formData = new FormData();

        const preparedPhotos = await prepareImagesForUpload(
          newPhotos.map((photo) => photo.uri),
          "portfolio_photo",
        );

        // Every new photo must upload so the new ids line up with them
        if (preparedPhotos.length !== newPhotos.length) {
          showBanner(
            "Error",
            "Could not prepare photos for upload. Please try again.",
            "error",
            3000,
          );
          return;
        }

        preparedPhotos.forEach((file, index) => {
          formData.append(`portfolio_photos[${index}]`, file as any);
        });

        if (removedPhotoIds.length > 0) {
          formData.append("remove_photos", JSON.stringify(removedPhotoIds));
        }
        if (portfolioOrder.length > 0) {
          formData.append("portfolio_order", JSON.stringify(portfolioOrder));
        }

        const config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };

        response = await ApiService.post<{
          success: boolean;
          message: string;
          data?: any;
        }>(businessEndpoints.profile, formData, config);
      } else {
        // When only removing or rearranging existing photos, send simple JSON body
        const body = {
          remove_photos: removedPhotoIds,
          ...(portfolioOrder.length > 0 && { portfolio_order: portfolioOrder }),
        };

        response = await ApiService.post<{
          success: boolean;
          message: string;
          data?: any;
        }>(businessEndpoints.profile, body);
      }

      const newBeforeSaved = photos.some(
        (photo, index) =>
          photo.backendId == null &&
          photos.slice(index + 1).some((p) => p.backendId != null),
      );
      if (response.success && newBeforeSaved) {
        // Uploads come back after the saved photos, in upload order
        const returned: PortfolioPhoto[] =
          response.data?.portfolio_photos ?? [];
        const uploadedIds = returned
          .map((photo) => photo.id)
          .filter((id) => !portfolioOrder.includes(id));
        if (uploadedIds.length === newPhotos.length) {
          const idByLocal = new Map(
            newPhotos.map((photo, index) => [photo.id, uploadedIds[index]]),
          );
          try {
            await ApiService.post(businessEndpoints.profile, {
              portfolio_order: photos.map(
                (photo) => photo.backendId ?? idByLocal.get(photo.id),
              ),
            });
          } catch (orderError) {
            // Photos are saved; only the new ones' position is off
            Logger.error("Failed to save portfolio order:", orderError);
          }
        }
      }

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Portfolio photos updated successfully",
          "success",
          3000,
        );
        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update portfolio photos",
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update portfolio photos:", error);
      showBanner(
        "Error",
        error?.message ||
          "Failed to update portfolio photos. Please try again.",
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
    newPhotos.length > 0 || removedPhotoIds.length > 0 || isReordered;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("managePortfolioPhotos")} />
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
        ) : (
          <>
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
            />

            {!hasAnyPhoto && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {t("youDidntSelectAnythingYet")}
                </Text>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

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
