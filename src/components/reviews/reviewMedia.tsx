import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import ImagePickerModal from "@/src/components/imagePickerModal";
import LocalVideoPreviewModal from "@/src/components/localVideoPreviewModal";
import Logger from "@/src/services/logger";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  formatClipDuration,
  launchReviewVideoPicker,
  REVIEW_VIDEO_MAX_SECONDS,
  type ReviewMedia,
} from "@/src/utils/reviewMedia";

/**
 * Review photo / video pieces: the picker tiles on the review form, the
 * thumbnails on review cards, "Served by …" and the staff rating badge.
 */

type MediaKind = "image" | "video";

// ── Video cover ──────────────────────────────────────────────────────────
// The server makes no cover image, so the first frame is pulled once per URL.
// Capped so long sessions don't keep every cover; oldest URL drops first.
const THUMB_CACHE_MAX = 50;
const thumbCache = new Map<string, string>();
const thumbInflight = new Map<string, Promise<string | null>>();

function loadVideoThumb(uri: string): Promise<string | null> {
  const cached = thumbCache.get(uri);
  if (cached) return Promise.resolve(cached);
  let pending = thumbInflight.get(uri);
  if (!pending) {
    pending = VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.6 })
      .then((result) => {
        thumbCache.set(uri, result.uri);
        if (thumbCache.size > THUMB_CACHE_MAX) {
          thumbCache.delete(thumbCache.keys().next().value!);
        }
        return result.uri;
      })
      .catch((error) => {
        Logger.warn("Review video cover failed:", error);
        return null;
      })
      .finally(() => thumbInflight.delete(uri));
    thumbInflight.set(uri, pending);
  }
  return pending;
}

/** First frame of a local or remote video; null while loading / on failure. */
export function useVideoThumbnail(uri?: string | null): {
  thumb: string | null;
  loading: boolean;
} {
  const [state, setState] = useState<{ uri: string | null; thumb: string | null; done: boolean }>(
    () => ({
      uri: uri ?? null,
      thumb: uri ? (thumbCache.get(uri) ?? null) : null,
      done: uri ? thumbCache.has(uri) : true,
    }),
  );
  useEffect(() => {
    if (!uri) {
      setState({ uri: null, thumb: null, done: true });
      return;
    }
    const cached = thumbCache.get(uri);
    if (cached) {
      setState({ uri, thumb: cached, done: true });
      return;
    }
    setState({ uri, thumb: null, done: false });
    let alive = true;
    loadVideoThumb(uri).then((thumb) => {
      if (alive) setState({ uri, thumb, done: true });
    });
    return () => {
      alive = false;
    };
  }, [uri]);
  return { thumb: state.thumb, loading: !state.done };
}

