import React, { useMemo, useCallback } from "react";
import Logger from "@/src/services/logger";
import { StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import * as ImagePicker from "expo-image-picker";
import {
  handleMediaLibraryPermission,
  handleCameraPermission,
} from "@/src/services/mediaPermissionService";

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
  /** When allowsMultipleSelection is true, can use this to receive all selected URIs at once */
  onImagesSelected?: (uris: string[]) => void;
  allowsMultipleSelection?: boolean;
  quality?: number;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    optionIcon: {
      marginRight: moderateWidthScale(16),
    },
    optionText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
  });

export default function ImagePickerModal({
  visible,
  onClose,
  onImageSelected,
  onImagesSelected,
  allowsMultipleSelection = false,
  quality = 0.8,
}: ImagePickerModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const handleSelectFromGallery = useCallback(async () => {
    onClose();
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection,
        quality,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri).filter(Boolean);
        if (allowsMultipleSelection && uris.length > 0 && onImagesSelected) {
          onImagesSelected(uris);
        } else {
          onImageSelected(uris[0]!);
        }
      }
    } catch (error) {
      Logger.error("Error selecting image from gallery:", error);
      Alert.alert(
        "Error",
        "Failed to select image from gallery. Please try again.",
      );
    }
  }, [onClose, onImageSelected, onImagesSelected, allowsMultipleSelection, quality]);

  const handleTakePhoto = useCallback(async () => {
    onClose();
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      Logger.error("Error taking photo:", error);
      Alert.alert(t("error"), t("failedToTakePhoto"));
    }
  }, [onClose, onImageSelected, quality]);

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("selectPhoto")}
    >
      <TouchableOpacity
        style={styles.optionItem}
        onPress={handleSelectFromGallery}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="photo-library"
          size={moderateWidthScale(24)}
          color={theme.darkGreen}
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>{t("fromGallery")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionItem}
        onPress={handleTakePhoto}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="camera-alt"
          size={moderateWidthScale(24)}
          color={theme.darkGreen}
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>{t("fromCamera")}</Text>
      </TouchableOpacity>
    </ModalizeBottomSheet>
  );
}
