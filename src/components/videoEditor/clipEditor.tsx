import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ClipTrimmer, { formatPrecise, type TrimEdge } from "./clipTrimmer";
import {
  FILMSTRIP_FRAMES,
  IMAGE_CLIP_MAX_MS,
  IMAGE_CLIP_MIN_MS,
  MIN_CLIP_MS,
  clipLengthMs,
  isImageClip,
  sourceToViewMs,
  viewDurationMs,
  viewToSourceMs,
  type EditorClip,
} from "./editorModel";
import { formatVideoDuration } from "@/src/utils/videoDuration";

/**
 * Level 2 of the trim tool: one clip at a time, CapCut / Instagram Edits
 * style — no modes. The strip always shows the orange trim ends and the
 * white line; tools act on them (Split at the white line, Mute, Delete),
 * and one full-width Done closes it. Removing a middle part = Split, then
 * delete the piece. Photos get a duration picker instead of the strip.
 *
 * The trimmer works on a "view" of the source with cut parts taken out;
 * everything going in or out of it is mapped here, so the screen only
 * ever sees SOURCE ms.
 */
type Props = {
  clip: EditorClip;
  index: number;
  count: number;
  frames?: (string | null)[];
  maxLengthMs: number;
  /** White line, SOURCE ms (null when it isn't on this clip). */
  playheadMs: number | null;
  disabled: boolean;
  onDone: () => void;
  /** Split at the white line. */
  onSplit: () => void;
  /** Back to the whole clip (trim + removed parts undone). */
  onReset: () => void;
  /** Mute / unmute this clip's own sound. */
  onToggleMute: () => void;
  onRemove: () => void;
  onTrimBegin: () => void;
  onTrimChange: (edge: TrimEdge, ms: number) => void;
  onTrimEnd: () => void;
  /** Slide the whole window to new SOURCE bounds. */
  onTrimMove: (startMs: number, endMs: number) => void;
  onScrubBegin: () => void;
  onScrub: (ms: number) => void;
  onScrubEnd: () => void;
  /** Photo clips: how long the photo shows. */
  onImageDurationBegin: () => void;
  onImageDurationChange: (ms: number) => void;
};

/** Quick picks for photo length (seconds). */
const PHOTO_PRESETS_S = [2, 3, 5, 7, 10];

