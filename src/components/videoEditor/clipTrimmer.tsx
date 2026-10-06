import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { FILMSTRIP_FRAMES, MIN_CLIP_MS, type EditorClip } from "./editorModel";

export type TrimEdge = "start" | "end";

type Props = {
  clip: EditorClip;
  /** Frames across the whole source file; undefined while loading. */
  frames?: (string | null)[];
  /** Longest this clip may be (account limit minus the other clips). */
  maxLengthMs: number;
  /** Playhead position in SOURCE ms, or null when it isn't on this clip. */
  playheadMs: number | null;
  disabled: boolean;
  onTrimBegin: () => void;
  onTrimChange: (edge: TrimEdge, ms: number) => void;
  onTrimEnd: () => void;
  onScrubBegin: () => void;
  onScrub: (ms: number) => void;
  onScrubEnd: () => void;
};

const HANDLE_W = widthScale(16);
const STRIP_H = heightScale(52);
/**
 * Grab area grows INWARD (over the strip). Outward slop would sit in the
 * Android back-gesture edge zone, where the system eats the drag.
 */
const START_HIT_SLOP = { left: 6, right: 22, top: 12, bottom: 12 };
const END_HIT_SLOP = { left: 22, right: 6, top: 12, bottom: 12 };
/**
 * Android gesture navigation claims ~24dp at each screen edge for "back";
 * a drag that starts there never reaches the app. Keep the handles clear.
 */
const ANDROID_EDGE_INSET = moderateWidthScale(24);
/** Throttle JS updates while dragging (each one re-renders + seeks the preview). */
const SEND_EVERY_MS = 40;
/** Screen-reader increment for the adjustable trim handles. */
const A11Y_STEP_MS = 250;

const DRAG_NONE = 0;
const DRAG_START = 1;
const DRAG_END = 2;
const DRAG_SCRUB = 3;

/** m:ss.d — trimming needs sub-second precision. */
export function formatPrecise(ms: number): string {
  const tenths = Math.max(0, Math.round(ms / 100));
  const totalSeconds = Math.floor(tenths / 10);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}.${tenths % 10}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      height: STRIP_H,
      marginTop: moderateHeightScale(8),
      marginHorizontal: Platform.OS === "android" ? ANDROID_EDGE_INSET : 0,
    },
    strip: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: HANDLE_W,
      right: HANDLE_W,
      flexDirection: "row",
      overflow: "hidden",
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.borderDark,
    },
    frame: {
      flex: 1,
      height: "100%",
    },
    frameEmpty: {
      flex: 1,
      height: "100%",
      backgroundColor: theme.black,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.white15,
    },
    dim: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: theme.black,
      opacity: 0.6,
    },
    selectionBar: {
      position: "absolute",
      height: heightScale(3),
      backgroundColor: theme.selectCard,
    },
    handle: {
      position: "absolute",
      top: 0,
      width: HANDLE_W,
      height: STRIP_H,
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
    },
    handleStart: {
      borderTopLeftRadius: moderateWidthScale(6),
      borderBottomLeftRadius: moderateWidthScale(6),
    },
    handleEnd: {
      borderTopRightRadius: moderateWidthScale(6),
      borderBottomRightRadius: moderateWidthScale(6),
    },
    grip: {
      width: widthScale(3),
      height: heightScale(16),
      borderRadius: widthScale(2),
      backgroundColor: theme.white,
    },
    playhead: {
      position: "absolute",
      top: -heightScale(3),
      width: widthScale(3),
      height: STRIP_H + heightScale(6),
      marginLeft: -widthScale(1.5),
      borderRadius: widthScale(2),
      backgroundColor: theme.white,
    },
  });

