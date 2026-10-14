import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import FlowButton from "@/src/components/reelFlow/flowButton";

/**
 * Pick another part of the uploaded video for one slot, CapCut style: the
 * video's frames in a strip with a box the size of the clip — drag the box,
 * the preview plays that part. Photo slots pick one frame (a thin marker).
 * No AI involved; the parent decides what saving it costs.
 */

/** Frames in the strip */
const STRIP_FRAMES = 10;

export function formatMoment(seconds: number): string {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const tenths = Math.round((total % 1) * 10) % 10;
  return `${m}:${String(s).padStart(2, "0")}${tenths ? `.${tenths}` : ""}`;
}

type Props = {
  visible: boolean;
  videoUrl: string;
  label: string;
  /** Video slots: clip length played from the moment */
  clipSeconds: number | null;
  /** Video length from the server (falls back to the player's) */
  videoSeconds: number | null;
  initialAt: number | null;
  /** Shown until the video can play (the clip's frame) */
  posterUri?: string | null;
  onCancel: () => void;
  onDone: (at: number) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.black },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(10),
    },
    close: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    videoArea: { flex: 1 },
    center: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    cornerSpinner: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(16),
    },
    playCircle: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: widthScale(32),
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    panel: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(26),
      borderTopRightRadius: moderateWidthScale(26),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(18),
      gap: moderateHeightScale(10),
    },
    range: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    hint: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    strip: {
      height: moderateHeightScale(62),
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.darkGreen,
      marginTop: moderateHeightScale(4),
    },
    frames: { flex: 1, flexDirection: "row" },
    frame: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)" },
    frameImage: { width: "100%", height: "100%" },
    shade: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    box: {
      position: "absolute",
      top: 0,
      bottom: 0,
      borderWidth: 3,
      borderColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "space-between",
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(2),
    },
    grip: {
      width: moderateWidthScale(4),
      height: moderateHeightScale(20),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.white,
    },
    ends: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    endText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
  });

export default function MomentPickerModal(props: Props) {
  // Mount the player only while open
  return props.visible ? <MomentPicker {...props} /> : null;
}

