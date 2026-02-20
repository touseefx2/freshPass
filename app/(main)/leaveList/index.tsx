import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useFocusEffect } from "expo-router";
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
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import RetryButton from "@/src/components/retryButton";

dayjs.extend(utc);

interface LeaveItem {
  id: number;
  staff_id: number;
  staff_name: string;
  type: "leave" | "break";
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(12),
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
    },
    cardRowLast: {
      marginBottom: 0,
    },
    typeBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown015,
    },
    typeBadgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    dateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    staffText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    emptyContainer: {
      flex: 1,
      minHeight: Dimensions.get("window").height * 0.6,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: moderateHeightScale(40),
    },
    emptyText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    errorContainer: {
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(16),
      textAlign: "center",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: moderateHeightScale(40),
    },
  });

export default function LeaveList() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();

  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: LeaveItem[];
      }>(staffEndpoints.leaves);

      if (response.success && response.data && Array.isArray(response.data)) {
        setLeaves(response.data);
      } else {
        setLeaves([]);
      }
    } catch (err: any) {
      setError(err?.message ?? t("apiFailed") ?? "Failed to load leaves");
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaves();
    }, [fetchLeaves]),
  );

  const formatDateOnly = (iso: string) => {
    if (!iso) return "—";
    const datePart = iso.slice(0, 10);
    return dayjs(datePart).format("MMM D, YYYY");
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "—";
    const d = dayjs.utc(iso);
    return d.format("MMM D, YYYY · h:mm a");
  };

  const navigateToDetail = (item: LeaveItem) => {
    router.push({
      pathname: "/(main)/leaveDetail",
      params: {
        leaveId: String(item.id),
        staffName: item.staff_name || "",
        leaveType: item.type,
        startTime: item.start_time || "",
        endTime: item.end_time || "",
        reason: item.reason || "",
        createdAt: item.created_at || "",
      },
    });
  };

  const renderItem = ({ item }: { item: LeaveItem }) => {
    const isLeave = item.type === "leave";
    const startStr = isLeave
      ? formatDateOnly(item.start_time)
      : formatDateTime(item.start_time);
    const endStr = isLeave
      ? formatDateOnly(item.end_time)
      : formatDateTime(item.end_time);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {(item.type === "break" ? "Break" : "Close").toUpperCase()}
            </Text>
          </View>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.staffText}>{item.staff_name || "—"}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.dateText}>{startStr}</Text>
        </View>
        <View style={[styles.cardRow, styles.cardRowLast]}>
          <Text style={styles.dateText}>to {endStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && leaves.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("leaveRequest") || "Leave Request"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader title={t("leaveRequest") || "Leave Request"} />
      {error && leaves.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={fetchLeaves} loading={loading} />
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("noLeaves") || "No leaves or breaks yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
