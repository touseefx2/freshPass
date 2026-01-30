import React, { useMemo, useCallback } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { addPhoto, removePhoto } from "@/src/state/slices/completeProfileSlice";
import {
  handleMediaLibraryPermission,
  handleCameraPermission,
} from "@/src/services/mediaPermissionService";
import { GalleryIcon, CameraIcon } from "@/assets/icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = moderateWidthScale(20);
const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;

const calculateItemWidth = () => {
  const availableWidth = SCREEN_WIDTH - PADDING * 2;
  const totalGaps = GAP * (NUM_COLUMNS - 1); // 2 gaps for 3 items
  const itemWidth = (availableWidth - totalGaps) / NUM_COLUMNS;
  return itemWidth;
};

type GridItem =
  | { type: "gallery"; id: string }
  | { type: "camera"; id: string }
  | { type: "photo"; id: string; uri: string };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
      paddingHorizontal: PADDING,
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
      // backgroundColor:"yellow",
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
  });

export default function StepEleven() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { photos } = useAppSelector((state) => state.completeProfile);

  const generatePhotoId = () => {
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

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
        result.assets.forEach((asset) => {
          if (asset.uri) {
            dispatch(
              addPhoto({
                id: generatePhotoId(),
                uri: asset.uri,
              }),
            );
          }
        });
      }
    } catch (error) {
      Logger.error("Error selecting image from gallery:", error);
      Alert.alert(
        "Error",
        "Failed to select image from gallery. Please try again.",
      );
    }
  }, [dispatch]);

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
        dispatch(
          addPhoto({
            id: generatePhotoId(),
            uri: result.assets[0].uri,
          }),
        );
      }
    } catch (error) {
      Logger.error("Error taking photo:", error);
      Alert.alert(t("error"), t("failedToTakePhoto"));
    }
  }, [dispatch]);

  const handleDeletePhoto = useCallback(
    (id: string) => {
      dispatch(removePhoto(id));
    },
    [dispatch],
  );

  const itemWidth = useMemo(() => calculateItemWidth(), []);

  // Create data array: gallery, camera, then photos
  const gridData = useMemo<GridItem[]>(() => {
    const items: GridItem[] = [
      { type: "gallery", id: "gallery" },
      { type: "camera", id: "camera" },
      ...photos.map((photo) => ({
        type: "photo" as const,
        id: photo.id,
        uri: photo.uri,
      })),
    ];
    return items;
  }, [photos]);

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

      // Photo item
      return (
        <View style={itemStyle}>
          <View style={styles.photoContainer}>
            <Image source={{ uri: item.uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePhoto(item.id)}
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
      handleSelectFromGallery,
      handleTakePhoto,
      handleDeletePhoto,
    ],
  );

  return (
    <View style={styles.container}>
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

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You didn't select anything yet
          </Text>
        </View>
      )}
    </View>
  );
}
