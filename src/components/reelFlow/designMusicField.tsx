import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale } from "@/src/theme/dimensions";
import MusicLibrarySheet from "@/src/components/videoEditor/musicLibrarySheet";
import { OptionRow, SectionLabel } from "@/src/components/reelFlow/flowParts";
import type { LibraryTrack } from "@/src/services/musicLibraryService";
import type { AutoReelMusic } from "@/src/types/reels";

/**
 * Silent design (`has_sound: false`): the user must pick a library track or
 * "No music". `value` undefined = not chosen yet, null = No music.
 * The server adds the music credit to the caption — the app doesn't.
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
  onChange: (music: AutoReelMusic | null) => void;
  /** Reel length — shorter tracks are hidden */
  lengthSeconds?: number | null;
  error?: string | null;
  disabled?: boolean;
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
    error: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

export default function DesignMusicField({
  value,
  onChange,
  lengthSeconds,
  error,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const lengthLabel = lengthSeconds
    ? t("designMusicMinLength", { seconds: Math.ceil(lengthSeconds) })
    : null;

  return (
    <View style={styles.wrap}>
      <SectionLabel label={t("designMusicTitle")} required />
      <Text style={styles.hint}>{t("designMusicHint")}</Text>
      <OptionRow
        icon="library-music"
        title={value ? value.title : t("designMusicPickTrack")}
        subtitle={value ? value.artist : lengthLabel}
        done={!!value}
        onPress={() => setSheetOpen(true)}
        disabled={disabled}
      />
      <OptionRow
        icon="music-off"
        title={t("templateGalleryNoMusic")}
        subtitle={t("designNoMusicSub")}
        done={value === null}
        onPress={() => onChange(null)}
        disabled={disabled}
      />
      {value ? <Text style={styles.hint}>{t("designMusicCreditNote")}</Text> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
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
    </View>
  );
}
