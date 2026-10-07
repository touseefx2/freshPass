import { useCallback } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { MAX_VIDEO_UPLOAD_SECONDS } from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import type { MediaUploadSourceType } from "@/src/types/media";

/**
 * "Upload a Reel" flow shared by the create (+) menu and the Media Library:
 * record (capped at the limit) or pick a video, then the step-by-step Reel
 * Studio opens at Trim (any length — it's trimmed there) → Style → Preview →
 * Publish.
 */
export function useUploadReel() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();

  /** Picked / recorded video → Reel Studio, starting at the Trim step. */
  const openStudio = useCallback(
    (asset: ImagePicker.ImagePickerAsset, sourceType: MediaUploadSourceType) => {
      if (!asset.uri) return;
      router.push({
        pathname: "/(main)/reelStudio" as any,
        params: {
          uri: encodeURIComponent(asset.uri),
          mimeType: asset.mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          ...(asset.width ? { width: String(asset.width) } : {}),
          ...(asset.height ? { height: String(asset.height) } : {}),
        },
      });
    },
    [router],
  );

  // Old flow (kept for going back to it): skip the editor, reject anything over
  // the limit and go straight to Publish reel.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openPublish = useCallback(
    (asset: ImagePicker.ImagePickerAsset, sourceType: MediaUploadSourceType) => {
      if (!asset.uri) return;
      // expo-image-picker reports duration in ms (null when unknown)
      const durationMs = asset.duration ?? 0;
      // Small tolerance — a 30s recording often reports 30.0x seconds
      if (durationMs > MAX_VIDEO_UPLOAD_SECONDS * 1000 + 500) {
        showBanner(
          t("error"),
          t("selectVideoWithinLimit", {
            max_seconds: MAX_VIDEO_UPLOAD_SECONDS,
          }),
          "error",
          3500,
        );
        return;
      }
      router.push({
        pathname: "/(main)/publishReel" as any,
        params: {
          videoUri: encodeURIComponent(asset.uri),
          mimeType: asset.mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          ...(durationMs > 0
            ? {
                durationSeconds: String(
                  Math.max(1, Math.round(durationMs / 1000)),
                ),
              }
            : {}),
          ...(asset.width ? { width: String(asset.width) } : {}),
          ...(asset.height ? { height: String(asset.height) } : {}),
        },
      });
    },
    [router, showBanner, t],
  );

  const recordReel = useCallback(async () => {
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: MAX_VIDEO_UPLOAD_SECONDS,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });
      if (!result.canceled && result.assets?.[0]) {
        // openPublish(result.assets[0], "camera");
        openStudio(result.assets[0], "camera");
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [openStudio, showBanner, t]);

  const pickReel = useCallback(async () => {
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
        // openPublish(result.assets[0], "device");
        openStudio(result.assets[0], "device");
      }
    } catch (error) {
      Logger.error("Error selecting video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [openStudio, showBanner, t]);

  return { recordReel, pickReel };
}