function MomentPicker({
  visible,
  videoUrl,
  label,
  clipSeconds,
  videoSeconds,
  initialAt,
  posterUri,
  onCancel,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = true;
    p.timeUpdateEventInterval = 0.1;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const [duration, setDuration] = useState<number | null>(videoSeconds);
  useEffect(() => {
    if (status === "readyToPlay" && player.duration > 0 && !videoSeconds) {
      setDuration(player.duration);
    }
  }, [player, status, videoSeconds]);

  const clip = clipSeconds ?? 0;
  const max = Math.max(0, (duration ?? 0) - clip);
  const [at, setAt] = useState(() => Math.min(initialAt ?? 0, max || Infinity));
  const atRef = useRef(at);
  atRef.current = at;

  // Clamp once the real length is known
  useEffect(() => {
    if (duration == null) return;
    setAt((prev) => Math.min(Math.max(0, prev), max));
  }, [duration, max]);

  // Ready: show the clip and play it (video slots loop their part)
  const [firstFrame, setFirstFrame] = useState(false);
  useEffect(() => {
    if (status !== "readyToPlay") return;
    player.currentTime = atRef.current;
    if (clip) player.play();
  }, [clip, player, status]);

  useEffect(() => {
    if (!clip) return;
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      if (currentTime >= atRef.current + clip) {
        player.currentTime = atRef.current;
      }
    });
    return () => sub.remove();
  }, [clip, player]);

  // The strip: frames across the whole video, loaded one by one
  const [frames, setFrames] = useState<(string | null)[]>(() =>
    Array(STRIP_FRAMES).fill(null),
  );
  // Only once the video shows: both read the same file over the network, and
  // the preview matters more than the strip
  const stripCanLoad = firstFrame || status === "error";
  useEffect(() => {
    if (!duration || !stripCanLoad) return;
    let cancelled = false;
    // Nearest the current clip first, a few at a time (each one reads the
    // video over the network)
    const start = Math.floor((atRef.current / duration) * STRIP_FRAMES);
    const queue = Array.from({ length: STRIP_FRAMES }, (_, i) => i).sort(
      (a, b) => Math.abs(a - start) - Math.abs(b - start),
    );
    const worker = async () => {
      while (!cancelled && queue.length) {
        const i = queue.shift()!;
        const time = ((i + 0.5) / STRIP_FRAMES) * duration;
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(videoUrl, {
            time: Math.round(time * 1000),
            quality: 0.35,
          });
          if (cancelled) return;
          setFrames((prev) => {
            const next = [...prev];
            next[i] = thumb.uri;
            return next;
          });
        } catch {
          // Cosmetic — the slot stays plain
        }
      }
    };
    void Promise.all([worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [duration, stripCanLoad, videoUrl]);

  // Dragging the box (or tapping the strip to jump there)
  const [stripWidth, setStripWidth] = useState(0);
  const boxWidth =
    duration && stripWidth
      ? clip
        ? Math.max(moderateWidthScale(28), (clip / duration) * stripWidth)
        : moderateWidthScale(14)
      : 0;
  const dragRef = useRef({ startAt: 0 });
  // While dragging the video isn't seeked (slow over the network) — the
  // strip's frame shows instead, and stays until the video plays there
  const [scrubbing, setScrubbing] = useState(false);
  const [waitingSeek, setWaitingSeek] = useState(false);
  useEffect(() => {
    if (isPlaying) setWaitingSeek(false);
  }, [isPlaying]);
  const geometryRef = useRef({ stripWidth, boxWidth, duration, max });
  geometryRef.current = { stripWidth, boxWidth, duration, max };

  const moveTo = (next: number) => {
    const { max: limit } = geometryRef.current;
    // Whole seconds read simply ("1:42 – 1:50"); the very end may be a fraction
    const clamped = Math.min(Math.max(0, Math.round(next)), limit);
    setAt(clamped);
    atRef.current = clamped;
  };

  /** One seek when the finger lifts, then play the chosen part. */
  const settle = () => {
    setScrubbing(false);
    setWaitingSeek(true);
    player.currentTime = atRef.current;
    if (clip) player.play();
    else setWaitingSeek(false);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { stripWidth: w, boxWidth: bw, duration: d } = geometryRef.current;
          if (!w || !d) return;
          player.pause();
          setScrubbing(true);
          const x = event.nativeEvent.locationX;
          const boxLeft = (atRef.current / d) * w;
          // Touch outside the box: centre the box there first
          if (x < boxLeft || x > boxLeft + bw) {
            moveTo(((x - bw / 2) / w) * d);
          }
          dragRef.current.startAt = atRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const { stripWidth: w, duration: d } = geometryRef.current;
          if (!w || !d) return;
          moveTo(dragRef.current.startAt + (gesture.dx / w) * d);
        },
        onPanResponderRelease: () => settle(),
        onPanResponderTerminate: () => settle(),
      }),
    // moveTo reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clip, player],
  );

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    player.currentTime = atRef.current;
    player.play();
  };

  const ready = status === "readyToPlay" && duration != null;
  // The strip frame nearest the box (instant, no network)
  const stripFrame = (() => {
    if (!duration) return null;
    const target = Math.min(
      frames.length - 1,
      Math.floor(((at + clip / 2) / duration) * frames.length),
    );
    // Not loaded yet → the closest one that is
    for (let d = 0; d < frames.length; d += 1) {
      const hit = frames[target - d] ?? frames[target + d];
      if (hit) return hit;
    }
    return null;
  })();
  const showStripFrame = (scrubbing || waitingSeek) && !!stripFrame;
  const boxLeft = duration && stripWidth ? (at / duration) * stripWidth : 0;
  const rangeLabel = clip
    ? `${formatMoment(at)} – ${formatMoment(at + clip)}`
    : formatMoment(at);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      supportedOrientations={["portrait"]}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View
          style={[styles.header, { paddingTop: insets.top + moderateHeightScale(8) }]}
        >
          <TouchableOpacity
            style={styles.close}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          >
            <MaterialIcons name="close" size={moderateWidthScale(24)} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {clip ? `${label} · ${Math.round(clip)}s` : label}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.videoArea}
          activeOpacity={1}
          onPress={togglePlay}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? t("pause") : t("play")}
        >
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
            onFirstFrameRender={() => setFirstFrame(true)}
            {...(Platform.OS === "android"
              ? { surfaceType: "textureView" as const }
              : null)}
          />
          {/* Until the video shows, the clip's frame — never a black screen */}
          {showStripFrame ? (
            <Image
              source={{ uri: stripFrame! }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
          ) : !firstFrame && posterUri && !scrubbing && !waitingSeek ? (
            <Image
              source={{ uri: posterUri }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
          ) : null}
          {!firstFrame && !posterUri && !showStripFrame ? (
            <View style={styles.center} pointerEvents="none">
              <ActivityIndicator color={theme.white} />
            </View>
          ) : !ready || waitingSeek ? (
            // Something is on screen — only a small sign that it's loading
            <ActivityIndicator
              style={styles.cornerSpinner}
              color={theme.white}
              size="small"
            />
          ) : !isPlaying && !scrubbing ? (
            <View style={styles.center} pointerEvents="none">
              <View style={styles.playCircle}>
                <MaterialIcons
                  name="play-arrow"
                  size={moderateWidthScale(38)}
                  color={theme.white}
                />
              </View>
            </View>
          ) : null}
        </TouchableOpacity>

        <View
          style={[
            styles.panel,
            { paddingBottom: Math.max(insets.bottom, moderateHeightScale(14)) },
          ]}
        >
          <Text style={styles.range}>{rangeLabel}</Text>
          <Text style={styles.hint}>
            {clip
              ? t("autoBuildDragHint", { seconds: Math.round(clip) })
              : t("designMomentPhotoSub")}
          </Text>
          <View
            style={styles.strip}
            onLayout={(event) => setStripWidth(event.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel={rangeLabel}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(event) => {
              moveTo(
                atRef.current +
                  (event.nativeEvent.actionName === "increment" ? 1 : -1),
              );
              settle();
            }}
          >
            <View style={styles.frames} pointerEvents="none">
              {frames.map((uri, index) => (
                <View key={index} style={styles.frame}>
                  {uri ? (
                    <Image
                      source={{ uri }}
                      style={styles.frameImage}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
              ))}
            </View>
            {boxWidth ? (
              <>
                <View
                  pointerEvents="none"
                  style={[styles.shade, { left: 0, width: boxLeft }]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.shade,
                    { left: boxLeft + boxWidth, right: 0 },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[styles.box, { left: boxLeft, width: boxWidth }]}
                >
                  {clip ? (
                    <>
                      <View style={styles.grip} />
                      <View style={styles.grip} />
                    </>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
          <View style={styles.ends}>
            <Text style={styles.endText}>0:00</Text>
            <Text style={styles.endText}>
              {duration ? formatMoment(duration) : ""}
            </Text>
          </View>
          <FlowButton
            label={t("done")}
            icon="check"
            onPress={() => onDone(Math.round(at * 10) / 10)}
            disabled={duration == null}
          />
        </View>
      </View>
    </Modal>
  );
}
