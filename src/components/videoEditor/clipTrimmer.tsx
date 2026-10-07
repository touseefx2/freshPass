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
  /** Playhead position in SOURCE ms, or null when it isn't on this clip. */
  playheadMs: number | null;
  disabled: boolean;
  onTrimBegin: () => void;
  onTrimChange: (edge: TrimEdge, ms: number) => void;
  onTrimEnd: () => void;
  /** Slide the whole trim window (length kept) to a new start, SOURCE ms. */
  onTrimMove: (startMs: number) => void;
  onScrubBegin: () => void;
  onScrub: (ms: number) => void;
  onScrubEnd: () => void;
  /**
   * "keep" (default): handles mark the part that stays, outside is dimmed.
   * "remove": handles mark a part to delete — drawn red, nothing dimmed.
   */
  variant?: "keep" | "remove";
  /** false → no handles, the strip only scrubs (Split). */
  showHandles?: boolean;
  /** Taller strip and wider handles (step-by-step Reel Studio). */
  large?: boolean;
};

const HANDLE_W = widthScale(16);
const STRIP_H = heightScale(52);
const LARGE_HANDLE_W = widthScale(26);
const LARGE_STRIP_H = heightScale(68);
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
/** Touches this close to the white line scrub it instead of moving the window. */
const PLAYHEAD_GRAB = widthScale(14);
/** Finger travel before a press inside the window becomes a move (else a tap). */
const MOVE_SLOP = 6;

const DRAG_NONE = 0;
const DRAG_START = 1;
const DRAG_END = 2;
const DRAG_SCRUB = 3;
/** Pressed inside the window — a move once it travels, otherwise a tap. */
const DRAG_PENDING = 4;
const DRAG_MOVE = 5;

