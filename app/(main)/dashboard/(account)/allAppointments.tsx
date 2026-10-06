import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import dayjs from "dayjs";
import { Appointment } from "@/src/components/appointmentDetail";
import { useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import StackHeader from "@/src/components/StackHeader";
import { Skeleton } from "@/src/components/skeletons";
import EmptyState from "@/src/components/emptyState";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(10),
    },
    emptyListContent: {
      flex: 1,
    },
    card: {
      flexDirection: "row",
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: moderateWidthScale(6),
        },
        android: {
          elevation: 3,
          shadowColor: theme.darkGreen,
        },
      }),
    },
    cardAccent: {
      width: moderateWidthScale(4),
    },
    accentScheduled: {
      backgroundColor: theme.orangeBrown,
    },
    accentCompleted: {
      backgroundColor: theme.buttonBack,
    },
    accentCancelled: {
      backgroundColor: theme.red,
    },
    cardContent: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(8),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      lineHeight: fontSize.size18,
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      alignSelf: "flex-start",
    },
    statusBadgeScheduled: {
      backgroundColor: theme.orangeBrown30,
    },
    statusBadgeCompleted: {
      backgroundColor: theme.lightGreen1,
    },
    statusBadgeCancelled: {
      backgroundColor: theme.lightRed,
    },
    statusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      textTransform: "capitalize",
    },
    statusTextScheduled: {
      color: theme.orangeBrownText,
    },
    statusTextCompleted: {
      color: theme.darkGreen,
    },
    statusTextCancelled: {
      color: theme.red,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(4),
    },
    metaText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "capitalize",
    },
    bookingId: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(6),
    },
    workHistoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
    },
    line: {
      height: 1,
      backgroundColor: theme.lightGreen1,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(20),
    },
  });

export default function AllAppointmentsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const formatDateTime = (date: string, time: string) => {
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm A");
    return `${date} - ${formattedTime}`;
  };

  const getServiceTitles = (appointment: Appointment) => {
    if (
      appointment.appointmentType === "subscription" &&
      Array.isArray(appointment.subscriptionServices) &&
      appointment.subscriptionServices.length > 0
    ) {
      return appointment.subscriptionServices.map((s) => s.name).join(", ");
    } else if (
      appointment.appointmentType === "service" &&
      Array.isArray(appointment.services) &&
      appointment.services.length > 0
    ) {
      return appointment.services.map((s) => s.name).join(", ");
    }
    return "Service";
  };

  const getAccentStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.accentCompleted;
    if (status === "cancelled") return styles.accentCancelled;
    return styles.accentScheduled;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.statusBadgeCompleted;
    if (status === "cancelled") return styles.statusBadgeCancelled;
    return styles.statusBadgeScheduled;
  };

  const getStatusTextStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.statusTextCompleted;
    if (status === "cancelled") return styles.statusTextCancelled;
    return styles.statusTextScheduled;
  };

  const fetchAppointments = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const params: {
          per_page: number;
          direction: string;
          page: number;
        } = {
          per_page: 16,
          direction: "desc",
          page,
        };

        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: {
            data: Appointment[];
            meta: {
              current_page: number;
              per_page: number;
              total: number;
              last_page: number;
            };
          };
        }>(appointmentsEndpoints.list(params));

        if (response.success && response.data) {
          if (append) {
            setData((prev) => [...prev, ...response.data.data]);
          } else {
            setData(response.data.data);
          }
          setCurrentPage(response.data.meta.current_page);
          setHasMore(
            response.data.meta.current_page < response.data.meta.last_page,
          );
          if (page === 1) setInitialLoadComplete(true);
        }
      } catch (error: any) {
        Logger.error("Failed to fetch all appointments:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  const handleLoadMore = useCallback(() => {
    if (initialLoadComplete && !loading && !loadingMore && hasMore) {
      fetchAppointments(currentPage + 1, true);
    }
  }, [initialLoadComplete, loading, currentPage, hasMore, loadingMore, fetchAppointments]);

  const renderItem = useCallback(
    ({ item }: { item: Appointment }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: "/(main)/bookingDetailsById",
            params: { bookingId: String(item.id) },
          });
        }}
      >
        <View style={styles.card}>
          <View style={[styles.cardAccent, getAccentStyle(item.status)]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName} numberOfLines={2}>
                {getServiceTitles(item)}
              </Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
                  {item.status === "scheduled" ? t("onGoingApt") : item.status}
                </Text>
              </View>
            </View>
            {!!item.user && (
              <View style={styles.metaRow}>
                <MaterialIcons name="person-outline" size={moderateWidthScale(14)} color={theme.lightGreen} />
                <Text style={styles.metaText}>{item.user}</Text>
              </View>
            )}
            {!!item.staffName && (
              <View style={styles.metaRow}>
                <MaterialIcons name="content-cut" size={moderateWidthScale(14)} color={theme.lightGreen} />
                <Text style={styles.metaText}>{item.staffName}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <MaterialIcons name="schedule" size={moderateWidthScale(14)} color={theme.lightGreen} />
              <Text style={styles.metaText}>
                {formatDateTime(item.appointmentDate, item.appointmentTime)}
              </Text>
            </View>
            {!!item.id && (
              <Text style={styles.bookingId}>{`#FP${item.id}`}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router, styles, t, theme],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [loadingMore, styles.footerLoader, theme.primary]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.contentContainer}>
          <Skeleton screenType="WorkHistoryList" styles={styles} />
        </View>
      );
    }
    return (
      <EmptyState
        icon="event-note"
        title={t("appointmentsEmptyTitle")}
        subtitle={t("appointmentsEmptySubtitle")}
      />
    );
  }, [loading, styles, t]);

  return (
    <View style={styles.container}>
      <StackHeader title={t("allAppointments")} />
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.contentContainer,
          data.length === 0 && styles.emptyListContent,
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
