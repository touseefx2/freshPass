import React, { useMemo, useCallback, useState } from "react";
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
import PhotoEditorModal, { usePhotoEditorQueue } from "@/src/components/PhotoEditorModal";
import { openFullImageModal } from "@/src/state/slices/generalSlice";

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

  const [editorUri, setEditorUri] = useState("");
  const [editorDims, setEditorDims] = useState<{ width?: number; height?: number }>({});
  const [editorVisible, setEditorVisible] = useState(false);
  const photoQueue = usePhotoEditorQueue();

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
        const items = result.assets
          .filter((a) => a.uri)
          .map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
        if (items.length > 0) {
          const editedUris = await photoQueue.startEditing(items);
          editedUris.forEach((uri) => {
            dispatch(addPhoto({ id: generatePhotoId(), uri }));
          });
        }
      }
    } catch (error) {
      Logger.error("Error selecting image from gallery:", error);
      Alert.alert(t("error"), t("failedToSelectImageFromGallery"));
    }
  }, [dispatch, photoQueue]);

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
        const asset = result.assets[0];
        setEditorUri(asset.uri);
        setEditorDims(asset.width && asset.height ? { width: asset.width, height: asset.height } : {});
        setEditorVisible(true);
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
        <Text style={styles.title}>{t("buildTrustWithPhotos")}</Text>
        <Text style={styles.subtitle}>
          {t("clientsBookSalonBarbersFirst")}
        </Text>
      </View>

      <PortfolioPhotoGrid
        photos={photos}
        onChangeOrder={handleChangeOrder}
        onDelete={handleDeletePhoto}
        onPickGallery={handleSelectFromGallery}
        onTakePhoto={handleTakePhoto}
        onPhotoPress={(_photo, idx) => {
          const uris = photos.map((p) => p.uri).filter(Boolean);
          if (uris.length) {
            dispatch(openFullImageModal({ images: uris, initialIndex: idx }));
          }
        }}
      />

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {t("youDidntSelectAnythingYet")}
          </Text>
        </View>
      )}

      {/* Single photo editor (camera) */}
      <PhotoEditorModal
        visible={editorVisible}
        imageUri={editorUri}
        imageWidth={editorDims.width}
        imageHeight={editorDims.height}
        onDone={(croppedUri) => {
          setEditorVisible(false);
          setEditorUri("");
          setEditorDims({});
          dispatch(addPhoto({ id: generatePhotoId(), uri: croppedUri }));
        }}
        onCancel={() => {
          setEditorVisible(false);
          setEditorUri("");
          setEditorDims({});
        }}
        cropShape="square"
      />

      {/* Multi-photo editor (gallery) */}
      <PhotoEditorModal
        visible={photoQueue.isEditing}
        imageUri={photoQueue.currentUri}
        imageWidth={photoQueue.currentWidth}
        imageHeight={photoQueue.currentHeight}
        onDone={photoQueue.handleDone}
        onCancel={photoQueue.handleCancel}
        cropShape="square"
      />
    </View>
  );
}
