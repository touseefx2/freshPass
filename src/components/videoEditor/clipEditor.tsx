import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ClipTrimmer, { type TrimEdge } from "./clipTrimmer";
import { clipLengthMs, type EditorClip } from "./editorModel";
import { formatVideoDuration } from "@/src/utils/videoDuration";

/**
 * Level 2 of the trim tool: one clip at a time (Instagram "trim clip").
 * Handles trim, the white playhead picks the split point, and every
 * action sits in one labelled toolbar.
 */
type Props = {
  clip: EditorClip;
  index: number;
  count: number;
  frames?: (string | null)[];
  maxLengthMs: number;
  playheadMs: number | null;
  disabled: boolean;
  onDone: () => void;
  onSplit: () => void;
  /** Mute / unmute this clip's own sound. */
  onToggleMute: () => void;
  onRemove: () => void;
  onTrimBegin: () => void;
  onTrimChange: (edge: TrimEdge, ms: number) => void;
  onTrimEnd: () => void;
  onTrimMove: (startMs: number) => void;
  onScrubBegin: () => void;
  onScrub: (ms: number) => void;
  onScrubEnd: () => void;
};

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
    title: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
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
    length: {
      alignSelf: "center",
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    hint: {
      textAlign: "center",
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    overLimit: {
      color: theme.link,
    },
    hintOverLimit: {
      fontFamily: fonts.fontBold,
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: moderateHeightScale(8),
    },
    action: {
      flex: 1,
      minHeight: heightScale(48),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(2),
    },
    actionDisabled: {
      opacity: 0.35,
    },
    actionLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    actionLabelActive: {
      color: theme.selectCard,
      fontFamily: fonts.fontBold,
    },
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
  onToggleMute,
  onRemove,
  onTrimBegin,
  onTrimChange,
  onTrimEnd,
  onTrimMove,
  onScrubBegin,
  onScrub,
  onScrubEnd,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const multi = count > 1;
  const lengthMs = clipLengthMs(clip);
  // e.g. a full long auto reel source that still has to be trimmed down
  const overLimit = lengthMs > maxLengthMs + 50;

  const actions: {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    onPress: () => void;
    enabled: boolean;
    /** Toggle that's on (e.g. clip muted) — drawn in the accent colour */
    active?: boolean;
  }[] = [
    { key: "split", icon: "content-cut", label: t("splitClip"), onPress: onSplit, enabled: true },
    {
      key: "mute",
      icon: clip.muted ? "volume-off" : "volume-up",
      label: clip.muted ? t("clipMuted") : t("muteClip"),
      onPress: onToggleMute,
      enabled: true,
      active: !!clip.muted,
    },
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

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>
          {multi ? t("clipLabel", { index: index + 1, count }) : t("trimVideo")}
        </Text>
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

      <Text style={[styles.length, overLimit && styles.overLimit]} accessibilityLabel={t("clipLengthA11y", { length: formatClipLength(lengthMs) })}>
        {formatClipLength(lengthMs)}
      </Text>

      <ClipTrimmer
        clip={clip}
        frames={frames}
        maxLengthMs={maxLengthMs}
        playheadMs={playheadMs}
        disabled={disabled}
        onTrimBegin={onTrimBegin}
        onTrimChange={onTrimChange}
        onTrimEnd={onTrimEnd}
        onTrimMove={onTrimMove}
        onScrubBegin={onScrubBegin}
        onScrub={onScrub}
        onScrubEnd={onScrubEnd}
      />

      <Text
        style={[styles.hint, overLimit && [styles.overLimit, styles.hintOverLimit]]}
        accessibilityLiveRegion="polite"
      >
        {overLimit
          ? t("clipTrimToFit", { max: formatVideoDuration(maxLengthMs / 1000) })
          : t("clipEditorHint")}
      </Text>

      <View style={styles.toolbar}>
        {actions.map((action) => {
          const enabled = action.enabled && !disabled;
          return (
            <TouchableOpacity
              key={action.key}
              style={[styles.action, !enabled && styles.actionDisabled]}
              onPress={action.onPress}
              disabled={!enabled}
              activeOpacity={0.7}
              accessibilityRole={action.active === undefined ? "button" : "switch"}
              accessibilityLabel={action.key === "mute" ? t("muteClip") : action.label}
              accessibilityState={{
                disabled: !enabled,
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
          );
        })}
      </View>
    </View>
  );
}
