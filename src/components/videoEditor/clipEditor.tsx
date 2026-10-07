import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MIN_CUT_MS,
  clipLengthMs,
  isImageClip,
  sourceToViewMs,
  viewDurationMs,
  viewToSourceMs,
  type CutRange,
  type EditorClip,
} from "./editorModel";
import { formatVideoDuration } from "@/src/utils/videoDuration";

/**
 * Level 2 of the trim tool: one clip at a time. Three clearly separated
 * modes so it's always obvious what the strip does:
 *   Trim    — orange ends mark the part that STAYS
 *   Split   — move the white line, tap "Split at …"
 *   Remove  — red ends mark a part to DELETE, tap "Remove …"
 * Photos get a duration picker instead.
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
  /** Delete a part of the clip (SOURCE ms); the rest joins up. */
  onRemoveRange: (range: CutRange) => void;
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

type Mode = "trim" | "split" | "remove";

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
    },
    titleWrap: { flex: 1, minWidth: 0 },
    title: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    length: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      fontVariant: ["tabular-nums"],
      marginTop: moderateHeightScale(1),
    },
    overLimit: { color: theme.link },
    doneBtn: {
      height: heightScale(34),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(17),
      backgroundColor: theme.buttonBack,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    doneText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    segment: {
      flexDirection: "row",
      marginTop: moderateHeightScale(10),
      padding: moderateWidthScale(3),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.black,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(5),
      minHeight: heightScale(36),
      borderRadius: moderateWidthScale(9),
    },
    segmentBtnActive: { backgroundColor: theme.buttonBack },
    segmentText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    segmentTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
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
    rangeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(4),
    },
    rangeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      fontVariant: ["tabular-nums"],
    },
    primaryBtn: {
      marginTop: moderateHeightScale(10),
      minHeight: heightScale(42),
      borderRadius: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      backgroundColor: theme.buttonBack,
    },
    primaryBtnDanger: { backgroundColor: theme.red },
    primaryBtnDisabled: { opacity: 0.4 },
    primaryText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "center",
      gap: moderateWidthScale(24),
      marginTop: moderateHeightScale(6),
    },
    action: {
      minWidth: moderateWidthScale(64),
      minHeight: heightScale(48),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(2),
    },
    actionDisabled: { opacity: 0.35 },
    actionLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    actionLabelActive: {
      color: theme.selectCard,
      fontFamily: fonts.fontBold,
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
  onRemoveRange,
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

  const [mode, setMode] = useState<Mode>("trim");
  useEffect(() => setMode("trim"), [clip.id]);

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
  const toSource = useCallback(
    (viewMs: number, bias: "after" | "before" = "after") =>
      viewToSourceMs(clipRef.current, viewMs, bias),
    [],
  );

  // ── Trim mode
  const handleTrimChange = useCallback(
    (edge: TrimEdge, ms: number) => {
      onTrimChange(edge, toSource(ms, edge === "start" ? "after" : "before"));
    },
    [onTrimChange, toSource],
  );
  const handleTrimMove = useCallback(
    (startMs: number) => {
      const c = clipRef.current;
      const len = sourceToViewMs(c, c.trimEndMs) - sourceToViewMs(c, c.trimStartMs);
      onTrimMove(toSource(startMs, "after"), toSource(startMs + len, "before"));
    },
    [onTrimMove, toSource],
  );
  const handleScrub = useCallback(
    (ms: number) => onScrub(toSource(ms, "after")),
    [onScrub, toSource],
  );

  // ── Remove mode: a red range (VIEW ms), local until "Remove" is tapped
  const [removeSel, setRemoveSel] = useState<CutRange | null>(null);
  useEffect(() => {
    if (mode !== "remove") return;
    // Start in the middle third of what's kept, so the red part is obvious
    const start = viewClip.trimStartMs;
    const len = viewClip.trimEndMs - start;
    const width = Math.max(MIN_CUT_MS, Math.round(len / 3));
    const s = Math.round(start + (len - width) / 2);
    setRemoveSel({ startMs: s, endMs: Math.min(viewClip.trimEndMs, s + width) });
  }, [mode, viewClip.trimStartMs, viewClip.trimEndMs, cutsKey]);
  const removeClip = useMemo<EditorClip | null>(
    () =>
      removeSel
        ? { ...viewClip, trimStartMs: removeSel.startMs, trimEndMs: removeSel.endMs }
        : null,
    [removeSel, viewClip],
  );
  const removeSelRef = useRef(removeSel);
  removeSelRef.current = removeSel;
  const onRemoveEdge = useCallback(
    (edge: TrimEdge, ms: number) => {
      setRemoveSel((sel) => {
        if (!sel) return sel;
        const next =
          edge === "start"
            ? { startMs: Math.min(ms, sel.endMs - MIN_CUT_MS), endMs: sel.endMs }
            : { startMs: sel.startMs, endMs: Math.max(ms, sel.startMs + MIN_CUT_MS) };
        return next;
      });
      onScrub(toSource(ms, edge === "start" ? "after" : "before"));
    },
    [onScrub, toSource],
  );
  const onRemoveMove = useCallback(
    (startMs: number) => {
      setRemoveSel((sel) =>
        sel ? { startMs, endMs: startMs + (sel.endMs - sel.startMs) } : sel,
      );
      onScrub(toSource(startMs, "after"));
    },
    [onScrub, toSource],
  );
  const applyRemove = () => {
    const sel = removeSelRef.current;
    if (!sel) return;
    onRemoveRange({
      startMs: toSource(sel.startMs, "after"),
      endMs: toSource(sel.endMs, "before"),
    });
  };

  // ── Split mode
  const splitOffsetMs =
    viewPlayheadMs == null ? null : viewPlayheadMs - viewClip.trimStartMs;
  const canSplit =
    splitOffsetMs != null &&
    splitOffsetMs >= MIN_CLIP_MS &&
    viewClip.trimEndMs - (viewPlayheadMs ?? 0) >= MIN_CLIP_MS;

  const modes: { key: Mode; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
    { key: "trim", icon: "content-cut", label: t("clipModeTrim") },
    { key: "split", icon: "call-split", label: t("clipModeSplit") },
    { key: "remove", icon: "remove-circle-outline", label: t("clipModeRemove") },
  ];

  const secondary: {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    onPress: () => void;
    active?: boolean;
  }[] = [
    ...(!isPhoto
      ? [
          {
            key: "mute",
            icon: (clip.muted ? "volume-off" : "volume-up") as keyof typeof MaterialIcons.glyphMap,
            label: clip.muted ? t("clipMuted") : t("muteClip"),
            onPress: onToggleMute,
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
          },
        ]
      : []),
  ];

  const hintText = overLimit
    ? t("clipTrimToFit", { max: formatVideoDuration(maxLengthMs / 1000) })
    : isPhoto
      ? t("photoClipHint")
      : mode === "trim"
        ? t("clipTrimHint")
        : mode === "split"
          ? t("clipSplitModeHint")
          : t("clipRemoveHint");

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {multi ? t("clipLabel", { index: index + 1, count }) : t("trimVideo")}
          </Text>
          <Text
            style={[styles.length, overLimit && styles.overLimit]}
            accessibilityLabel={t("clipLengthA11y", { length: formatClipLength(lengthMs) })}
          >
            {formatClipLength(lengthMs)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={onDone}
          disabled={disabled}
          activeOpacity={0.85}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("done")}
        >
          <MaterialIcons name="check" size={moderateWidthScale(16)} color={theme.buttonText} />
          <Text style={styles.doneText}>{t("done")}</Text>
        </TouchableOpacity>
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
        <>
          <View style={styles.segment} accessibilityRole="tablist">
            {modes.map((m) => {
              const active = mode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setMode(m.key)}
                  disabled={disabled}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active, disabled }}
                >
                  <MaterialIcons
                    name={m.icon}
                    size={moderateWidthScale(16)}
                    color={active ? theme.white : theme.white70}
                  />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === "remove" && removeClip ? (
            <ClipTrimmer
              key="remove"
              variant="remove"
              clip={removeClip}
              frames={viewFrames}
              playheadMs={viewPlayheadMs}
              disabled={disabled}
              onTrimBegin={onScrubBegin}
              onTrimChange={onRemoveEdge}
              onTrimEnd={onScrubEnd}
              onTrimMove={onRemoveMove}
              onScrubBegin={onScrubBegin}
              onScrub={handleScrub}
              onScrubEnd={onScrubEnd}
            />
          ) : (
            <ClipTrimmer
              key={mode === "split" ? "split" : "trim"}
              clip={viewClip}
              frames={viewFrames}
              playheadMs={viewPlayheadMs}
              disabled={disabled}
              showHandles={mode === "trim"}
              onTrimBegin={onTrimBegin}
              onTrimChange={handleTrimChange}
              onTrimEnd={onTrimEnd}
              onTrimMove={handleTrimMove}
              onScrubBegin={onScrubBegin}
              onScrub={handleScrub}
              onScrubEnd={onScrubEnd}
            />
          )}

          {mode === "trim" ? (
            <View style={styles.rangeRow}>
              <Text style={styles.rangeText}>{formatPrecise(viewClip.trimStartMs)}</Text>
              <Text style={styles.rangeText}>{formatPrecise(viewClip.trimEndMs)}</Text>
            </View>
          ) : null}

          {mode === "split" ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !canSplit && styles.primaryBtnDisabled]}
              onPress={onSplit}
              disabled={disabled || !canSplit}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <MaterialIcons name="call-split" size={moderateWidthScale(18)} color={theme.white} />
              <Text style={styles.primaryText}>
                {t("clipSplitAt", { time: formatClipLength(splitOffsetMs ?? 0) })}
              </Text>
            </TouchableOpacity>
          ) : null}

          {mode === "remove" && removeSel ? (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnDanger]}
              onPress={applyRemove}
              disabled={disabled}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <MaterialIcons name="delete-outline" size={moderateWidthScale(18)} color={theme.white} />
              <Text style={styles.primaryText}>
                {t("clipRemoveRange", {
                  start: formatPrecise(removeSel.startMs),
                  end: formatPrecise(removeSel.endMs),
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      <Text
        style={[styles.hint, overLimit && styles.hintOverLimit]}
        accessibilityLiveRegion="polite"
      >
        {hintText}
      </Text>

      {secondary.length > 0 ? (
        <View style={styles.toolbar}>
          {secondary.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[styles.action, disabled && styles.actionDisabled]}
              onPress={action.onPress}
              disabled={disabled}
              activeOpacity={0.7}
              accessibilityRole={action.active === undefined ? "button" : "switch"}
              accessibilityLabel={action.key === "mute" ? t("muteClip") : action.label}
              accessibilityState={{
                disabled,
                ...(action.active === undefined ? {} : { checked: action.active }),
              }}
            >
              <MaterialIcons
                name={action.icon}
                size={moderateWidthScale(22)}
                color={action.active ? theme.selectCard : theme.white}
              />
              <Text style={[styles.actionLabel, action.active && styles.actionLabelActive]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
