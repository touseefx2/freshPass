import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
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
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(24),
    },
    emptyListContent: {
      flex: 1,
    },
    appointmentItem: {
      paddingVertical: moderateHeightScale(12),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    workHistoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
    },
    appointmentService: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "capitalize",
    },
    appointmentDate: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
    bookingIdText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen6,
      marginTop: moderateHeightScale(2),
    },
    appointmentStatus: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
      overflow: "hidden",
      textTransform: "capitalize",
    },
    statusScheduled: {
      backgroundColor: theme.orangeBrown30,
      color: theme.selectCard,
    },
    statusCompleted: {
      backgroundColor: theme.lightGreen1,
      color: theme.darkGreen,
    },
    statusCancelled: {
      backgroundColor: theme.lightRed,
      color: theme.red,
    },
    line: {
      height: 1,
      backgroundColor: theme.lightGreen1,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(20),
    },
    customerName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
  });

export default function MyAppointmentsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const staffId = useAppSelector(
    (state) => state.user.businessStatus?.owner_as_staff?.staff_id ?? null,
  );

  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const formatDateTime = (date: string, time: string) => {
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm a");
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

  const getStatusStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.statusCompleted;
    if (status === "cancelled") return styles.statusCancelled;
    return styles.statusScheduled;
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
          staff_id?: number;
        } = {
          per_page: 16,
          direction: "desc",
          page,
        };

        if (staffId) {
          params.staff_id = staffId;
        }

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
        Logger.error("Failed to fetch appointments:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [staffId],
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
    ({ item, index }: { item: Appointment; index: number }) => (
      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            router.push({
              pathname: "/(main)/bookingDetailsById",
              params: { bookingId: String(item.id) },
            });
          }}
        >
          <View style={styles.appointmentItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.appointmentService}>
                {getServiceTitles(item)}
              </Text>
              {!!item.user && (
                <Text style={styles.customerName}>
                  {item.user}
                </Text>
              )}
              <Text style={styles.appointmentDate}>
                {formatDateTime(item.appointmentDate, item.appointmentTime)}
              </Text>
              {!!item.id && (
                <Text style={styles.bookingIdText}>{`#FP${item.id}`}</Text>
              )}
            </View>
            <Text style={[styles.appointmentStatus, getStatusStyle(item.status)]}>
              {item.status === "scheduled" ? t("onGoingApt") : item.status}
            </Text>
          </View>
        </TouchableOpacity>
        {index < data.length - 1 && <View style={styles.line} />}
      </View>
    ),
    [data.length, router, styles, t],
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
      <StackHeader title={t("myAppointments")} />
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
