import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
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
import type { MusicSlot } from "./musicModel";

/**
 * A bar the length of the VIDEO showing where each song plays (Instagram /
 * CapCut style). Tap a song's block to edit it. "Repeat" (only when the
 * songs are shorter than the video) makes the SELECTED song fill the rest.
 */
type Props = {
  videoMs: number;
  slots: MusicSlot[];
  selectedIndex: number;
  /** Chosen parts, back to back, without repeats. */
  partsTotalMs: number;
  /** Index of the song that fills the rest by repeating; -1 = none. */
  repeatIndex: number;
  /** Reel playhead, or null to hide the line. */
  playheadMs: number | null;
  disabled?: boolean;
  onSelect: (index: number) => void;
  onToggleLoop: () => void;
  /** Bigger type and bar (step-by-step Reel Studio). */
  large?: boolean;
};

const BAR_H = heightScale(34);
const LARGE_BAR_H = heightScale(42);

function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const createStyles = (theme: Theme, large: boolean = false) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
      minHeight: heightScale(30),
    },
    title: {
      fontSize: large ? fontSize.size15 : fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    repeatBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      height: heightScale(large ? 38 : 30),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(15),
      borderWidth: 1,
      borderColor: theme.white15,
    },
    repeatBtnOn: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    repeatText: {
      fontSize: large ? fontSize.size14 : fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    repeatTextOn: { color: theme.darkGreen },
    bar: {
      height: large ? LARGE_BAR_H : BAR_H,
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white15,
      overflow: "hidden",
    },
    block: {
      position: "absolute",
      top: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      paddingLeft: moderateWidthScale(6),
      borderRightWidth: 2,
      borderRightColor: theme.darkGreen,
    },
    blockA: { backgroundColor: theme.orangeBrown },
    blockB: { backgroundColor: theme.buttonBack },
    blockRepeat: { opacity: 0.6 },
    blockSelected: {
      borderWidth: 2,
      borderColor: theme.white,
      borderRadius: moderateWidthScale(6),
    },
    blockLabel: {
      fontSize: large ? fontSize.size14 : fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    blockLabelB: { color: theme.white },
    silence: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    silenceText: {
      fontSize: large ? fontSize.size13 : fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    playLine: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 2,
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
    info: {
      fontSize: large ? fontSize.size14 : fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginTop: moderateHeightScale(4),
    },
  });

export default function MusicCoverage({
  videoMs,
  slots,
  selectedIndex,
  partsTotalMs,
  repeatIndex,
  playheadMs,
  disabled,
  onSelect,
  onToggleLoop,
  large = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme, large), [theme, large]);
  const [width, setWidth] = useState(0);

  const short = partsTotalMs < videoMs - 50;
  const coveredMs = slots.reduce((m, s) => Math.max(m, s.at + s.len), 0);
  const coveredW = videoMs > 0 ? Math.min(1, coveredMs / videoMs) * width : 0;
  // Repeat button shows the SELECTED song's state
  const loop = repeatIndex >= 0 && repeatIndex === selectedIndex;
  const playX =
    playheadMs != null && videoMs > 0
      ? Math.min(1, Math.max(0, playheadMs / videoMs)) * width
      : null;

  let info: string;
  if (!short) info = t("musicCoversVideo");
  else if (repeatIndex >= 0) info = t("musicRepeatLastInfo", { index: repeatIndex + 1 });
  else
    info = t("musicStopsInfo", {
      time: formatMs(coveredMs),
      rest: formatMs(videoMs - coveredMs),
    });

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{t("musicOnVideo")}</Text>
        {short ? (
          <TouchableOpacity
            style={[styles.repeatBtn, loop && styles.repeatBtnOn]}
            onPress={onToggleLoop}
            disabled={disabled}
            activeOpacity={0.8}
            hitSlop={8}
            accessibilityRole="switch"
            accessibilityState={{ checked: loop, disabled }}
            accessibilityLabel={t("musicRepeatSong", { index: selectedIndex + 1 })}
          >
            <MaterialIcons
              name="repeat"
              size={moderateWidthScale(16)}
              color={loop ? theme.darkGreen : theme.white}
            />
            <Text style={[styles.repeatText, loop && styles.repeatTextOn]}>
              {t("musicRepeatSong", { index: selectedIndex + 1 })}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={styles.bar}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && videoMs > 0
          ? slots.map((s) => {
              const left = (s.at / videoMs) * width;
              const w = (s.len / videoMs) * width;
              const alt = s.index % 2 === 1;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => onSelect(s.index)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={t("musicSongN", { index: s.index + 1 })}
                  accessibilityState={{ selected: s.index === selectedIndex }}
                  style={[
                    styles.block,
                    alt ? styles.blockB : styles.blockA,
                    s.repeat && styles.blockRepeat,
                    s.index === selectedIndex && !s.repeat && styles.blockSelected,
                    { left, width: w },
                  ]}
                >
                  {w > 28 ? (
                    <>
                      <MaterialIcons
                        name={s.repeat ? "repeat" : "music-note"}
                        size={moderateWidthScale(13)}
                        color={alt ? theme.white : theme.darkGreen}
                      />
                      <Text style={[styles.blockLabel, alt && styles.blockLabelB]}>
                        {s.index + 1}
                      </Text>
                    </>
                  ) : null}
                </Pressable>
              );
            })
          : null}
        {width > 0 && coveredW < width - 2 ? (
          <View style={[styles.silence, { left: coveredW }]} pointerEvents="none">
            <Text style={styles.silenceText} numberOfLines={1}>
              {t("musicNoMusicHere")}
            </Text>
          </View>
        ) : null}
        {playX != null ? <View style={[styles.playLine, { left: playX }]} /> : null}
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>0:00</Text>
        <Text style={styles.scaleText}>{formatMs(videoMs)}</Text>
      </View>
      <Text style={styles.info}>{info}</Text>
    </View>
  );
}