/** "1.2s" under a minute (Instagram style), "1:05.3" above. */
function formatClipLength(ms: number): string {
  const tenths = Math.max(0, Math.round(ms / 100));
  if (tenths < 600) return `${(tenths / 10).toFixed(1)}s`;
  const totalSeconds = Math.floor(tenths / 10);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}.${tenths % 10}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: heightScale(32),
    },
    title: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    resetBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      height: heightScale(30),
      borderRadius: heightScale(15),
      borderWidth: 1,
      borderColor: theme.white15,
    },
    resetText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    lengthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(6),
    },
    edgeTime: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      fontVariant: ["tabular-nums"],
      minWidth: moderateWidthScale(52),
    },
    edgeTimeEnd: { textAlign: "right" },
    lengthPill: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.white15,
    },
    lengthText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    overLimit: { color: theme.link },
    hint: {
      textAlign: "center",
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    hintOverLimit: {
      color: theme.link,
      fontFamily: fonts.fontBold,
    },
    tools: {
      flexDirection: "row",
      justifyContent: "center",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(10),
    },
    tool: {
      flex: 1,
      maxWidth: moderateWidthScale(110),
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(3),
    },
    toolDisabled: { opacity: 0.35 },
    toolLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    toolLabelActive: {
      color: theme.selectCard,
      fontFamily: fonts.fontBold,
    },
    doneBtn: {
      marginTop: moderateHeightScale(12),
      minHeight: heightScale(46),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.buttonBack,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    doneText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    photoPresets: {
      flexDirection: "row",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(10),
    },
    preset: {
      minWidth: moderateWidthScale(48),
      height: heightScale(34),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: heightScale(17),
      borderWidth: 1,
      borderColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    presetActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    presetText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    photoSlider: { marginTop: moderateHeightScale(6) },
  });

export default function ClipEditor({
  clip,
  index,
  count,
  frames,
  maxLengthMs,
  playheadMs,
  disabled,
  onDone,
  onSplit,
  onReset,
  onToggleMute,
  onRemove,
  onTrimBegin,
  onTrimChange,
  onTrimEnd,
  onTrimMove,
  onScrubBegin,
  onScrub,
  onScrubEnd,
  onImageDurationBegin,
  onImageDurationChange,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const multi = count > 1;
  const isPhoto = isImageClip(clip);
  const lengthMs = clipLengthMs(clip);
  // e.g. a full long auto reel source that still has to be trimmed down
  const overLimit = lengthMs > maxLengthMs + 50;
  const edited =
    !isPhoto &&
    (clip.trimStartMs > 0 ||
      clip.trimEndMs < clip.sourceDurationMs ||
      (clip.cuts?.length ?? 0) > 0);

  // ── Trimmer view (cut parts taken out of the source)
  const cutsKey = (clip.cuts ?? []).map((c) => `${c.startMs}-${c.endMs}`).join(",");
  const viewClip = useMemo<EditorClip>(
    () => ({
      ...clip,
      sourceDurationMs: viewDurationMs(clip),
      trimStartMs: sourceToViewMs(clip, clip.trimStartMs),
      trimEndMs: sourceToViewMs(clip, clip.trimEndMs),
      cuts: undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clip.id, clip.uri, clip.sourceDurationMs, clip.trimStartMs, clip.trimEndMs, cutsKey],
  );
  const viewFrames = useMemo(() => {
    if (!frames || !cutsKey) return frames;
    // Pick the source frame nearest to each cell of the joined-up strip
    const n = frames.length || FILMSTRIP_FRAMES;
    const viewMs = viewDurationMs(clip);
    return Array.from({ length: n }, (_, i) => {
      const source = viewToSourceMs(clip, (viewMs * (i + 0.5)) / n);
      const idx = Math.min(n - 1, Math.max(0, Math.floor((source / clip.sourceDurationMs) * n)));
      return frames[idx] ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, cutsKey, clip.sourceDurationMs]);
  const viewPlayheadMs =
    playheadMs == null ? null : sourceToViewMs(clip, playheadMs);

  const clipRef = useRef(clip);
  clipRef.current = clip;
  const handleTrimChange = useCallback(
    (edge: TrimEdge, ms: number) => {
      onTrimChange(
        edge,
        viewToSourceMs(clipRef.current, ms, edge === "start" ? "after" : "before"),
      );
    },
    [onTrimChange],
  );
  const handleTrimMove = useCallback(
    (startMs: number) => {
      const c = clipRef.current;
      const len = sourceToViewMs(c, c.trimEndMs) - sourceToViewMs(c, c.trimStartMs);
      onTrimMove(
        viewToSourceMs(c, startMs, "after"),
        viewToSourceMs(c, startMs + len, "before"),
      );
    },
    [onTrimMove],
  );
  const handleScrub = useCallback(
    (ms: number) => onScrub(viewToSourceMs(clipRef.current, ms, "after")),
    [onScrub],
  );

  // Split needs the white line clear of both trim ends
  const canSplit =
    viewPlayheadMs != null &&
    viewPlayheadMs - viewClip.trimStartMs >= MIN_CLIP_MS &&
    viewClip.trimEndMs - viewPlayheadMs >= MIN_CLIP_MS;

  const tools: {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    onPress: () => void;
    enabled: boolean;
    active?: boolean;
  }[] = [
    ...(!isPhoto
      ? [
          {
            key: "split",
            icon: "call-split" as const,
            label: t("clipModeSplit"),
            onPress: onSplit,
            enabled: canSplit,
          },
          {
            key: "mute",
            icon: (clip.muted ? "volume-off" : "volume-up") as keyof typeof MaterialIcons.glyphMap,
            label: clip.muted ? t("clipMuted") : t("muteClip"),
            onPress: onToggleMute,
            enabled: true,
            active: !!clip.muted,
          },
        ]
      : []),
    ...(multi
      ? [
          {
            key: "delete",
            icon: "delete-outline" as const,
            label: t("delete"),
            onPress: onRemove,
            enabled: true,
          },
        ]
      : []),
  ];

  const hintText = overLimit
    ? t("clipTrimToFit", { max: formatVideoDuration(maxLengthMs / 1000) })
    : isPhoto
      ? t("photoClipHint")
      : t("clipEditHint");

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {multi ? t("clipLabel", { index: index + 1, count }) : t("trimVideo")}
        </Text>
        {edited ? (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={onReset}
            disabled={disabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("clipReset")}
          >
            <MaterialIcons name="restart-alt" size={moderateWidthScale(15)} color={theme.white} />
            <Text style={styles.resetText}>{t("clipReset")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isPhoto ? (
        <>
          <View style={styles.photoPresets}>
            {PHOTO_PRESETS_S.map((sec) => {
              const ms = sec * 1000;
              const active = Math.abs(lengthMs - ms) < 50;
              return (
                <TouchableOpacity
                  key={sec}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => {
                    onImageDurationBegin();
                    onImageDurationChange(ms);
                  }}
                  disabled={disabled}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}
                >
                  <Text style={styles.presetText}>{sec}s</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Slider
            style={styles.photoSlider}
            minimumValue={IMAGE_CLIP_MIN_MS}
            maximumValue={IMAGE_CLIP_MAX_MS}
            step={500}
            value={lengthMs}
            onSlidingStart={onImageDurationBegin}
            onValueChange={onImageDurationChange}
            minimumTrackTintColor={theme.selectCard}
            maximumTrackTintColor={theme.white15}
            thumbTintColor={theme.selectCard}
            disabled={disabled}
            accessibilityLabel={t("photoClipDuration")}
          />
        </>
      ) : (
        <ClipTrimmer
          clip={viewClip}
          frames={viewFrames}
          playheadMs={viewPlayheadMs}
          disabled={disabled}
          onTrimBegin={onTrimBegin}
          onTrimChange={handleTrimChange}
          onTrimEnd={onTrimEnd}
          onTrimMove={handleTrimMove}
          onScrubBegin={onScrubBegin}
          onScrub={handleScrub}
          onScrubEnd={onScrubEnd}
        />
      )}

      <View style={styles.lengthRow}>
        <Text style={styles.edgeTime}>
          {isPhoto ? "" : formatPrecise(viewClip.trimStartMs)}
        </Text>
        <View style={styles.lengthPill}>
          <Text
            style={[styles.lengthText, overLimit && styles.overLimit]}
            accessibilityLabel={t("clipLengthA11y", { length: formatClipLength(lengthMs) })}
          >
            {formatClipLength(lengthMs)}
          </Text>
        </View>
        <Text style={[styles.edgeTime, styles.edgeTimeEnd]}>
          {isPhoto ? "" : formatPrecise(viewClip.trimEndMs)}
        </Text>
      </View>

      <Text
        style={[styles.hint, overLimit && styles.hintOverLimit]}
        accessibilityLiveRegion="polite"
      >
        {hintText}
      </Text>

      {tools.length > 0 ? (
        <View style={styles.tools}>
          {tools.map((tool) => {
            const enabled = tool.enabled && !disabled;
            return (
              <TouchableOpacity
                key={tool.key}
                style={[styles.tool, !enabled && styles.toolDisabled]}
                onPress={tool.onPress}
                disabled={!enabled}
                activeOpacity={0.75}
                accessibilityRole={tool.active === undefined ? "button" : "switch"}
                accessibilityLabel={tool.key === "mute" ? t("muteClip") : tool.label}
                accessibilityHint={tool.key === "split" ? t("clipSplitToolHint") : undefined}
                accessibilityState={{
                  disabled: !enabled,
                  ...(tool.active === undefined ? {} : { checked: tool.active }),
                }}
              >
                <MaterialIcons
                  name={tool.icon}
                  size={moderateWidthScale(22)}
                  color={tool.active ? theme.selectCard : theme.white}
                />
                <Text style={[styles.toolLabel, tool.active && styles.toolLabelActive]}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={onDone}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("done")}
      >
        <MaterialIcons name="check" size={moderateWidthScale(18)} color={theme.buttonText} />
        <Text style={styles.doneText}>{t("done")}</Text>
      </TouchableOpacity>
    </View>
  );
}
