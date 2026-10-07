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
import ClipTrimmer, { type TrimEdge } from "@/src/components/videoEditor/clipTrimmer";
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
} from "@/src/components/videoEditor/editorModel";

/**
 * Trim step of the Reel Studio (light, large controls). Same trimming as the
 * editor's clip view — orange ends, white line, Split / Mute / Reset — laid
 * out as "Start · Selected · End" the way the step design shows it.
 *
 * The trimmer works on a "view" of the source with cut parts taken out;
 * everything going in or out of it is mapped here, so the screen only ever
 * sees SOURCE ms.
 */
type Props = {
  clip: EditorClip;
  frames?: (string | null)[];
  /** White line, SOURCE ms (null when it isn't on this clip). */
  playheadMs: number | null;
  disabled: boolean;
  /** Whole reel (all clips) and its allowed maximum. */
  reelTotalMs: number;
  maxMs: number;
  multi: boolean;
  canAddClip: boolean;
  addingClip: boolean;
  /** Smaller paddings on short screens. */
  compact?: boolean;
  onSplit: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onAddClip: () => void;
  onTrimBegin: () => void;
  onTrimChange: (edge: TrimEdge, ms: number) => void;
  onTrimEnd: () => void;
  onTrimMove: (startMs: number, endMs: number) => void;
  onScrubBegin: () => void;
  onScrub: (ms: number) => void;
  onScrubEnd: () => void;
  onImageDurationBegin: () => void;
  onImageDurationChange: (ms: number) => void;
};

const PHOTO_PRESETS_S = [2, 3, 5, 7, 10];

