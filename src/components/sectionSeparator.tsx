import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale } from "@/src/theme/dimensions";

type SectionSeparatorProps = {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  lineStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: theme.lightGreen2,
    },
    text: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen2,
    },
  });

export default function SectionSeparator({
  label = "OR",
  containerStyle,
  lineStyle,
  textStyle,
}: SectionSeparatorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.line, lineStyle]} />
      {label ? <Text style={[styles.text]}>{label}</Text> : null}
      <View style={[styles.line, lineStyle]} />
    </View>
  );
}
