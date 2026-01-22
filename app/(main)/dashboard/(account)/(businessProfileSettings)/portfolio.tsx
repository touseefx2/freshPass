import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
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
import { GalleryIcon, CameraIcon } from "@/assets/icons";
import { Skeleton } from "@/src/components/skeletons";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = moderateWidthScale(20);
const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;

const calculateItemWidth = () => {
  const availableWidth = SCREEN_WIDTH - PADDING * 2;
  const totalGaps = GAP * (NUM_COLUMNS - 1);
  const itemWidth = (availableWidth - totalGaps) / NUM_COLUMNS;
  return itemWidth;
};

type PortfolioPhoto = {
  id: number;
  name?: string;
  path?: string;
  url?: string;
  mime_type?: string;
  size?: number;
};

type GridItem =
  | { type: "gallery"; id: string }
  | { type: "camera"; id: string }
  | { type: "photo"; id: string; uri: string; isExisting: boolean; backendId?: number };

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
    gridContainer: {
      marginTop: moderateHeightScale(10),
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
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<PortfolioPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<Array<{ id: string; uri: string }>>(
    []
  );
  const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);

  const itemWidth = useMemo(() => calculateItemWidth(), []);

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

      if (response.success && response.data?.portfolio_photos) {
        setExistingPhotos(response.data.portfolio_photos);
      } else {
        setExistingPhotos([]);
      }
    } catch (error: any) {
      Logger.error("Failed to fetch portfolio module data:", error);
      showBanner(
        "Error",
        error?.message || "Failed to fetch portfolio photos. Please try again.",
        "error",
        3000
      );
      setExistingPhotos([]);
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
      Alert.alert(
        "Error",
        "Failed to select image from gallery. Please try again."
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
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  }, []);

  const handleDeletePhoto = useCallback(
    (item: GridItem) => {
      if (item.type !== "photo") {
        return;
      }

      if (item.isExisting && item.backendId != null) {
        setExistingPhotos((prev) => prev.filter((p) => p.id !== item.backendId));
        setRemovedPhotoIds((prev) =>
          prev.includes(item.backendId as number)
            ? prev
            : [...prev, item.backendId as number]
        );
      } else {
        setNewPhotos((prev) => prev.filter((p) => p.id !== item.id));
      }
    },
    []
  );

  const gridData: GridItem[] = useMemo(() => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
    const items: GridItem[] = [
      { type: "gallery", id: "gallery" },
      { type: "camera", id: "camera" },
      ...existingPhotos.map((photo) => ({
        type: "photo" as const,
        id: `existing_${photo.id}`,
        uri: photo.path ? `${baseUrl}${photo.path}` : photo.url || "",
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
    return items;
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
                <Text style={styles.actionButtonText}>from gallery</Text>
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
                <Text style={styles.actionButtonText}>from camera</Text>
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
    [itemWidth, theme, handleSelectFromGallery, handleTakePhoto, handleDeletePhoto]
  );

  const handleUpdate = async () => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      let response;

      if (newPhotos.length > 0) {
        // When adding new photos, use multipart/form-data
        const formData = new FormData();

        newPhotos.forEach((photo, index) => {
          const fileExtension = photo.uri.split(".").pop() || "jpg";
          const fileName = `portfolio_photo_${index}.${fileExtension}`;

          formData.append(`portfolio_photos[${index}]`, {
            uri: photo.uri,
            type: `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`,
            name: fileName,
          } as any);
        });

        if (removedPhotoIds.length > 0) {
          formData.append("remove_photos", JSON.stringify(removedPhotoIds));
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
        // When only removing existing photos, send simple JSON body
        const body = {
          remove_photos: removedPhotoIds,
        };

        response = await ApiService.post<{
          success: boolean;
          message: string;
          data?: any;
        }>(businessEndpoints.profile, body);
      }

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Portfolio photos updated successfully",
          "success",
          3000
        );
        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update portfolio photos",
          "error",
          3000
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update portfolio photos:", error);
      showBanner(
        "Error",
        error?.message || "Failed to update portfolio photos. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const hasAnyPhoto = existingPhotos.length > 0 || newPhotos.length > 0;
  const hasChanges = newPhotos.length > 0 || removedPhotoIds.length > 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Manage portfolio photos" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
        ) : (
          <>
            <View style={styles.titleSec}>
              <Text style={styles.title}>Build trust with photos</Text>
              <Text style={styles.subtitle}>
                Clients book salon barbers with great portfolios first.
              </Text>
            </View>

            <FlatList
              data={gridData}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={NUM_COLUMNS}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.gridContainer}
              scrollEnabled={false}
            />

            {!hasAnyPhoto && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  You didn't select anything yet
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          <Button
            title="Update photos"
            onPress={handleUpdate}
            disabled={isUpdating || !hasChanges}
            loading={isUpdating}
          />
        </View>
      )}
    </SafeAreaView>
  );
}


