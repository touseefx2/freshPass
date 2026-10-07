import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FlowButton from "./flowButton";

type Action = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof FlowButton>["icon"];
  trailingIcon?: React.ComponentProps<typeof FlowButton>["trailingIcon"];
  accessibilityHint?: string;
};

type Props = {
  primary: Action;
  /** Outlined button above the primary one (e.g. "Back to editing"). */
  secondary?: Action | null;
  /** Small underlined text button below the primary one (e.g. "Save as draft"). */
  tertiary?: Action | null;
  /** Why the primary button is disabled, or a short note under it. */
  hint?: string | null;
  /** Upload / export progress shown above the buttons. */
  progress?: { label: string; percent: number | null } | null;
  /** Skip the bottom safe-area padding (e.g. a keyboard is open). */
  noSafeArea?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      gap: moderateHeightScale(10),
    },
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    hint: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
    },
    progressBlock: {
      gap: moderateHeightScale(6),
    },
    progressLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    progressTrack: {
      height: heightScale(8),
      borderRadius: heightScale(4),
      backgroundColor: theme.lightGreen015,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: heightScale(4),
      backgroundColor: theme.buttonBack,
    },
  });

/** Sticky bottom action area: one clear primary button per step. */
export default function FlowFooter({
  primary,
  secondary,
  tertiary,
  hint,
  progress,
  noSafeArea = false,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: noSafeArea
            ? moderateHeightScale(10)
            : Math.max(insets.bottom, moderateHeightScale(14)) +
              moderateHeightScale(4),
        },
      ]}
    >
      {progress ? (
        <View style={styles.progressBlock} accessibilityLiveRegion="polite">
          <Text style={styles.progressLabel}>{progress.label}</Text>
          {progress.percent != null ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(0, Math.min(100, progress.percent))}%`,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {secondary ? (
        <FlowButton
          variant="outline"
          label={secondary.label}
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          loading={secondary.loading}
          icon={secondary.icon}
          trailingIcon={secondary.trailingIcon}
          accessibilityHint={secondary.accessibilityHint}
        />
      ) : null}

      <FlowButton
        label={primary.label}
        onPress={primary.onPress}
        disabled={primary.disabled}
        loading={primary.loading}
        icon={primary.icon}
        trailingIcon={primary.trailingIcon}
        accessibilityHint={primary.accessibilityHint}
      />

      {tertiary ? (
        <FlowButton
          variant="text"
          compact
          label={tertiary.label}
          onPress={tertiary.onPress}
          disabled={tertiary.disabled}
          loading={tertiary.loading}
        />
      ) : null}

      {hint ? (
        <View style={styles.hintRow}>
          <MaterialIcons
            name="info-outline"
            size={moderateWidthScale(18)}
            color={theme.lightGreen}
          />
          <Text style={styles.hint}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}
