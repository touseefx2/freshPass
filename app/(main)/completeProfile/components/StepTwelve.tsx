import React, { useMemo, useCallback } from "react";
import Logger from "@/src/services/logger";
import { StyleSheet, Text, View, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import PortfolioPhotoGrid from "@/src/components/PortfolioPhotoGrid";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  addPhoto,
  removePhoto,
  setPhotos,
} from "@/src/state/slices/completeProfileSlice";
import {
  handleMediaLibraryPermission,
  handleCameraPermission,
} from "@/src/services/mediaPermissionService";

const PADDING = moderateWidthScale(20);

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

export default function StepTwelve() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
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
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
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
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
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
    (photo: { id: string }) => {
      dispatch(removePhoto(photo.id));
    },
    [dispatch],
  );

  const handleChangeOrder = useCallback(
    (ordered: Array<{ id: string; uri: string }>) => {
      dispatch(setPhotos(ordered));
    },
    [dispatch],
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>Build trust with photos</Text>
        <Text style={styles.subtitle}>
          Clients book salon barbers with great portfolios first.
        </Text>
      </View>

      <PortfolioPhotoGrid
        photos={photos}
        onChangeOrder={handleChangeOrder}
        onDelete={handleDeletePhoto}
        onPickGallery={handleSelectFromGallery}
        onTakePhoto={handleTakePhoto}
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
