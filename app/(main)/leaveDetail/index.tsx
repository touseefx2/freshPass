import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  heightScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import DatePickerModal from "@/src/components/datePickerModal";
import TimePickerModal from "@/src/components/timePickerModal";
import Button from "@/src/components/button";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(40),
    },
    applyButton: {
      marginTop: moderateHeightScale(8),
    },
  });

export default function LeaveDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader title="Leave Detail" />
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Button title="Cancel Leave" containerStyle={styles.applyButton} />
      </KeyboardAwareScrollView>
    </View>
  );
}
