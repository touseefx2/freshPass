import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import DashboardHeader from "@/src/components/DashboardHeader";
import Button from "@/src/components/button";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import {
  NotificationBellOutlineIcon,
  ProposalDocumentIcon,
  MessageBubbleOutlineIcon,
} from "@/assets/icons";
import { ApiService, checkInternetConnection } from "@/src/services/api";
import { notificationsEndpoints } from "@/src/services/endpoints";
import { Skeleton } from "@/src/components/skeletons";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useFocusEffect } from "expo-router";
import { setUnreadCount } from "@/src/state/slices/userSlice";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type NotificationIconType = "notification" | "proposal" | "message";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  icon: NotificationIconType;
  isRead: boolean;
  highlight?: string;
  createdAt: string; // full ISO datetime e.g. "2024-01-17T09:30:00Z"
  apiId: number; // API notification ID for marking as read
};

type NotificationSection = {
  title: string;
  data: NotificationItem[];
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
    },
    listContent: {
      paddingBottom: moderateHeightScale(20),
    },
    sectionHeaderContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sectionHeader: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    markAllAsReadText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
    },
    markAllAsReadContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    sectionContainer: {
      marginBottom: moderateHeightScale(24),
    },
    notificationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(14),
      gap: moderateWidthScale(12),
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    leftTimelineDotContainer: {
      width: moderateWidthScale(10),
    },
    timelineOuterDot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(8 / 2),
      borderWidth: 2.2,
      borderColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    iconContainer: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      alignItems: "center",
      justifyContent: "center",
    },
    unreadIconContainer: {
      backgroundColor: theme.orangeBrown30,
    },
    readIconContainer: {
      backgroundColor: theme.lightGreen13,
    },
    contentContainer: {
      flex: 1,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    notificationTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flexShrink: 1,
      marginRight: moderateWidthScale(8),
    },
    timeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    messageText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    messageHighlight: {
      fontFamily: fonts.fontMedium,
    },
    loadingFooter: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
    },
    screenTitle: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    guestContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    guestContent: {
      alignItems: "center",
      width: "100%",
      maxWidth: widthScale(340),
    },
    guestIconContainer: {
      width: widthScale(70),
      height: heightScale(70),
      borderRadius: widthScale(70 / 2),
      backgroundColor: theme.orangeBrown30,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    guestTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    guestMessage: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(8),
    },
    buttonContainer: {
      width: "100%",
      marginBottom: moderateHeightScale(20),
    },
  });