/** m:ss.d — trimming needs sub-second precision. */
export function formatPrecise(ms: number): string {
  const tenths = Math.max(0, Math.round(ms / 100));
  const totalSeconds = Math.floor(tenths / 10);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}.${tenths % 10}`;
}

const createStyles = (
  theme: Theme,
  handleW: number = HANDLE_W,
  stripH: number = STRIP_H,
  large: boolean = false,
) =>
  StyleSheet.create({
    container: {
      height: stripH,
      marginTop: moderateHeightScale(8),
      marginHorizontal: Platform.OS === "android" ? ANDROID_EDGE_INSET : 0,
    },
    strip: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: handleW,
      right: handleW,
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
      width: handleW,
      height: stripH,
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
      width: widthScale(large ? 4 : 3),
      height: heightScale(large ? 24 : 16),
      borderRadius: widthScale(2),
      backgroundColor: theme.white,
    },
    removeFill: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(220, 53, 69, 0.38)",
    },
    handleRemove: {
      backgroundColor: theme.red,
    },
    selectionBarRemove: {
      backgroundColor: theme.red,
    },
    playhead: {
      position: "absolute",
      top: -heightScale(3),
      width: widthScale(3),
      height: stripH + heightScale(6),
      marginLeft: -widthScale(1.5),
      borderRadius: widthScale(2),
      backgroundColor: theme.white,
    },
  });

export default function ClipTrimmer({
  clip,
  frames,
  playheadMs,
  disabled,
  onTrimBegin,
  onTrimChange,
  onTrimEnd,
  onTrimMove,
  onScrubBegin,
  onScrub,
  onScrubEnd,
  variant = "keep",
  showHandles = true,
  large = false,
}: Props) {
  const removing = variant === "remove";
  const { colors } = useTheme();
  const theme = colors as Theme;
  const handleW = large ? LARGE_HANDLE_W : HANDLE_W;
  const stripH = large ? LARGE_STRIP_H : STRIP_H;
  const styles = useMemo(
    () => createStyles(theme, handleW, stripH, large),
    [theme, handleW, stripH, large],
  );
  const { t } = useTranslation();

  const [width, setWidth] = useState(0);
  // Bumped when a drag ends so committed props re-sync into the shared values.
  const [dragEpoch, setDragEpoch] = useState(0);

  const durationMs = Math.max(1, clip.sourceDurationMs);
  const trackW = Math.max(1, width - handleW * 2);

  const startMs = useSharedValue(clip.trimStartMs);
  const endMs = useSharedValue(clip.trimEndMs);
  const playMs = useSharedValue(playheadMs ?? -1);
  const trackWidth = useSharedValue(trackW);
  const dragging = useSharedValue(DRAG_NONE);
  const origin = useSharedValue(0);
  const lastSent = useSharedValue(0);
  // Window length while it's being slid, and where the press began
  const moveLen = useSharedValue(0);
  const pressX = useSharedValue(0);

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
          // No length limit here — Next / Save checks the final reel
          next = Math.min(Math.max(raw, 0), endMs.value - MIN_CLIP_MS);
          startMs.value = next;
        } else {
          next = Math.max(Math.min(raw, durationMs), startMs.value + MIN_CLIP_MS);
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
      onTrimBegin,
      onTrimChange,
      onTrimEnd,
      endDrag,
    ],
  );

  /**
   * Strip: drag inside the window slides it (Instagram style), the white line
   * (or anywhere outside the window) scrubs, a tap moves the white line.
   */
  const stripGesture = useMemo(() => {
    const toMs = (x: number) => {
      "worklet";
      const ms = (x / trackWidth.value) * durationMs;
      return Math.round(Math.min(endMs.value - 1, Math.max(startMs.value, ms)));
    };
    const throttled = () => {
      "worklet";
      const now = Date.now();
      if (now - lastSent.value < SEND_EVERY_MS) return false;
      lastSent.value = now;
      return true;
    };
    return Gesture.Pan()
      .enabled(!disabled)
      .minDistance(0)
      .onBegin((e) => {
        lastSent.value = 0;
        pressX.value = e.x;
        const ms = (e.x / trackWidth.value) * durationMs;
        const playX = (playMs.value / durationMs) * trackWidth.value;
        const onPlayhead =
          playMs.value >= 0 && Math.abs(e.x - playX) <= PLAYHEAD_GRAB;
        const len = endMs.value - startMs.value;
        // Whole source selected → nothing to slide, keep plain scrubbing
        // No handles (Split) → the strip only scrubs
        const canMove = showHandles && len < durationMs - 1;
        if (!onPlayhead && canMove && ms > startMs.value && ms < endMs.value) {
          dragging.value = DRAG_PENDING;
          origin.value = startMs.value;
          moveLen.value = len;
          return;
        }
        dragging.value = DRAG_SCRUB;
        playMs.value = toMs(e.x);
        runOnJS(onScrubBegin)();
        runOnJS(onScrub)(playMs.value);
      })
      .onUpdate((e) => {
        if (dragging.value === DRAG_PENDING) {
          if (Math.abs(e.translationX) < MOVE_SLOP) return;
          dragging.value = DRAG_MOVE;
          runOnJS(onTrimBegin)();
        }
        if (dragging.value === DRAG_MOVE) {
          const raw =
            origin.value + (e.translationX / trackWidth.value) * durationMs;
          const next = Math.min(
            Math.max(raw, 0),
            Math.max(0, durationMs - moveLen.value),
          );
          startMs.value = next;
          endMs.value = next + moveLen.value;
          if (throttled()) runOnJS(onTrimMove)(Math.round(next));
          return;
        }
        if (dragging.value !== DRAG_SCRUB) return;
        playMs.value = toMs(e.x);
        if (throttled()) runOnJS(onScrub)(playMs.value);
      })
      .onFinalize(() => {
        if (dragging.value === DRAG_MOVE) {
          runOnJS(onTrimMove)(Math.round(startMs.value));
          dragging.value = DRAG_NONE;
          runOnJS(onTrimEnd)();
          runOnJS(endDrag)();
          return;
        }
        if (dragging.value === DRAG_PENDING) {
          // Plain tap inside the window: put the white line there
          playMs.value = toMs(pressX.value);
          runOnJS(onScrubBegin)();
        } else if (dragging.value !== DRAG_SCRUB) {
          return;
        }
        runOnJS(onScrub)(playMs.value);
        dragging.value = DRAG_NONE;
        runOnJS(onScrubEnd)();
      });
  }, [
    disabled,
    dragging,
    durationMs,
    endDrag,
    endMs,
    lastSent,
    moveLen,
    onScrub,
    onScrubBegin,
    onScrubEnd,
    onTrimBegin,
    onTrimEnd,
    onTrimMove,
    origin,
    playMs,
    pressX,
    showHandles,
    startMs,
    trackWidth,
  ]);

  const xOf = (ms: number) => {
    "worklet";
    return handleW + (ms / durationMs) * trackWidth.value;
  };

  const startHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xOf(startMs.value) - handleW }],
  }));
  const endHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xOf(endMs.value) }],
  }));
  const leftDimStyle = useAnimatedStyle(() => ({
    left: 0,
    width: Math.max(0, xOf(startMs.value) - handleW),
  }));
  const rightDimStyle = useAnimatedStyle(() => ({
    left: Math.max(0, xOf(endMs.value) - handleW),
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
      dragging.value !== DRAG_MOVE &&
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
            <GestureDetector gesture={stripGesture}>
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
                {removing ? null : (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.dim, leftDimStyle]}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.dim, rightDimStyle]}
                    />
                  </>
                )}
              </View>
            </GestureDetector>

            {removing ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.removeFill, selectionStyle]}
              />
            ) : null}
            {showHandles ? (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.selectionBar,
                    removing && styles.selectionBarRemove,
                    { top: 0 },
                    selectionStyle,
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.selectionBar,
                    removing && styles.selectionBarRemove,
                    { bottom: 0 },
                    selectionStyle,
                  ]}
                />
              </>
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[styles.playhead, playheadStyle]}
            />

            {showHandles ? (
              <>
                <GestureDetector gesture={startGesture}>
                  <Animated.View
                    style={[
                      styles.handle,
                      styles.handleStart,
                      removing && styles.handleRemove,
                      startHandleStyle,
                    ]}
                    {...a11yHandleProps("start")}
                  >
                    <View style={styles.grip} />
                  </Animated.View>
                </GestureDetector>
                <GestureDetector gesture={endGesture}>
                  <Animated.View
                    style={[
                      styles.handle,
                      styles.handleEnd,
                      removing && styles.handleRemove,
                      endHandleStyle,
                    ]}
                    {...a11yHandleProps("end")}
                  >
                    <View style={styles.grip} />
                  </Animated.View>
                </GestureDetector>
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}
