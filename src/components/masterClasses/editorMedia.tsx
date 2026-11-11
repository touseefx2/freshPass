// Class image / video: pick from the device, upload to the Media Library
// (POST /api/media) with progress, keep the returned id as media_asset_id.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  getCachedMediaLimits,
  getMediaLimits,
  uploadImage,
  uploadVideo,
  VideoTooLargeError,
} from "@/src/services/mediaLibraryService";
import { uploadMaxSeconds } from "@/src/utils/reelLimits";
import { isUploadCancelled } from "@/src/utils/uploadCancel";
import Logger from "@/src/services/logger";
import { ClassMediaThumb } from "@/src/components/masterClasses/parts";
import { EditorFieldError } from "@/src/components/masterClasses/editorFields";
import type { MasterClassMedia } from "@/src/types/masterClass";

export type UploadedClassMedia = {
  id: number;
  /** Local preview (photo or first video frame), else the server thumbnail. */
  previewUri: string | null;
  isVideo: boolean;
  /** Playable video URL from the server (videos only). */
  videoUrl: string | null;
};

// iOS hands over an H.264 copy instead of the HEVC original (the server rejects HEVC).
const iosCompatible =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

/** Pick → validate → upload. Aborts the upload when the screen goes away. */
export function useClassMediaUpload(
  onUploaded: (media: UploadedClassMedia) => void,
) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [pendingPreview, setPendingPreview] = useState<{
    uri: string | null;
    isVideo: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setUploading(false);
    setPendingPreview(null);
    setPercent(0);
  }, []);

  /**
   * @param onImagePicked When provided and the picked file is a photo,
   *   calls this with the local URI instead of uploading — lets the caller
   *   open a crop editor first, then call `uploadImageUri(croppedUri)`.
   *   Videos still upload directly.
   */
  const pick = useCallback(async (onImagePicked?: (uri: string) => void) => {
    if (controllerRef.current) return;
    setError(null);
    let asset: ImagePicker.ImagePickerAsset | undefined;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 0.9,
        ...iosCompatible,
      });
      asset = result.canceled ? undefined : result.assets?.[0];
    } catch (err) {
      Logger.warn("Class media picker failed:", err);
      setError(t("mcMediaPickFailed"));
      return;
    }
    if (!asset?.uri || !mountedRef.current) return;

    const isVideo = asset.type === "video";

    // Image picked and caller wants to edit it first
    if (!isVideo && onImagePicked) {
      onImagePicked(asset.uri);
      return;
    }

    if (isVideo) {
      const limits =
        getCachedMediaLimits() ?? (await getMediaLimits().catch(() => null));
      const maxSeconds = uploadMaxSeconds(limits);
      if ((asset.duration ?? 0) > maxSeconds * 1000 + 500) {
        setError(t("mcVideoTooLong", { seconds: maxSeconds }));
        return;
      }
    }

    let previewUri: string | null = isVideo ? null : asset.uri;
    if (isVideo) {
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 0,
          quality: 0.6,
        });
        previewUri = thumb.uri;
      } catch {
        previewUri = null;
      }
    }
    if (!mountedRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingPreview({ uri: previewUri, isVideo });
    setPercent(0);
    setUploading(true);

    try {
      const uploaded = isVideo
        ? await uploadVideo(
            {
              uri: asset.uri,
              mimeType: asset.mimeType,
              fileName: asset.fileName,
              sourceType: "device",
              durationSeconds: Math.max(1, (asset.duration ?? 1000) / 1000),
              width: asset.width,
              height: asset.height,
              signal: controller.signal,
              onCompressProgress: (p) =>
                mountedRef.current && setPercent(Math.round(p * 0.3)),
            },
            (p) => mountedRef.current && setPercent(30 + Math.round(p * 0.7)),
          )
        : await uploadImage(
            {
              uri: asset.uri,
              mimeType: asset.mimeType,
              fileName: asset.fileName,
              sourceType: "device",
              width: asset.width,
              height: asset.height,
              signal: controller.signal,
            },
            (p) => mountedRef.current && setPercent(p),
          );
      if (!mountedRef.current || controller.signal.aborted) return;
      onUploadedRef.current({
        id: uploaded.id,
        previewUri: previewUri ?? uploaded.thumbnail_url ?? null,
        isVideo,
        videoUrl: isVideo ? (uploaded.playback_url || uploaded.url || null) : null,
      });
    } catch (err: any) {
      if (isUploadCancelled(err) || !mountedRef.current) return;
      Logger.warn("Class media upload failed:", err);
      setError(
        err instanceof VideoTooLargeError
          ? t("mcVideoTooLarge")
          : err?.isNoInternet
            ? t("mcNoInternet")
            : typeof err?.message === "string" && err.message && !/^Upload failed/.test(err.message)
              ? err.message
              : t("mcUploadFailed"),
      );
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (mountedRef.current) {
        setUploading(false);
        setPendingPreview(null);
      }
    }
  }, [t]);

  /** Upload a local image URI (e.g. after cropping in the photo editor). */
  const uploadImageUri = useCallback(
    async (imageUri: string) => {
      if (controllerRef.current) return;
      setError(null);
      const controller = new AbortController();
      controllerRef.current = controller;
      setPendingPreview({ uri: imageUri, isVideo: false });
      setPercent(0);
      setUploading(true);
      try {
        const uploaded = await uploadImage(
          { uri: imageUri, sourceType: "device", signal: controller.signal },
          (p) => mountedRef.current && setPercent(p),
        );
        if (!mountedRef.current || controller.signal.aborted) return;
        onUploadedRef.current({
          id: uploaded.id,
          previewUri: imageUri,
          isVideo: false,
          videoUrl: null,
        });
      } catch (err: any) {
        if (isUploadCancelled(err) || !mountedRef.current) return;
        Logger.warn("Class media upload failed:", err);
        setError(
          err?.isNoInternet
            ? t("mcNoInternet")
            : typeof err?.message === "string" &&
                err.message &&
                !/^Upload failed/.test(err.message)
              ? err.message
              : t("mcUploadFailed"),
        );
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        if (mountedRef.current) {
          setUploading(false);
          setPendingPreview(null);
        }
      }
    },
    [t],
  );

  return {
    pick,
    uploadImageUri,
    cancel,
    uploading,
    percent,
    pendingPreview,
    error,
    clearError: () => setError(null),
  };
}

