import React, { useMemo } from "react";
import { ScrollView, View, Text, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";

const DEFAULT_AI_REQUESTS_IMAGE =
  process.env.EXPO_PUBLIC_DEFAULT_AI_REQUESTS_IMAGE || "";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function getImageUrl(image: (string | null) | undefined): string {
  if (image == null || image === "") return DEFAULT_AI_REQUESTS_IMAGE;

  if (image.startsWith("https://") || image.startsWith("http://")) return image;

  return `${API_BASE_URL}${image}`;
}

export default function AiResults() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={styles.safeArea}>
      <StackHeader title={"AI Result"} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      ></ScrollView>
    </View>
  );
}
