import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useTheme, useAppDispatch } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { Feather } from "@expo/vector-icons";
import RetryButton from "@/src/components/retryButton";
import { Dropdown } from "react-native-element-dropdown";
import subscription from "./subscription";

interface SubscriptionData {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlan: string;
  subscriptionPlanPrice: string;
  subscriptionPlanType: string;
  subscriptionPlanDescription: string;
  userId: number;
  user: string;
  businessId: number;
  business: string;
  subscriber: string;
  visits: {
    used: number;
    upcoming: number;
    total: number;
    remaining: number;
  };
  status: string;
  stripeStatus: string;
  endsAt: string | null;
  paymentDate: string | null;
  nextPaymentDate: string;
  remainingDays: number;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
}

interface SubscriptionResponse {
  success: boolean;
  message: string;
  data: {
    data: SubscriptionData[];
    meta: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingBottom: moderateHeightScale(30),
    },
    subscriptionCard: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
      padding: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(10),
    },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    starIcon: {
      marginRight: moderateWidthScale(6),
    },
    planTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown015,
      borderWidth: 1,
      borderColor: theme.orangeBrown,
    },
    statusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 0.5,
    },
    topSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    userInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    userIcon: {
      marginRight: moderateWidthScale(6),
    },
    userText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      opacity: 0.75,
    },
    priceBadge: {
      backgroundColor: theme.buttonBack,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      minWidth: moderateWidthScale(90),
    },
    priceText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    planPriceLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      marginTop: moderateHeightScale(1),
      opacity: 0.9,
    },
    descriptionText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
      opacity: 0.65,
      lineHeight: fontSize.size18,
    },
    usageSection: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(8),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    usageHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    usageTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(6),
      flex: 1,
    },
    checkIcon: {
      marginLeft: moderateWidthScale(4),
    },
    usageStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(6),
    },
    usageItem: {
      alignItems: "center",
      flex: 1,
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    usageLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(3),
      opacity: 0.65,
    },
    usageValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    paymentDateSection: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(6),
      paddingTop: moderateHeightScale(8),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    paymentDateLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(6),
      letterSpacing: 0.3,
      opacity: 0.7,
    },
    paymentDateValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(8),
    },
    nextRenewalSection: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(8),
      paddingTop: moderateHeightScale(8),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    nextRenewalLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(6),
      letterSpacing: 0.3,
      opacity: 0.7,
    },
    nextRenewalDate: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(8),
    },
    paymentRenewalRow: {
      flexDirection: "row",
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(6),
      paddingTop: moderateHeightScale(8),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    paymentDateContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: moderateWidthScale(8),
    },
    renewalContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginLeft: moderateWidthScale(8),
    },
    dateInfoContainer: {
      marginLeft: moderateWidthScale(4),
    },
    dateLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      opacity: 0.7,
    },
    dateValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    bookAppointmentButton: {
      backgroundColor: theme.buttonBack,
      paddingVertical: moderateHeightScale(11),
      paddingHorizontal: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      alignSelf: "center",
      marginTop: moderateHeightScale(6),
      width: "100%",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    bookAppointmentButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.3,
    },
    cancelButton: {
      backgroundColor: "transparent",
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      alignSelf: "center",
      width: "100%",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.red,
    },
    cancelButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.red,
      letterSpacing: 0.3,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: moderateHeightScale(60),
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyIcon: {
      marginBottom: moderateHeightScale(20),
    },
    emptyText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },
    emptySubtext: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: moderateHeightScale(60),
      paddingHorizontal: moderateWidthScale(20),
    },
    errorText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    headerDescription: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(24),
      opacity: 0.75,
      lineHeight: fontSize.size22,
    },
    headerRow: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(24),
    },
    headerDescriptionRow: {},
    filterDropdown: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(8),
      width: 140,
      alignSelf: "flex-end",
    },
    filterDropdownText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    filterDropdownContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLine,
      marginTop: moderateHeightScale(4),
    },
    filterDropdownItem: {
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    filterDropdownItemText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterDropdownItemTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(24),
      width: "85%",
      maxWidth: moderateWidthScale(400),
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    modalTitle: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    modalCloseButton: {
      width: moderateWidthScale(32),
      height: moderateHeightScale(32),
      borderRadius: moderateWidthScale(16),
      alignItems: "center",
      justifyContent: "center",
    },
    modalQuestion: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(20),
      lineHeight: fontSize.size22,
    },
    modalQuestionBold: {
      fontFamily: fonts.fontBold,
    },
    consequencesBox: {
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      marginBottom: moderateHeightScale(20),
    },
    consequenceItem: {
      flexDirection: "row",
      marginBottom: moderateHeightScale(12),
    },
    consequenceBullet: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(8),
    },
    consequenceText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(24),
    },
    checkbox: {
      width: moderateWidthScale(20),
      height: moderateHeightScale(20),
      borderRadius: moderateWidthScale(4),
      borderWidth: 2,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    checkboxChecked: {
      backgroundColor: theme.darkGreen,
    },
    checkboxText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    confirmButton: {
      backgroundColor: theme.buttonBack,
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(20),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
    },
    confirmButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    confirmButtonDisabled: {
      opacity: 0.5,
    },
    cancelledStatusContainer: {
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(6),
      borderWidth: 1,
      borderColor: theme.orangeBrown,
      flexDirection: "row",
      alignItems: "center",
    },
    cancelledIconContainer: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown015,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    cancelledContentContainer: {
      flex: 1,
    },
    cancelledStatusText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      marginBottom: moderateHeightScale(4),
    },
    cancelledStatusSubtext: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      opacity: 0.8,
      lineHeight: fontSize.size18,
    },
  });

