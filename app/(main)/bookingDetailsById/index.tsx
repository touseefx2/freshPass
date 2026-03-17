import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
  Share,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  setActionLoader,
  openFullImageModal,
} from "@/src/state/slices/generalSlice";
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
import { Ionicons, Entypo, Feather } from "@expo/vector-icons";
import Button from "@/src/components/button";
import CancelBookingBottomSheet from "@/src/components/CancelBookingBottomSheet";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import {
  appointmentsEndpoints,
  reviewsEndpoints,
  chatEndpoints,
} from "@/src/services/endpoints";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchAppointmentPaymentSheetParams } from "@/src/services/stripeService";
import {
  PersonIcon,
  MapPinIcon,
  CalendarIcon,
  ContactIcon,
  SupportIcon,
  WalletIcon,
} from "@/assets/icons";
import StackHeader from "@/src/components/StackHeader";
import ReviewPromptModal from "@/src/components/reviewPromptModal";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import ShareOptionsBottomSheet from "@/src/components/ShareOptionsBottomSheet";
import PotentialContactsModal, {
  type PotentialContact,
} from "@/src/components/PotentialContactsModal";

const SEND_MESSAGE_URL = "/api/chat/messages";

type PotentialContactsResponse = {
  success: boolean;
  data: {
    data: PotentialContact[];
    meta: { current_page: number; last_page: number };
  };
};

type SendMessageResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

