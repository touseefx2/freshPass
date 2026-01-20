import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

interface RegisterHeaderProps {
  onBack: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
    },
    backButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(26),
      alignItems: "flex-start",
      justifyContent: "center",
    },
  });

export default function RegisterHeader({ onBack }: RegisterHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onBack}
        hitSlop={moderateWidthScale(8)}
        style={styles.backButton}
      >
        <Feather
          name="arrow-left"
          size={moderateWidthScale(22)}
          color={(colors as Theme).darkGreen}
        />
      </Pressable>
    </View>
  );
}