/** "4.50" / 4.5 / null → 4.5 (0 when missing) */
export function parseRating(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Picker
    pickerRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    tile: {
      flex: 1,
      height: heightScale(136),
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
    },
    tileEmpty: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(10),
      gap: moderateHeightScale(4),
    },
    tileError: {
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.lightRed,
    },
    tileIconCircle: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
    },
    tileLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    tileSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    tileFilled: {
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    fill: { ...StyleSheet.absoluteFillObject },
    removeBtn: {
      position: "absolute",
      top: moderateWidthScale(8),
      right: moderateWidthScale(8),
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.lightGreen6,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircle: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.lightGreen6,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircleSmall: {
      width: widthScale(26),
      height: widthScale(26),
      borderRadius: widthScale(13),
    },
    tileBadge: {
      position: "absolute",
      left: moderateWidthScale(8),
      bottom: moderateWidthScale(8),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen6,
    },
    tileBadgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(6),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      lineHeight: fontSize.size18,
    },
    // Strip (review cards)
    strip: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    thumb: {
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    // Served by
    servedBy: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    servedAvatar: {
      width: widthScale(20),
      height: widthScale(20),
      borderRadius: widthScale(10),
      overflow: "hidden",
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
    },
    servedInitial: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    servedText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    servedName: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Rating badge
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
    },
    badgeOverlay: {
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.white85,
    },
    badgeValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    badgeCount: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

/** Full-screen photo (shared viewer) or the video player. */
function useMediaViewer() {
  const dispatch = useDispatch();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const open = useCallback(
    (kind: MediaKind, uri: string) => {
      if (kind === "image") dispatch(openFullImageModal({ images: [uri] }));
      else setVideoUri(uri);
    },
    [dispatch],
  );
  const viewer = (
    <LocalVideoPreviewModal
      visible={!!videoUri}
      uri={videoUri}
      onClose={() => setVideoUri(null)}
    />
  );
  return { open, viewer };
}

// ── Review form: photo + video tiles ────────────────────────────────────

function FilledTile({
  kind,
  media,
  onOpen,
  onRemove,
  disabled,
}: {
  kind: MediaKind;
  media: ReviewMedia;
  onOpen: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const isVideo = kind === "video";
  const { thumb, loading } = useVideoThumbnail(isVideo ? media.uri : null);
  const cover = isVideo ? thumb : media.isLocal ? media.uri : resolveApiImageUrl(media.uri);
  const duration = isVideo ? formatClipDuration(media.durationMs) : null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[styles.tile, styles.tileFilled]}
      accessibilityRole="button"
      accessibilityLabel={isVideo ? t("rvPlayVideo") : t("rvViewPhoto")}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.fill} contentFit="cover" transition={120} />
      ) : loading ? (
        <ActivityIndicator color={theme.white} />
      ) : null}
      {isVideo ? (
        <View style={styles.playCircle} pointerEvents="none">
          <MaterialIcons name="play-arrow" size={moderateWidthScale(26)} color={theme.white} />
        </View>
      ) : null}
      <View style={styles.tileBadge} pointerEvents="none">
        <MaterialIcons
          name={isVideo ? "videocam" : "photo"}
          size={moderateWidthScale(13)}
          color={theme.white}
        />
        <Text style={styles.tileBadgeText}>
          {duration ?? (isVideo ? t("video") : t("rvPhoto"))}
        </Text>
      </View>
      {!disabled ? (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={8}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel={isVideo ? t("rvRemoveVideo") : t("rvRemovePhoto")}
        >
          <MaterialIcons name="close" size={moderateWidthScale(18)} color={theme.white} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

function EmptyTile({
  kind,
  onPress,
  hasError,
  disabled,
}: {
  kind: MediaKind;
  onPress: () => void;
  hasError?: boolean;
  disabled?: boolean;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const isVideo = kind === "video";
  const label = isVideo ? t("rvAddVideo") : t("rvAddPhoto");
  const sub = isVideo
    ? t("rvVideoHint", { seconds: REVIEW_VIDEO_MAX_SECONDS })
    : t("rvPhotoHint");
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.tile,
        styles.tileEmpty,
        hasError && styles.tileError,
        disabled && { opacity: 0.45 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub}`}
    >
      <View style={styles.tileIconCircle}>
        <MaterialIcons
          name={isVideo ? "video-call" : "add-a-photo"}
          size={moderateWidthScale(24)}
          color={theme.buttonBack}
        />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.tileSub} numberOfLines={2}>
        {sub}
      </Text>
    </TouchableOpacity>
  );
}

export function ReviewMediaPicker({
  photo,
  video,
  onPhotoChange,
  onVideoChange,
  errors,
  onError,
  disabled = false,
}: {
  photo: ReviewMedia | null;
  video: ReviewMedia | null;
  onPhotoChange: (media: ReviewMedia | null) => void;
  onVideoChange: (media: ReviewMedia | null) => void;
  errors: { image?: string | null; video?: string | null };
  onError: (kind: MediaKind, message: string | null) => void;
  disabled?: boolean;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<MediaKind | null>(null);
  const { open, viewer } = useMediaViewer();

  const pickVideo = useCallback(
    async (source: "camera" | "library") => {
      const allowed =
        source === "camera"
          ? await handleCameraPermission()
          : await handleMediaLibraryPermission();
      if (!allowed) return;
      try {
        const result = await launchReviewVideoPicker(source);
        if (result.status === "tooLong") {
          onError("video", t("rvVideoTooLong", { seconds: REVIEW_VIDEO_MAX_SECONDS }));
          return;
        }
        if (result.status === "picked") {
          onError("video", null);
          onVideoChange(result.media);
        }
      } catch (error) {
        Logger.error("Review video pick failed:", error);
        onError("video", t("failedToSelectMedia"));
      }
    },
    [onError, onVideoChange, t],
  );

  const errorLines = [errors.image, errors.video].filter(Boolean) as string[];

  return (
    <View style={{ gap: moderateHeightScale(10) }}>
      <View style={styles.pickerRow}>
        {photo ? (
          <FilledTile
            kind="image"
            media={photo}
            disabled={disabled}
            onOpen={() =>
              open("image", photo.isLocal ? photo.uri : (resolveApiImageUrl(photo.uri) ?? photo.uri))
            }
            onRemove={() => {
              onError("image", null);
              onPhotoChange(null);
            }}
          />
        ) : (
          <EmptyTile
            kind="image"
            hasError={!!errors.image}
            disabled={disabled}
            onPress={() => setSheet("image")}
          />
        )}
        {video ? (
          <FilledTile
            kind="video"
            media={video}
            disabled={disabled}
            onOpen={() => open("video", video.uri)}
            onRemove={() => {
              onError("video", null);
              onVideoChange(null);
            }}
          />
        ) : (
          <EmptyTile
            kind="video"
            hasError={!!errors.video}
            disabled={disabled}
            onPress={() => setSheet("video")}
          />
        )}
      </View>
      {errorLines.map((line) => (
        <View key={line} style={styles.errorRow} accessibilityRole="alert">
          <MaterialIcons name="error-outline" size={moderateWidthScale(16)} color={theme.red} />
          <Text style={styles.errorText}>{line}</Text>
        </View>
      ))}

      <ImagePickerModal
        visible={sheet === "image"}
        onClose={() => setSheet(null)}
        title={t("rvAddPhoto")}
        quality={1}
        onImageSelected={(uri) => {
          onError("image", null);
          onPhotoChange({ uri, isLocal: true });
        }}
      />
      <ImagePickerModal
        visible={sheet === "video"}
        onClose={() => setSheet(null)}
        title={t("rvAddVideo")}
        onImageSelected={() => {}}
        onGalleryPress={() => void pickVideo("library")}
        onCameraPress={() => void pickVideo("camera")}
        cameraLabel={t("rvRecordVideo")}
        cameraIcon="videocam"
      />
      {viewer}
    </View>
  );
}

// ── Review cards: photo / video thumbnails ──────────────────────────────

function StripThumb({
  kind,
  uri,
  size,
  onPress,
}: {
  kind: MediaKind;
  uri: string;
  size: number;
  onPress: () => void;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const isVideo = kind === "video";
  const { thumb } = useVideoThumbnail(isVideo ? uri : null);
  const cover = isVideo ? thumb : uri;
  const small = size < widthScale(64);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.thumb, { width: size, height: size }]}
      accessibilityRole="button"
      accessibilityLabel={isVideo ? t("rvPlayVideo") : t("rvViewPhoto")}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.fill} contentFit="cover" transition={120} />
      ) : null}
      {isVideo ? (
        <View style={[styles.playCircle, small && styles.playCircleSmall]} pointerEvents="none">
          <MaterialIcons
            name="play-arrow"
            size={moderateWidthScale(small ? 18 : 24)}
            color={theme.white}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/** The customer's photo and video on a review; renders nothing without media. */
export function ReviewMediaStrip({
  imageUrl,
  videoUrl,
  size = widthScale(72),
  style,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useStyles();
  const { open, viewer } = useMediaViewer();
  const image = resolveApiImageUrl(imageUrl);
  const video = resolveApiImageUrl(videoUrl);
  if (!image && !video) return null;
  return (
    <View style={[styles.strip, style]}>
      {image ? (
        <StripThumb kind="image" uri={image} size={size} onPress={() => open("image", image)} />
      ) : null}
      {video ? (
        <StripThumb kind="video" uri={video} size={size} onPress={() => open("video", video)} />
      ) : null}
      {viewer}
    </View>
  );
}

/** "Served by Alex" on a business review. */
export function ReviewServedBy({
  name,
  image,
  style,
}: {
  name: string;
  image?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useStyles();
  const { t } = useTranslation();
  const uri = resolveApiImageUrl(image);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const fallback = (
    <View style={styles.servedAvatar}>
      <Text style={styles.servedInitial}>{initial}</Text>
    </View>
  );
  return (
    <View style={[styles.servedBy, style]}>
      {uri ? <AppImage uri={uri} style={styles.servedAvatar} fallback={fallback} /> : fallback}
      <Text style={styles.servedText} numberOfLines={1}>
        {t("rvServedBy")} <Text style={styles.servedName}>{name}</Text>
      </Text>
    </View>
  );
}

/** ★ 4.5 (12) — a staff member's (or business's) rating. Hidden with no reviews. */
export function RatingBadge({
  average,
  count,
  overlay = false,
  showCount = true,
  style,
}: {
  average: unknown;
  count?: number | null;
  /** Light pill for use over a photo */
  overlay?: boolean;
  showCount?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const value = parseRating(average);
  const total = count ?? 0;
  if (total <= 0 || value <= 0) return null;
  return (
    <View
      style={[styles.badge, overlay && styles.badgeOverlay, style]}
      accessible
      accessibilityLabel={t("rvRatingA11y", { rating: value.toFixed(1), count: total })}
    >
      <MaterialIcons name="star" size={moderateWidthScale(14)} color={theme.orangeBrown} />
      <Text style={styles.badgeValue}>{value.toFixed(1)}</Text>
      {showCount ? <Text style={styles.badgeCount}>({total})</Text> : null}
    </View>
  );
}
