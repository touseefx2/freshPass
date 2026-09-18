import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
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
import { getMediaLimits } from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import type { MediaLimits, MediaUploadSourceType } from "@/src/types/media";
import { formatReelLimitMessage } from "@/src/utils/reelLimits";
import { getReelUploadGate } from "@/src/utils/reelUploadGate";

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
    limitHint: {
      maxWidth: widthScale(220),
      marginBottom: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.darkGreenLight,
    },
    limitHintText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      textAlign: "center",
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
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector(
    (state) => state.user.businessStatus,
  );

  const [limits, setLimits] = useState<MediaLimits | null>(null);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);

  const menuBottom =
    Math.max(insets.bottom, moderateHeightScale(8)) + heightScale(88);

  const maxSeconds = limits?.max_seconds ?? 15;
  const limitMessage = useMemo(
    () => (limits ? formatReelLimitMessage(limits, t) : null),
    [limits, t],
  );

  useEffect(() => {
    if (!visible) return;
    void getMediaLimits()
      .then(setLimits)
      .catch((error) => {
        Logger.error("Failed to load media limits:", error);
      });
  }, [visible]);

  const ensureCanUploadReel = useCallback((): boolean => {
    const gate = getReelUploadGate(businessStatus);
    if (gate === "stripe") {
      onClose();
      dispatch(setStripeConnectModalVisible(true));
      return false;
    }
    if (gate === "plan") {
      onClose();
      setBuyPlanModalVisible(true);
      return false;
    }
    return true;
  }, [businessStatus, dispatch, onClose]);

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

  const handleRecord = useCallback(async () => {
    if (!ensureCanUploadReel()) return;
    onClose();
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
        openEditor(result.assets[0], "camera", seconds);
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [ensureCanUploadReel, maxSeconds, onClose, openEditor, showBanner, t]);

  const handleUpload = useCallback(async () => {
    if (!ensureCanUploadReel()) return;
    onClose();
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
        openEditor(result.assets[0], "device", seconds);
      }
    } catch (error) {
      Logger.error("Error selecting video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [ensureCanUploadReel, maxSeconds, onClose, openEditor, showBanner, t]);

  return (
    <>
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
              {limitMessage ? (
                <View style={styles.limitHint}>
                  <Text style={styles.limitHintText}>{limitMessage}</Text>
                </View>
              ) : null}
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

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />
    </>
  );
}
