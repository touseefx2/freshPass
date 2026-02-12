import React, { useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";

export default function TryOnPurchase() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return <View style={styles.safeArea}></View>;
}