/** "01:15" — or "01:15.4" when tenths matter. */
export function formatTimecode(ms: number, tenths = false): string {
  const totalTenths = Math.max(0, Math.round(ms / 100));
  const totalSeconds = tenths
    ? Math.floor(totalTenths / 10)
    : Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return tenths ? `${base}.${totalTenths % 10}` : base;
}

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    wrap: {
      gap: moderateHeightScale(compact ? 8 : 12),
    },
    timeRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    timeCol: {
      flex: 1,
      alignItems: "center",
      gap: moderateHeightScale(4),
    },
    timeLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    timeBox: {
      alignSelf: "stretch",
      minHeight: heightScale(compact ? 46 : 52),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    timeBoxSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen07,
    },
    timeBoxOver: {
      borderColor: theme.red,
      backgroundColor: theme.lightRed,
    },
    timeValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    timeValueSmall: {
      fontSize: fontSize.size17,
    },
    timeValueOver: {
      color: theme.red,
    },
    timeSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    hint: {
      textAlign: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    hintOver: {
      color: theme.red,
      fontFamily: fonts.fontBold,
    },
    tools: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    tool: {
      flex: 1,
      minHeight: heightScale(compact ? 50 : 56),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(2),
      paddingHorizontal: moderateWidthScale(4),
    },
    toolActive: {
      backgroundColor: theme.upcomingCard,
      borderColor: theme.selectCard,
    },
    toolDisabled: { opacity: 0.4 },
    toolLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    toolLabelActive: { color: theme.orangeBrownText },
    photoPresets: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    preset: {
      flex: 1,
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    presetActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    presetText: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    presetTextActive: { color: theme.white },
    photoLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function StudioTrimPanel({
  clip,
  frames,
  playheadMs,
  disabled,
  reelTotalMs,
  maxMs,
  multi,
  canAddClip,
  addingClip,
  compact = false,
  onSplit,
  onReset,
  onToggleMute,
  onAddClip,
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
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const { t } = useTranslation();
  const isPhoto = isImageClip(clip);
  const lengthMs = clipLengthMs(clip);
  const overLimit = reelTotalMs > maxMs + 50;
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

  const maxLabel = formatTimecode(maxMs);
  const selectedLabel = formatTimecode(multi ? reelTotalMs : lengthMs, overLimit);

  const tools: {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    onPress: () => void;
    enabled: boolean;
    active?: boolean;
    hint?: string;
  }[] = [
    ...(!isPhoto
      ? [
          {
            key: "split",
            icon: "call-split" as const,
            label: t("clipModeSplit"),
            onPress: onSplit,
            enabled: canSplit,
            hint: t("clipSplitToolHint"),
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
    {
      key: "add",
      icon: "add-circle-outline",
      label: t("addClip"),
      onPress: onAddClip,
      enabled: canAddClip && !addingClip,
    },
    ...(!isPhoto
      ? [
          {
            key: "reset",
            icon: "restart-alt" as const,
            label: t("clipReset"),
            onPress: onReset,
            enabled: edited,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.wrap}>
      {isPhoto ? (
        <>
          <Text style={styles.photoLabel}>{t("photoClipDuration")}</Text>
          <View style={styles.photoPresets}>
            {PHOTO_PRESETS_S.map((sec) => {
              const ms = sec * 1000;
              const active = Math.abs(lengthMs - ms) < 50;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={sec}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => {
                    onImageDurationBegin();
                    onImageDurationChange(ms);
                  }}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}
                >
                  <Text
                    style={[styles.presetText, active && styles.presetTextActive]}
                  >
                    {sec}s
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Slider
            minimumValue={IMAGE_CLIP_MIN_MS}
            maximumValue={IMAGE_CLIP_MAX_MS}
            step={500}
            value={lengthMs}
            onSlidingStart={onImageDurationBegin}
            onValueChange={onImageDurationChange}
            minimumTrackTintColor={theme.selectCard}
            maximumTrackTintColor={theme.lightGreen2}
            thumbTintColor={theme.selectCard}
            disabled={disabled}
            accessibilityLabel={t("photoClipDuration")}
          />
        </>
      ) : (
        <ClipTrimmer
          large
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

      <View style={styles.timeRow}>
        {!isPhoto ? (
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>{t("flowTrimStart")}</Text>
            <View style={styles.timeBox} accessible accessibilityLabel={`${t("flowTrimStart")} ${formatTimecode(viewClip.trimStartMs, true)}`}>
              <Text style={[styles.timeValue, styles.timeValueSmall]}>
                {formatTimecode(viewClip.trimStartMs, true)}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.timeCol, { flex: 1.25 }]}>
          <Text style={styles.timeLabel}>
            {multi ? t("flowReelTotal") : t("flowSelected")}
          </Text>
          <View
            style={[
              styles.timeBox,
              styles.timeBoxSelected,
              overLimit && styles.timeBoxOver,
            ]}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={t("flowSelectedA11y", {
              length: selectedLabel,
              max: maxLabel,
            })}
          >
            <Text style={[styles.timeValue, overLimit && styles.timeValueOver]}>
              {selectedLabel}
              <Text style={styles.timeSub}> / {maxLabel}</Text>
            </Text>
          </View>
        </View>
        {!isPhoto ? (
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>{t("flowTrimEnd")}</Text>
            <View style={styles.timeBox} accessible accessibilityLabel={`${t("flowTrimEnd")} ${formatTimecode(viewClip.trimEndMs, true)}`}>
              <Text style={[styles.timeValue, styles.timeValueSmall]}>
                {formatTimecode(viewClip.trimEndMs, true)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Short screens keep only the "too long" warning */}
      {!compact || overLimit ? (
        <Text
          style={[styles.hint, overLimit && styles.hintOver]}
          accessibilityLiveRegion="polite"
        >
          {overLimit
            ? t("flowTrimTooLong", { max: maxLabel })
            : isPhoto
              ? t("photoClipHint")
              : multi
                ? t("flowTrimHintMulti", { length: formatTimecode(lengthMs, true) })
                : t("flowTrimHint")}
        </Text>
      ) : null}

      <View style={styles.tools}>
        {tools.map((tool) => {
          const enabled = tool.enabled && !disabled;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              key={tool.key}
              style={[
                styles.tool,
                tool.active && styles.toolActive,
                !enabled && styles.toolDisabled,
              ]}
              onPress={tool.onPress}
              disabled={!enabled}
              accessibilityRole={tool.active === undefined ? "button" : "switch"}
              accessibilityLabel={tool.key === "mute" ? t("muteClip") : tool.label}
              accessibilityHint={tool.hint}
              accessibilityState={{
                disabled: !enabled,
                ...(tool.active === undefined ? {} : { checked: tool.active }),
              }}
            >
              <MaterialIcons
                name={tool.icon}
                size={moderateWidthScale(24)}
                color={tool.active ? theme.selectCard : theme.darkGreen}
              />
              <Text
                style={[styles.toolLabel, tool.active && styles.toolLabelActive]}
                numberOfLines={1}
              >
                {tool.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
