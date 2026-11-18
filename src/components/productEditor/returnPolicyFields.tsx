import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

type IconName = keyof typeof MaterialIcons.glyphMap;

export type ChoiceTile<T extends string | number> = {
  value: T;
  label: string;
  /** Second line under the label (bigger cards). */
  hint?: string | null;
  icon?: IconName;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: moderateWidthScale(10) },
    tile: {
      flex: 1,
      minWidth: 0,
      minHeight: heightScale(56),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    tileActive: { borderColor: theme.darkGreen, backgroundColor: theme.darkGreen },
    tileError: { borderColor: theme.red },
    tileDisabled: { opacity: 0.55 },
    tileTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    label: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    labelActive: { color: theme.white },
    hint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size18,
    },
    hintActive: { color: theme.white },
    error: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
  });

/**
 * One-of-many tiles laid out side by side (radio group): return window
 * 7 / 14 / 20 days, who pays return shipping. Selected = filled dark green
 * with a tick, like the category tiles.
 */
export function ChoiceTiles<T extends string | number>({
  options,
  value,
  onChange,
  error,
  disabled = false,
  accessibilityLabel,
}: {
  options: ChoiceTile<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              activeOpacity={0.8}
              style={[
                styles.tile,
                active && styles.tileActive,
                !active && !!error && styles.tileError,
                disabled && styles.tileDisabled,
              ]}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(opt.value);
              }}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled }}
              accessibilityLabel={opt.hint ? `${opt.label}. ${opt.hint}` : opt.label}
            >
              <View style={styles.tileTop}>
                {opt.icon ? (
                  <MaterialIcons
                    name={active ? "check-circle" : opt.icon}
                    size={moderateWidthScale(18)}
                    color={active ? theme.white : theme.selectCard}
                  />
                ) : active ? (
                  <MaterialIcons
                    name="check-circle"
                    size={moderateWidthScale(18)}
                    color={theme.white}
                  />
                ) : null}
                <Text
                  style={[styles.label, active && styles.labelActive]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </View>
              {opt.hint ? (
                <Text style={[styles.hint, active && styles.hintActive]}>
                  {opt.hint}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(18)}
            color={theme.red}
          />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </>
  );
}
