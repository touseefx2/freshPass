import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import MusicLibrarySheet from "@/src/components/videoEditor/musicLibrarySheet";
import { OptionRow, SectionLabel } from "@/src/components/reelFlow/flowParts";
import type { LibraryTrack } from "@/src/services/musicLibraryService";
import type { AutoReelMusic } from "@/src/types/reels";
import Logger from "@/src/services/logger";

/**
 * Silent design (`has_sound: false`): the user must pick a library track or
 * "No music". `value` undefined = not chosen yet, null = No music.
 * "No music" is a small checkbox at the right of the section title. Checking
 * it disables "Pick a track"; unchecking goes back to not chosen.
 * The server adds the music credit to the caption — the app doesn't.
 * `compact`: one card (label, choice, "No music" chip) for busy screens.
 */

export function trackToAutoReelMusic(track: LibraryTrack): AutoReelMusic {
  return {
    url: track.streamUrl,
    title: track.title,
    artist: track.artist,
    license: track.license,
    license_version: track.licenseVersion,
    source_url: track.sourceUrl,
  };
}

type Props = {
  value: AutoReelMusic | null | undefined;
  onChange: (music: AutoReelMusic | null | undefined) => void;
  /** Reel length — shorter tracks are hidden */
  lengthSeconds?: number | null;
  error?: string | null;
  disabled?: boolean;
  /** One-card layout without the heading row and hint */
  compact?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(10) },
    hint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    noMusicToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: 44,
      paddingLeft: moderateWidthScale(8),
    },
    noMusicText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    disabled: { opacity: 0.45 },
    playButton: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
    },
    error: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // ── compact ── (same card as the flow's OptionRow)
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(68),
      paddingVertical: moderateHeightScale(12),
      paddingLeft: moderateWidthScale(14),
      paddingRight: moderateWidthScale(12),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    cardError: { borderColor: theme.lightRedBorder },
    cardIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    cardIconOff: { backgroundColor: theme.lightGreen07 },
    cardTexts: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    cardTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    cardValuePicked: {
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      minHeight: moderateHeightScale(36),
      paddingLeft: moderateWidthScale(8),
      paddingRight: moderateWidthScale(12),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.lightGreen07,
    },
    chipOn: { backgroundColor: theme.darkGreen },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: { color: theme.white, fontFamily: fonts.fontBold },
    note: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function DesignMusicField({
  value,
  onChange,
  lengthSeconds,
  error,
  disabled = false,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const noMusic = value === null;
  const previewUrl = value?.url ?? null;

  // ── Preview of the picked track ───────────────────────────────────
  const soundRef = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);
  const finishedRef = useRef(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const stopPreview = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setPreviewPlaying(false);
    setPreviewLoading(false);
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
  }, []);

  const onPreviewStatus = useCallback((status: AVPlaybackStatus) => {
    if (!mountedRef.current || !status.isLoaded) return;
    setPreviewPlaying(status.isPlaying);
    if (status.didJustFinish) {
      finishedRef.current = true;
      setPreviewPlaying(false);
    }
  }, []);

  const togglePreview = useCallback(async () => {
    if (!previewUrl) return;
    if (soundRef.current) {
      try {
        if (previewPlaying) await soundRef.current.pauseAsync();
        else if (finishedRef.current) await soundRef.current.replayAsync();
        else await soundRef.current.playAsync();
        finishedRef.current = false;
      } catch {}
      return;
    }
    setPreviewLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
        onPreviewStatus,
      );
      if (!mountedRef.current) {
        await sound.unloadAsync();
        return;
      }
      soundRef.current = sound;
    } catch (error) {
      Logger.error("Music preview failed:", error);
    } finally {
      if (mountedRef.current) setPreviewLoading(false);
    }
  }, [onPreviewStatus, previewPlaying, previewUrl]);

  // New track / no music / sheet open → stop the old preview
  useEffect(() => {
    stopPreview();
  }, [previewUrl, sheetOpen, stopPreview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const lengthLabel = lengthSeconds
    ? t("designMusicMinLength", { seconds: Math.ceil(lengthSeconds) })
    : null;

  const playButton = value ? (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={togglePreview}
      disabled={disabled || previewLoading}
      hitSlop={6}
      style={styles.playButton}
      accessibilityRole="button"
      accessibilityLabel={previewPlaying ? t("pause") : t("play")}
    >
      {previewLoading ? (
        <ActivityIndicator size="small" color={theme.white} />
      ) : (
        <MaterialIcons
          name={previewPlaying ? "pause" : "play-arrow"}
          size={moderateWidthScale(26)}
          color={theme.white}
        />
      )}
    </TouchableOpacity>
  ) : undefined;

  const librarySheet = (
    <MusicLibrarySheet
      visible={sheetOpen}
      onClose={() => setSheetOpen(false)}
      onSelect={(track) => {
        onChange(trackToAutoReelMusic(track));
        setSheetOpen(false);
      }}
      tone="light"
      minDurationMs={lengthSeconds ? Math.ceil(lengthSeconds) * 1000 : null}
    />
  );

  if (compact) {
    const valueText = value
      ? [value.title, value.artist].filter(Boolean).join(" · ")
      : noMusic
        ? t("designNoMusicSub")
        : lengthSeconds
          ? t("designMusicPickMin", { seconds: Math.ceil(lengthSeconds) })
          : t("designMusicPickTrack");
    return (
      <View style={styles.wrap}>
        {/* Card opens the library (also from No music — picking a track replaces it) */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setSheetOpen(true)}
          disabled={disabled}
          style={[styles.card, !!error && styles.cardError, disabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={`${t("designMusicTitle")}, ${valueText}`}
          accessibilityHint={t("designMusicPickTrack")}
        >
          {playButton ?? (
            <View style={[styles.cardIcon, noMusic && styles.cardIconOff]}>
              <MaterialIcons
                name={noMusic ? "music-off" : "library-music"}
                size={moderateWidthScale(24)}
                color={noMusic ? theme.lightGreen : theme.selectCard}
              />
            </View>
          )}
          <View style={styles.cardTexts}>
            <Text style={styles.cardTitle}>
              {t("designMusicTitle")}
              <Text style={{ color: theme.selectCard }}> *</Text>
            </Text>
            <Text
              style={[styles.cardValue, !!value && styles.cardValuePicked]}
              numberOfLines={1}
            >
              {valueText}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onChange(noMusic ? undefined : null)}
            disabled={disabled}
            hitSlop={6}
            style={[styles.chip, noMusic && styles.chipOn]}
            accessibilityRole="checkbox"
            accessibilityLabel={`${t("templateGalleryNoMusic")}, ${t("designNoMusicSub")}`}
            accessibilityState={{ checked: noMusic, disabled }}
          >
            <MaterialIcons
              name={noMusic ? "check-box" : "check-box-outline-blank"}
              size={moderateWidthScale(18)}
              color={noMusic ? theme.white : theme.darkGreen}
            />
            <Text style={[styles.chipText, noMusic && styles.chipTextOn]}>
              {t("templateGalleryNoMusic")}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : value ? (
          <Text style={styles.note}>{t("designMusicCreditNote")}</Text>
        ) : null}
        {librarySheet}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <SectionLabel label={t("designMusicTitle")} required />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onChange(noMusic ? undefined : null)}
          disabled={disabled}
          hitSlop={8}
          style={[styles.noMusicToggle, disabled && styles.disabled]}
          accessibilityRole="checkbox"
          accessibilityLabel={`${t("templateGalleryNoMusic")}, ${t("designNoMusicSub")}`}
          accessibilityState={{ checked: noMusic, disabled }}
        >
          <Text style={styles.noMusicText}>{t("templateGalleryNoMusic")}</Text>
          <MaterialIcons
            name={noMusic ? "check-box" : "check-box-outline-blank"}
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{t("designMusicHint")}</Text>
      <OptionRow
        icon="library-music"
        iconNode={playButton}
        title={value ? value.title : t("designMusicPickTrack")}
        subtitle={value ? value.artist : lengthLabel}
        done={!!value}
        onPress={() => setSheetOpen(true)}
        disabled={disabled || noMusic}
      />
      {value ? <Text style={styles.hint}>{t("designMusicCreditNote")}</Text> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {librarySheet}
    </View>
  );
}
