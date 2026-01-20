import { Stack } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
 
const createStyles = (theme: any) =>
  StyleSheet.create({
    contentStyle: {
      
    },
  });

export default function MainLayout() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: styles.contentStyle,
        animation: Platform.OS === "ios" ? "default" : "fade_from_bottom",
      }}
    />
  );
}
