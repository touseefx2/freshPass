import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
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
 * "Song part" picker: the whole song is drawn across the strip and an orange
 * box marks the part that's used. Drag the box to move it, drag its edges to
 * make it shorter / longer, or tap the song to move the box there. The
 * waveform is decorative (seeded from the uri); we don't decode audio.
 */
type Props = {
  /** Seeds the decorative waveform so each song looks different. */
  seed: string;
  musicDurationMs: number;
  startMs: number;
  endMs: number;
  /** Ms into the selection that's playing now, or null to hide the line. */
  playheadMs: number | null;
  disabled?: boolean;
  onDragStart: () => void;
  onChange: (startMs: number, endMs: number) => void;
  /** Bigger type (step-by-step Reel Studio). */
  large?: boolean;
};

const BAR_W = 3;
const BAR_GAP = 2;
const BAR_STEP = BAR_W + BAR_GAP;
const WAVE_H = heightScale(40);
const STRIP_H = WAVE_H + moderateHeightScale(14);
const HANDLE_W = moderateWidthScale(14);
/** Finger this close to an edge grabs the edge instead of the box. */
const EDGE_GRAB = moderateWidthScale(22);
const MIN_PART_MS = 1000;
/**
 * Android gesture navigation claims ~24dp at each screen edge for "back";
 * a drag that starts there never reaches the app. Keep the handles clear.
 */
const ANDROID_EDGE_INSET = moderateWidthScale(24);
const TAP_SLOP = 4;

type Drag = "none" | "move" | "start" | "end";

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

const createStyles = (theme: Theme, large: boolean = false) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: moderateHeightScale(6),
    },
    title: {
      fontSize: large ? fontSize.size15 : fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    range: {
      fontSize: large ? fontSize.size15 : fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      fontVariant: ["tabular-nums"],
    },
    strip: {
      height: STRIP_H,
      justifyContent: "center",
    },
    edgeSafe: {
      marginHorizontal: Platform.OS === "android" ? ANDROID_EDGE_INSET : 0,
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
      borderTopWidth: 3,
      borderBottomWidth: 3,
      borderColor: theme.orangeBrown,
      pointerEvents: "none",
    },
    handle: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: HANDLE_W,
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
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
      width: 3,
      height: heightScale(14),
      borderRadius: 2,
      backgroundColor: theme.darkGreen,
    },
    playLine: {
      position: "absolute",
      top: moderateHeightScale(4),
      bottom: moderateHeightScale(4),
      width: 2,
      borderRadius: 1,
      backgroundColor: theme.white,
      pointerEvents: "none",
    },
    scale: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(3),
    },
    scaleText: {
      fontSize: large ? fontSize.size13 : fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      fontVariant: ["tabular-nums"],
    },
    hint: {
      fontSize: large ? fontSize.size14 : fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      textAlign: "center",
      marginTop: moderateHeightScale(4),
    },
  });

