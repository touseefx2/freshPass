import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { router, useLocalSearchParams } from "expo-router";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints } from "@/src/services/endpoints";
import dayjs from "dayjs";
import { MaterialIcons } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";

export default function ForgotPassword() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ email?: string }>();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={styles.safeArea}>
      {/* <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      /> */}
      <StackHeader title={"Forogot Password"} onBack={() => router.back()} />
    </View>
  );
}
