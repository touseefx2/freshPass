import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

/**
 * CapCut-style clip editing: the selected clip plays on top, every clip sits
 * in one row underneath (number, frame, seconds). Tapping a clip selects it;
 * the screen shows its few actions below the row.
 */

export type ClipState = "ai" | "changed" | "own" | "missing";

export type ClipItem = {
  key: string;
  label: string;
  /** "6s" — how long it plays in the reel */
  secondsLabel: string | null;
  thumbUri: string | null;
  thumbLoading: boolean;
  isVideo: boolean;
  state: ClipState;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    preview: {
      borderRadius: moderateWidthScale(18),
      overflow: "hidden",
      backgroundColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    previewEmpty: {
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(24),
    },
    previewEmptyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white80,
      textAlign: "center",
    },
    previewTag: {
      position: "absolute",
      left: moderateWidthScale(10),
      top: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(12),
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    previewTagText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    row: {
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(2),
    },
    tile: {
      width: moderateWidthScale(66),
      height: moderateWidthScale(88),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.lightGreen1,
      borderWidth: 2.5,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    tileSelected: {
      borderColor: theme.selectCard,
    },
    tileMissing: {
      borderColor: theme.red,
      borderStyle: "dashed",
      backgroundColor: theme.lightRed,
    },
    tileImage: {
      ...StyleSheet.absoluteFillObject,
    },
    tileNumber: {
      position: "absolute",
      left: moderateWidthScale(5),
      top: moderateWidthScale(4),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowRadius: 3,
    },
    tileNumberDark: {
      color: theme.darkGreen,
      textShadowRadius: 0,
    },
    tileSeconds: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingVertical: moderateHeightScale(3),
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      textAlign: "center",
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    tileDot: {
      position: "absolute",
      right: moderateWidthScale(5),
      top: moderateWidthScale(5),
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
      borderWidth: 1.5,
      borderColor: theme.white,
    },
  });

/** The selected clip, looping its part of the video (muted — the reel has its own music). */
export function ClipPreview({
  videoUri,
  at,
  seconds,
  imageUri,
  tag,
  emptyText,
}: {
  /** Video to play from `at` for `seconds` (null → image / empty state) */
  videoUri: string | null;
  at: number;
  seconds: number | null;
  imageUri: string | null;
  tag: string | null;
  /** Shown when there's nothing to play yet (a missing moment) */
  emptyText: string;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(windowHeight * 0.25);

  return (
    <View style={[styles.preview, { height }]}>
      {videoUri ? (
        <LoopingClip key={videoUri} uri={videoUri} at={at} seconds={seconds} />
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />
      ) : (
        <View style={styles.previewEmpty}>
          <MaterialIcons
            name="touch-app"
            size={moderateWidthScale(34)}
            color={theme.white80}
          />
          <Text style={styles.previewEmptyText}>{emptyText}</Text>
        </View>
      )}
      {tag ? (
        <View style={styles.previewTag} pointerEvents="none">
          <Text style={styles.previewTagText}>{tag}</Text>
        </View>
      ) : null}
    </View>
  );
}

function LoopingClip({
  uri,
  at,
  seconds,
}: {
  uri: string;
  at: number;
  seconds: number | null;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = !seconds;
    p.timeUpdateEventInterval = 0.2;
  });

  // Jump to the clip whenever it changes, then play just that part
  useEffect(() => {
    player.currentTime = at;
    player.play();
  }, [at, player]);

  useEffect(() => {
    if (!seconds) return;
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      if (currentTime >= at + seconds || currentTime < at - 0.5) {
        player.currentTime = at;
      }
    });
    return () => sub.remove();
  }, [at, player, seconds]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      // SurfaceView under overlays freezes on Android
      {...(Platform.OS === "android"
        ? { surfaceType: "textureView" as const }
        : null)}
    />
  );
}

/** One row of clips; the selected one is outlined. */
export function ClipStrip({
  items,
  selectedKey,
  onSelect,
}: {
  items: ClipItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item, index) => {
        const selected = item.key === selectedKey;
        const missing = item.state === "missing";
        const hasThumb = !!item.thumbUri;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            onPress={() => onSelect(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={[
              `${index + 1}. ${item.label}`,
              item.secondsLabel,
              missing ? t("designNotFound") : null,
            ]
              .filter(Boolean)
              .join(", ")}
            style={[
              styles.tile,
              missing && styles.tileMissing,
              selected && styles.tileSelected,
            ]}
          >
            {hasThumb ? (
              <Image
                source={{ uri: item.thumbUri! }}
                style={styles.tileImage}
                contentFit="cover"
              />
            ) : item.thumbLoading ? (
              <ActivityIndicator color={theme.buttonBack} />
            ) : (
              <MaterialIcons
                name={missing ? "priority-high" : item.isVideo ? "videocam" : "photo"}
                size={moderateWidthScale(24)}
                color={missing ? theme.red : theme.buttonBack}
              />
            )}
            <Text style={[styles.tileNumber, !hasThumb && styles.tileNumberDark]}>
              {index + 1}
            </Text>
            {item.state === "changed" || item.state === "own" ? (
              <View style={styles.tileDot} />
            ) : null}
            {item.secondsLabel ? (
              <Text style={styles.tileSeconds}>{item.secondsLabel}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
