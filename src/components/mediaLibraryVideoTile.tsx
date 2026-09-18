import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { MediaVideo } from "@/src/types/media";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  extractVideoThumbnail,
  getCachedVideoThumbnail,
} from "@/src/utils/videoThumbnailCache";

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type MediaLibraryVideoTileProps = {
  video: MediaVideo;
  width: number;
  onLongPress: (video: MediaVideo) => void;
  onDeletePress?: (video: MediaVideo) => void;
  onPublishPress?: (video: MediaVideo) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tile: {
      aspectRatio: 1,
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    overlayCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(6),
    },
    processingText: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
    },
    failedText: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
    },
    durationBadge: {
      position: "absolute",
      bottom: moderateHeightScale(6),
      right: moderateWidthScale(6),
      backgroundColor: theme.lightGreen4,
      borderRadius: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(5),
      paddingVertical: moderateHeightScale(2),
    },
    durationText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    menuButton: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen4,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteChip: {
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.red,
    },
    deleteChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    reelBadge: {
      position: "absolute",
      top: moderateHeightScale(6),
      left: moderateWidthScale(6),
      backgroundColor: theme.selectCard,
      borderRadius: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(5),
      paddingVertical: moderateHeightScale(2),
    },
    reelBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    publishChip: {
      position: "absolute",
      bottom: moderateHeightScale(6),
      left: moderateWidthScale(6),
      backgroundColor: theme.buttonBack,
      borderRadius: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(3),
    },
    publishChipText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

export default function MediaLibraryVideoTile({
  video,
  width,
  onLongPress,
  onDeletePress,
  onPublishPress,
}: MediaLibraryVideoTileProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const serverThumb = resolveApiImageUrl(video.thumbnail_url);
  const [localThumb, setLocalThumb] = useState<string | null>(
    () => getCachedVideoThumbnail(video.id) ?? null,
  );
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedVideoThumbnail(video.id);
    if (cached) {
      setLocalThumb(cached);
      return;
    }

    if (serverThumb) {
      setLocalThumb(serverThumb);
    }

    const playbackUrl = resolveApiImageUrl(video.playback_url);
    if (!playbackUrl) return;

    // Prefer lazy first-frame extraction for tiles on screen
    setExtracting(true);
    extractVideoThumbnail(video.id, playbackUrl)
      .then((uri) => {
        if (!cancelled && uri) setLocalThumb(uri);
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [video.id, video.playback_url, video.thumbnail_url, serverThumb]);

  const durationLabel = formatDuration(video.duration_seconds);
  const isProcessing = video.status === "processing";
  const isFailed = video.status === "failed";
  const showImage = !isProcessing && !isFailed && !!localThumb;

  return (
    <TouchableOpacity
      style={[styles.tile, { width }]}
      activeOpacity={0.85}
      onLongPress={() => onLongPress(video)}
      delayLongPress={350}
    >
      {showImage ? (
        <Image
          source={{ uri: localThumb! }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          {!isProcessing && !isFailed && (
            <>
              {extracting ? (
                <ActivityIndicator size="small" color={theme.darkGreen} />
              ) : (
                <MaterialIcons
                  name="videocam"
                  size={moderateWidthScale(28)}
                  color={theme.lightGreen}
                />
              )}
            </>
          )}
        </View>
      )}

      {isProcessing && (
        <View style={styles.overlayCenter}>
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.processingText}>{t("videoProcessing")}</Text>
        </View>
      )}

      {isFailed && (
        <View style={styles.overlayCenter}>
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
          <Text style={styles.failedText} numberOfLines={2}>
            {video.failure_reason || t("videoFailed")}
          </Text>
          {onDeletePress && (
            <TouchableOpacity
              style={styles.deleteChip}
              onPress={() => onDeletePress(video)}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteChipText}>{t("delete")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {durationLabel && video.status === "ready" && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{durationLabel}</Text>
        </View>
      )}

      {!!video.reel_id && video.status === "ready" && (
        <View style={styles.reelBadge}>
          <Text style={styles.reelBadgeText}>{t("inReel")}</Text>
        </View>
      )}

      {video.status === "ready" && !video.reel_id && onPublishPress && (
        <TouchableOpacity
          style={styles.publishChip}
          onPress={() => onPublishPress(video)}
          activeOpacity={0.85}
        >
          <Text style={styles.publishChipText}>{t("publish")}</Text>
        </TouchableOpacity>
      )}

      {!isFailed && (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => onLongPress(video)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name="more-vert"
            size={moderateWidthScale(16)}
            color={theme.white}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
