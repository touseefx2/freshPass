import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale, moderateHeightScale } from "@/src/theme/dimensions";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  textColor?: string;
  backgroundColor?: string;
}

const createStyles = (theme: Theme, textColor?: string, backgroundColor?: string) =>
  StyleSheet.create({
    button: {
      backgroundColor: backgroundColor || theme.buttonBack,
      borderRadius: moderateWidthScale(12),
      height:moderateHeightScale(48),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: textColor || theme.buttonText,
    },
  });

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  containerStyle,
  textStyle,
  textColor,
  backgroundColor,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme, textColor, backgroundColor), [colors, textColor, backgroundColor]);

  // If loading, disable button but don't apply disabled opacity
  const isDisabled = disabled || loading;
  const showDisabledStyle = disabled && !loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        showDisabledStyle && styles.buttonDisabled,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor || (colors as Theme).buttonText} />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