export default function subscriptionCustomer() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionData | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSubscriptions = useCallback(
    async (page: number = 1, append: boolean = false, status?: string) => {
      const filterStatus = status !== undefined ? status : statusFilter;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setApiError(false);

      try {
        const statusParam = filterStatus === "all" ? undefined : filterStatus;
        const baseUrl = businessEndpoints.subscriptions(statusParam);
        // Use ? if no query params exist, otherwise use &
        const separator = baseUrl.includes("?") ? "&" : "?";
        const response = await ApiService.get<SubscriptionResponse>(
          `${baseUrl}${separator}page=${page}&per_page=10`
        );

        if (response.success && response.data?.data) {
          if (append) {
            setSubscriptions((prev) => [...prev, ...response.data.data]);
          } else {
            setSubscriptions(response.data.data);
          }
          setCurrentPage(response.data.meta.current_page);
          setTotalPages(response.data.meta.last_page);
        } else {
          if (!append) {
            setError("No subscriptions found");
            setApiError(true);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load subscriptions");
        setApiError(true);
        if (!append) {
          showBanner(
            "Error",
            err.message || "Failed to load subscriptions",
            "error",
            2500
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showBanner, statusFilter]
  );

  useEffect(() => {
    fetchSubscriptions(1, false);
  }, [statusFilter]);

  const handleStatusFilterChange = useCallback((status: string) => {
    // Reset data when filter changes
    setSubscriptions([]);
    setCurrentPage(1);
    setTotalPages(1);
    setStatusFilter(status);
    // useEffect will handle the API call when statusFilter changes
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && currentPage < totalPages) {
      fetchSubscriptions(currentPage + 1, true);
    }
  }, [loadingMore, currentPage, totalPages, fetchSubscriptions]);

  const handleBookAppointment = (subscription: SubscriptionData) => {
    router.push({
      pathname: "/(main)/bookingNow/checkoutBooking",
      params: {
        businessId: subscription.businessId.toString(),
        subscriptionId: subscription.id.toString(),
        item:JSON.stringify(subscription)
      },
    });
  };

  const handleCancelSubscription = useCallback(
    (subscription: SubscriptionData) => {
      setSelectedSubscription(subscription);
      setCancelModalVisible(true);
    },
    []
  );

  const handleConfirmCancellation = useCallback(async () => {
    if (!selectedSubscription || !confirmChecked || isCancelling) return;

    setIsCancelling(true);
    try {
      const response = await ApiService.patch<{
        success: boolean;
        message: string;
        data: {};
      }>(businessEndpoints.cancelSubscription(selectedSubscription.id), {});

      if (response.success) {
        showBanner(
          "Success",
          "Subscription cancelled successfully",
          "success",
          2500
        );
        setCancelModalVisible(false);
        setSelectedSubscription(null);
        setConfirmChecked(false);
        // Clear data and fetch page 1
        setSubscriptions([]);
        setCurrentPage(1);
        setTotalPages(1);
        await fetchSubscriptions(1, false);
      } else {
        showBanner(
          "Error",
          response.message || "Failed to cancel subscription",
          "error",
          2500
        );
      }
    } catch (err: any) {
      showBanner(
        "Error",
        err.message || "Failed to cancel subscription",
        "error",
        2500
      );
    } finally {
      setIsCancelling(false);
    }
  }, [
    selectedSubscription,
    confirmChecked,
    isCancelling,
    showBanner,
    fetchSubscriptions,
  ]);

  const formatEndsAtDate = useCallback((endsAt: string | null): string => {
    if (!endsAt) return "";
    try {
      const date = new Date(endsAt);
      const month = date.toLocaleString("en-US", { month: "short" });
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    } catch (error) {
      return endsAt;
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SubscriptionData }) => {
      const isCancelledButActive =
        item.status?.trim()?.toLowerCase() === "active" &&
        item.stripeStatus?.trim()?.toLowerCase() === "cancelled" &&
        item.endsAt;

      return (
        <View style={styles.subscriptionCard}>
          {/* Header: Plan Name and Status */}
          <View style={styles.cardHeader}>
            <View style={styles.planTitleRow}>
              <Feather
                name="star"
                size={moderateWidthScale(16)}
                color={theme.orangeBrown}
                style={styles.starIcon}
              />
              <Text style={styles.planTitle}>{item.subscriptionPlan}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* User Info and Price Badge */}
          <View style={styles.topSection}>
            <View style={styles.userInfoRow}>
              <Feather
                name="user"
                size={moderateWidthScale(14)}
                color={theme.darkGreen}
                style={styles.userIcon}
              />
              <Text style={styles.userText} numberOfLines={1}>
                {item.business}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>
                ${item.subscriptionPlanPrice}
              </Text>
              <Text style={styles.planPriceLabel}>/month</Text>
            </View>
          </View>

          {/* Description */}
          {item.subscriptionPlanDescription && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.subscriptionPlanDescription}
            </Text>
          )}

          {/* Usage Section */}
          <View style={styles.usageSection}>
            <View style={styles.usageHeader}>
              <Feather
                name="zap"
                size={moderateWidthScale(14)}
                color={theme.orangeBrown}
              />
              <Text style={styles.usageTitle}>
                {item.visits.total} Visits Per Month
              </Text>
            </View>
            <View style={styles.usageStats}>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Used</Text>
                <Text style={styles.usageValue}>{item.visits.used}</Text>
              </View>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Upcoming</Text>
                <Text style={styles.usageValue}>{item.visits.upcoming}</Text>
              </View>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Remaining</Text>
                <Text style={styles.usageValue}>{item.visits.remaining}</Text>
              </View>
            </View>
          </View>

          {/* Payment Date and Next Renewal - Side by Side */}
          {(item.paymentDate ||
            item.status?.trim()?.toLowerCase() === "active") && (
            <View style={styles.paymentRenewalRow}>
              {item.paymentDate && (
                <View style={styles.paymentDateContainer}>
                  <Feather
                    name="credit-card"
                    size={moderateWidthScale(12)}
                    color={theme.darkGreen}
                  />
                  <View style={styles.dateInfoContainer}>
                    <Text style={styles.dateLabel}>Payment</Text>
                    <Text style={styles.dateValue}>{item.paymentDate}</Text>
                  </View>
                </View>
              )}
              {item.status?.trim()?.toLowerCase() === "active" && (
                <View
                  style={[
                    styles.renewalContainer,
                    !item.paymentDate && { marginLeft: 0 },
                  ]}
                >
                  <Feather
                    name="calendar"
                    size={moderateWidthScale(12)}
                    color={theme.darkGreen}
                  />
                  <View style={styles.dateInfoContainer}>
                    <Text style={styles.dateLabel}>Renewal</Text>
                    <Text style={styles.dateValue}>{item.nextPaymentDate}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Book Appointment Button */}
          {item.status?.trim()?.toLowerCase() === "active" &&
            item.visits.remaining > 0 && (
              <TouchableOpacity
                style={styles.bookAppointmentButton}
                onPress={() => handleBookAppointment(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookAppointmentButtonText}>
                  Book Appointment
                </Text>
              </TouchableOpacity>
            )}

          {/* Cancelled Status or Cancel Button */}
          {isCancelledButActive ? (
            <View style={styles.cancelledStatusContainer}>
              <View style={styles.cancelledIconContainer}>
                <Feather
                  name="info"
                  size={moderateWidthScale(20)}
                  color={theme.orangeBrown}
                />
              </View>
              <View style={styles.cancelledContentContainer}>
                <Text style={styles.cancelledStatusText}>
                  Subscription Cancelled
                </Text>
                <Text style={styles.cancelledStatusSubtext}>
                  You can still use this subscription until{" "}
                  <Text style={{ fontFamily: fonts.fontBold }}>
                    {formatEndsAtDate(item.endsAt)}
                  </Text>
                </Text>
              </View>
            </View>
          ) : (
            item.status?.trim()?.toLowerCase() === "active" && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelSubscription(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      );
    },
    [
      styles,
      theme,
      handleCancelSubscription,
      handleBookAppointment,
      formatEndsAtDate,
    ]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.buttonBack} />
      </View>
    );
  }, [loadingMore, styles.footerLoader, theme.buttonBack]);

  const statusOptions = [
    // { label: "All", value: "all" },
    // { label: "Pending", value: "pending" },
    { label: "Active", value: "active" },
    // { label: "Paused", value: "paused" },
    { label: "Expired", value: "expired" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const renderFilterItem = useCallback(
    (item: { label: string; value: string }) => {
      const isSelected = item.value === statusFilter;
      return (
        <View style={styles.filterDropdownItem}>
          <Text
            style={[
              styles.filterDropdownItemText,
              isSelected && styles.filterDropdownItemTextSelected,
            ]}
          >
            {item.label}
          </Text>
        </View>
      );
    },
    [statusFilter, styles]
  );

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerRow}>
        <View style={styles.headerDescriptionRow}>
          <Text style={styles.headerDescription}>
            Manage your active subscriptions and billing information here.
          </Text>
        </View>
        <Dropdown
          style={styles.filterDropdown}
          containerStyle={styles.filterDropdownContainer}
          activeColor={theme.orangeBrown015}
          showsVerticalScrollIndicator={false}
          dropdownPosition="auto"
          placeholderStyle={styles.filterDropdownText}
          selectedTextStyle={styles.filterDropdownText}
          data={statusOptions}
          maxHeight={moderateHeightScale(200)}
          labelField="label"
          valueField="value"
          placeholder="Status"
          value={statusFilter}
          onChange={(item) => handleStatusFilterChange(item.value)}
          renderItem={renderFilterItem}
          renderRightIcon={() => (
            <Feather
              name="chevron-down"
              size={moderateWidthScale(16)}
              color={theme.darkGreen}
            />
          )}
        />
      </View>
    );
  }, [
    styles,
    statusFilter,
    statusOptions,
    handleStatusFilterChange,
    renderFilterItem,
    theme,
  ]);

  const getEmptyText = useCallback((filter: string) => {
    const filterLabels: { [key: string]: string } = {
      all: "No subscriptions",
      active: "No active subscriptions",
      pending: "No pending subscriptions",
      paused: "No paused subscriptions",
      expired: "No expired subscriptions",
      cancelled: "No cancelled subscriptions",
    };
    return filterLabels[filter] || "No subscriptions";
  }, []);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={[styles.emptyContainer, { justifyContent: "center" }]}>
          <ActivityIndicator size="large" color={theme.buttonBack} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Feather
          name="credit-card"
          size={moderateWidthScale(64)}
          color={theme.lightGreen}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyText}>{getEmptyText(statusFilter)}</Text>
        <Text style={styles.emptySubtext}>
          Manage your active subscriptions and billing information here.
        </Text>
      </View>
    );
  }, [loading, styles, theme, statusFilter, getEmptyText]);

  if (apiError && !loading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        <StackHeader title="Subscriptions" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton
            onPress={() => fetchSubscriptions(1, false)}
            loading={loading}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Subscriptions" />
      <FlatList
        data={subscriptions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.contentContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Cancel Subscription Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCancelModalVisible(false)}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Subscription</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setCancelModalVisible(false)}
                activeOpacity={0.7}
              >
                <Feather
                  name="x"
                  size={moderateWidthScale(20)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>

            {/* Question */}
            <Text style={styles.modalQuestion}>
              Are you sure you want to cancel your{" "}
              <Text style={styles.modalQuestionBold}>
                {selectedSubscription?.subscriptionPlan}
              </Text>
              ?
            </Text>

            {/* Consequences Box */}
            <View style={styles.consequencesBox}>
              <View style={styles.consequenceItem}>
                <Text style={styles.consequenceBullet}>•</Text>
                <Text style={styles.consequenceText}>
                  You will lose access to the benefits at the end of the current
                  billing cycle.
                </Text>
              </View>
              <View style={styles.consequenceItem}>
                <Text style={styles.consequenceBullet}>•</Text>
                <Text style={styles.consequenceText}>
                  This action cannot be undone automatically.
                </Text>
              </View>
              <View style={styles.consequenceItem}>
                <Text style={styles.consequenceBullet}>•</Text>
                <Text style={styles.consequenceText}>
                  You can re-subscribe at any time.
                </Text>
              </View>
            </View>

            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setConfirmChecked(!confirmChecked)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  confirmChecked && styles.checkboxChecked,
                ]}
              >
                {confirmChecked && (
                  <Feather
                    name="check"
                    size={moderateWidthScale(14)}
                    color={theme.white}
                  />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I understand that my subscription will be cancelled.
              </Text>
            </TouchableOpacity>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!confirmChecked || isCancelling) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmCancellation}
              disabled={!confirmChecked || isCancelling}
              activeOpacity={0.8}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm Cancellation
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
