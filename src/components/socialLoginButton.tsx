import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface SocialLoginButtonProps {
  icon: React.ReactNode; // SVG icon component
  title: string;
  onPress: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      borderRadius: moderateWidthScale(12),
      height:moderateHeightScale(48),
      paddingHorizontal: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen,
    },
    section: {
      width: moderateWidthScale(200),
      flexDirection: "row",
      alignItems: "center",
      justifyContent:"center",
      // justifyContent: "flex-start",
      gap: moderateWidthScale(10),
    },
    buttonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "left",
    },
  });

export default function SocialLoginButton({
  icon,
  title,
  onPress,
}: SocialLoginButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.section}>
        {icon}
        <Text style={styles.buttonText}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
