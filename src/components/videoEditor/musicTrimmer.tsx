import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

/**
 * Music section picker: the whole song is drawn across the strip and a box
 * (= reel length) sits on top. Drag the box — or tap anywhere — to choose the
 * part that plays. The waveform is decorative (seeded from the uri); we don't
 * decode audio.
 */
type Props = {
  /** Seeds the decorative waveform so each song looks different. */
  seed: string;
  musicDurationMs: number;
  /** Reel length — the box width. */
  windowMs: number;
  startMs: number;
  /** Reel playhead (0..windowMs), or null to hide the play line. */
  playheadMs: number | null;
  disabled?: boolean;
  onDragStart: () => void;
  onChange: (startMs: number) => void;
};

const BAR_W = 3;
const BAR_GAP = 2;
const BAR_STEP = BAR_W + BAR_GAP;
const WAVE_H = heightScale(40);
const STRIP_H = WAVE_H + moderateHeightScale(14);
/** Keeps the box grabbable when the song is much longer than the reel. */
const MIN_BOX_W = moderateWidthScale(44);
const TAP_SLOP = 4;

function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic, music-looking bar heights (0.2–1). */
function barHeight(seed: number, i: number): number {
  let x = (seed ^ Math.imul(i + 1, 2654435761)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const noise = ((x >>> 0) % 1000) / 1000;
  const swell = 0.55 + 0.35 * Math.sin(i / 6 + (seed % 7));
  return Math.max(0.2, Math.min(1, swell * (0.55 + noise * 0.6)));
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: moderateHeightScale(6),
    },
    range: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    total: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    strip: {
      height: STRIP_H,
      justifyContent: "center",
    },
    dim: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.55)",
      pointerEvents: "none",
    },
    box: {
      position: "absolute",
      top: 0,
      bottom: 0,
      borderWidth: 2,
      borderColor: theme.white,
      borderRadius: moderateWidthScale(10),
      backgroundColor: "rgba(255,255,255,0.08)",
      pointerEvents: "none",
    },
    boxActive: { borderColor: theme.orangeBrown },
    playLine: {
      position: "absolute",
      top: moderateHeightScale(5),
      bottom: moderateHeightScale(5),
      width: 2,
      borderRadius: 1,
      backgroundColor: theme.orangeBrown,
      pointerEvents: "none",
    },
    hint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      textAlign: "center",
      marginTop: moderateHeightScale(6),
    },
  });

export default function MusicTrimmer({
  seed,
  musicDurationMs,
  windowMs,
  startMs,
  playheadMs,
  disabled,
  onDragStart,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [width, setWidth] = useState(0);
  /** Box left edge (px) while dragging; null = follow `startMs`. */
  const [dragLeft, setDragLeft] = useState<number | null>(null);

  const maxStartMs = Math.max(0, musicDurationMs - windowMs);
  const boxW =
    musicDurationMs > 0
      ? Math.min(width, Math.max(MIN_BOX_W, (windowMs / musicDurationMs) * width))
      : width;
  const travel = Math.max(0, width - boxW);

  const leftFromMs = (ms: number) =>
    maxStartMs > 0 ? (Math.min(ms, maxStartMs) / maxStartMs) * travel : 0;
  const msFromLeft = (left: number) =>
    travel > 0 ? (Math.max(0, Math.min(travel, left)) / travel) * maxStartMs : 0;

  const boxLeft = dragLeft ?? leftFromMs(startMs);
  const shownStart = msFromLeft(boxLeft);

  // PanResponder is created once — read live values through a ref.
  const live = useRef({ boxLeft, travel, boxW, disabled, onDragStart, onChange, msFromLeft });
  live.current = { boxLeft, travel, boxW, disabled, onDragStart, onChange, msFromLeft };
  const grabLeftRef = useRef(0);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.disabled,
        onMoveShouldSetPanResponder: () => !live.current.disabled,
        // Keep the gesture — parent Pressable / scroll views must not steal it.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          grabLeftRef.current = live.current.boxLeft;
          live.current.onDragStart();
        },
        onPanResponderMove: (_, g) => {
          const { travel: tr } = live.current;
          setDragLeft(Math.max(0, Math.min(tr, grabLeftRef.current + g.dx)));
        },
        onPanResponderRelease: (e, g) => {
          const { travel: tr, boxW: bw, msFromLeft: toMs, onChange: emit } =
            live.current;
          let left = Math.max(0, Math.min(tr, grabLeftRef.current + g.dx));
          if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) {
            // Tap → center the box where the finger landed.
            left = Math.max(0, Math.min(tr, e.nativeEvent.locationX - bw / 2));
          }
          setDragLeft(null);
          emit(Math.round(toMs(left) / 100) * 100);
        },
        onPanResponderTerminate: () => setDragLeft(null),
      }),
    [],
  );

  // A new song / undo while dragging → drop the stale drag.
  useEffect(() => {
    setDragLeft(null);
  }, [seed]);

  const seedNum = useMemo(() => hashSeed(seed), [seed]);
  const wavePath = useMemo(() => {
    let d = "";
    for (let x = 0, i = 0; x + BAR_W <= width; x += BAR_STEP, i++) {
      const h = barHeight(seedNum, i) * WAVE_H;
      const y = (WAVE_H - h) / 2;
      d += `M${x} ${y}h${BAR_W}v${h}h-${BAR_W}z`;
    }
    return d;
  }, [seedNum, width]);

  const playX =
    playheadMs != null && dragLeft == null && windowMs > 0
      ? boxLeft + Math.min(1, Math.max(0, playheadMs / windowMs)) * boxW
      : null;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.range}>
          {formatMs(shownStart)} – {formatMs(shownStart + windowMs)}
        </Text>
        <Text style={styles.total}>{formatMs(musicDurationMs)}</Text>
      </View>

      <View
        style={styles.strip}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        {...pan.panHandlers}
      >
        {width > 0 ? (
          <>
            <Svg width={width} height={WAVE_H} pointerEvents="none">
              <Path d={wavePath} fill={theme.white} />
            </Svg>
            <View style={[styles.dim, { left: 0, width: boxLeft }]} />
            <View
              style={[
                styles.dim,
                { left: boxLeft + boxW, width: Math.max(0, width - boxLeft - boxW) },
              ]}
            />
            <View
              style={[
                styles.box,
                dragLeft != null && styles.boxActive,
                { left: boxLeft, width: boxW },
              ]}
            />
            {playX != null ? <View style={[styles.playLine, { left: playX }]} /> : null}
          </>
        ) : null}
      </View>

      <Text style={styles.hint}>{t("musicTrimHint")}</Text>
    </View>
  );
}