// Back Arrow Icon SVG
const backArrowIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="{{COLOR}}"/>
</svg>
`;

// Hours before appointment (current time must be at least this many hours behind appointment) to show Reschedule button
const HOURS_BEFORE_APPOINTMENT_TO_SHOW_RESCHEDULE = 1;

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
  businessId?: number;
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
  owner?: {
    id: number;
    name: string;
    profile_pic: string | null;
  };
  notes?: string | null;
  appointmentDate?: string;
  appointmentTime?: string;
  userId?: number | null;
  userProfilePic?: string | null;
  staffId?: number | null;
  subscription_id?: number | null;
  service_ids: number[] | null;
  images?: Array<{
    id: number;
    name: string;
    url: string;
    mime_type?: string | null;
    size?: number | null;
  }>;
}

interface ApiBookingResponse {
  id: number;
  businessId: number;
  owner?: {
    id: number;
    name: string;
    profile_pic: string | null;
  };
  businessTitle: string;
  businessAddress: string;
  businessLatitude: string;
  businessLongitude: string;
  businessLogoUrl: string | null;
  businessAverageRating: number;
  userId: number;
  user: string;
  userProfilePic: string | null;
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
  images?: Array<{
    id: number;
    name: string;
    url: string;
    mime_type?: string | null;
    size?: number | null;
  }>;
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
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    badgesLeft: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      alignItems: "center",
    },
    rescheduleSmallButton: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown,
      borderWidth: moderateWidthScale(1),
      borderColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    rescheduleSmallButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
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
    notesContainer: {
      marginTop: moderateHeightScale(14),
      marginHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(8),
      borderLeftWidth: moderateWidthScale(3),
      borderLeftColor: theme.darkGreen,
    },
    notesLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    notesText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      opacity: 0.85,
      lineHeight: fontSize.size18,
    },
    businessCard: {
      marginBottom: moderateHeightScale(24),
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    businessCardTouchable: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
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
      alignItems: "flex-start",
      marginVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    actionButton: {
      alignItems: "center",
      width: widthScale(70),
      justifyContent: "flex-start",
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
    imagesSection: {
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    imagesSectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    imagesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    imageCard: {
      width:
        (Dimensions.get("window").width -
          moderateWidthScale(20) * 2 -
          moderateWidthScale(8) * 2) /
        3,
      height:
        (Dimensions.get("window").width -
          moderateWidthScale(20) * 2 -
          moderateWidthScale(8) * 2) /
        3,
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.lightGreen2,
      borderWidth: 1,
      borderColor: theme.borderLight,
      position: "relative",
    },
    imageCardImage: {
      width: "100%",
      height: "100%",
    },
    imageShareIcon: {
      position: "absolute",
      top: moderateHeightScale(6),
      left: moderateWidthScale(6),
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    imageDownloadIcon: {
      position: "absolute",
      bottom: moderateHeightScale(6),
      right: moderateWidthScale(6),
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
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
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const hasShownReviewPromptForVisit = useRef(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareToUserModalVisible, setShareToUserModalVisible] = useState(false);
  const [potentialContacts, setPotentialContacts] = useState<
    PotentialContact[]
  >([]);
  const [potentialPage, setPotentialPage] = useState(1);
  const [potentialLastPage, setPotentialLastPage] = useState(1);
  const [potentialLoading, setPotentialLoading] = useState(false);
  const [potentialLoadingMore, setPotentialLoadingMore] = useState(false);
  const [potentialError, setPotentialError] = useState(false);
  const [shareSending, setShareSending] = useState(false);
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

  const handlePersonPress = useCallback(() => {
    if (!booking) {
      return;
    }

    if (userRole === "customer") {
      const staffId = booking.staffId;
      if (!staffId || staffClientname.toLowerCase() === "anyone") {
        return;
      }

      router.push({
        pathname: "/(main)/staffDetail",
        params: { id: String(staffId) },
      });
    } else {
      const customerId = booking.userId;
      if (!customerId) {
        return;
      }

      router.push({
        pathname: "/(main)/customerDetail",
        params: { id: String(customerId) },
      });
    }
  }, [booking, router, staffClientname, userRole]);

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

    const service_ids = allServices.map((s: any) => s.id);

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
      businessId: apiData.businessId,
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
      owner: apiData.owner,
      notes: apiData.notes ?? null,
      appointmentDate: apiData.appointmentDate,
      appointmentTime: apiData.appointmentTime,
      userId: apiData.userId ?? null,
      staffId: apiData.staffId ?? null,
      subscription_id: apiData.subscriptionId,
      service_ids: service_ids,
      images:
        Array.isArray(apiData.images) && apiData.images.length > 0
          ? apiData.images.map((img: any) => ({
              id: img.id,
              name: img.name ?? "",
              url: img.url ?? "",
              mime_type: img.mime_type ?? null,
              size: img.size ?? null,
            }))
          : undefined,
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

  // Show review modal only when: status complete, customer, and no review exists yet (reviews API returns empty data)
  useEffect(() => {
    if (
      !loading &&
      booking &&
      isComplete &&
      userRole === "customer" &&
      !hasShownReviewPromptForVisit.current &&
      booking.businessId != null &&
      user?.id != null
    ) {
      checkAndShowReviewPrompt();
    }
  }, [loading, booking, isComplete, userRole, user?.id]);

  const checkAndShowReviewPrompt = async () => {
    try {
      const businessId = booking?.businessId ?? 0;
      const userId = user?.id ?? 0;
      const response = await ApiService.get<{
        success: boolean;
        data: unknown[];
      }>(reviewsEndpoints.list({ business_id: businessId, user_id: userId }));

      hasShownReviewPromptForVisit.current = true;

      const data = response?.data;
      const isEmpty = Array.isArray(data) && data.length === 0;

      if (isEmpty) {
        setShowReviewModal(true);
      }
    } catch {
      hasShownReviewPromptForVisit.current = true;
    }
  };

  // Parse date and time from dateTime string
  const dateTimeParts = booking?.dateTime?.split(" - ") ?? [];
  const date = (dateTimeParts[0] || booking?.dateTime) ?? "";
  const time = dateTimeParts[1] ?? "";

  // True if status is ongoing and current time is at least HOURS_BEFORE_APPOINTMENT_TO_SHOW_RESCHEDULE hours before appointment
  const canShowReschedule = (() => {
    if (
      booking?.status !== "ongoing" ||
      !booking?.appointmentDate ||
      !booking?.appointmentTime
    )
      return false;
    try {
      const [month, day, year] = booking.appointmentDate.split("/").map(Number);
      const [hours, minutes] = booking.appointmentTime.split(":").map(Number);
      const appointmentMs = new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
      ).getTime();
      const nowMs = Date.now();
      const diffHours = (appointmentMs - nowMs) / (1000 * 60 * 60);
      return diffHours >= HOURS_BEFORE_APPOINTMENT_TO_SHOW_RESCHEDULE;
    } catch {
      return false;
    }
  })();

  const businessName = booking?.businessName || booking?.location || "---";
  const businessLatitude = booking?.businessLatitude
    ? parseFloat(booking.businessLatitude)
    : undefined;
  const businessLongitude = booking?.businessLongitude
    ? parseFloat(booking.businessLongitude)
    : undefined;

  const handleContactPress = () => {
    console.log("booking", booking);
    const ownerId =
      userRole === "customer" ? booking?.owner?.id : (booking?.userId ?? null);

    const ownerName =
      userRole === "customer" ? booking?.owner?.name : (booking?.user ?? "");

    const pic =
      userRole === "customer"
        ? booking?.owner?.profile_pic
        : (booking?.userProfilePic ?? "");

    router.push({
      pathname: "/(main)/chatBox",
      params: {
        id: String(ownerId),
        chatItem: JSON.stringify({
          id: String(ownerId),
          name: ownerName,
          image: pic,
        }),
      },
    });
  };

  const handleShareImage = useCallback(async (url: string) => {
    setShareImageUrl(url);
    setShareSheetVisible(true);
  }, []);

  const handleNativeShare = useCallback(async () => {
    if (!shareImageUrl) return;
    try {
      await Share.share({
        message: shareImageUrl,
        url: shareImageUrl,
      });
    } catch (_err) {}
    setShareSheetVisible(false);
    setShareImageUrl(null);
  }, [shareImageUrl]);

  const fetchPotentialContacts = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        setPotentialError(false);
        if (append) setPotentialLoadingMore(true);
        else setPotentialLoading(true);
        const url = chatEndpoints.potentialContacts({
          page: pageNum,
          per_page: 20,
        });
        const res = await ApiService.get<PotentialContactsResponse>(url);
        const list = res.data?.data ?? [];
        const meta = res.data?.meta;
        if (append) {
          setPotentialContacts((prev) => [...prev, ...list]);
        } else {
          setPotentialContacts(list);
        }
        setPotentialPage(meta?.current_page ?? pageNum);
        setPotentialLastPage(meta?.last_page ?? 1);
      } catch {
        if (!append) setPotentialError(true);
      } finally {
        setPotentialLoading(false);
        setPotentialLoadingMore(false);
      }
    },
    [],
  );

  const openShareToUserModal = useCallback(() => {
    setShareSheetVisible(false);
    setShareToUserModalVisible(true);
    setPotentialContacts([]);
    setPotentialPage(1);
    setPotentialLastPage(1);
    setPotentialError(false);
    fetchPotentialContacts(1, false);
  }, [fetchPotentialContacts]);

  const onPotentialContactPress = useCallback(
    async (contact: PotentialContact) => {
      if (!shareImageUrl?.trim()) return;
      setShareSending(true);
      try {
        const formData = new FormData();
        formData.append("receiver_id", String(Number(contact.id)));
        formData.append("message", shareImageUrl);

        const res = await ApiService.post<SendMessageResponse>(
          SEND_MESSAGE_URL,
          formData,
          {
            headers: {
              "Content-Type": false as any,
            },
          },
        );

        if (res?.success) {
          setShareToUserModalVisible(false);
          setShareImageUrl(null);
          showBanner(
            t("success"),
            t("messageSentSuccessfully"),
            "success",
            3000,
          );
        } else {
          showBanner(
            t("error"),
            t("somethingWentWrong") || "Something went wrong.",
            "error",
            3000,
          );
        }
      } catch {
        showBanner(
          t("error"),
          t("somethingWentWrong") || "Something went wrong.",
          "error",
          3000,
        );
      } finally {
        setShareSending(false);
      }
    },
    [shareImageUrl, showBanner, t],
  );

  const onPotentialEndReached = useCallback(() => {
    if (
      potentialLoadingMore ||
      potentialLoading ||
      potentialPage >= potentialLastPage
    )
      return;
    fetchPotentialContacts(potentialPage + 1, true);
  }, [
    potentialLoadingMore,
    potentialLoading,
    potentialPage,
    potentialLastPage,
    fetchPotentialContacts,
  ]);

  const handleOpenFullImage = useCallback(
    (initialIndex: number) => {
      if (!booking?.images?.length) return;
      const urls = booking.images.map((img) => img.url);
      dispatch(openFullImageModal({ images: urls, initialIndex }));
    },
    [booking?.images, dispatch],
  );

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

  const handleSupportPress = useCallback(async () => {
    const url = process.env.EXPO_PUBLIC_PRIVACY_URL;
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (_error) {
      // Silently ignore if URL cannot be opened
    }
  }, []);

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
              <View style={styles.badgesLeft}>
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
                  <TouchableOpacity
                    style={styles.detailTextContainer}
                    activeOpacity={0.7}
                    onPress={handlePersonPress}
                  >
                    <Text style={styles.detailLabel}>
                      {userRole === "customer"
                        ? t("myBarber")
                        : t("myCustomer")}
                    </Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {staffClientname}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.detailsRowBottomLine} />
            </View>

            {/* Notes - show when not empty */}
            {booking.notes != null && String(booking.notes).trim() !== "" && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>{t("notes")}</Text>
                <Text style={styles.notesText}>{booking.notes}</Text>
              </View>
            )}
          </View>

          {/* Business Information Card */}
          <View style={styles.businessCard}>
            <TouchableOpacity
              style={styles.businessCardTouchable}
              activeOpacity={0.7}
              onPress={() => {
                if (booking.businessId != null) {
                  router.push({
                    pathname: "/(main)/businessDetail",
                    params: { business_id: booking.businessId.toString() },
                  });
                }
              }}
              disabled={booking.businessId == null}
            >
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
            </TouchableOpacity>
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

          {/* Try-on Images Section */}
          {booking.images &&
            Array.isArray(booking.images) &&
            booking.images.length > 0 && (
              <View style={styles.imagesSection}>
                <Text style={styles.imagesSectionTitle}>
                  {t("tryOnImages") || "Try-on images"}
                </Text>
                <View style={styles.imagesGrid}>
                  {booking.images.map((img, index) => (
                    <View key={img.id || index} style={styles.imageCard}>
                      <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => handleOpenFullImage(index)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: img.url }}
                          style={styles.imageCardImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.imageShareIcon}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShareImage(img.url);
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="share-2"
                          size={moderateWidthScale(16)}
                          color={theme.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.imageDownloadIcon}
                        onPress={(e) => {
                          e.stopPropagation();
                          downloadMedia(img.url);
                        }}
                        disabled={downloadingUrl === img.url}
                        activeOpacity={0.7}
                      >
                        {downloadingUrl === img.url ? (
                          <ActivityIndicator size="small" color={theme.white} />
                        ) : (
                          <Feather
                            name="download"
                            size={moderateWidthScale(16)}
                            color={theme.white}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

          <View style={styles.line} />

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionButton}
              onPress={handleContactPress}
            >
              <View style={styles.actionButtonCircle}>
                <ContactIcon
                  width={moderateWidthScale(22)}
                  height={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </View>
              <Text style={styles.actionButtonText}>
                {userRole === "customer" ? t("contact") : t("contactC")}
              </Text>
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
            {canShowReschedule && userRole === "customer" && (
              <TouchableOpacity
                onPress={() => {
                  const baseParams: Record<string, string> = {
                    business_id: booking?.businessId?.toString() ?? "",
                    is_reschedule: "1",
                    booking_id: booking?.id ?? "",
                    appointment_type:
                      booking?.type === "subscription"
                        ? "subscription"
                        : "service",
                    notes: booking?.notes ?? "",
                    appointment_date: booking?.appointmentDate ?? "",
                    appointment_time: booking?.appointmentTime ?? "",
                    staff_id:
                      booking?.staffId != null
                        ? String(booking.staffId)
                        : "anyone",
                  };
                  if (
                    booking?.type === "service" &&
                    booking?.service_ids?.length
                  ) {
                    baseParams.service_ids = JSON.stringify(
                      booking.service_ids,
                    );
                  }
                  if (
                    booking?.type === "subscription" &&
                    booking?.subscription_id != null
                  ) {
                    baseParams.subscription_id = String(
                      booking.subscription_id,
                    );
                  }

                  router.push({
                    pathname: "/(main)/bookingNow",
                    params: baseParams,
                  });
                }}
                activeOpacity={0.7}
                style={styles.actionButton}
              >
                <View style={styles.actionButtonCircle}>
                  <CalendarIcon
                    width={moderateWidthScale(22)}
                    height={moderateWidthScale(22)}
                    color={theme.darkGreen}
                  />
                </View>
                <Text style={styles.actionButtonText}>{t("reschedule")}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionButton}
              onPress={handleSupportPress}
            >
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
                // !isComplete &&
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
            <TouchableOpacity
              onPress={handleSupportPress}
              activeOpacity={0.7}
              style={styles.policyLink}
            >
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

        {/* Review prompt modal – shown when booking is complete (once per visit) */}
        <ReviewPromptModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onWriteReview={() => {
            setShowReviewModal(false);
            router.push({
              pathname: "/(main)/leaveReview",
              params: {
                business_id: booking?.businessId?.toString() ?? "",
                business_name: businessName,
                business_address: booking?.businessAddress ?? "",
                business_logo_url: booking?.businessLogoUrl ?? "",
                business_latitude: booking?.businessLatitude ?? "",
                business_longitude: booking?.businessLongitude ?? "",
              },
            });
          }}
          businessName={businessName}
        />

        {/* Share options bottom sheet – from try-on image share */}
        <ShareOptionsBottomSheet
          visible={shareSheetVisible}
          onClose={() => {
            setShareSheetVisible(false);
          }}
          onSelectInAppUser={openShareToUserModal}
          onSelectNativeShare={handleNativeShare}
        />

        {/* Contacts modal – send try-on image to user */}
        <PotentialContactsModal
          visible={shareToUserModalVisible}
          onClose={() => {
            setShareToUserModalVisible(false);
            setShareImageUrl(null);
          }}
          contacts={potentialContacts}
          loading={potentialLoading}
          loadingMore={potentialLoadingMore}
          error={potentialError}
          onRetry={() => fetchPotentialContacts(1, false)}
          onContactPress={onPotentialContactPress}
          onEndReached={onPotentialEndReached}
          sending={shareSending}
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