export default function MusicTrimmer({
  seed,
  musicDurationMs,
  startMs,
  endMs,
  playheadMs,
  disabled,
  onDragStart,
  onChange,
  large = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme, large), [theme, large]);

  const [width, setWidth] = useState(0);
  /** Live selection while dragging; null = follow props. */
  const [draft, setDraft] = useState<{ s: number; e: number } | null>(null);

  const dur = Math.max(1, musicDurationMs);
  // Waveform sits between the two handle widths so the edges stay grabbable.
  const track = Math.max(1, width - HANDLE_W * 2);
  const xOf = (ms: number) => HANDLE_W + (ms / dur) * track;

  const s = draft?.s ?? startMs;
  const e = draft?.e ?? endMs;

  // PanResponder is created once — read live values through a ref.
  const live = useRef({ s, e, dur, track, disabled, onDragStart, onChange });
  live.current = { s, e, dur, track, disabled, onDragStart, onChange };
  const grab = useRef<{ mode: Drag; s: number; e: number; x: number }>({
    mode: "none",
    s: 0,
    e: 0,
    x: 0,
  });

  const pan = useMemo(() => {
    const clampSel = (mode: Drag, s0: number, e0: number, dMs: number) => {
      const { dur: d } = live.current;
      if (mode === "move") {
        const len = e0 - s0;
        const ns = Math.max(0, Math.min(d - len, s0 + dMs));
        return { s: ns, e: ns + len };
      }
      if (mode === "start") {
        return { s: Math.max(0, Math.min(e0 - MIN_PART_MS, s0 + dMs)), e: e0 };
      }
      return { s: s0, e: Math.min(d, Math.max(s0 + MIN_PART_MS, e0 + dMs)) };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.disabled,
      onMoveShouldSetPanResponder: () => !live.current.disabled,
      // Keep the gesture — the parent Pressable must not steal it.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (ev) => {
        const { s: s0, e: e0, dur: d, track: tr } = live.current;
        const x = ev.nativeEvent.locationX;
        const left = HANDLE_W + (s0 / d) * tr;
        const right = HANDLE_W + (e0 / d) * tr;
        let mode: Drag = "none";
        if (Math.abs(x - left) <= EDGE_GRAB && x <= (left + right) / 2) mode = "start";
        else if (Math.abs(x - right) <= EDGE_GRAB) mode = "end";
        else if (x > left && x < right) mode = "move";
        grab.current = { mode, s: s0, e: e0, x };
        live.current.onDragStart();
      },
      onPanResponderMove: (_, g) => {
        const { mode, s: s0, e: e0 } = grab.current;
        if (mode === "none") return;
        const dMs = (g.dx / live.current.track) * live.current.dur;
        const next = clampSel(mode, s0, e0, dMs);
        setDraft({ s: next.s, e: next.e });
      },
      onPanResponderRelease: (_, g) => {
        const { mode, s: s0, e: e0, x } = grab.current;
        const { dur: d, track: tr, onChange: emit } = live.current;
        let next = { s: s0, e: e0 };
        const tapped = Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP;
        if (tapped && (mode === "none" || mode === "move")) {
          // Tap → center the box on that spot (same length)
          const len = e0 - s0;
          const at = ((x - HANDLE_W) / tr) * d;
          const ns = Math.max(0, Math.min(d - len, at - len / 2));
          next = { s: ns, e: ns + len };
        } else if (mode !== "none") {
          next = clampSel(mode, s0, e0, (g.dx / tr) * d);
        }
        setDraft(null);
        emit(Math.round(next.s / 100) * 100, Math.round(next.e / 100) * 100);
      },
      onPanResponderTerminate: () => setDraft(null),
    });
  }, []);

  useEffect(() => {
    setDraft(null);
  }, [seed]);

  const seedNum = useMemo(() => hashSeed(seed), [seed]);
  const wavePath = useMemo(() => {
    let d = "";
    for (let x = 0, i = 0; x + BAR_W <= track; x += BAR_STEP, i++) {
      const h = barHeight(seedNum, i) * WAVE_H;
      const y = (WAVE_H - h) / 2;
      d += `M${x} ${y}h${BAR_W}v${h}h-${BAR_W}z`;
    }
    return d;
  }, [seedNum, track]);

  const left = xOf(s);
  const right = xOf(e);
  const playX =
    playheadMs != null && draft == null
      ? xOf(Math.min(e, s + Math.max(0, playheadMs)))
      : null;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{t("musicSongPart")}</Text>
        <Text style={styles.range}>
          {formatMs(s)} – {formatMs(e)} · {Math.round((e - s) / 1000)}s
        </Text>
      </View>

      <View style={styles.edgeSafe}>
      <View
        style={styles.strip}
        onLayout={(ev: LayoutChangeEvent) => setWidth(ev.nativeEvent.layout.width)}
        {...pan.panHandlers}
        accessibilityLabel={t("musicSongPart")}
        accessibilityValue={{ text: `${formatMs(s)} – ${formatMs(e)}` }}
      >
        {width > 0 ? (
          <>
            <Svg
              width={track}
              height={WAVE_H}
              style={{ marginLeft: HANDLE_W }}
              pointerEvents="none"
            >
              <Path d={wavePath} fill={theme.white} />
            </Svg>
            <View style={[styles.dim, { left: 0, width: Math.max(0, left - HANDLE_W) }]} />
            <View style={[styles.dim, { left: right + HANDLE_W, right: 0 }]} />
            <View style={[styles.box, { left, width: Math.max(0, right - left) }]} />
            <View style={[styles.handle, styles.handleStart, { left: left - HANDLE_W }]}>
              <View style={styles.grip} />
            </View>
            <View style={[styles.handle, styles.handleEnd, { left: right }]}>
              <View style={styles.grip} />
            </View>
            {playX != null ? <View style={[styles.playLine, { left: playX }]} /> : null}
          </>
        ) : null}
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>0:00</Text>
        <Text style={styles.scaleText}>{formatMs(musicDurationMs)}</Text>
      </View>
      </View>
      <Text style={styles.hint}>{t("musicTrimHint")}</Text>
    </View>
  );
}
