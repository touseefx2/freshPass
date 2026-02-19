import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { SvgXml } from "react-native-svg";
import { Ionicons, Entypo } from "@expo/vector-icons";
import Button from "@/src/components/button";
import CancelBookingBottomSheet from "@/src/components/CancelBookingBottomSheet";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchAppointmentPaymentSheetParams } from "@/src/services/stripeService";
import {
  PersonIcon,
  MapPinIcon,
  CalendarIcon,
  ContactIcon,
  SupportIcon,
  BookAgainIcon,
  WalletIcon,
} from "@/assets/icons";
import StackHeader from "@/src/components/StackHeader";

// Back Arrow Icon SVG
const backArrowIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="{{COLOR}}"/>
</svg>
`;

const BackArrowIcon = ({ width = 24, height = 24, color = "#FFFFFF" }) => {
  const svgXml = backArrowIconSvg
    .replace(/{{WIDTH}}/g, width.toString())
    .replace(/{{HEIGHT}}/g, height.toString())
    .replace(/{{COLOR}}/g, color);
  return <SvgXml xml={svgXml} />;
};

type BookingStatus =
  | "ongoing"
  | "active"
  | "complete"
  | "cancelled"
  | "expired";

interface BookingItem {
  id: string;
  serviceName: string;
  membershipType?: string;
  planName?: string;
  type?: "subscription" | "service";
  staffName: string;
  location?: string;
  dateTime: string;
  duration: string;
  price: string;
  user: string;
  status: BookingStatus;
  businessName?: string;
  businessAddress?: string;
  businessLatitude?: string;
  businessLongitude?: string;
  businessLogoUrl?: string;
  businessAverageRating?: number;
  paymentMethod?: string;
  paidAmount?: string | null;
  subscriptionVisits?: {
    used: number;
    upcoming: number;
    total: number;
    remaining: number;
  } | null;
}

interface ApiBookingResponse {
  id: number;
  businessId: number;
  businessTitle: string;
  businessAddress: string;
  businessLatitude: string;
  businessLongitude: string;
  businessLogoUrl: string | null;
  businessAverageRating: number;
  userId: number;
  user: string;
  userEmail: string;
  appointmentType: "service" | "subscription";
  paymentMethod: string;
  subscriptionId: number | null;
  subscription: any | null;
  subscriptionPlanType: string | null;
  subscriptionPlanDescription: string | null;
  services: Array<{
    id: number;
    name: string;
    description: string | null;
    price: string;
    duration: {
      hours: number;
      minutes: number;
    };
  }>;
  totalPrice: number;
  subscriptionServices: any;
  subscriptionVisits: {
    used: number;
    upcoming: number;
    total: number;
    remaining: number;
  } | null;
  staffId: number | null;
  staffName: string | null;
  staffEmail: string | null;
  staffImage: string | null;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  paidAmount: string | null;
  notes: string | null;
  cancelReason: string | null;
  cancelDate: string | null;
  createdAt: string;
  deleted_at: string | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    backButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(8),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
    },
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    line: {
      width: "100%",
      height: 1.1,
      backgroundColor: theme.borderLight,
      alignSelf: "center",
    },
    scrollContent: {
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(30),
    },
    bottomButton: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
      paddingTop: moderateHeightScale(2),
    },
    bookingSection: {
      marginBottom: moderateHeightScale(24),
    },
    statusBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
    },
    badgesContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    membershipBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.darkGreenLight,
    },
    membershipBadgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    statusOngoing: {
      backgroundColor: theme.orangeBrown015,
    },
    statusActive: {
      backgroundColor: "#E3F2FD",
    },
    statusComplete: {
      backgroundColor: "#E8F5E9",
    },
    statusCancelled: {
      backgroundColor: "#FFEBEE",
    },
    statusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
    },
    statusTextOngoing: {
      color: theme.appointmentStatusText,
    },
    statusTextActive: {
      color: "#1976D2",
    },
    statusTextComplete: {
      color: "#388E3C",
    },
    statusTextCancelled: {
      color: "#D32F2F",
    },
    serviceName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(20),
    },
    detailsRowContainer: {
      marginTop: moderateHeightScale(16),
    },
    detailsRowTopLine: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
      marginBottom: moderateHeightScale(16),
    },
    detailsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
    },
    detailColumn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
      paddingHorizontal: moderateWidthScale(8),
    },
    detailColumnSeparator: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: theme.borderLight,
    },
    detailIconContainer: {
      marginRight: moderateWidthScale(8),
      marginTop: moderateHeightScale(2),
    },
    detailTextContainer: {
      flex: 1,
    },
    detailLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    detailValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    detailsRowBottomLine: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
      marginTop: moderateHeightScale(16),
    },
    businessCard: {
      marginBottom: moderateHeightScale(24),
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    businessImageContainer: {
      marginRight: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    businessImage: {
      width: widthScale(60),
      height: widthScale(60),
      borderRadius: widthScale(60 / 2),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      backgroundColor: theme.lightGreen05,
    },
    ratingBadge: {
      position: "absolute",
      bottom: 0,
      left: moderateWidthScale(10),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(2),
      minWidth: moderateWidthScale(40),
    },
    sahdow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,

      elevation: 2,
    },
    ratingStar: {
      marginRight: moderateWidthScale(2),
    },
    ratingText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    businessInfo: {
      flex: 1,
    },
    businessName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    businessAddress: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    mapPinContainer: {
      width: 50,
      height: 50,
      borderRadius: 50 / 2,
      borderWidth: moderateWidthScale(1),
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: moderateWidthScale(8),
    },
    actionButtonsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    actionButton: {
      alignItems: "center",
      width: widthScale(70),
      justifyContent: "center",
    },
    actionButtonCircle: {
      width: widthScale(60),
      height: heightScale(50),
      borderRadius: 36,
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    actionButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
    },
    paymentSection: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    paymentIcon: {
      marginRight: moderateWidthScale(12),
    },
    paymentTextContainer: {
      flex: 1,
    },
    paymentLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    paymentAmount: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    paymentAmountVal: {
      fontFamily: fonts.fontMedium,
    },
    payOnlineButtonContainer: {},
    payOnlineButton: {
      height: moderateHeightScale(36),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(8),
    },
    payOnlineButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
    },
    policyLink: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    policyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: moderateWidthScale(1),
      borderColor: "#D32F2F",
    },
    cancelButtonText: {
      color: "#D32F2F",
    },
    removeButton: {
      backgroundColor: theme.darkGreenLight,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    errorText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
  });

export default function bookingDetailsById() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state: any) => state.user);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = params.bookingId as string;
  const userRole = useAppSelector((state) => state.user.userRole);
  let staffClientname = "";
  if (userRole === "customer") {
    staffClientname = booking?.staffName ?? "Anyone";
  } else {
    staffClientname = booking?.user ?? "User";
  }

  const mapApiStatusToBookingStatus = (apiStatus: string): BookingStatus => {
    switch (apiStatus.toLowerCase()) {
      case "scheduled":
        return "ongoing";
      case "pending":
        return "active";
      case "completed":
        return "complete";
      case "cancelled":
        return "cancelled";
      case "expired":
        return "expired";
      default:
        return "active";
    }
  };

  const formatDuration = (
    services: ApiBookingResponse["services"],
    subscriptionServices: any,
  ): string => {
    let allServices: any[] = [];

    // Handle services array
    if (Array.isArray(services) && services.length > 0) {
      allServices = services;
    }

    // Handle subscriptionServices - can be array or object
    if (subscriptionServices) {
      if (
        Array.isArray(subscriptionServices) &&
        subscriptionServices.length > 0
      ) {
        allServices = subscriptionServices;
      } else if (
        typeof subscriptionServices === "object" &&
        !Array.isArray(subscriptionServices)
      ) {
        // If it's an object, try to extract services from it
        const values = Object.values(subscriptionServices);
        if (values.length > 0 && Array.isArray(values[0])) {
          allServices = values[0] as any[];
        }
      }
    }

    if (allServices.length === 0) {
      return "---";
    }

    let totalHours = 0;
    let totalMinutes = 0;

    allServices.forEach((service: any) => {
      if (service.duration) {
        totalHours += service.duration.hours || 0;
        totalMinutes += service.duration.minutes || 0;
      }
    });

    // Convert minutes to hours if needed
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;

    if (totalHours > 0 && totalMinutes > 0) {
      return `${totalHours}h ${totalMinutes}m`;
    } else if (totalHours > 0) {
      return `${totalHours}h`;
    } else if (totalMinutes > 0) {
      return `${totalMinutes}m`;
    }
    return "---";
  };

  const formatPrice = (price: number | string | null): string => {
    if (price === null || price === undefined) {
      return "---";
    }
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) {
      return "---";
    }
    return `$${numPrice.toFixed(2)} USD`;
  };

  const getPrice = (apiData: ApiBookingResponse): number | string | null => {
    if (apiData.appointmentType === "subscription") {
      return apiData.paidAmount;
    }
    const totalPrice = apiData?.totalPrice;
    // Check if totalPrice is an empty object or invalid
    if (
      totalPrice === null ||
      totalPrice === undefined ||
      (typeof totalPrice === "object" &&
        Object.keys(totalPrice).length === 0) ||
      (typeof totalPrice !== "number" && typeof totalPrice !== "string")
    ) {
      return null;
    }
    return totalPrice;
  };

  const formatAppointmentDateTime = (date: string, time: string): string => {
    try {
      // Parse date format "MM/DD/YYYY"
      const dateParts = date.split("/");
      const month = parseInt(dateParts[0]);
      const day = parseInt(dateParts[1]);
      const year = parseInt(dateParts[2]);

      // Parse time format "HH:mm"
      const [hours, minutes] = time.split(":").map(Number);
      const dateObj = new Date(year, month - 1, day, hours, minutes);

      // Format as "Day, Mon DD at H:MM AM/PM"
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const dayName = days[dateObj.getDay()];
      const monthName = months[dateObj.getMonth()];
      let hours12 = dateObj.getHours();
      const ampm = hours12 >= 12 ? "PM" : "AM";
      hours12 = hours12 % 12;
      hours12 = hours12 ? hours12 : 12;
      const minutesStr = dateObj.getMinutes().toString().padStart(2, "0");

      return `${dayName}, ${monthName} ${day} at ${hours12}:${minutesStr} ${ampm}`;
    } catch (error) {
      return `${date} at ${time}`;
    }
  };

  const mapApiResponseToBookingItem = (
    apiData: ApiBookingResponse,
  ): BookingItem => {
    const services = Array.isArray(apiData.services) ? apiData.services : [];
    const subscriptionServices = Array.isArray(apiData.subscriptionServices)
      ? apiData.subscriptionServices
      : [];

    const allServices =
      apiData.appointmentType === "subscription"
        ? subscriptionServices
        : services;

    const serviceName =
      allServices.length > 0
        ? allServices.map((s: any) => s.name).join(" + ")
        : "---";

    const duration = formatDuration(services, apiData.subscriptionServices);

    const dateTime = formatAppointmentDateTime(
      apiData.appointmentDate,
      apiData.appointmentTime,
    );

    const price = getPrice(apiData);
    const planName = apiData.subscription || "---";

    const businessLogo = apiData.businessLogoUrl
      ? apiData.businessLogoUrl.startsWith("http://") ||
        apiData.businessLogoUrl.startsWith("https://")
        ? apiData.businessLogoUrl
        : process.env.EXPO_PUBLIC_API_BASE_URL + apiData.businessLogoUrl
      : (process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ?? "");

    return {
      id: apiData.id.toString(),
      serviceName: serviceName || "---",
      membershipType: apiData.subscriptionPlanType || "---",
      staffName: apiData.staffName || "Anyone",
      location: apiData.businessAddress || "Business address",
      dateTime: dateTime,
      duration: duration,
      user: apiData.user ?? "User",
      price: formatPrice(price),
      status: mapApiStatusToBookingStatus(apiData.status),
      businessName: apiData.businessTitle || "---",
      businessAddress: apiData.businessAddress || "Business address",
      businessLatitude: apiData.businessLatitude || undefined,
      businessLongitude: apiData.businessLongitude || undefined,
      businessLogoUrl: businessLogo,
      businessAverageRating: apiData.businessAverageRating || 0,
      paymentMethod: apiData.paymentMethod,
      paidAmount: apiData.paidAmount,
      subscriptionVisits: apiData.subscriptionVisits || null,
      planName,
      type: apiData.appointmentType,
    };
  };

  const fetchBookingDetails = async () => {
    if (!bookingId) {
      setError("Booking ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: ApiBookingResponse;
      }>(appointmentsEndpoints.getById(bookingId));

      if (response.success && response.data) {
        const mappedBooking = mapApiResponseToBookingItem(response.data);
        setBooking(mappedBooking);
      } else {
        setError(response.message || "Failed to fetch booking details");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch booking details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookingDetails();
    }, []),
  );

  const getStatusBadgeStyle = (status: BookingStatus) => {
    switch (status) {
      case "ongoing":
        return styles.statusOngoing;
      case "active":
        return styles.statusActive;
      case "complete":
        return styles.statusComplete;
      case "cancelled":
      case "expired":
        return styles.statusCancelled;
      default:
        return styles.statusActive;
    }
  };

  const getStatusTextStyle = (status: BookingStatus) => {
    switch (status) {
      case "ongoing":
        return styles.statusTextOngoing;
      case "active":
        return styles.statusTextActive;
      case "complete":
        return styles.statusTextComplete;
      case "cancelled":
      case "expired":
        return styles.statusTextCancelled;
      default:
        return styles.statusTextActive;
    }
  };

  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case "ongoing":
        return "On going";
      case "active":
        return "Active";
      case "complete":
        return "Complete";
      case "cancelled":
        return "You canceled";
      case "expired":
        return "Expired";
      default:
        return "Active";
    }
  };

  const isCancelled =
    booking?.status === "cancelled" || booking?.status === "expired";
  const isComplete = booking?.status === "complete";

  // Parse date and time from dateTime string
  const dateTimeParts = booking?.dateTime?.split(" - ") ?? [];
  const date = (dateTimeParts[0] || booking?.dateTime) ?? "";
  const time = dateTimeParts[1] ?? "";

  const businessName = booking?.businessName || booking?.location || "---";
  const businessLatitude = booking?.businessLatitude
    ? parseFloat(booking.businessLatitude)
    : undefined;
  const businessLongitude = booking?.businessLongitude
    ? parseFloat(booking.businessLongitude)
    : undefined;

  // Handle location navigation to Google Maps
  const handleLocationPress = async () => {
    if (!businessLatitude || !businessLongitude) {
      Alert.alert(t("error"), t("locationCoordinatesNotAvailable"));
      return;
    }

    const encodedName = encodeURIComponent(businessName);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${businessLatitude},${businessLongitude}&query_place_id=${encodedName}`;

    try {
      const canOpen = await Linking.canOpenURL(googleMapsUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback to Apple Maps on iOS if Google Maps not available
        if (Platform.OS === "ios") {
          const appleMapsUrl = `http://maps.apple.com/?ll=${businessLatitude},${businessLongitude}&q=${encodedName}`;
          await Linking.openURL(appleMapsUrl);
        } else {
          Alert.alert(t("error"), t("unableToOpenMaps"));
        }
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToOpenMaps"));
    }
  };

  // Handle cancel booking modal
  const handleOpenCancelModal = () => {
    setCancelModalVisible(true);
  };

  const handleCloseCancelModal = () => {
    setCancelModalVisible(false);
  };

  const handleCancelBooking = async (reason: string) => {
    if (!bookingId) {
      showBanner(t("error"), t("bookingIdRequired"), "error", 2500);
      return;
    }

    dispatch(setActionLoader(true));

    try {
      const response = await ApiService.patch<{
        success: boolean;
        message: string;
        data?: any;
      }>(appointmentsEndpoints.cancel(bookingId), {
        cancel_reason: reason,
      });

      if (response.success) {
        showBanner(t("success"), t("bookingCancelledSuccess"), "success", 2500);
        // Fetch booking details again to update the UI
        await fetchBookingDetails();
      } else {
        showBanner(
          t("error"),
          response.message || t("failedToCancelBooking"),
          "error",
          2500,
        );
      }
    } catch (error: any) {
      showBanner(
        t("error"),
        error?.message || t("failedToCancelBookingTryAgain"),
        "error",
        2500,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const handlePayOnline = async () => {
    if (!booking?.id) {
      showBanner(
        t("error"),
        "Appointment ID is missing. Please try again.",
        "error",
        4000,
      );
      return;
    }

    const appointmentId = Number(booking.id);
    if (Number.isNaN(appointmentId)) {
      showBanner(t("error"), "Invalid appointment ID.", "error", 4000);
      return;
    }

    dispatch(setActionLoader(true));
    try {
      const {
        paymentIntent,
        setupIntent,
        customerSessionClientSecret,
        ephemeralKey,
        customer,
      } = await fetchAppointmentPaymentSheetParams(appointmentId);
      dispatch(setActionLoader(false));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const paymentConfig: any = {
        merchantDisplayName: "Fresh Pass",
        customerId: customer,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user.name || undefined,
          email: user.email || undefined,
        },
        customFlow: false,
      };

      if (customerSessionClientSecret) {
        paymentConfig.customerSessionClientSecret = customerSessionClientSecret;
      } else if (ephemeralKey) {
        paymentConfig.customerEphemeralKeySecret = ephemeralKey;
      } else {
        throw new Error(
          "Either customerSessionClientSecret or ephemeralKey must be provided",
        );
      }

      if (paymentIntent && paymentIntent.trim() !== "") {
        paymentConfig.paymentIntentClientSecret = paymentIntent;
      } else if (setupIntent && setupIntent.trim() !== "") {
        paymentConfig.setupIntentClientSecret = setupIntent;
      } else {
        throw new Error(
          "Either Payment Intent or Setup Intent must be provided",
        );
      }

      const { error: initError } = await initPaymentSheet(paymentConfig);
      if (initError) {
        throw new Error(initError.message || "Failed to initialize payment");
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (!presentError.code?.includes("Canceled")) {
          showBanner(
            "Payment Failed",
            presentError.message || "Payment could not be completed",
            "error",
            4000,
          );
        }
        return;
      }

      showBanner(
        t("success"),
        "Payment successful! Your booking is confirmed.",
        "success",
        3000,
      );
      await fetchBookingDetails();
    } catch (err: any) {
      let errorMessage = "Failed to process payment";
      if (err.data?.message) {
        errorMessage = err.data.message;
      } else if (err.data?.error) {
        errorMessage = err.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      showBanner("Payment Failed", errorMessage, "error", 4000);
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={fetchBookingDetails} loading={loading} />
        </View>
      );
    }
    if (!booking) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t("noBookingDataFound")}</Text>
        </View>
      );
    }
    return (
      <>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Booking Section */}
          <View style={styles.bookingSection}>
            {/* Status and Membership Badges */}
            <View style={styles.badgesContainer}>
              <View
                style={[
                  styles.statusBadge,
                  getStatusBadgeStyle(booking.status),
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    getStatusTextStyle(booking.status),
                  ]}
                >
                  {getStatusLabel(booking.status)}
                </Text>
              </View>
              {booking.subscriptionVisits &&
                booking.subscriptionVisits.remaining !== undefined && (
                  <View style={styles.membershipBadge}>
                    <Text style={styles.membershipBadgeText}>
                      {booking.subscriptionVisits.remaining} visit
                      {booking.subscriptionVisits.remaining !== 1
                        ? "s"
                        : ""}{" "}
                      left
                    </Text>
                  </View>
                )}
            </View>

            {/* Service Name */}
            <Text style={styles.serviceName}>{booking.serviceName}</Text>

            {/* Details Row */}
            <View style={styles.detailsRowContainer}>
              <View style={styles.detailsRowTopLine} />
              <View style={styles.detailsRow}>
                <View style={styles.detailColumn}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons
                      name="time-outline"
                      size={moderateWidthScale(17)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>{t("duration")}</Text>
                    <Text style={styles.detailValue}>{booking.duration}</Text>
                  </View>
                  <View style={styles.detailColumnSeparator} />
                </View>
                <View style={styles.detailColumn}>
                  <View style={styles.detailIconContainer}>
                    <CalendarIcon
                      width={moderateWidthScale(17)}
                      height={moderateWidthScale(17)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>{t("date")}</Text>
                    <Text style={styles.detailValue}>
                      {date}
                      {time ? ` -` : ""}
                    </Text>
                    {time && <Text style={styles.detailValue}>{time}</Text>}
                  </View>
                  <View style={styles.detailColumnSeparator} />
                </View>
                <View style={[styles.detailColumn, { borderRightWidth: 0 }]}>
                  <View style={styles.detailIconContainer}>
                    <PersonIcon
                      width={moderateWidthScale(17)}
                      height={moderateWidthScale(17)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>
                      {userRole === "customer"
                        ? t("myBarber")
                        : t("myCustomer")}
                    </Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {staffClientname}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.detailsRowBottomLine} />
            </View>
          </View>

          {/* Business Information Card */}
          <View style={styles.businessCard}>
            <View style={styles.businessImageContainer}>
              <Image
                source={{
                  uri: booking.businessLogoUrl,
                }}
                style={styles.businessImage}
              />
              {booking.businessAverageRating !== undefined &&
                booking.businessAverageRating > 0 && (
                  <View style={[styles.ratingBadge, styles.sahdow]}>
                    <Ionicons
                      name="star"
                      size={moderateWidthScale(10)}
                      color={theme.selectCard}
                      style={styles.ratingStar}
                    />
                    <Text style={styles.ratingText}>
                      {booking.businessAverageRating.toFixed(1)}
                    </Text>
                  </View>
                )}
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{booking.businessName}</Text>
              <Text style={styles.businessAddress}>
                {booking.businessAddress}
              </Text>
            </View>
            {businessLatitude && businessLongitude && (
              <TouchableOpacity
                style={styles.mapPinContainer}
                onPress={handleLocationPress}
              >
                <MapPinIcon
                  width={moderateWidthScale(18)}
                  height={moderateWidthScale(18)}
                  color={theme.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.line} />

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity activeOpacity={0.7} style={styles.actionButton}>
              <View style={styles.actionButtonCircle}>
                <ContactIcon
                  width={moderateWidthScale(22)}
                  height={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </View>
              <Text style={styles.actionButtonText}>{t("contact")}</Text>
            </TouchableOpacity>
            {/* {isCancelled && (
            <TouchableOpacity activeOpacity={0.7} style={styles.actionButton}>
              <View style={styles.actionButtonCircle}>
                <BookAgainIcon
                  width={moderateWidthScale(22)}
                  height={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </View>
              <Text style={styles.actionButtonText}>{t("bookAgain")}</Text>
            </TouchableOpacity>
          )} */}
            {/* <TouchableOpacity activeOpacity={0.7} style={styles.actionButton}>
            <View style={styles.actionButtonCircle}>
              <CalendarIcon
                width={moderateWidthScale(22)}
                height={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.actionButtonText}>{t("reschedule")}</Text>
          </TouchableOpacity> */}
            <TouchableOpacity activeOpacity={0.7} style={styles.actionButton}>
              <View style={styles.actionButtonCircle}>
                <SupportIcon
                  width={moderateWidthScale(22)}
                  height={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </View>
              <Text style={styles.actionButtonText}>{t("support")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.line} />

          {/* Payment Information */}
          {booking.type === "service" ? (
            <View style={styles.paymentSection}>
              <View style={styles.paymentIcon}>
                <WalletIcon
                  width={moderateWidthScale(22)}
                  height={moderateWidthScale(22)}
                  color={theme.orangeBrown}
                />
              </View>
              <View style={styles.paymentTextContainer}>
                {booking.paymentMethod === "pay_now" &&
                booking.paidAmount !== null &&
                booking.paidAmount !== undefined ? (
                  <>
                    <Text style={styles.paymentLabel}>
                      {userRole === "customer" ? "I" : staffClientname} paid
                    </Text>
                    <Text style={styles.paymentAmount}>
                      <Text style={styles.paymentAmountVal}>
                        {formatPrice(booking.paidAmount)}
                      </Text>
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.paymentLabel}>
                      {userRole === "customer" ? "I" : staffClientname} will pay
                    </Text>
                    <Text style={styles.paymentAmount}>
                      Total:{" "}
                      <Text style={styles.paymentAmountVal}>
                        {booking.price}
                      </Text>
                    </Text>
                  </>
                )}
              </View>
              {!isCancelled &&
                !isComplete &&
                userRole === "customer" &&
                !(
                  booking.paymentMethod === "pay_now" &&
                  booking.paidAmount != null
                ) && (
                  <Button
                    title={t("payOnline")}
                    onPress={handlePayOnline}
                    containerStyle={styles.payOnlineButton}
                    textStyle={styles.payOnlineButtonText}
                  />
                )}
            </View>
          ) : (
            <View style={styles.paymentSection}>
              <View style={styles.paymentTextContainer}>
                <Text style={styles.paymentAmount}>
                  <Text style={styles.paymentAmountVal}>
                    {booking.planName}
                  </Text>
                </Text>
              </View>
            </View>
          )}

          <View style={styles.line} />

          {/* Policy Link (only for ongoing bookings) */}
          {!isCancelled && !isComplete && userRole === "customer" && (
            <TouchableOpacity style={styles.policyLink}>
              <Text style={styles.policyText}>{t("bookingCancelPolicy")}</Text>
              <Entypo
                name="chevron-small-right"
                size={moderateWidthScale(22)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bottom Button */}

        {!isCancelled && !isComplete && userRole === "customer" && (
          <View style={styles.bottomButton}>
            <Button
              title={t("cancelThisBooking")}
              onPress={() => {
                handleOpenCancelModal();
              }}
              containerStyle={styles.cancelButton}
              textColor={"#D32F2F"}
            />
          </View>
        )}

        {/* Cancel Booking Bottom Sheet */}
        <CancelBookingBottomSheet
          visible={cancelModalVisible}
          onClose={handleCloseCancelModal}
          onSubmit={handleCancelBooking}
        />
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("bookingDetail")} />
      {renderContent()}
    </SafeAreaView>
  );
}
