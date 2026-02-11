import React, { useMemo, useState } from "react";
import { StyleSheet, View, Text, StatusBar } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import dayjs from "dayjs";
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
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(20),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
    },
    rowLast: {
      marginBottom: 0,
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      width: moderateWidthScale(100),
    },
    value: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    typeBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown015,
    },
    typeBadgeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    cancelButton: {
      marginTop: moderateHeightScale(24),
    },
  });

export default function LeaveDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    leaveId?: string;
    staffName?: string;
    leaveType?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
    createdAt?: string;
  }>();

  const [cancelling, setCancelling] = useState(false);

  const leaveId = params.leaveId ? Number(params.leaveId) : null;
  const staffName = params.staffName ?? "";
  const leaveType = (params.leaveType ?? "leave") as "leave" | "break";
  const startTime = params.startTime ?? "";
  const endTime = params.endTime ?? "";
  const reason = params.reason ?? "";
  const createdAt = params.createdAt ?? "";

  const formatDateTime = (iso: string) => {
    if (!iso) return "—";
    const d = dayjs(iso);
    return d.format("MMM D, YYYY · h:mm a");
  };

  const formatDateOnly = (iso: string) => {
    if (!iso) return "—";
    const datePart = iso.slice(0, 10);
    return dayjs(datePart).format("MMM D, YYYY");
  };

  const formatStartEnd = (iso: string) => {
    if (!iso) return "—";
    return leaveType === "leave"
      ? formatDateOnly(iso)
      : formatDateTime(iso);
  };

  const handleCancelLeave = async () => {
    if (leaveId == null) return;
    setCancelling(true);
    try {
      await ApiService.delete<{ success: boolean; message: string }>(
        staffEndpoints.leaveCancel(leaveId),
      );
      showBanner(
        t("success") || "Success",
        "Leave cancelled successfully",
        "success",
        2500,
      );
      router.back();
    } catch (error: any) {
      showBanner(
        t("apiFailed") || "Error",
        error?.message ?? "Failed to cancel leave",
        "error",
        2500,
      );
    } finally {
      setCancelling(false);
    }
  };

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
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {(leaveType === "break" ? "Break" : "Leave").toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Staff</Text>
            <Text style={styles.value}>{staffName || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Start</Text>
            <Text style={styles.value}>{formatStartEnd(startTime)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>End</Text>
            <Text style={styles.value}>{formatStartEnd(endTime)}</Text>
          </View>
          {reason ? (
            <View style={styles.row}>
              <Text style={styles.label}>Reason</Text>
              <Text style={styles.value}>{reason}</Text>
            </View>
          ) : null}
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Created</Text>
            <Text style={styles.value}>{formatDateOnly(createdAt)}</Text>
          </View>
        </View>

        <Button
          title={cancelling ? "Cancelling..." : "Cancel Leave"}
          onPress={handleCancelLeave}
          disabled={cancelling}
          containerStyle={styles.cancelButton}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}
