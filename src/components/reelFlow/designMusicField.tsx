import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

/**
 * Silent design (`has_sound: false`): the user must pick a library track or
 * "No music". `value` undefined = not chosen yet, null = No music.
 * "No music" is a small checkbox at the right of the section title. Checking
 * it disables "Pick a track"; unchecking goes back to not chosen.
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
  onChange: (music: AutoReelMusic | null | undefined) => void;
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
  const noMusic = value === null;

  const lengthLabel = lengthSeconds
    ? t("designMusicMinLength", { seconds: Math.ceil(lengthSeconds) })
    : null;

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