export default function ClipTrimmer({
  clip,
  frames,
  maxLengthMs,
  playheadMs,
  disabled,
  onTrimBegin,
  onTrimChange,
  onTrimEnd,
  onScrubBegin,
  onScrub,
  onScrubEnd,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [width, setWidth] = useState(0);
  // Bumped when a drag ends so committed props re-sync into the shared values.
  const [dragEpoch, setDragEpoch] = useState(0);

  const durationMs = Math.max(1, clip.sourceDurationMs);
  const trackW = Math.max(1, width - HANDLE_W * 2);

  const startMs = useSharedValue(clip.trimStartMs);
  const endMs = useSharedValue(clip.trimEndMs);
  const playMs = useSharedValue(playheadMs ?? -1);
  const trackWidth = useSharedValue(trackW);
  const dragging = useSharedValue(DRAG_NONE);
  const origin = useSharedValue(0);
  const lastSent = useSharedValue(0);

  useEffect(() => {
    trackWidth.value = trackW;
  }, [trackW, trackWidth]);

  useEffect(() => {
    if (dragging.value !== DRAG_NONE) return;
    startMs.value = clip.trimStartMs;
    endMs.value = clip.trimEndMs;
  }, [
    clip.id,
    clip.trimStartMs,
    clip.trimEndMs,
    dragEpoch,
    dragging,
    endMs,
    startMs,
  ]);

  useEffect(() => {
    if (dragging.value === DRAG_SCRUB) return;
    playMs.value = playheadMs ?? -1;
  }, [dragging, playMs, playheadMs]);

  const endDrag = useMemo(() => () => setDragEpoch((n) => n + 1), []);

  const handleGesture = (edge: TrimEdge) => {
    const isStart = edge === "start";
    return Gesture.Pan()
      .enabled(!disabled)
      .hitSlop(isStart ? START_HIT_SLOP : END_HIT_SLOP)
      .minDistance(1)
      .onStart(() => {
        dragging.value = isStart ? DRAG_START : DRAG_END;
        origin.value = isStart ? startMs.value : endMs.value;
        lastSent.value = 0;
        runOnJS(onTrimBegin)();
      })
      .onUpdate((e) => {
        const raw =
          origin.value + (e.translationX / trackWidth.value) * durationMs;
        let next: number;
        if (isStart) {
          const min = Math.max(0, endMs.value - maxLengthMs);
          next = Math.min(Math.max(raw, min), endMs.value - MIN_CLIP_MS);
          startMs.value = next;
        } else {
          const max = Math.min(durationMs, startMs.value + maxLengthMs);
          next = Math.max(Math.min(raw, max), startMs.value + MIN_CLIP_MS);
          endMs.value = next;
        }
        const now = Date.now();
        if (now - lastSent.value >= SEND_EVERY_MS) {
          lastSent.value = now;
          runOnJS(onTrimChange)(edge, Math.round(next));
        }
      })
      .onEnd(() => {
        runOnJS(onTrimChange)(
          edge,
          Math.round(isStart ? startMs.value : endMs.value),
        );
        dragging.value = DRAG_NONE;
        runOnJS(onTrimEnd)();
        runOnJS(endDrag)();
      });
  };

  const startGesture = useMemo(
    () => handleGesture("start"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      disabled,
      durationMs,
      maxLengthMs,
      onTrimBegin,
      onTrimChange,
      onTrimEnd,
      endDrag,
    ],
  );
  const endGesture = useMemo(
    () => handleGesture("end"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      disabled,
      durationMs,
      maxLengthMs,
      onTrimBegin,
      onTrimChange,
      onTrimEnd,
      endDrag,
    ],
  );

  const scrubGesture = useMemo(() => {
    const toMs = (x: number) => {
      "worklet";
      const ms = (x / trackWidth.value) * durationMs;
      return Math.round(Math.min(endMs.value - 1, Math.max(startMs.value, ms)));
    };
    return Gesture.Pan()
      .enabled(!disabled)
      .minDistance(0)
      .onBegin((e) => {
        dragging.value = DRAG_SCRUB;
        lastSent.value = 0;
        playMs.value = toMs(e.x);
        runOnJS(onScrubBegin)();
        runOnJS(onScrub)(playMs.value);
      })
      .onUpdate((e) => {
        playMs.value = toMs(e.x);
        const now = Date.now();
        if (now - lastSent.value >= SEND_EVERY_MS) {
          lastSent.value = now;
          runOnJS(onScrub)(playMs.value);
        }
      })
      .onFinalize(() => {
        if (dragging.value !== DRAG_SCRUB) return;
        runOnJS(onScrub)(playMs.value);
        dragging.value = DRAG_NONE;
        runOnJS(onScrubEnd)();
      });
  }, [
    disabled,
    dragging,
    durationMs,
    endMs,
    lastSent,
    onScrub,
    onScrubBegin,
    onScrubEnd,
    playMs,
    startMs,
    trackWidth,
  ]);

  const xOf = (ms: number) => {
    "worklet";
    return HANDLE_W + (ms / durationMs) * trackWidth.value;
  };

  const startHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xOf(startMs.value) - HANDLE_W }],
  }));
  const endHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xOf(endMs.value) }],
  }));
  const leftDimStyle = useAnimatedStyle(() => ({
    left: 0,
    width: Math.max(0, xOf(startMs.value) - HANDLE_W),
  }));
  const rightDimStyle = useAnimatedStyle(() => ({
    left: Math.max(0, xOf(endMs.value) - HANDLE_W),
    right: 0,
  }));
  const selectionStyle = useAnimatedStyle(() => ({
    left: xOf(startMs.value),
    width: Math.max(0, xOf(endMs.value) - xOf(startMs.value)),
  }));
  const playheadStyle = useAnimatedStyle(() => {
    const ms = playMs.value;
    const visible =
      ms >= 0 &&
      dragging.value !== DRAG_START &&
      dragging.value !== DRAG_END &&
      ms >= startMs.value - 1 &&
      ms <= endMs.value + 1;
    return {
      opacity: visible ? 1 : 0,
      transform: [{ translateX: xOf(Math.max(0, ms)) }],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  const nudge = (edge: TrimEdge, deltaMs: number) => {
    if (disabled) return;
    onTrimBegin();
    onTrimChange(
      edge,
      (edge === "start" ? clip.trimStartMs : clip.trimEndMs) + deltaMs,
    );
    onTrimEnd();
  };

  const a11yHandleProps = (edge: TrimEdge) => ({
    accessible: true,
    accessibilityRole: "adjustable" as const,
    accessibilityLabel: edge === "start" ? t("trimStart") : t("trimEnd"),
    accessibilityValue: {
      text: formatPrecise(edge === "start" ? clip.trimStartMs : clip.trimEndMs),
    },
    accessibilityActions: [
      { name: "increment" as const },
      { name: "decrement" as const },
    ],
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
      const dir = event.nativeEvent.actionName === "increment" ? 1 : -1;
      nudge(edge, dir * A11Y_STEP_MS);
    },
  });

  const frameCells =
    frames ?? Array.from({ length: FILMSTRIP_FRAMES }, () => null);

  return (
    <View>
      <View style={styles.container} onLayout={onLayout}>
        {width > 0 ? (
          <>
            <GestureDetector gesture={scrubGesture}>
              <View style={styles.strip}>
                {frameCells.map((uri, i) =>
                  uri ? (
                    <Image
                      key={i}
                      source={{ uri }}
                      style={styles.frame}
                      contentFit="cover"
                      transition={100}
                    />
                  ) : (
                    <View key={i} style={styles.frameEmpty} />
                  ),
                )}
                <Animated.View
                  pointerEvents="none"
                  style={[styles.dim, leftDimStyle]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[styles.dim, rightDimStyle]}
                />
              </View>
            </GestureDetector>

            <Animated.View
              pointerEvents="none"
              style={[styles.selectionBar, { top: 0 }, selectionStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.selectionBar, { bottom: 0 }, selectionStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.playhead, playheadStyle]}
            />

            <GestureDetector gesture={startGesture}>
              <Animated.View
                style={[styles.handle, styles.handleStart, startHandleStyle]}
                {...a11yHandleProps("start")}
              >
                <View style={styles.grip} />
              </Animated.View>
            </GestureDetector>
            <GestureDetector gesture={endGesture}>
              <Animated.View
                style={[styles.handle, styles.handleEnd, endHandleStyle]}
                {...a11yHandleProps("end")}
              >
                <View style={styles.grip} />
              </Animated.View>
            </GestureDetector>
          </>
        ) : null}
      </View>
    </View>
  );
}
