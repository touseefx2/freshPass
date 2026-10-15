import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { formatVideoDuration } from "@/src/utils/videoDuration";
import {
  clipLengthMs,
  type EditorClip,
} from "@/src/components/videoEditor/editorModel";

/**
 * AI auto reel (trim-only studio): every clip joined in one strip, each as
 * wide as it is long, with "+" at the end. Above it the total and whether it
 * fits (the reel's length … 5:00); tap a clip to trim / split / remove it
 * below, or move it with the arrows.
 */
type Props = {
  clips: EditorClip[];
  thumbs: Record<string, string | null | undefined>;
  totalMs: number;
  /** Shortest total (the reel's length); null = no minimum */
  minMs: number | null;
  maxMs: number;
  selectedId: string | null;
  canAdd: boolean;
  adding: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  /** Move the selected clip one place earlier (-1) / later (1) */
  onMove: (direction: -1 | 1) => void;
};

/** Thin clips stay tappable: at least this share of the strip */
const MIN_SHARE = 0.07;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(8) },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    total: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    status: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      flexShrink: 1,
    },
    statusText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      flexShrink: 1,
    },
    statusOk: { color: theme.darkGreen },
    statusBad: { color: theme.red },
    strip: {
      flexDirection: "row",
      gap: moderateWidthScale(3),
      height: moderateHeightScale(64),
    },
    segment: {
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.darkGreen,
      // Same width when selected — only its colour changes (no jump)
      borderWidth: 2.5,
      borderColor: "transparent",
    },
    segmentOn: { borderColor: theme.selectCard },
    segmentImage: { ...StyleSheet.absoluteFillObject },
    segmentShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    segmentNumber: {
      position: "absolute",
      top: moderateHeightScale(3),
      left: moderateWidthScale(5),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    segmentLength: {
      position: "absolute",
      bottom: moderateHeightScale(3),
      left: moderateWidthScale(5),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    add: {
      width: moderateWidthScale(52),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
    },
    addOff: { opacity: 0.4 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    moves: { flexDirection: "row", gap: moderateWidthScale(8) },
    move: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    moveOff: { opacity: 0.35 },
    footerText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function ReelStrip({
  clips,
  thumbs,
  totalMs,
  minMs,
  maxMs,
  selectedId,
  canAdd,
  adding,
  disabled,
  onSelect,
  onAdd,
  onMove,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const tooShort = minMs != null && totalMs < minMs - 50;
  const tooLong = totalMs > maxMs + 50;
  const minLabel = minMs != null ? formatVideoDuration(minMs / 1000) : null;
  const maxLabel = formatVideoDuration(maxMs / 1000);
  const statusText = tooShort
    ? t("reelStripTooShort", {
        missing: formatVideoDuration(Math.ceil((minMs! - totalMs) / 1000)),
        min: minLabel,
      })
    : tooLong
      ? t("reelStripTooLong", {
          over: formatVideoDuration(Math.ceil((totalMs - maxMs) / 1000)),
          max: maxLabel,
        })
      : minLabel
        ? t("reelStripFits", { min: minLabel, max: maxLabel })
        : t("reelStripFitsMax", { max: maxLabel });

  const selectedIndex = clips.findIndex((c) => c.id === selectedId);
  const share = (clip: EditorClip) =>
    Math.max(clipLengthMs(clip), totalMs * MIN_SHARE);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.total}>
          {t("reelStripTotal", { length: formatVideoDuration(totalMs / 1000) })}
        </Text>
        <View style={styles.status} accessibilityLiveRegion="polite">
          <MaterialIcons
            name={tooShort || tooLong ? "error-outline" : "check-circle"}
            size={moderateWidthScale(16)}
            color={tooShort || tooLong ? theme.red : theme.darkGreen}
          />
          <Text
            style={[
              styles.statusText,
              tooShort || tooLong ? styles.statusBad : styles.statusOk,
            ]}
            numberOfLines={2}
          >
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.strip}>
        {clips.map((clip, index) => {
          const on = clip.id === selectedId;
          const thumb = thumbs[clip.id];
          return (
            <TouchableOpacity
              key={clip.id}
              activeOpacity={0.85}
              onPress={() => onSelect(clip.id)}
              disabled={disabled}
              style={[styles.segment, on && styles.segmentOn, { flex: share(clip) }]}
              accessibilityRole="button"
              accessibilityLabel={t("reelStripClipA11y", {
                n: index + 1,
                length: formatVideoDuration(clipLengthMs(clip) / 1000),
              })}
              accessibilityState={{ selected: on, disabled }}
            >
              {thumb ? (
                <Image
                  source={{ uri: thumb }}
                  style={styles.segmentImage}
                  contentFit="cover"
                />
              ) : null}
              <View style={styles.segmentShade} />
              <Text style={styles.segmentNumber}>{index + 1}</Text>
              <Text style={styles.segmentLength} numberOfLines={1}>
                {formatVideoDuration(clipLengthMs(clip) / 1000)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAdd}
          disabled={disabled || adding || !canAdd}
          style={[styles.add, (disabled || adding || !canAdd) && styles.addOff]}
          accessibilityRole="button"
          accessibilityLabel={t("addClip")}
          accessibilityState={{ disabled: disabled || adding || !canAdd, busy: adding }}
        >
          <MaterialIcons
            name={adding ? "hourglass-empty" : "add"}
            size={moderateWidthScale(26)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </View>

      {clips.length > 1 && selectedIndex >= 0 ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t("reelStripEditing", { n: selectedIndex + 1, total: clips.length })}
          </Text>
          {/* Order: move the selected clip earlier / later */}
          <View style={styles.moves}>
            {([-1, 1] as const).map((direction) => {
              const off =
                disabled ||
                (direction === -1
                  ? selectedIndex === 0
                  : selectedIndex === clips.length - 1);
              return (
                <TouchableOpacity
                  key={direction}
                  activeOpacity={0.8}
                  onPress={() => onMove(direction)}
                  disabled={off}
                  style={[styles.move, off && styles.moveOff]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    direction === -1 ? t("reelStripMoveEarlier") : t("reelStripMoveLater")
                  }
                  accessibilityState={{ disabled: off }}
                >
                  <MaterialIcons
                    name={direction === -1 ? "chevron-left" : "chevron-right"}
                    size={moderateWidthScale(24)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
