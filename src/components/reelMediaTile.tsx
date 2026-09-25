import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { extractLocalVideoThumbnail } from "@/src/utils/videoThumbnailCache";

export type ReelMediaItem = {
  id: string;
  uri: string;
  type: "image" | "video";
  thumbnailUri?: string;
  durationMs?: number;
};

type ReelMediaTileProps = {
  media: ReelMediaItem;
  index: number;
  width: number;
  onPress: (media: ReelMediaItem) => void;
  onRemove: (id: string) => void;
  onThumbnailReady?: (id: string, thumbnailUri: string) => void;
};

function formatDurationMs(durationMs?: number): string | null {
  if (durationMs == null || Number.isNaN(durationMs) || durationMs <= 0) {
    return null;
  }
  // expo-image-picker may report seconds on some Android builds
  const totalSeconds =
    durationMs > 1000
      ? Math.round(durationMs / 1000)
      : Math.round(durationMs);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tile: {
      aspectRatio: 1,
      borderRadius: moderateWidthScale(12),
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
    dimOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.lightGreen2,
    },
    playCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircle: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.lightGreen4,
      alignItems: "center",
      justifyContent: "center",
    },
    orderBadge: {
      position: "absolute",
      top: moderateHeightScale(6),
      left: moderateWidthScale(6),
      minWidth: widthScale(22),
      height: widthScale(22),
      borderRadius: widthScale(11),
      paddingHorizontal: moderateWidthScale(4),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    orderText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    durationBadge: {
      position: "absolute",
      bottom: moderateHeightScale(6),
      left: moderateWidthScale(6),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
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
    typeBadge: {
      position: "absolute",
      bottom: moderateHeightScale(6),
      right: moderateWidthScale(6),
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(5),
      paddingVertical: moderateHeightScale(2),
    },
    typeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.3,
    },
    removeButton: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
  });

export default function ReelMediaTile({
  media,
  index,
  width,
  onPress,
  onRemove,
  onThumbnailReady,
}: ReelMediaTileProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [thumbUri, setThumbUri] = useState<string | undefined>(
    media.type === "video" ? media.thumbnailUri : media.uri,
  );
  const [loadingThumb, setLoadingThumb] = useState(
    media.type === "video" && !media.thumbnailUri,
  );

  useEffect(() => {
    let cancelled = false;

    if (media.type === "image") {
      setThumbUri(media.uri);
      setLoadingThumb(false);
      return;
    }

    if (media.thumbnailUri && media.thumbnailUri !== media.uri) {
      setThumbUri(media.thumbnailUri);
      setLoadingThumb(false);
      return;
    }

    setLoadingThumb(true);
    void (async () => {
      const extracted = await extractLocalVideoThumbnail(media.uri);
      if (cancelled) return;
      if (extracted) {
        setThumbUri(extracted);
        onThumbnailReady?.(media.id, extracted);
      }
      setLoadingThumb(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [media.id, media.uri, media.type, media.thumbnailUri, onThumbnailReady]);

  const durationLabel = formatDurationMs(media.durationMs);
  const isVideo = media.type === "video";

  return (
    <TouchableOpacity
      style={[styles.tile, { width }]}
      onPress={() => onPress(media)}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {thumbUri ? (
        <AppImage uri={thumbUri} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          {loadingThumb ? (
            <ActivityIndicator size="small" color={theme.darkGreen} />
          ) : (
            <MaterialIcons
              name={isVideo ? "videocam" : "image"}
              size={moderateWidthScale(28)}
              color={theme.lightGreen}
            />
          )}
        </View>
      )}

      {isVideo && (
        <>
          <View style={styles.dimOverlay} pointerEvents="none" />
          <View style={styles.playCenter} pointerEvents="none">
            <View style={styles.playCircle}>
              <MaterialIcons
                name="play-arrow"
                size={moderateWidthScale(20)}
                color={theme.white}
              />
            </View>
          </View>
          {durationLabel ? (
            <View style={styles.durationBadge}>
              <MaterialIcons
                name="videocam"
                size={moderateWidthScale(10)}
                color={theme.white}
              />
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
          ) : (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>VIDEO</Text>
            </View>
          )}
        </>
      )}

      <View style={styles.orderBadge} pointerEvents="none">
        <Text style={styles.orderText}>{index + 1}</Text>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(media.id)}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <MaterialIcons
          name="close"
          size={moderateWidthScale(14)}
          color={theme.white}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
