import React, { useCallback, useMemo } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import type { MediaUploadSourceType } from "@/src/types/media";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.lightGreen4,
    },
    menuWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
    },
    menu: {
      alignItems: "stretch",
      gap: moderateHeightScale(10),
    },
    menuOption: {
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
      minWidth: widthScale(160),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.38,
      shadowRadius: moderateWidthScale(6),
      elevation: 8,
    },
    menuOptionIcon: {
      width: widthScale(24),
      height: widthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    menuOptionLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

type BusinessCreateMediaMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export default function BusinessCreateMediaMenu({
  visible,
  onClose,
}: BusinessCreateMediaMenuProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const menuBottom =
    Math.max(insets.bottom, moderateHeightScale(8)) + heightScale(88);

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
    onClose();
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
  }, [onClose, openEditor, showBanner, t]);

  const handleUpload = useCallback(async () => {
    onClose();
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
  }, [onClose, openEditor, showBanner, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[styles.menuWrap, { bottom: menuBottom }]}
          pointerEvents="box-none"
        >
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleRecord}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <MaterialIcons
                  name="videocam"
                  size={moderateWidthScale(22)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.menuOptionLabel}>{t("recordVideo")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleUpload}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <MaterialIcons
                  name="file-upload"
                  size={moderateWidthScale(22)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.menuOptionLabel}>{t("uploadVideo")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