// ── Box ─────────────────────────────────────────────────────────────

type Props = {
  /** Local preview after a pick (photo uri / first video frame). */
  previewUri: string | null;
  isVideo: boolean;
  /** Saved media when no local preview exists. */
  media: MasterClassMedia | null;
  hasMedia: boolean;
  uploading: boolean;
  percent: number;
  error?: string | null;
  onPick: () => void;
  onRemove: () => void;
  onCancelUpload: () => void;
  /** Tap the preview to view full-screen. */
  onPreviewPress?: () => void;
};

export function EditorMediaBox({
  previewUri,
  isVideo,
  media,
  hasMedia,
  uploading,
  percent,
  error,
  onPick,
  onRemove,
  onCancelUpload,
  onPreviewPress,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  if (!hasMedia && !uploading) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onPick}
          style={[styles.empty, !!error && styles.emptyError]}
          accessibilityRole="button"
          accessibilityLabel={t("mcAddMedia")}
          accessibilityHint={t("mcAddMediaHint")}
        >
          <View style={styles.emptyIcon}>
            <Ionicons name="camera-outline" size={iconScale(26)} color={theme.darkGreen} />
          </View>
          <Text style={styles.emptyTitle}>{t("mcAddMedia")}</Text>
          <Text style={styles.emptyHint}>{t("mcAddMediaHint")}</Text>
        </TouchableOpacity>
        <EditorFieldError message={error} />
      </View>
    );
  }

  const PreviewWrap = onPreviewPress && !uploading ? Pressable : View;
  const previewWrapProps =
    onPreviewPress && !uploading
      ? { onPress: onPreviewPress, accessibilityRole: "button" as const }
      : {};

  return (
    <View style={styles.wrap}>
      <PreviewWrap style={styles.previewWrap} {...previewWrapProps}>
        <ClassMediaThumb
          uri={previewUri ?? undefined}
          media={previewUri ? null : media}
          isVideo={isVideo}
          width="100%"
          height={heightScale(190)}
          radius={moderateWidthScale(14)}
        />
        {uploading ? (
          <View style={styles.uploadOverlay} accessibilityLiveRegion="polite">
            <ActivityIndicator color={theme.white} />
            <Text style={styles.uploadText}>
              {t("mcUploadingMedia", { percent })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(4, percent)}%` }]} />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCancelUpload}
              style={styles.cancelUpload}
              accessibilityRole="button"
              accessibilityLabel={t("mcCancelUpload")}
            >
              <Text style={styles.cancelUploadText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </PreviewWrap>
      {!uploading ? (
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onPick}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={t("mcChangeMedia")}
          >
            <MaterialCommunityIcons
              name="image-edit-outline"
              size={iconScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.actionText}>{t("mcChangeMedia")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onRemove}
            style={[styles.action, styles.actionDanger]}
            accessibilityRole="button"
            accessibilityLabel={t("mcRemoveMedia")}
          >
            <Ionicons name="trash-outline" size={iconScale(17)} color={theme.red} />
            <Text style={[styles.actionText, styles.actionTextDanger]}>
              {t("mcRemoveMedia")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <EditorFieldError message={error} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: moderateHeightScale(8),
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(6),
      minHeight: heightScale(150),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(18),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
    },
    emptyError: {
      borderColor: theme.red,
    },
    emptyIcon: {
      width: moderateWidthScale(54),
      height: moderateWidthScale(54),
      borderRadius: moderateWidthScale(27),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
      marginBottom: moderateHeightScale(4),
    },
    emptyTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptyHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
    previewWrap: {
      borderRadius: moderateWidthScale(14),
      overflow: "hidden",
    },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      backgroundColor: theme.lightGreen6,
      paddingHorizontal: moderateWidthScale(32),
    },
    uploadText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    progressTrack: {
      alignSelf: "stretch",
      height: heightScale(6),
      borderRadius: heightScale(3),
      backgroundColor: theme.white15,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: heightScale(3),
      backgroundColor: theme.orangeBrown,
    },
    cancelUpload: {
      minHeight: heightScale(36),
      minWidth: moderateWidthScale(88),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: heightScale(18),
      borderWidth: 1,
      borderColor: theme.white70,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelUploadText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    actions: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    action: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    actionDanger: {
      borderColor: theme.lightRed30,
    },
    actionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actionTextDanger: {
      color: theme.red,
    },
  });
