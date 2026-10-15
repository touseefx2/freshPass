import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
 * `defaultMusic` (the template's own song): "Select music" with three
 * choices — that song (selected to start), a library track or No music.
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

/** Same song: same link, or the same title and artist (a link can differ) */
function isSameSong(a: AutoReelMusic, b: AutoReelMusic): boolean {
  if (a.url === b.url) return true;
  const norm = (text?: string | null) => (text ?? "").trim().toLowerCase();
  return (
    !!norm(a.title) &&
    norm(a.title) === norm(b.title) &&
    norm(a.artist) === norm(b.artist)
  );
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
  /** Replaces the default "no sound of its own" hint (e.g. a template's own song) */
  hint?: string | null;
  /** The template's own song → the three-choice layout */
  defaultMusic?: AutoReelMusic | null;
  /** True while a track preview here or the library sheet has the sound */
  onAudioBusyChange?: (busy: boolean) => void;
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
    // Template song / library: two rows in one card
    choiceGroup: {
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      // Opaque, so Android's shadow doesn't show through
      backgroundColor: theme.white,
      overflow: "hidden",
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(8),
      elevation: 1,
    },
    choiceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: moderateHeightScale(56),
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
    },
    // Tint inside the opaque card (fine on Android) + the check icon
    choiceRowOn: { backgroundColor: theme.lightGreen07 },
    choiceDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
      marginLeft: moderateWidthScale(60),
    },
    choiceTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    choiceSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    smallPlay: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
    },
    smallIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    choiceTrailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    // Its own small button: opens the library (the row selects the song)
    changeButton: {
      minHeight: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    changeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
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
  hint,
  defaultMusic = null,
  onAudioBusyChange,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const noMusic = value === null;
  const valueUrl = value?.url ?? null;
  // Last track chosen — "No music" unchecked goes back to it
  const lastTrackRef = useRef<AutoReelMusic | null>(value ?? null);
  if (value) lastTrackRef.current = value;
  // Last library pick (not the template's song) — its row keeps it to tap again.
  // The template's song can arrive after `value` (review loads it), so it's
  // also left out where the row reads this, not only here
  const lastLibraryRef = useRef<AutoReelMusic | null>(
    value && !(defaultMusic && isSameSong(value, defaultMusic)) ? value : null,
  );
  if (value && !(defaultMusic && isSameSong(value, defaultMusic))) {
    lastLibraryRef.current = value;
  }

  // ── Preview of the picked track ───────────────────────────────────
  const soundRef = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);
  const finishedRef = useRef(false);
  // Track the preview player holds (rows can preview their own track)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const stopPreview = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    finishedRef.current = false;
    setPreviewUrl(null);
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

  const togglePreview = useCallback(
    async (url: string) => {
      // One track loads at a time
      if (previewLoading) return;
      if (soundRef.current && previewUrl !== url) await stopPreview();
      if (soundRef.current) {
        try {
          if (previewPlaying) await soundRef.current.pauseAsync();
          else if (finishedRef.current) await soundRef.current.replayAsync();
          else await soundRef.current.playAsync();
          finishedRef.current = false;
        } catch {}
        return;
      }
      setPreviewUrl(url);
      setPreviewLoading(true);
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
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
        setPreviewUrl(null);
      } finally {
        if (mountedRef.current) setPreviewLoading(false);
      }
    },
    [onPreviewStatus, previewLoading, previewPlaying, previewUrl, stopPreview],
  );

  // New choice / no music / sheet open → stop the old preview
  useEffect(() => {
    stopPreview();
  }, [valueUrl, sheetOpen, stopPreview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  // Previews here and the library sheet take the sound from the screen's music
  const audioBusy = previewUrl != null || sheetOpen;
  useEffect(() => {
    onAudioBusyChange?.(audioBusy);
  }, [audioBusy, onAudioBusyChange]);
  useEffect(() => () => onAudioBusyChange?.(false), [onAudioBusyChange]);

  const lengthLabel = lengthSeconds
    ? t("designMusicMinLength", { seconds: Math.ceil(lengthSeconds) })
    : null;

  const renderPlayButton = (track: AutoReelMusic, small = false) => {
    const mine = previewUrl === track.url;
    const playing = mine && previewPlaying;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => void togglePreview(track.url)}
        disabled={disabled || (mine && previewLoading)}
        // Small one: 38 + slop ≥ 44pt to tap
        hitSlop={small ? 8 : 6}
        style={small ? styles.smallPlay : styles.playButton}
        accessibilityRole="button"
        accessibilityLabel={`${playing ? t("pause") : t("play")}, ${track.title}`}
      >
        {mine && previewLoading ? (
          <ActivityIndicator size="small" color={theme.white} />
        ) : (
          <MaterialIcons
            name={playing ? "pause" : "play-arrow"}
            size={moderateWidthScale(small ? 22 : 26)}
            color={theme.white}
          />
        )}
      </TouchableOpacity>
    );
  };
  const playButton = value ? renderPlayButton(value) : undefined;

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

  if (defaultMusic) {
    const isDefault = !!value && isSameSong(value, defaultMusic);
    // Never the template's own song: that one has its own row
    const libraryTrack =
      lastLibraryRef.current &&
      !isSameSong(lastLibraryRef.current, defaultMusic)
        ? lastLibraryRef.current
        : null;
    const libraryOn =
      !!value && !!libraryTrack && value.url === libraryTrack.url;
    const tileOff = disabled || noMusic;
    const row = ({
      selected,
      leading,
      trailing,
      title,
      subtitle,
      onPress,
      role,
    }: {
      selected: boolean;
      leading: React.ReactNode;
      trailing: React.ReactNode;
      title: string;
      subtitle: string;
      onPress: () => void;
      role: "radio" | "button";
    }) => {
      const on = selected && !noMusic;
      return (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onPress}
          disabled={tileOff}
          style={[styles.choiceRow, on && styles.choiceRowOn]}
          accessibilityRole={role}
          accessibilityLabel={`${title}, ${subtitle}${on ? `, ${t("selected")}` : ""}`}
          accessibilityState={
            role === "radio"
              ? { checked: on, disabled: tileOff }
              : { selected: on, disabled: tileOff }
          }
        >
          {leading}
          <View style={styles.cardTexts}>
            <Text style={styles.choiceTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.choiceSub} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View style={styles.choiceTrailing}>{trailing}</View>
        </TouchableOpacity>
      );
    };
    const checkIcon = (
      <MaterialIcons
        name="check-circle"
        size={moderateWidthScale(22)}
        color={theme.darkGreen}
      />
    );
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <SectionLabel label={t("musicSelectTitle")} required />
          <TouchableOpacity
            activeOpacity={0.7}
            // Unchecking goes back to the track chosen before
            onPress={() =>
              onChange(noMusic ? (lastTrackRef.current ?? defaultMusic) : null)
            }
            disabled={disabled}
            hitSlop={8}
            style={[styles.noMusicToggle, disabled && styles.disabled]}
            accessibilityRole="checkbox"
            accessibilityLabel={`${t("templateGalleryNoMusic")}, ${t("designNoMusicSub")}`}
            accessibilityState={{ checked: noMusic, disabled }}
          >
            <Text style={styles.noMusicText}>
              {t("templateGalleryNoMusic")}
            </Text>
            <MaterialIcons
              name={noMusic ? "check-box" : "check-box-outline-blank"}
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <View style={[styles.choiceGroup, tileOff && styles.disabled]}>
          {row({
            selected: isDefault,
            role: "radio",
            leading: renderPlayButton(defaultMusic, true),
            trailing:
              isDefault && !noMusic ? (
                checkIcon
              ) : (
                <MaterialIcons
                  name="radio-button-unchecked"
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              ),
            title: defaultMusic.title,
            subtitle: [t("musicTemplateSong"), defaultMusic.artist]
              .filter(Boolean)
              .join(" · "),
            onPress: () => onChange(defaultMusic),
          })}
          <View style={styles.choiceDivider} />
          {row({
            selected: libraryOn,
            // A picked song: the row selects it; nothing yet: it opens the library
            role: libraryTrack ? "radio" : "button",
            leading: libraryTrack ? (
              renderPlayButton(libraryTrack, true)
            ) : (
              <View style={styles.smallIcon}>
                <MaterialIcons
                  name="library-music"
                  size={moderateWidthScale(20)}
                  color={theme.selectCard}
                />
              </View>
            ),
            // Picked: "Change" (opens the library) + check / circle; not yet: the arrow
            trailing: libraryTrack ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSheetOpen(true)}
                  disabled={tileOff}
                  hitSlop={8}
                  style={styles.changeButton}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("change")}, ${t("musicFromLibrary")}`}
                >
                  <Text style={styles.changeText}>{t("change")}</Text>
                </TouchableOpacity>
                {libraryOn && !noMusic ? (
                  checkIcon
                ) : (
                  <MaterialIcons
                    name="radio-button-unchecked"
                    size={moderateWidthScale(22)}
                    color={theme.lightGreen}
                  />
                )}
              </>
            ) : (
              <MaterialIcons
                name="chevron-right"
                size={moderateWidthScale(24)}
                color={theme.darkGreen}
              />
            ),
            title: libraryTrack ? libraryTrack.title : t("musicFromLibrary"),
            subtitle: libraryTrack
              ? libraryTrack.artist
              : lengthSeconds
                ? t("designMusicPickMin", { seconds: Math.ceil(lengthSeconds) })
                : t("musicFromLibrarySub"),
            onPress: () =>
              libraryTrack ? onChange(libraryTrack) : setSheetOpen(true),
          })}
        </View>
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
          style={[
            styles.card,
            !!error && styles.cardError,
            disabled && styles.disabled,
          ]}
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
      <Text style={styles.hint}>{hint ?? t("designMusicHint")}</Text>
      <OptionRow
        icon="library-music"
        iconNode={playButton}
        title={value ? value.title : t("designMusicPickTrack")}
        subtitle={value ? value.artist : lengthLabel}
        done={!!value}
        onPress={() => setSheetOpen(true)}
        disabled={disabled || noMusic}
      />
      {value ? (
        <Text style={styles.hint}>{t("designMusicCreditNote")}</Text>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {librarySheet}
    </View>
  );
}