type ApiNotification = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export default function ExploreScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const isGuest = user.isGuest;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [markAllAsReadLoading, setMarkAllAsReadLoading] = useState(false);

  // Determine icon type from title
  const getIconType = (title: string): NotificationIconType => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("proposal")) {
      return "proposal";
    }
    if (lowerTitle.includes("message")) {
      return "message";
    }
    return "notification";
  };

  // Format time label
  const formatTimeLabel = (createdAt: string): string => {
    const now = dayjs();
    const created = dayjs(createdAt);
    const diffInMinutes = now.diff(created, "minute");
    const diffInHours = now.diff(created, "hour");
    const diffInDays = now.diff(created, "day");

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hr ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else {
      // Format as date: DD/MM/YYYY
      const day = `${created.date()}`.padStart(2, "0");
      const month = `${created.month() + 1}`.padStart(2, "0");
      const year = created.year();
      return `${day}/${month}/${year}`;
    }
  };

  // Map API notification to NotificationItem
  const mapApiNotification = (apiNotif: ApiNotification): NotificationItem => {
    return {
      id: apiNotif.id.toString(),
      apiId: apiNotif.id,
      title: apiNotif.title,
      description: apiNotif.message,
      timeLabel: formatTimeLabel(apiNotif.created_at),
      icon: getIconType(apiNotif.title),
      isRead: apiNotif.is_read,
      createdAt: apiNotif.created_at,
    };
  };

  // Fetch notifications from API
  const fetchNotifications =  
    async (page: number = 1, append: boolean = false) => {
      if (isGuest) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: {
            data: ApiNotification[];
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
          };
        }>(notificationsEndpoints.list({ page, per_page: 16 }));

        if (response.success && response.data) {
          const mappedNotifications =
            response.data.data.map(mapApiNotification);
          if (append) {
            setNotifications((prev) => [...prev, ...mappedNotifications]);
          } else {
            setNotifications(mappedNotifications);
          }
          setCurrentPage(response.data.current_page);
          setTotalPages(response.data.last_page);
        }
      } catch (error: any) {
        showBanner(
          "API Failed",
          error?.message || "Failed to fetch notifications",
          "error",
          2500
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

  // Fetch unread count
  const handleFetchUnreadCount = async () => {
    if (isGuest) {
      return;
    }
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          unread_count: number;
        };
      }>(notificationsEndpoints.unreadCount);

      if (response.success && response.data) {
        dispatch(setUnreadCount(response.data.unread_count));
      }
    } catch (error: any) {
      // Silent fail - no banner or console
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: number, itemId: string) => {
    if (isGuest) {
      return;
    }
    try {
      const response = await ApiService.post<{
        success: boolean;
        message: string;
      }>(notificationsEndpoints.markAsRead(notificationId));

      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === itemId ? { ...notif, isRead: true } : notif
          )
        );
        // Fetch updated unread count
        handleFetchUnreadCount();
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to mark notification as read",
        "error",
        2500
      );
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (isGuest) {
      return;
    }
    setMarkAllAsReadLoading(true);
    try {
      const response = await ApiService.post<{
        success: boolean;
        message: string;
      }>(notificationsEndpoints.markAllAsRead);

      if (response.success) {
        fetchNotifications(1, false);
        handleFetchUnreadCount();
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to mark all notifications as read",
        "error",
        2500
      );
    } finally {
      setMarkAllAsReadLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        fetchNotifications(1, false);
        handleFetchUnreadCount();
      } else {
        setLoading(false);
      }
    }, [isGuest])
  );

  const handleRefresh = async () => {
    if (isGuest) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);

    try {
      // Check internet connection first
      const hasInternet = await checkInternetConnection();

      if (!hasInternet) {
        showBanner(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          "error",
          2500
        );
        setRefreshing(false);
        return;
      }

      // Call both APIs in parallel
      await Promise.all([
        fetchNotifications(1, false),
        handleFetchUnreadCount(),
      ]);
    } catch (error: any) {
      // Error handling is done in individual functions
    } finally {
      setRefreshing(false);
    }
  } 

  const loadMore =  () => {
    if (isGuest) {
      return;
    }
    if (!loadingMore && currentPage < totalPages) {
      fetchNotifications(currentPage + 1, true);
    }
  } 

  const sections = useMemo<NotificationSection[]>(() => {
    if (notifications.length === 0) {
      return [];
    }

    const today = new Date();

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const formatDateTitle = (date: Date) => {
      const yesterday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      );

      if (isSameDay(date, today)) {
        return "Today";
      }

      if (isSameDay(date, yesterday)) {
        return "Yesterday";
      }

      const day = `${date.getDate()}`.padStart(2, "0");
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Group notifications by calendar date derived from createdAt
    const grouped = new Map<string, NotificationItem[]>();
    notifications.forEach((item) => {
      const dateObj = new Date(item.createdAt);
      const key = `${dateObj.getFullYear()}-${`${
        dateObj.getMonth() + 1
      }`.padStart(2, "0")}-${`${dateObj.getDate()}`.padStart(2, "0")}`;
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    });

    // Sort dates descending (latest first)
    const sortedDates = Array.from(grouped.keys()).sort((a, b) =>
      a < b ? 1 : a > b ? -1 : 0
    );

    return sortedDates.map((isoDate) => {
      const dateObj = new Date(isoDate);
      const items = [...(grouped.get(isoDate) ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        title: formatDateTitle(dateObj),
        data: items,
      };
    });
  }, [notifications]);

  const renderIcon = (icon: NotificationIconType) => {
    switch (icon) {
      case "proposal":
        return (
          <ProposalDocumentIcon
            width={24}
            height={24}
            color={theme.darkGreen}
          />
        );
      case "message":
        return (
          <MessageBubbleOutlineIcon
            width={24}
            height={24}
            color={theme.darkGreen}
          />
        );
      default:
        return (
          <NotificationBellOutlineIcon
            width={24}
            height={24}
            color={theme.darkGreen}
          />
        );
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const handleSignIn = async() => {
    await ApiService.logout();
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <DashboardHeader />
        <Text
          style={[
            styles.screenTitle,
            { paddingTop: moderateHeightScale(20) },
          ]}
        >
          Notifications
        </Text>
        <View style={styles.guestContainer}>
          <View style={styles.guestContent}>
            <View style={styles.guestIconContainer}>
              <Feather
                name="user"
                size={moderateWidthScale(36)}
                color={theme.darkGreen}
              />
            </View>

            <Text style={styles.guestTitle}>Guest Mode</Text>

            <Text style={styles.guestMessage}>
              You are currently browsing as a guest. To access all features and
              make bookings, please sign in to your account.
            </Text>

            <View style={styles.buttonContainer}>
              <Button title="Sign In" onPress={handleSignIn} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DashboardHeader />
      {loading && notifications.length === 0 ? (
        <View style={styles.content}>
          <Skeleton screenType="Notifications" styles={styles} />
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.emptyStateContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <Text style={styles.emptyStateText}>No notifications yet</Text>
        </ScrollView>
      ) : (
        <SectionList
          style={styles.content}
          contentContainerStyle={styles.listContent}
          sections={sections}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          renderSectionHeader={({ section }) => {
            const sectionIndex = sections.findIndex(
              (s) => s.title === section.title
            );
            return (
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {sectionIndex === 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    disabled={markAllAsReadLoading}
                    activeOpacity={0.7}
                  >
                    <View style={styles.markAllAsReadContainer}>
                      {markAllAsReadLoading && (
                        <ActivityIndicator
                          size="small"
                          color={theme.darkGreen}
                        />
                      )}
                      <Text style={styles.markAllAsReadText}>
                        Mark all as read
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.notificationRow}
              onPress={() => {
                if (!item.isRead) {
                  handleMarkAsRead(item.apiId, item.id);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconRow}>
                <View style={styles.leftTimelineDotContainer}>
                  {!item.isRead && <View style={styles.timelineOuterDot} />}
                </View>
                <View
                  style={[
                    styles.iconContainer,
                    item.isRead
                      ? styles.readIconContainer
                      : styles.unreadIconContainer,
                  ]}
                >
                  {renderIcon(item.icon)}
                </View>
              </View>
              <View style={styles.contentContainer}>
                <View style={styles.rowHeader}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.timeText}>{item.timeLabel}</Text>
                </View>
                <Text style={styles.messageText}>
                  {item.description}
                  {item.highlight && (
                    <Text style={styles.messageHighlight}>
                      {item.highlight}
                    </Text>
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}
