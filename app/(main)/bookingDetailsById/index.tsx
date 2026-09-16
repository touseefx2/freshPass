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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateHeightScale, moderateWidthScale, iconScale } from "@/src/theme/dimensions";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Button from "@/src/components/button";
import CancelBookingBottomSheet from "@/src/components/CancelBookingBottomSheet";
import OutcomeConfirmSheet from "@/src/components/OutcomeConfirmSheet";
import RestoreVisitSheet from "@/src/components/RestoreVisitSheet";
import RetryButton from "@/src/components/retryButton";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import {
  appointmentsEndpoints,
  reviewsEndpoints,
  chatEndpoints,
} from "@/src/services/endpoints";
import { useStripe } from "@stripe/stripe-react-native";
import {
  fetchAppointmentPaymentSheetParams,
  getStripeModeHeaders,
  useStripeAccount as setStripeAccount,
} from "@/src/services/stripeService";
import {
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
import TipSection from "@/src/components/tipSection";
import PayAndTipModal from "@/src/components/payAndTipModal";
import {
  formatTipAmount,
  formatTipRecipientName,
  type PaidTip,
  type PendingTip,
} from "@/src/services/tipService";
import { resolveApiImageUrl } from "@/src/utils/media";
import type { AffiliatedBusiness } from "@/src/types/affiliation";
import type {
  AppointmentCancellationPolicy,
  AppointmentVisitStatus,
  MembershipPolicy,
  OutcomeCorrectionPreview,
  OutcomePreview,
  OutcomeSummary,
} from "@/src/types/cancellationPolicy";
import OutcomeSummaryCard from "@/src/components/OutcomeSummaryCard";
import { createStyles } from "./styles";

const SEND_MESSAGE_URL = "/api/chat/messages";

function formatPolicyDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeCardLastFour(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

function getFreeCancellationLabel(
  policy: AppointmentCancellationPolicy,
  translate: (key: string, options?: Record<string, string>) => string,
): string {
  if (policy.cancellationFeePercent === 0) {
    return translate("freeCancellationAnyTime");
  }
  const formatted = formatPolicyDateTime(policy.freeCancellationUntil);
  if (formatted) {
    return translate("freeCancellationUntil", { date: formatted });
  }
  return translate("freeCancellationNotAvailable");
}

function getMembershipFreeCancellationLabel(
  policy: MembershipPolicy,
  translate: (key: string, options?: Record<string, string>) => string,
): string {
  const formatted = formatPolicyDateTime(policy.freeCancellationUntil);
  if (formatted) {
    return translate("freeCancellationUntil", { date: formatted });
  }
  if (!policy.lateCancelForfeitsVisit) {
    return translate("visitReturned");
  }
  return translate("freeCancellationNotAvailable");
}

function getVisitStatusLabel(
  visitStatus: AppointmentVisitStatus | string | null | undefined,
  translate: (key: string) => string,
): string | null {
  if (!visitStatus) return null;
  switch (visitStatus) {
    case "forfeited":
      return translate("visitStatusForfeited");
    case "returned":
      return translate("visitStatusReturned");
    case "restored":
      return translate("visitStatusRestored");
    case "used":
      return translate("outcomeVisitUsed");
    case "reserved":
      return translate("visitStatusReserved");
    default:
      return String(visitStatus);
  }
}
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

// A tip only becomes available once the Stripe webhook settles the service
// payment, which lands a moment after the payment sheet closes.
const TIP_AVAILABILITY_POLL_DELAYS_MS = [0, 2000, 2000];

type BookingStatus =
  | "ongoing"
  | "active"
  | "complete"
  | "cancelled"
  | "expired"
  | "awaiting_outcome"
  | "no_show";

interface BookingItem {
  id: string;
  serviceName: string;
  serviceDescription?: string | null;
  serviceLabels?: string[];
  serviceImageUrl?: string | null;
  membershipType?: string;
  planName?: string;
  planDescription?: string | null;
  type?: "subscription" | "service";
  staffName: string;
  location?: string;
  dateTime: string;
  duration: string;
  price: string;
  serviceTotal?: number | null;
  user: string;
  status: BookingStatus;
  businessId?: number;
  businessName?: string;
  businessAddress?: string;
  businessLatitude?: string;
  businessLongitude?: string;
  businessLogoUrl?: string;
  businessAverageRating?: number;
  workingWithBusiness?: AffiliatedBusiness | null;
  paymentMethod?: string;
  paidAmount?: string | null;
  /** Service payment is still outstanding. Keep using for existing pay UI. */
  owesPayment?: boolean;
  /**
   * Completed pay-later appointment that is still unpaid.
   * Use this to open combined service + tip payment sheet.
   */
  paymentDueNow?: boolean;
  paidAt?: string | null;
  subscriptionVisits?: {
    used: number;
    upcoming: number;
    total: number;
    remaining: number;
    bookable?: number;
  } | null;
  owner?: {
    id: number;
    name: string;
    profile_pic: string | null;
  };
  notes?: string | null;
  appointmentDate?: string;
  appointmentTime?: string;
  createdAt?: string | null;
  userId?: number | null;
  userProfilePic?: string | null;
  staffId?: number | null;
  subscription_id?: number | null;
  service_ids: number[] | null;
  staffImage?: string | null;
  staffIsOwner?: boolean;
  tipRecipientType?: "staff" | "business";
  tipRecipientName?: string;
  canTip?: boolean;
  /** Customer chose No Tip on the pay-and-tip sheet; never ask again. */
  tipDeclined?: boolean;
  tip?: PaidTip | null;
  pendingTip?: PendingTip | null;
  images?: Array<{
    id: number;
    name: string;
    url: string;
    mime_type?: string | null;
    size?: number | null;
  }>;
  cancellationPolicy?: AppointmentCancellationPolicy | null;
  membershipPolicy?: MembershipPolicy | null;
  visitStatus?: AppointmentVisitStatus | string | null;
  visitRestoreReason?: string | null;
  hasSavedCard?: boolean;
  cardLastFour?: string | null;
  outcomeMarkedAt?: string | null;
  outcomeMarkedById?: number | null;
  canMarkOutcome?: boolean;
  canCorrectOutcome?: boolean;
  canRestoreVisit?: boolean;
  outcomeSummary?: OutcomeSummary | null;
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
  business?: {
    id: number;
    title: string;
    logo_url?: string | null;
    complete_address?: string | null;
    working_with_business_id?: number | null;
    working_with_business?: AffiliatedBusiness | null;
  } | null;
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
    label?: string | null;
    image?: string | null;
    image_url?: string | null;
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
    bookable?: number;
  } | null;
  staffId: number | null;
  staffName: string | null;
  staffEmail: string | null;
  staffImage: string | null;
  staffIsOwner?: boolean;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  paidAmount: string | null;
  owesPayment?: boolean;
  paymentDueNow?: boolean;
  paidAt?: string | null;
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
  tipRecipientType?: "staff" | "business";
  tipRecipientStaffId?: number | null;
  tipRecipientName?: string;
  canTip?: boolean;
  tipDeclined?: boolean;
  tip?: PaidTip | null;
  pendingTip?: PendingTip | null;
  cancellationPolicy?: AppointmentCancellationPolicy | null;
  membershipPolicy?: MembershipPolicy | null;
  visitStatus?: AppointmentVisitStatus | string | null;
  visitRestoreReason?: string | null;
  hasSavedCard?: boolean;
  cardLastFour?: string | null;
  card_last_four?: string | null;
  outcomeMarkedAt?: string | null;
  outcomeMarkedById?: number | null;
  canMarkOutcome?: boolean;
  canCorrectOutcome?: boolean;
  canRestoreVisit?: boolean;
  outcomeSummary?: OutcomeSummary | null;
}

export default function BookingDetailsById() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state: any) => state.user);
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelFeeNotice, setCancelFeeNotice] = useState<string | null>(null);
  const [outcomeSheetVisible, setOutcomeSheetVisible] = useState(false);
  const [outcomeConfirming, setOutcomeConfirming] = useState(false);
  const [outcomePreviewLoading, setOutcomePreviewLoading] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<
    "completed" | "no_show" | null
  >(null);
  const [outcomePreview, setOutcomePreview] = useState<OutcomePreview | null>(
    null,
  );
  const [correctionSheetVisible, setCorrectionSheetVisible] = useState(false);
  const [correctionConfirming, setCorrectionConfirming] = useState(false);
  const [correctionPreview, setCorrectionPreview] =
    useState<OutcomeCorrectionPreview | null>(null);
  const [restoreVisitSheetVisible, setRestoreVisitSheetVisible] =
    useState(false);
  const [restoreVisitSubmitting, setRestoreVisitSubmitting] = useState(false);
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
  const [payAndTipModalVisible, setPayAndTipModalVisible] = useState(false);

  const bookingId = params.bookingId as string;
  // Set by payment_request / review_request notifications so the tap lands in
  // the relevant flow instead of just the details screen.
  const shouldOpenPay = params.openPay === "1";
  const shouldOpenReview = params.openReview === "1";
  const hasHandledNotificationAction = useRef(false);
  const userRole = useAppSelector((state) => state.user.userRole);
  let staffClientname = "";
  if (userRole === "customer") {
    const base = booking?.staffName ?? "Anyone";
    staffClientname =
      booking?.staffIsOwner && base.toLowerCase() !== "anyone"
        ? `${base} · ${t("owner")}`
        : base;
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
      case "awaiting_outcome":
        return "awaiting_outcome";
      case "no_show":
        return "no_show";
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

    const serviceDescription =
      allServices.find((s: any) => s?.description)?.description ??
      apiData.subscriptionPlanDescription ??
      null;

    const serviceLabels = allServices
      .map((s: any) => (typeof s?.label === "string" ? s.label.trim() : ""))
      .filter(Boolean);

    const firstServiceImage =
      allServices
        .map((s: any) => s?.image_url || s?.image || null)
        .find((uri: string | null) => !!uri) ?? null;

    const duration = formatDuration(services, apiData.subscriptionServices);

    const dateTime = formatAppointmentDateTime(
      apiData.appointmentDate,
      apiData.appointmentTime,
    );

    const price = getPrice(apiData);
    const planName =
      typeof apiData.subscription === "string"
        ? apiData.subscription
        : apiData.subscription?.name ||
          apiData.subscription?.title ||
          "---";

    const businessLogo = apiData.businessLogoUrl
      ? apiData.businessLogoUrl.startsWith("http://") ||
        apiData.businessLogoUrl.startsWith("https://")
        ? apiData.businessLogoUrl
        : process.env.EXPO_PUBLIC_API_BASE_URL + apiData.businessLogoUrl
      : (process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ?? "");

    const resolvedServiceImage = firstServiceImage
      ? firstServiceImage.startsWith("http://") ||
        firstServiceImage.startsWith("https://")
        ? firstServiceImage
        : process.env.EXPO_PUBLIC_API_BASE_URL + firstServiceImage
      : businessLogo;

    return {
      id: apiData.id.toString(),
      serviceName: serviceName || "---",
      serviceDescription,
      serviceLabels,
      serviceImageUrl: resolvedServiceImage,
      membershipType: apiData.subscriptionPlanType || "---",
      staffName: apiData.staffName || "Anyone",
      location: apiData.businessAddress || "Business address",
      dateTime: dateTime,
      duration: duration,
      user: apiData.user ?? "User",
      price: formatPrice(price),
      serviceTotal:
        typeof price === "number"
          ? price
          : typeof price === "string"
            ? Number.parseFloat(price)
            : null,
      status: mapApiStatusToBookingStatus(apiData.status),
      businessId: apiData.businessId,
      businessName: apiData.businessTitle || "---",
      businessAddress: apiData.businessAddress || "Business address",
      businessLatitude: apiData.businessLatitude || undefined,
      businessLongitude: apiData.businessLongitude || undefined,
      businessLogoUrl: businessLogo,
      businessAverageRating: apiData.businessAverageRating || 0,
      workingWithBusiness:
        apiData.business?.working_with_business ?? null,
      paymentMethod: apiData.paymentMethod,
      paidAmount: apiData.paidAmount,
      owesPayment:
        apiData.owesPayment ??
        // Older responses have no owesPayment; settling a pay-later
        // appointment rewrites the method to pay_now, so this matches.
        !(apiData.paymentMethod === "pay_now" && apiData.paidAmount != null),
      paymentDueNow: apiData.paymentDueNow ?? false,
      paidAt: apiData.paidAt ?? null,
      subscriptionVisits: apiData.subscriptionVisits || null,
      planName,
      planDescription: apiData.subscriptionPlanDescription ?? null,
      type: apiData.appointmentType,
      owner: apiData.owner,
      notes: apiData.notes ?? null,
      appointmentDate: apiData.appointmentDate,
      appointmentTime: apiData.appointmentTime,
      createdAt: apiData.createdAt ?? null,
      userId: apiData.userId ?? null,
      userProfilePic: apiData.userProfilePic ?? null,
      staffId: apiData.staffId ?? null,
      staffIsOwner: apiData.staffIsOwner === true,
      staffImage: apiData.staffImage ?? null,
      subscription_id: apiData.subscriptionId,
      service_ids: service_ids,
      tipRecipientType: apiData.tipRecipientType,
      tipRecipientName: apiData.tipRecipientName,
      canTip: apiData.canTip ?? false,
      tipDeclined: apiData.tipDeclined ?? false,
      tip: apiData.tip ?? null,
      pendingTip: apiData.pendingTip ?? null,
      cancellationPolicy: apiData.cancellationPolicy ?? null,
      membershipPolicy: apiData.membershipPolicy ?? null,
      visitStatus: apiData.visitStatus ?? null,
      visitRestoreReason: apiData.visitRestoreReason ?? null,
      hasSavedCard: apiData.hasSavedCard ?? false,
      cardLastFour: normalizeCardLastFour(
        apiData.cardLastFour ?? apiData.card_last_four,
      ),
      outcomeMarkedAt: apiData.outcomeMarkedAt ?? null,
      outcomeMarkedById: apiData.outcomeMarkedById ?? null,
      canMarkOutcome: apiData.canMarkOutcome ?? false,
      canCorrectOutcome: apiData.canCorrectOutcome ?? false,
      canRestoreVisit: apiData.canRestoreVisit ?? false,
      outcomeSummary: apiData.outcomeSummary ?? null,
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

  // Refetch without touching the loading state, so background refreshes don't
  // replace the screen with a spinner.
  const refreshBookingSilently = async (): Promise<BookingItem | null> => {
    if (!bookingId) return null;

    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: ApiBookingResponse;
      }>(appointmentsEndpoints.getById(bookingId));

      if (response.success && response.data) {
        const mappedBooking = mapApiResponseToBookingItem(response.data);
        setBooking(mappedBooking);
        return mappedBooking;
      }
    } catch {
      // Leave the current booking on screen; the next focus refetch corrects it.
    }

    return null;
  };

  const refreshUntilTipAvailable = async () => {
    for (const delayMs of TIP_AVAILABILITY_POLL_DELAYS_MS) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      const updated = await refreshBookingSilently();
      // Tip settled: can tip, already tipped, or chose No Tip on pay-and-tip.
      if (
        updated?.canTip ||
        updated?.tip ||
        (updated?.tipDeclined ?? false)
      ) {
        return;
      }
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
      case "awaiting_outcome":
        return styles.statusAwaitingOutcome;
      case "cancelled":
      case "expired":
      case "no_show":
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
      case "awaiting_outcome":
        return styles.statusTextAwaitingOutcome;
      case "cancelled":
      case "expired":
      case "no_show":
        return styles.statusTextCancelled;
      default:
        return styles.statusTextActive;
    }
  };

  const getStatusDotStyle = (status: BookingStatus) => {
    switch (status) {
      case "ongoing":
        return styles.statusDotOngoing;
      case "active":
        return styles.statusDotActive;
      case "complete":
        return styles.statusDotComplete;
      case "awaiting_outcome":
        return styles.statusDotAwaitingOutcome;
      case "cancelled":
      case "expired":
      case "no_show":
        return styles.statusDotCancelled;
      default:
        return styles.statusDotActive;
    }
  };

  const getStatusLabel = (status: BookingStatus, customerName?: string) => {
    switch (status) {
      case "ongoing":
        return "On going";
      case "active":
        return "Active";
      case "complete":
        return "Complete";
      case "awaiting_outcome":
        return t("statusAwaitingOutcome");
      case "no_show":
        return t("statusNoShow");
      case "cancelled":
        if (userRole === "staff" || userRole === "business") {
          return `${customerName || "Customer"} canceled`;
        }
        return "You canceled";
      case "expired":
        return "Expired";
      default:
        return "Active";
    }
  };

  const isCancelled =
    booking?.status === "cancelled" ||
    booking?.status === "expired" ||
    booking?.status === "no_show";
  const isComplete = booking?.status === "complete";
  const isAwaitingOutcome = booking?.status === "awaiting_outcome";

  const paidTipBreakdown = useMemo(() => {
    if (!booking?.tip) return null;

    const tipAmount = booking.tip.amount;
    const serviceAmount = Number.isFinite(booking.serviceTotal)
      ? (booking.serviceTotal as number)
      : Number.parseFloat(String(booking.price)) || 0;
    const paidRaw = Number.parseFloat(String(booking.paidAmount ?? ""));
    const combined = serviceAmount + tipAmount;
    // Prefer backend paidAmount only when it already covers service + tip.
    // Otherwise paidAmount can be service-only or tip-only after a separate tip charge.
    const totalPaid =
      Number.isFinite(paidRaw) && paidRaw >= combined - 0.02
        ? paidRaw
        : combined;

    return {
      serviceAmount,
      tipAmount,
      totalPaid,
      recipientName: formatTipRecipientName(booking.tip.recipientName),
      currency: booking.tip.currency || "usd",
    };
  }, [booking]);

  const tipReceiptImageUri = useMemo(
    () => resolveApiImageUrl(booking?.staffImage),
    [booking?.staffImage],
  );

  // Show review modal only when: status complete, customer, and no review exists yet (reviews API returns empty data)
  useEffect(() => {
    if (
      !loading &&
      booking &&
      isComplete &&
      userRole === "customer" &&
      !hasShownReviewPromptForVisit.current &&
      // A payment notification must land in the payment sheet, not behind a
      // review modal. Once the payment is settled the prompt can show again.
      !(shouldOpenPay && booking.owesPayment) &&
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

  const monthsShort = [
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
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatAppointmentParts = () => {
    if (!booking?.appointmentDate || !booking?.appointmentTime) {
      return { dateLabel: booking?.dateTime ?? "---", timeLabel: "" };
    }
    try {
      const [month, day, year] = booking.appointmentDate.split("/").map(Number);
      const [hours, minutes] = booking.appointmentTime.split(":").map(Number);
      const dateObj = new Date(year, month - 1, day, hours, minutes);
      let hours12 = dateObj.getHours();
      const ampm = hours12 >= 12 ? "PM" : "AM";
      hours12 = hours12 % 12;
      hours12 = hours12 ? hours12 : 12;
      const minutesStr = dateObj.getMinutes().toString().padStart(2, "0");
      return {
        dateLabel: `${daysShort[dateObj.getDay()]}, ${monthsShort[dateObj.getMonth()]} ${day}`,
        timeLabel: `${hours12}:${minutesStr} ${ampm}`,
      };
    } catch {
      return { dateLabel: booking.dateTime ?? "---", timeLabel: "" };
    }
  };

  const { dateLabel, timeLabel } = formatAppointmentParts();

  const formatBookedOn = (createdAt?: string | null) => {
    if (!createdAt) return null;
    try {
      let d = new Date(createdAt);
      if (Number.isNaN(d.getTime()) && createdAt.includes("/")) {
        const [month, day, year] = createdAt.split("/").map(Number);
        d = new Date(year, month - 1, day);
      }
      if (Number.isNaN(d.getTime())) return null;
      return `Booked on ${monthsShort[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch {
      return null;
    }
  };

  const bookedOnLabel = formatBookedOn(booking?.createdAt);

  const isSubscription = booking?.type === "subscription";
  const serviceCardTitle = isSubscription
    ? booking?.planName || booking?.serviceName || "---"
    : booking?.serviceName || "---";
  const serviceCardSubtitle = (() => {
    if (isSubscription) {
      const parts: string[] = [];
      if (booking?.membershipType && booking.membershipType !== "---") {
        parts.push(booking.membershipType);
      }
      if (booking?.serviceName && booking.serviceName !== "---") {
        parts.push(booking.serviceName);
      }
      return parts.length ? `(${parts.join(", ")})` : null;
    }
    if (booking?.serviceLabels && booking.serviceLabels.length > 0) {
      return `(${booking.serviceLabels.join(", ")})`;
    }
    return null;
  })();
  const serviceCardDescription =
    (isSubscription
      ? booking?.planDescription
      : booking?.serviceDescription) || null;

  const paymentHeadline = (() => {
    if (!booking) return "";
    if (isSubscription) {
      return booking.planName || "Plan";
    }
    if (!booking.owesPayment && booking.paidAmount != null) {
      return userRole === "customer" ? "You paid" : `${staffClientname} paid`;
    }
    return userRole === "customer" ? "I will pay" : "Customer will pay";
  })();

  const paymentSubline = (() => {
    if (!booking || isSubscription) return null;
    if (booking.paymentMethod === "pay_now" && !booking.owesPayment) {
      return "Paid online";
    }
    return "In-person at the business";
  })();

  const savedCardLabel =
    !isSubscription && booking?.cardLastFour
      ? t("savedCardLastFour", { lastFour: booking.cardLastFour })
      : null;

  const handleReschedulePress = () => {
    if (!booking) return;
    const baseParams: Record<string, string> = {
      business_id: booking.businessId?.toString() ?? "",
      is_reschedule: "1",
      booking_id: booking.id ?? "",
      appointment_type:
        booking.type === "subscription" ? "subscription" : "service",
      notes: booking.notes ?? "",
      appointment_date: booking.appointmentDate ?? "",
      appointment_time: booking.appointmentTime ?? "",
      staff_id: booking.staffId != null ? String(booking.staffId) : "anyone",
    };
    if (booking.type === "service" && booking.service_ids?.length) {
      baseParams.service_ids = JSON.stringify(booking.service_ids);
    }
    if (booking.type === "subscription" && booking.subscription_id != null) {
      baseParams.subscription_id = String(booking.subscription_id);
    }
    router.push({
      pathname: "/(main)/bookingNow",
      params: baseParams,
    });
  };

  const getAppointmentStartDate = (): Date | null => {
    if (!booking?.appointmentDate || !booking?.appointmentTime) return null;
    try {
      const [month, day, year] = booking.appointmentDate.split("/").map(Number);
      const [hours, minutes] = booking.appointmentTime.split(":").map(Number);
      if (
        !month ||
        !day ||
        !year ||
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
      ) {
        return null;
      }
      const dateObj = new Date(year, month - 1, day, hours, minutes);
      return Number.isNaN(dateObj.getTime()) ? null : dateObj;
    } catch {
      return null;
    }
  };

  const appointmentStart = getAppointmentStartDate();
  const now = new Date();
  const RESCHEDULE_CUTOFF_MS = 30 * 60 * 1000; // 30 minutes before start
  const isBeforeAppointmentStart =
    !appointmentStart || now.getTime() < appointmentStart.getTime();
  const isBeforeRescheduleCutoff =
    !appointmentStart ||
    now.getTime() < appointmentStart.getTime() - RESCHEDULE_CUTOFF_MS;

  // Cancel: customer, owner, and assigned staff (MD §6.3). Hidden after
  // appointment start, and after outcome / cancel / complete.
  const canShowBottomCancel =
    !isCancelled &&
    !isComplete &&
    !isAwaitingOutcome &&
    isBeforeAppointmentStart;
  // Reschedule is customer-only (business/staff manage time via cancel + rebook).
  // Hidden within 30 minutes of appointment start.
  const canShowBottomReschedule =
    userRole === "customer" &&
    !isCancelled &&
    !isComplete &&
    !isAwaitingOutcome &&
    booking?.status === "ongoing" &&
    isBeforeRescheduleCutoff;
  // Memberships are outside the outcome flow — keep the old complete action.
  // One-time services use Mark Completed / Mark No-Show via canMarkOutcome.
  const canShowMarkComplete =
    booking?.type === "subscription" &&
    !booking?.canMarkOutcome &&
    booking?.status === "ongoing" &&
    (userRole === "business" || userRole === "staff");
  const canShowOutcomeActions = !!booking?.canMarkOutcome;
  const canShowCorrectOutcome = !!booking?.canCorrectOutcome;
  const canShowRestoreVisit = !!booking?.canRestoreVisit;
  const canShowBottomButtonRow =
    canShowBottomReschedule || canShowBottomCancel;

  const visitStatusLabel = getVisitStatusLabel(booking?.visitStatus, t);

  const businessName = booking?.businessName || booking?.location || "---";
  const businessLatitude = booking?.businessLatitude
    ? parseFloat(booking.businessLatitude)
    : undefined;
  const businessLongitude = booking?.businessLongitude
    ? parseFloat(booking.businessLongitude)
    : undefined;

  const handleContactPress = () => {
    Logger.log("booking", booking);
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
  const handleOpenCancelModal = async () => {
    if (!bookingId) return;

    dispatch(setActionLoader(true));
    try {
      const response = await ApiService.get<{
        success: boolean;
        message?: string;
        data?: { message?: string };
      }>(appointmentsEndpoints.cancellationPreview(bookingId));

      setCancelFeeNotice(
        response?.data?.message || response?.message || null,
      );
      setCancelModalVisible(true);
    } catch (error: any) {
      Logger.error("Cancellation preview error:", error);
      setCancelFeeNotice(null);
      setCancelModalVisible(true);
      if (error?.message) {
        showBanner(t("error"), error.message, "warning", 2500);
      }
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const handleCloseCancelModal = () => {
    setCancelModalVisible(false);
    setCancelFeeNotice(null);
  };

  const openOutcomePreview = async (outcome: "completed" | "no_show") => {
    if (!bookingId) return;
    setPendingOutcome(outcome);
    setOutcomePreview(null);
    setOutcomePreviewLoading(true);
    setOutcomeSheetVisible(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message?: string;
        data: OutcomePreview;
      }>(appointmentsEndpoints.outcomePreview(bookingId, outcome));
      if (response.success && response.data) {
        setOutcomePreview(response.data);
      } else {
        setOutcomeSheetVisible(false);
        showBanner(
          t("error"),
          response.message || "Could not load outcome preview.",
          "error",
          2500,
        );
      }
    } catch (error: any) {
      Logger.error("Outcome preview error:", error);
      setOutcomeSheetVisible(false);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          "Could not load outcome preview.",
        "error",
        2500,
      );
    } finally {
      setOutcomePreviewLoading(false);
    }
  };

  const handleConfirmOutcome = async () => {
    if (!bookingId || !pendingOutcome || outcomeConfirming) return;
    setOutcomeConfirming(true);
    try {
      const stripeHeaders = await getStripeModeHeaders();
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
      }>(
        appointmentsEndpoints.markOutcome(bookingId),
        { outcome: pendingOutcome },
        { headers: stripeHeaders },
      );
      if (response.success) {
        showBanner(
          t("success"),
          response.message || "Outcome marked successfully.",
          "success",
          2500,
        );
        setOutcomeSheetVisible(false);
        setOutcomePreview(null);
        await fetchBookingDetails();
      } else {
        showBanner(
          t("error"),
          response.message || "Unable to mark outcome.",
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Mark outcome error:", error);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          "Unable to mark outcome.",
        "error",
        3000,
      );
    } finally {
      setOutcomeConfirming(false);
    }
  };

  const openCorrectionPreview = async () => {
    if (!bookingId) return;
    setCorrectionPreview(null);
    dispatch(setActionLoader(true));
    try {
      const response = await ApiService.get<{
        success: boolean;
        message?: string;
        data: OutcomeCorrectionPreview;
      }>(appointmentsEndpoints.correctionPreview(bookingId));
      if (response.success && response.data) {
        setCorrectionPreview(response.data);
        setCorrectionSheetVisible(true);
      } else {
        showBanner(
          t("error"),
          response.message || "Could not load correction preview.",
          "error",
          2500,
        );
      }
    } catch (error: any) {
      Logger.error("Correction preview error:", error);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          "Could not load correction preview.",
        "error",
        2500,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const handleConfirmCorrection = async () => {
    if (!bookingId || correctionConfirming) return;
    setCorrectionConfirming(true);
    try {
      const stripeHeaders = await getStripeModeHeaders();
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
      }>(appointmentsEndpoints.correctOutcome(bookingId), {}, {
        headers: stripeHeaders,
      });
      if (response.success) {
        showBanner(
          t("success"),
          response.message || "Appointment corrected to completed.",
          "success",
          2500,
        );
        setCorrectionSheetVisible(false);
        setCorrectionPreview(null);
        await fetchBookingDetails();
      } else {
        showBanner(
          t("error"),
          response.message || "Unable to correct outcome.",
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Correct outcome error:", error);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          "Unable to correct outcome.",
        "error",
        3000,
      );
    } finally {
      setCorrectionConfirming(false);
    }
  };

  const handleRestoreVisit = async (reason: string) => {
    if (!bookingId || restoreVisitSubmitting) return;
    setRestoreVisitSubmitting(true);
    try {
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
      }>(appointmentsEndpoints.restoreVisit(bookingId), { reason });
      if (response.success) {
        showBanner(
          t("success"),
          response.message || t("restoreVisitSuccess"),
          "success",
          2500,
        );
        setRestoreVisitSheetVisible(false);
        await fetchBookingDetails();
      } else {
        showBanner(
          t("error"),
          response.message || t("restoreVisitFailed"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Restore visit error:", error);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          t("restoreVisitFailed"),
        "error",
        3000,
      );
    } finally {
      setRestoreVisitSubmitting(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!bookingId) return;

    dispatch(setActionLoader(true));
    try {
      const response = await ApiService.patch<{
        success: boolean;
        message: string;
      }>(appointmentsEndpoints.complete(bookingId), {});

      if (response.success) {
        showBanner(
          t("success"),
          response.message || "Booking marked as completed.",
          "success",
          2500,
        );
        await fetchBookingDetails();
      } else {
        showBanner(
          t("error"),
          response.message || "Unable to complete this booking.",
          "error",
          2500,
        );
      }
    } catch (completeError: any) {
      showBanner(
        t("error"),
        completeError?.message || "Unable to complete this booking.",
        "error",
        2500,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
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

  const handlePayOnline = async (tipAmount?: number | null) => {
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
        connectedAccountId,
      } = await fetchAppointmentPaymentSheetParams(
        appointmentId,
        tipAmount,
      );
      dispatch(setActionLoader(false));
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        await setStripeAccount(connectedAccountId);

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
          paymentConfig.customerSessionClientSecret =
            customerSessionClientSecret;
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
        // Not awaited: the Stripe account must be released straight away, and
        // the tip card can appear once the webhook settles the payment.
        void refreshUntilTipAvailable();
      } finally {
        await setStripeAccount(null);
      }
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

  /**
   * Completed unpaid pay-later: tip chooser then one sheet.
   * Skip chooser when a tip was already committed at booking.
   * All other owesPayment cases keep the existing direct pay sheet.
   */
  const startPayOnlineFlow = () => {
    if (!booking) return;

    if (booking.paymentDueNow) {
      const hasBookingPendingTip =
        booking.pendingTip?.source === "booking" &&
        booking.pendingTip.amount > 0;

      if (hasBookingPendingTip) {
        void handlePayOnline(null);
        return;
      }

      setPayAndTipModalVisible(true);
      return;
    }

    void handlePayOnline();
  };

  const handlePayAndTipContinue = (tipAmount: number | null) => {
    setPayAndTipModalVisible(false);
    void handlePayOnline(tipAmount);
  };

  // Act on the notification the customer tapped, once the booking has loaded.
  // The ref keeps a re-render from reopening the Stripe sheet.
  useEffect(() => {
    if (!booking || loading || hasHandledNotificationAction.current) return;

    if (shouldOpenPay && booking.owesPayment) {
      hasHandledNotificationAction.current = true;
      startPayOnlineFlow();
    } else if (shouldOpenReview) {
      hasHandledNotificationAction.current = true;
      void checkAndShowReviewPrompt();
    }
  }, [booking, loading]);

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
          {/* Status + Booking ID */}
          <View style={styles.statusIdRow}>
            <View
              style={[styles.statusBadge, getStatusBadgeStyle(booking.status)]}
            >
              <View
                style={[styles.statusDot, getStatusDotStyle(booking.status)]}
              />
              <Text
                style={[styles.statusText, getStatusTextStyle(booking.status)]}
              >
                {getStatusLabel(booking.status, booking.user)}
              </Text>
            </View>
            <View style={styles.bookingIdBlock}>
              <Text style={styles.bookingIdText}>{`#FP${booking.id}`}</Text>
              {bookedOnLabel ? (
                <Text style={styles.bookedOnText}>{bookedOnLabel}</Text>
              ) : null}
            </View>
          </View>

          {/* Service / Plan card */}
          <View style={[styles.serviceCard, styles.cardShadow]}>
            <View style={styles.serviceCardRow}>
              <Image
                source={{
                  uri:
                    booking.serviceImageUrl ||
                    booking.businessLogoUrl ||
                    process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ||
                    "",
                }}
                style={styles.serviceImage}
              />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {serviceCardTitle}
                </Text>
                {serviceCardSubtitle ? (
                  <Text style={styles.serviceSubtitle} numberOfLines={2}>
                    {serviceCardSubtitle}
                  </Text>
                ) : null}
                <View style={styles.tagsRow}>
                  {isSubscription ? (
                    <View style={styles.tagPill}>
                      <Ionicons
                        name="pricetag-outline"
                        size={moderateWidthScale(11)}
                        color={theme.darkGreen}
                      />
                      <Text style={styles.tagText}>Plan</Text>
                    </View>
                  ) : null}
                  {booking.membershipType &&
                  booking.membershipType !== "---" &&
                  isSubscription ? (
                    <View style={styles.tagPill}>
                      <Ionicons
                        name="sparkles"
                        size={moderateWidthScale(11)}
                        color={theme.darkGreen}
                      />
                      <Text style={styles.tagText}>
                        {booking.membershipType}
                      </Text>
                    </View>
                  ) : null}
                  {!isSubscription &&
                    (booking.serviceLabels ?? []).slice(0, 2).map((label) => (
                      <View key={label} style={styles.tagPill}>
                        <Ionicons
                          name="leaf-outline"
                          size={moderateWidthScale(11)}
                          color={theme.darkGreen}
                        />
                        <Text style={styles.tagText}>{label}</Text>
                      </View>
                    ))}
                  <View style={styles.tagPill}>
                    <Ionicons
                      name="time-outline"
                      size={moderateWidthScale(11)}
                      color={theme.darkGreen}
                    />
                    <Text style={styles.tagText}>{booking.duration}</Text>
                  </View>
                </View>
                {serviceCardDescription ? (
                  <Text style={styles.serviceDescription} numberOfLines={3}>
                    {serviceCardDescription}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.infoWrap}>
            <View style={styles.infoGrid}>
              <View style={styles.infoColumn}>
                <View style={styles.infoIconCircle}>
                  <Ionicons
                    name="time"
                    size={moderateWidthScale(12)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    {t("duration")}
                  </Text>
                  <Text style={styles.infoValueDuration}>
                    {booking.duration}
                  </Text>
                </View>
              </View>

              <View style={styles.infoColumn}>
                <View style={styles.infoIconCircle}>
                  <Ionicons
                    name="calendar"
                    size={moderateWidthScale(12)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    Date & Time
                  </Text>
                  <Text style={styles.infoValue}>{dateLabel}</Text>
                  {timeLabel ? (
                    <Text style={styles.infoValueSecondary}>{timeLabel}</Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={styles.infoColumnPressable}
                activeOpacity={0.7}
                onPress={handlePersonPress}
              >
                <View style={styles.infoIconCircle}>
                  <Ionicons
                    name="person"
                    size={moderateWidthScale(12)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    {userRole === "customer" ? t("myBarber") : t("myCustomer")}
                  </Text>
                  <Text style={styles.infoValue}>{staffClientname}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={moderateWidthScale(11)}
                  color={theme.lightGreen4}
                  style={styles.infoChevron}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location / Business */}
          <View style={styles.locationCard}>
            <TouchableOpacity
              style={styles.locationTouchable}
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
              <Image
                source={{ uri: booking.businessLogoUrl }}
                style={styles.locationAvatar}
              />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {booking.businessName}
                </Text>
                <View style={styles.locationAddressRow}>
                  <Ionicons
                    name="location-sharp"
                    size={moderateWidthScale(12)}
                    color={theme.lightGreen}
                    style={styles.locationAddressPin}
                  />
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {booking.businessAddress}
                  </Text>
                </View>
                {!!booking.workingWithBusiness?.title && (
                  <Text style={styles.locationAffiliation} numberOfLines={1}>
                    {t("affiliatedWith")}{" "}
                    <Text style={styles.locationAffiliationName}>
                      {booking.workingWithBusiness.title}
                    </Text>
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {businessLatitude && businessLongitude ? (
              <TouchableOpacity
                style={styles.getDirectionsButton}
                onPress={handleLocationPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="location-sharp"
                  size={moderateWidthScale(12)}
                  color={theme.darkGreen}
                />
                <Text style={styles.getDirectionsText}>Get Directions</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Chat + Support */}
          <View style={styles.actionCardsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionCard, styles.actionCardPrimary]}
              onPress={handleContactPress}
            >
              <ContactIcon
                width={moderateWidthScale(20)}
                height={moderateWidthScale(20)}
                color={theme.white}
              />
              <View style={styles.actionCardTextWrap}>
                <Text
                  style={[
                    styles.actionCardTitle,
                    styles.actionCardTitlePrimary,
                  ]}
                  numberOfLines={1}
                >
                  {userRole === "customer"
                    ? "Business Chat"
                    : "Customer Chat"}
                </Text>
                <Text
                  style={[
                    styles.actionCardSubtitle,
                    styles.actionCardSubtitlePrimary,
                  ]}
                  numberOfLines={2}
                >
                  {userRole === "customer"
                    ? "Message the business"
                    : "Message your customer"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={moderateWidthScale(14)}
                color={theme.white}
                style={styles.actionCardChevron}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionCard, styles.actionCardSecondary]}
              onPress={handleSupportPress}
            >
              <SupportIcon
                width={moderateWidthScale(20)}
                height={moderateWidthScale(20)}
                color={theme.buttonBack}
              />
              <View style={styles.actionCardTextWrap}>
                <Text
                  style={[
                    styles.actionCardTitle,
                    styles.actionCardTitleSecondary,
                  ]}
                  numberOfLines={1}
                >
                  {t("support")}
                </Text>
                <Text
                  style={[
                    styles.actionCardSubtitle,
                    styles.actionCardSubtitleSecondary,
                  ]}
                  numberOfLines={2}
                >
                  Get help from FreshPass
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={moderateWidthScale(14)}
                color={theme.buttonBack}
                style={styles.actionCardChevron}
              />
            </TouchableOpacity>
          </View>

          {/* Try-on Images */}
          {booking.images &&
            Array.isArray(booking.images) &&
            booking.images.length > 0 && (
              <View style={[styles.imagesSection, styles.cardShadow]}>
                <Text style={styles.imagesSectionTitle}>
                  {t("attachedImages") || "Attached images"}
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

          {/* Payment */}
          <View style={[styles.paymentCard, styles.cardShadow]}>
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIconCircle}>
                <WalletIcon
                  width={moderateWidthScale(18)}
                  height={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </View>
              <View style={styles.paymentTextCol}>
                <Text style={styles.paymentLabel}>
                  {isSubscription ? t("planName") : t("paymentMethod")}
                </Text>
                <Text style={styles.paymentTitle}>{paymentHeadline}</Text>
                {paymentSubline ? (
                  <Text style={styles.paymentSubtitle}>{paymentSubline}</Text>
                ) : null}
                {savedCardLabel ? (
                  <Text
                    style={styles.paymentSubtitle}
                    numberOfLines={1}
                  >
                    {savedCardLabel}
                  </Text>
                ) : null}
                {!isCancelled &&
                  userRole === "customer" &&
                  booking.type === "service" &&
                  booking.owesPayment && (
                    <Button
                      title={t("payOnline")}
                      onPress={startPayOnlineFlow}
                      containerStyle={styles.payOnlineButton}
                      textStyle={styles.payOnlineButtonText}
                    />
                  )}
              </View>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRight}>
              <Text style={styles.paymentLabel}>
                {isSubscription ? t("remaining") : t("totalAmount")}
              </Text>
              {booking.type === "service" ? (
                paidTipBreakdown &&
                !booking.owesPayment &&
                booking.paidAmount != null ? (
                  <View style={styles.paymentBreakdownCard}>
                    <View style={styles.paymentBreakdownRow}>
                      <Text style={styles.paymentBreakdownLabel}>Service</Text>
                      <Text style={styles.paymentBreakdownValue}>
                        {formatPrice(paidTipBreakdown.serviceAmount)}
                      </Text>
                    </View>
                    <View style={styles.paymentBreakdownRow}>
                      <Text style={styles.paymentBreakdownLabel}>
                        Tip for {paidTipBreakdown.recipientName}
                      </Text>
                      <Text style={styles.paymentBreakdownValue}>
                        {formatTipAmount(
                          paidTipBreakdown.tipAmount,
                          paidTipBreakdown.currency,
                        )}
                      </Text>
                    </View>
                    <View style={styles.paymentBreakdownDivider} />
                    <View style={styles.paymentBreakdownRow}>
                      <Text style={styles.paymentBreakdownTotalLabel}>
                        Total paid
                      </Text>
                      <Text style={styles.paymentBreakdownTotalValue}>
                        {formatPrice(paidTipBreakdown.totalPaid)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.paymentAmount}>
                    {!booking.owesPayment && booking.paidAmount != null
                      ? formatPrice(booking.paidAmount)
                      : booking.price}
                  </Text>
                )
              ) : (
                <Text style={styles.paymentAmount}>
                  {booking.subscriptionVisits
                    ? `${booking.subscriptionVisits.bookable ?? booking.subscriptionVisits.remaining}/${booking.subscriptionVisits.total} left`
                    : booking.price}
                </Text>
              )}
            </View>
          </View>

          {/* Notes */}
          {booking.notes != null && String(booking.notes).trim() !== "" && (
            <View style={[styles.notesCard, styles.cardShadow]}>
              <View style={styles.paymentIconCircle}>
                <Ionicons
                  name="document-text-outline"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </View>
              <View style={styles.notesTextCol}>
                <Text style={styles.notesLabel}>Customer Notes</Text>
                <Text style={styles.notesText}>{booking.notes}</Text>
              </View>
            </View>
          )}

          {/* Paid tip receipt */}
          {userRole === "customer" && booking.tip && paidTipBreakdown && (
            <View style={styles.tipReceiptSection}>
              <View style={styles.tipReceiptCard}>
                <View style={styles.tipReceiptTopRow}>
                  <View style={styles.tipReceiptAvatarWrap}>
                    <View style={styles.tipReceiptAvatar}>
                      {tipReceiptImageUri ? (
                        <Image
                          source={{ uri: tipReceiptImageUri }}
                          style={styles.tipReceiptAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.tipReceiptInitial}>
                          {paidTipBreakdown.recipientName
                            .charAt(0)
                            .toUpperCase() || "?"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.tipReceiptBadge}>
                      <Ionicons
                        name="heart"
                        size={moderateWidthScale(10)}
                        color={theme.buttonText}
                      />
                    </View>
                  </View>

                  <View style={styles.tipReceiptInfo}>
                    <Text style={styles.tipReceiptEyebrow}>Thank you</Text>
                    <Text style={styles.tipReceiptTitle}>
                      {paidTipBreakdown.recipientName}
                    </Text>
                    <Text style={styles.tipReceiptSubtitle}>
                      Received your appreciation
                    </Text>
                  </View>

                  <View style={styles.tipReceiptAmountPill}>
                    <Text style={styles.tipReceiptAmount}>
                      {formatTipAmount(
                        paidTipBreakdown.tipAmount,
                        paidTipBreakdown.currency,
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.tipReceiptFooter}>
                  <Ionicons
                    name="checkmark-circle"
                    size={moderateWidthScale(16)}
                    color={theme.buttonBack}
                  />
                  <Text style={styles.tipReceiptFooterText}>
                    Your tip of{" "}
                    {formatTipAmount(
                      paidTipBreakdown.tipAmount,
                      paidTipBreakdown.currency,
                    )}{" "}
                    was shared successfully
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Standalone tip */}
          {userRole === "customer" &&
            booking.canTip &&
            !(booking.tipDeclined ?? false) &&
            !booking.paymentDueNow && (
              <TipSection
                appointmentId={Number(booking.id)}
                initialCanTip={booking.canTip}
                initialTip={booking.tip}
                fallbackRecipientName={booking.tipRecipientName}
                fallbackRecipientType={booking.tipRecipientType}
                fallbackRecipientImage={booking.staffImage}
                onTipComplete={fetchBookingDetails}
              />
            )}

          {/* Agreed cancellation / membership policy */}
          {userRole === "customer" &&
            booking.cancellationPolicy &&
            booking.type !== "subscription" &&
            (booking.status === "ongoing" || booking.status === "active") && (
              <View style={styles.cancellationPolicyCard}>
                <View style={styles.cancellationPolicyAccent} />
                <View style={styles.cancellationPolicyHeader}>
                  <View style={styles.cancellationPolicyIconWrap}>
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={iconScale(18)}
                      color={theme.white}
                    />
                  </View>
                  <Text style={styles.cancellationPolicyTitle}>
                    {t("cancellationPolicy")}
                  </Text>
                </View>

                <View style={styles.cancellationPolicyRow}>
                  <Text style={styles.cancellationPolicyRowLabel}>
                    {t("freeCancellation")}
                  </Text>
                  <Text style={styles.cancellationPolicyRowValue}>
                    {getFreeCancellationLabel(booking.cancellationPolicy, t)}
                  </Text>
                </View>

                <View style={styles.cancellationPolicyRow}>
                  <Text style={styles.cancellationPolicyRowLabel}>
                    {t("lateCancellationFee")}
                  </Text>
                  <Text style={styles.cancellationPolicyRowValue}>
                    {`${booking.cancellationPolicy.cancellationFeePercent}%`}
                  </Text>
                </View>

                <View style={styles.cancellationPolicyRow}>
                  <Text style={styles.cancellationPolicyRowLabel}>
                    {t("noShowFee")}
                  </Text>
                  <Text style={styles.cancellationPolicyRowValue}>
                    {`${booking.cancellationPolicy.noShowFeePercent}%`}
                  </Text>
                </View>
              </View>
            )}

          {userRole === "customer" &&
            booking.membershipPolicy &&
            booking.type === "subscription" &&
            (booking.status === "ongoing" || booking.status === "active") && (
              <View style={styles.cancellationPolicyCard}>
                <View style={styles.cancellationPolicyAccent} />
                <View style={styles.cancellationPolicyHeader}>
                  <View style={styles.cancellationPolicyIconWrap}>
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={iconScale(18)}
                      color={theme.white}
                    />
                  </View>
                  <Text style={styles.cancellationPolicyTitle}>
                    {t("cancellationPolicy")}
                  </Text>
                </View>

                <View style={styles.cancellationPolicyRow}>
                  <Text style={styles.cancellationPolicyRowLabel}>
                    {t("freeCancellation")}
                  </Text>
                  <Text style={styles.cancellationPolicyRowValue}>
                    {getMembershipFreeCancellationLabel(
                      booking.membershipPolicy,
                      t,
                    )}
                  </Text>
                </View>

                <View style={styles.cancellationPolicyRow}>
                  <Text style={styles.cancellationPolicyRowLabel}>
                    {t("lateCancellation")}
                  </Text>
                  <Text style={styles.cancellationPolicyRowValue}>
                    {booking.membershipPolicy.lateCancelForfeitsVisit
                      ? t("usesOneVisit")
                      : t("visitReturned")}
                  </Text>
                </View>

                <View style={styles.cancellationPolicyRow}>
                  <Text style={styles.cancellationPolicyRowLabel}>
                    {t("statusNoShow")}
                  </Text>
                  <Text style={styles.cancellationPolicyRowValue}>
                    {booking.membershipPolicy.noShowForfeitsVisit
                      ? t("usesOneVisit")
                      : t("visitReturned")}
                  </Text>
                </View>

                {booking.membershipPolicy.text ? (
                  <Text style={styles.cancellationPolicyBodyText}>
                    {booking.membershipPolicy.text}
                  </Text>
                ) : null}
              </View>
            )}

          {visitStatusLabel &&
            (isCancelled || isComplete) &&
            booking.type === "subscription" && (
              <View style={styles.visitStatusCard}>
                <Text style={styles.visitStatusLabel}>{visitStatusLabel}</Text>
                {booking.visitRestoreReason ? (
                  <Text style={styles.visitStatusReason}>
                    {booking.visitRestoreReason}
                  </Text>
                ) : null}
              </View>
            )}

          {booking.outcomeSummary ? (
            <OutcomeSummaryCard
              summary={booking.outcomeSummary}
              isBusinessView={
                userRole === "business" || userRole === "staff"
              }
            />
          ) : null}
        </ScrollView>

        {(canShowMarkComplete ||
          canShowOutcomeActions ||
          canShowCorrectOutcome ||
          canShowRestoreVisit ||
          canShowBottomReschedule ||
          canShowBottomCancel) && (
          <View
            style={[
              styles.bottomActions,
              { paddingBottom: Math.max(insets.bottom, moderateHeightScale(14)) },
            ]}
          >
            {canShowMarkComplete ? (
              <Button
                title="Mark as Completed"
                onPress={handleCompleteBooking}
                containerStyle={styles.completeButton}
                leftIcon={
                  <View style={styles.completeIcon}>
                    <Ionicons
                      name="checkmark"
                      size={moderateWidthScale(16)}
                      color={theme.buttonBack}
                    />
                  </View>
                }
              />
            ) : null}
            {canShowOutcomeActions ? (
              <View style={styles.outcomeActionsRow}>
                <TouchableOpacity
                  style={[styles.outcomeActionButton, styles.outcomeCompletedButton]}
                  activeOpacity={0.7}
                  onPress={() => openOutcomePreview("completed")}
                >
                  <Text style={styles.outcomeCompletedButtonText}>
                    {t("markCompleted")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outcomeActionButton, styles.outcomeNoShowButton]}
                  activeOpacity={0.7}
                  onPress={() => openOutcomePreview("no_show")}
                >
                  <Text style={styles.outcomeNoShowButtonText}>
                    {t("markNoShow")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {canShowCorrectOutcome ? (
              <Button
                title={t("correctToCompleted")}
                onPress={openCorrectionPreview}
                containerStyle={styles.completeButton}
              />
            ) : null}
            {canShowRestoreVisit ? (
              <Button
                title={t("restoreVisit")}
                onPress={() => setRestoreVisitSheetVisible(true)}
                containerStyle={styles.completeButton}
              />
            ) : null}
            {canShowBottomButtonRow ? (
              <View style={styles.bottomButtonsRow}>
                {canShowBottomReschedule ? (
                  <TouchableOpacity
                    style={styles.bottomOutlineButton}
                    activeOpacity={0.7}
                    onPress={handleReschedulePress}
                  >
                    <CalendarIcon
                      width={moderateWidthScale(18)}
                      height={moderateWidthScale(18)}
                      color={theme.darkGreen}
                    />
                    <Text style={styles.bottomOutlineButtonText}>
                      {t("reschedule")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {canShowBottomCancel ? (
                  <TouchableOpacity
                    style={styles.bottomCancelButton}
                    activeOpacity={0.7}
                    onPress={handleOpenCancelModal}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={moderateWidthScale(18)}
                      color={theme.red}
                    />
                    <Text style={styles.bottomCancelButtonText}>
                      Cancel Booking
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        <CancelBookingBottomSheet
          visible={cancelModalVisible}
          onClose={handleCloseCancelModal}
          onSubmit={handleCancelBooking}
          feeNotice={cancelFeeNotice}
        />

        <RestoreVisitSheet
          visible={restoreVisitSheetVisible}
          onClose={() => {
            if (!restoreVisitSubmitting) {
              setRestoreVisitSheetVisible(false);
            }
          }}
          onSubmit={handleRestoreVisit}
          submitting={restoreVisitSubmitting}
        />

        <OutcomeConfirmSheet
          visible={outcomeSheetVisible}
          onClose={() => {
            if (!outcomeConfirming) {
              setOutcomeSheetVisible(false);
              setOutcomePreview(null);
            }
          }}
          onConfirm={handleConfirmOutcome}
          title={
            outcomePreview?.title ||
            (pendingOutcome === "no_show"
              ? t("confirmNoShow")
              : t("markCompleted"))
          }
          question={
            outcomePreview?.question ||
            (outcomePreviewLoading ? "Loading..." : "")
          }
          message={outcomePreview?.message || ""}
          confirmLabel={
            pendingOutcome === "no_show"
              ? t("confirmNoShow")
              : t("markCompleted")
          }
          confirmDestructive={pendingOutcome === "no_show"}
          showNoSavedCardWarning={
            !!outcomePreview &&
            pendingOutcome === "no_show" &&
            !outcomePreview.hasSavedCard &&
            !outcomePreview.paid
          }
          confirming={outcomeConfirming || outcomePreviewLoading}
        />

        <OutcomeConfirmSheet
          visible={correctionSheetVisible}
          onClose={() => {
            if (!correctionConfirming) {
              setCorrectionSheetVisible(false);
              setCorrectionPreview(null);
            }
          }}
          onConfirm={handleConfirmCorrection}
          title={t("correctNoShowTitle")}
          question={t("correctNoShowQuestion")}
          message={correctionPreview?.message || ""}
          confirmLabel={t("changeToCompleted")}
          confirming={correctionConfirming}
        />

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

        <ShareOptionsBottomSheet
          visible={shareSheetVisible}
          onClose={() => {
            setShareSheetVisible(false);
          }}
          onSelectInAppUser={openShareToUserModal}
          onSelectNativeShare={handleNativeShare}
        />

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

        <PayAndTipModal
          visible={payAndTipModalVisible}
          appointmentId={Number(booking.id)}
          serviceAmount={booking.serviceTotal}
          fallbackRecipientName={
            booking.tipRecipientName || booking.staffName
          }
          onClose={() => setPayAndTipModalVisible(false)}
          onContinue={handlePayAndTipContinue}
        />
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <StackHeader title={t("bookingDetail")} showLine={false} />
      <View style={styles.sheet}>{renderContent()}</View>
    </View>
  );
}
