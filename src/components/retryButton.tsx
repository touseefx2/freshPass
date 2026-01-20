import React, { useMemo } from "react";
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";

interface RetryButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(8),
     height:moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(16),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(8),
      alignSelf: "center",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.buttonText,
    },
  });

export default function RetryButton({
  onPress,
  loading = false,
  disabled = false,
}: RetryButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const isDisabled = disabled || loading;
  const showDisabledStyle = disabled && !loading;

  return (
    <TouchableOpacity
      style={[styles.button, showDisabledStyle && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={(colors as Theme).darkGreen}
        />
      ) : (
        <Text style={styles.buttonText}>Retry</Text>
      )}
    </TouchableOpacity>
  );
}

