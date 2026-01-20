import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
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
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { UserRole } from "@/src/state/slices/userSlice";
import StackHeader from "@/src/components/StackHeader";
import { Skeleton } from "@/src/components/skeletons";

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
    workHistoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
    },
    workHistoryService: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    workHistoryDate: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    workHistoryPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    line: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    loadingContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(20),
    },
  });

export default function WorkHistoryList() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const userRole = useAppSelector((state) => state.user.userRole) as UserRole;

  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Format date and time
  const formatDateTime = (date: string, time: string) => {
    const formattedDate = date;
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm a");
    return `${formattedDate} - ${formattedTime}`;
  };

  // Format price
  const formatPrice = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Get service titles
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

  const fetchWorkHistory = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        let params: {
          status?: string;
          per_page: number;
          direction: string;
          page: number;
          staff_id?: number;
        } = {
          per_page: 16,
          direction: "desc",
          page: page,
        };

        // For staff role, fetch completed appointments
        if (userRole === "staff") {
          params.status = "without_scheduled";
        }
        // For client role, fetch past appointments
        else if (userRole === "customer") {
          params.status = "without_scheduled";
        }
        // For business, fetch without_scheduled (past appointments)
        else {
          params.status = "without_scheduled";
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
          setTotalCount(response.data.meta.total);
          setCurrentPage(response.data.meta.current_page);
          setHasMore(
            response.data.meta.current_page < response.data.meta.last_page
          );
          
          // Mark initial load as complete after first page loads
          if (page === 1) {
            setInitialLoadComplete(true);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch work history:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userRole]
  );

  useEffect(() => {
    fetchWorkHistory(1);
  }, [fetchWorkHistory]);

  const handleLoadMore = useCallback(() => {
    // Only load more if initial load is complete, not currently loading, and has more data
    if (initialLoadComplete && !loading && !loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchWorkHistory(nextPage, true);
    }
  }, [initialLoadComplete, loading, currentPage, hasMore, loadingMore, fetchWorkHistory]);

  const renderItem = useCallback(
    ({ item, index }: { item: Appointment; index: number }) => {
      return (
        <View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              router.push({
                pathname: "/(main)/dashboard/(home)/appointmentDetail",
                params: {
                  appointment: JSON.stringify(item),
                },
              });
            }}
          >
            <View style={styles.workHistoryItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.workHistoryService}>
                  {getServiceTitles(item)}
                </Text>
                <Text style={styles.workHistoryDate}>
                  {formatDateTime(item.appointmentDate, item.appointmentTime)}
                </Text>
              </View>
              <Text style={styles.workHistoryPrice}>
                {formatPrice(item.paidAmount)}
              </Text>
            </View>
          </TouchableOpacity>
          {index < data.length - 1 && <View style={styles.line} />}
        </View>
      );
    },
    [data.length, router, styles]
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
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>No work history found</Text>
      </View>
    );
  }, [loading, styles]);

  return (
    <View style={styles.container}>
      <StackHeader title="Work History" />
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.contentContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

