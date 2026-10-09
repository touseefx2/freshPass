import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

type Variant = "primary" | "outline" | "text" | "light";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Icon before the label. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Icon after the label (e.g. chevron on "Next" buttons). */
  trailingIcon?: keyof typeof MaterialIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
  /** Extra label style (e.g. a smaller size in a two-button row). */
  labelStyle?: StyleProp<TextStyle>;
  compact?: boolean;
  /** Red label / icon for a destructive action (e.g. "Cancel order"). */
  danger?: boolean;
  accessibilityHint?: string;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: heightScale(58),
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    compact: {
      minHeight: heightScale(50),
      paddingHorizontal: moderateWidthScale(16),
    },
    primary: {
      backgroundColor: theme.darkGreen,
    },
    outline: {
      backgroundColor: theme.white,
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    light: {
      backgroundColor: theme.white,
    },
    text: {
      backgroundColor: "transparent",
      minHeight: heightScale(48),
    },
    disabled: { opacity: 0.45 },
    label: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      includeFontPadding: false,
      textAlign: "center",
    },
    labelCompact: {
      fontSize: fontSize.size16,
    },
    labelPrimary: { color: theme.buttonText },
    labelOutline: { color: theme.darkGreen },
    labelText: {
      color: theme.darkGreen,
      textDecorationLine: "underline",
    },
    labelDanger: { color: theme.red },
    trailing: {
      position: "absolute",
      right: moderateWidthScale(18),
    },
    /** Room for the chevron on both sides so the label stays centered. */
    withTrailing: {
      paddingHorizontal: moderateWidthScale(48),
    },
    labelWrap: {
      flexShrink: 1,
    },
  });

/** Big, high-contrast button used across the reel flows. */
export default function FlowButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  trailingIcon,
  style,
  labelStyle,
  compact = false,
  danger = false,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const fg = danger
    ? theme.red
    : variant === "primary"
      ? theme.buttonText
      : theme.darkGreen;
  const inactive = disabled || loading;

  return (
    // TouchableOpacity, not Pressable: NativeWind's JSX wrapper drops
    // Pressable function styles (background / layout would be lost).
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      style={[
        styles.base,
        compact && styles.compact,
        !!trailingIcon && styles.withTrailing,
        styles[variant],
        disabled && !loading && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? (
            <MaterialIcons
              name={icon}
              size={moderateWidthScale(compact ? 20 : 22)}
              color={fg}
            />
          ) : null}
          <View style={styles.labelWrap}>
            <Text
              style={[
                styles.label,
                compact && styles.labelCompact,
                variant === "primary"
                  ? styles.labelPrimary
                  : variant === "text"
                    ? styles.labelText
                    : styles.labelOutline,
                danger && styles.labelDanger,
                labelStyle,
              ]}
              // Long translations wrap / shrink a little instead of clipping
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {label}
            </Text>
          </View>
          {trailingIcon ? (
            <MaterialIcons
              name={trailingIcon}
              size={moderateWidthScale(26)}
              color={fg}
              style={styles.trailing}
            />
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}
