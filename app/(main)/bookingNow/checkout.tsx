import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import AppImage from "@/src/components/AppImage";
import {
  setSelectedStaff,
  type StaffMember,
} from "@/src/state/slices/bsnsSlice";
import {
  setActionLoader,
  setGuestModeModalVisible,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { appointmentsEndpoints, resolveAppointmentStaffId } from "@/src/services/endpoints";
import { useStripe } from "@stripe/stripe-react-native";
import {
  getStripeModeHeaders,
  pollAppointmentCheckoutStatus,
  startAppointmentCheckout,
  useStripeAccount,
} from "@/src/services/stripeService";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import CancellationPolicySheet from "@/src/components/CancellationPolicySheet";
import { useTranslation } from "react-i18next";
import {
  formatCustomerScheduleDate,
  getCustomerScheduleDateLabel,
  getCustomerSubscriptionDateDisplay,
  getCustomerSubscriptionDisplayPrice,
  getCustomerSubscriptionPill,
} from "@/src/utils/customerSubscriptionLifecycle";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import {
  prepareImagesForUpload,
  type PreparedImageFile,
} from "@/src/utils/prepareImageForUpload";
import type {
  CancellationPolicyQuote,
  CardSetupResponse,
} from "@/src/types/cancellationPolicy";
import {
  getDefaultAvatarImage,
} from "@/src/services/remoteConfigService";

const isWebUrl = (u?: string) => !!u && /^https?:\/\//i.test(u);

const buildAppointmentFormData = (
  body: Record<string, any>,
  files: PreparedImageFile[],
) => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => formData.append(`${key}[${i}]`, String(item)));
    } else if (typeof value === "boolean") {
      // Laravel's boolean rule rejects the string "true" in multipart; send 1/0
      formData.append(key, value ? "1" : "0");
    } else {
      formData.append(key, String(value));
    }
  });

  files.forEach((file, i) => formData.append(`images[${i}]`, file as any));

  return formData;
};

const getAppointmentImageErrorMessage = (error: any): string => {
  if (error?.status === 413) {
    return "Photos are too large. Please remove some and try again.";
  }
  // Booking your own business: ApiService already set the translated message
  if (error?.data?.data?.error_code === "own_business" && error?.message) {
    return error.message;
  }
  const errors = error?.data?.errors;
  if (errors && typeof errors === "object") {
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const msg = errors[firstKey];
      if (Array.isArray(msg) && msg[0]) return String(msg[0]);
      if (typeof msg === "string") return msg;
    }
  }
  return (
    error?.message || "Failed to book appointment. Please try again."
  );
};

const parseStringArrayParam = (raw?: string): string[] => {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
};

const resolveRouteParam = (
  value: string | string[] | undefined | null,
): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const resolveBusinessIdParam = (
  ...candidates: Array<string | number | null | undefined>
): string => {
  for (const candidate of candidates) {
    if (candidate == null || candidate === "") continue;
    const raw = String(candidate).trim();
    if (!raw || raw === "null" || raw === "undefined" || raw === "NaN") {
      continue;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    return String(Math.trunc(numeric));
  }
  return "";
};

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  label?: string | null;
}

interface SubscriptionPlanService {
  id: number;
  name: string;
  price: string;
  description: string | null;
  durationHours: number;
  durationMinutes: number;
  quantity?: number;
}

interface SubscriptionData {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlan: string;
  subscriptionPlanPrice: string;
  totalPrice?: number;
  subscriptionPlanServices?: SubscriptionPlanService[];
  subscriptionPlanType: string;
  subscriptionPlanDescription: string;
  userId: number;
  user: string;
  businessId: number;
  business: string;
  subscriber: string;
  status: string;
  stripeStatus?: string | null;
  hasAccess?: boolean;
  hasEnded?: boolean;
  endsAt?: string | null;
  paymentDate: string | null;
  nextPaymentDate: string | null;
  remainingDays: number | null;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
}

const formatSlotTo12h = (time24: string): string => {
  if (typeof time24 !== "string" || !/^\d{1,2}:\d{2}/.test(time24)) return "";
  const [h, m] = time24.split(":").map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h === 12 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
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
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const resolveStaffImageUri = (
  staffId: string,
  staffMember: StaffMember | null,
): string => {
  // Anyone without an assigned staff → default avatar; once assigned, use that staff's image
  if (staffId === "anyone" && !staffMember) {
    return getDefaultAvatarImage();
  }
  const img = staffMember?.image;
  if (!img) return getDefaultAvatarImage();
  const isAbsolute =
    typeof img === "string" &&
    (img.startsWith("http://") || img.startsWith("https://"));
  return isAbsolute
    ? img
    : `${process.env.EXPO_PUBLIC_API_BASE_URL ?? ""}${img}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // ── Checkout (step-flow look)
    ckRoot: {
      flex: 1,
      backgroundColor: theme.background,
    },
    ckFlex: { flex: 1 },
    ckContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(16),
    },
    ckSummary: {
      overflow: "hidden",
    },
    ckRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    ckRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    ckIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    ckAvatarWrap: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      overflow: "hidden",
      backgroundColor: theme.emptyProfileImage,
    },
    ckAvatar: {
      width: "100%",
      height: "100%",
    },
    ckRowText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    ckRowTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    ckRowSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    ckCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    ckLines: {
      gap: moderateHeightScale(12),
    },
    ckLine: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    ckLineName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    ckLinePrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    ckDivider: {
      height: 1,
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.borderNormal,
    },
    ckLineLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    ckLineValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    ckSection: {
      gap: moderateHeightScale(10),
    },
    ckPhotos: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    ckPhoto: {
      width: widthScale(76),
      height: widthScale(76),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
    },
    ckNote: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(16),
    },
    ckNoteText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    ckPlanHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    ckPlanTitleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    ckPlanTitle: {
      flexShrink: 1,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    ckPill: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.upcomingCard,
      borderWidth: 1,
      borderColor: theme.upcomingBorder,
    },
    ckPillText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 0.5,
    },
    ckPlanMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    ckPlanPrice: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    ckPlanDates: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    ckPlanDate: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    ckPlanDateValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    ckTotalBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    ckTotalLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    ckTotalValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    // Availability Section
    // Payment Method Section
    // Service Details Section
    // Price Breakdown Section
    // Privacy Policy Section
    // Subscription Section
    // Note Input Section
    processingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    processingContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      minWidth: widthScale(120),
      minHeight: heightScale(120),
    },
    processingText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(16),
      textAlign: "center",
    },
    // Subscription Card (when from subscription booking)
  });

function CheckoutContent() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;
  // Get data from Redux
  const businessData = useAppSelector((state) => state.bsns);
  const {
    selectedServices: reduxSelectedServices,
    allServices,
    staffMembers,
    selectedStaff: reduxSelectedStaff,
    businessId,
    businessHours,
    selectedDate: reduxSelectedDate,
    selectedTimeSlot: reduxSelectedTimeSlot,
    assignedStaffId: reduxAssignedStaffId,
    selectedPaymentMethod: reduxPaymentMethod,
    selectedNote: reduxNote,
    subscriptionPlanType,
  } = businessData;
  // Solo plans have no staff — backend assigns the owner, so skip staff checks
  const isSoloPlan =
    typeof subscriptionPlanType === "string" &&
    subscriptionPlanType.toLowerCase() === "solo";
  const bookingTryOnImageUrls = useAppSelector(
    (state) => state.general.bookingTryOnImageUrls,
  );

  const params = useLocalSearchParams<{
    subscription_id?: string;
    business_id?: string;
    item?: string;
    try_on_image_urls?: string;
    gallery_image_uris?: string;
    selected_subscription_service_ids?: string;
    reel_id?: string;
    saved_look_id?: string;
  }>();

  const attributionReelId = params.reel_id ? Number(params.reel_id) : null;
  const attributionSavedLookId = params.saved_look_id
    ? Number(params.saved_look_id)
    : null;

  // Prefer try-on URLs from route params (passed from bookingNow) so they're always in sync
  const tryOnImageUrls = useMemo(() => {
    const fromParams = parseStringArrayParam(params.try_on_image_urls).filter(
      isWebUrl,
    );
    if (fromParams.length > 0) return fromParams;
    return Array.isArray(bookingTryOnImageUrls) &&
      bookingTryOnImageUrls.length > 0
      ? bookingTryOnImageUrls.filter(isWebUrl)
      : [];
  }, [params.try_on_image_urls, bookingTryOnImageUrls]);

  const galleryImageUris = useMemo(
    () => parseStringArrayParam(params.gallery_image_uris),
    [params.gallery_image_uris],
  );

  const attachedImageUris = useMemo(
    () => [...tryOnImageUrls, ...galleryImageUris],
    [tryOnImageUrls, galleryImageUris],
  );

  const postCreateAppointment = useCallback(
    async (requestBody: Record<string, any>) => {
      const imageUrls = (tryOnImageUrls ?? []).filter(isWebUrl);
      const body: Record<string, any> = { ...requestBody };
      if (imageUrls.length > 0) {
        body.image_urls = imageUrls;
      } else {
        delete body.image_urls;
      }

      if (galleryImageUris.length > 0) {
        const preparedImages = await prepareImagesForUpload(
          galleryImageUris,
          "appointment_image",
        );
        if (preparedImages.length !== galleryImageUris.length) {
          showBanner(
            "Error",
            "Some photos could not be prepared. Please try again.",
            "error",
            3000,
          );
          return null;
        }
        return ApiService.post(
          appointmentsEndpoints.create,
          buildAppointmentFormData(body, preparedImages),
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      }

      return ApiService.post(appointmentsEndpoints.create, body);
    },
    [galleryImageUris, showBanner, tryOnImageUrls],
  );

  /** Pay-now: same booking body as create, but hits checkout (no appointment yet). */
  const postAppointmentCheckout = useCallback(
    async (requestBody: Record<string, any>) => {
      const imageUrls = (tryOnImageUrls ?? []).filter(isWebUrl);
      const body: Record<string, any> = { ...requestBody };
      if (imageUrls.length > 0) {
        body.image_urls = imageUrls;
      } else {
        delete body.image_urls;
      }

      if (galleryImageUris.length > 0) {
        const preparedImages = await prepareImagesForUpload(
          galleryImageUris,
          "appointment_image",
        );
        if (preparedImages.length !== galleryImageUris.length) {
          showBanner(
            "Error",
            "Some photos could not be prepared. Please try again.",
            "error",
            3000,
          );
          return null;
        }
        return startAppointmentCheckout(
          buildAppointmentFormData(body, preparedImages),
          { multipart: true },
        );
      }

      return startAppointmentCheckout(body);
    },
    [galleryImageUris, showBanner, tryOnImageUrls],
  );

  // Use Redux directly - no local state needed
  const selectedServices = reduxSelectedServices || [];
  const selectedStaffId = reduxSelectedStaff || "anyone";
  const assignedStaffId = reduxAssignedStaffId ?? null;
  const paymentMethod = reduxPaymentMethod || "payNow";
  const note = reduxNote || "";
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [policySheetVisible, setPolicySheetVisible] = useState(false);
  const [policyQuote, setPolicyQuote] =
    useState<CancellationPolicyQuote | null>(null);
  const [policyConfirming, setPolicyConfirming] = useState(false);

  const handleBackNavigation = useCallback(() => {
    router.back();
  }, [router]);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackNavigation();
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [handleBackNavigation]),
  );

  // Dummy staff member
  const dummyStaff: StaffMember = {
    id: 1,
    name: "Md Shariful Islam Khan",
    experience: 5,
    image: null,
    working_hours: null,
  };

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  );
  const staffImageUri = resolveStaffImageUri(
    selectedStaffId,
    selectedStaffMember,
  );
  // Tax rate (5% = 0.1)
  const taxRate = 0.0;
  const tax = totalPrice * taxRate;
  const estimatedTotal = totalPrice + tax;

  // Update selected staff member when staff ID or auto-assigned staff changes
  useEffect(() => {
    if (selectedStaffId === "anyone") {
      if (assignedStaffId != null) {
        const foundStaff = staffMembers.find((s) => s.id === assignedStaffId);
        setSelectedStaffMember(foundStaff ?? null);
      } else {
        setSelectedStaffMember(null);
      }
    } else {
      const foundStaff = staffMembers.find(
        (s) => s.id.toString() === selectedStaffId,
      );
      if (foundStaff) {
        setSelectedStaffMember(foundStaff);
      } else {
        setSelectedStaffMember(dummyStaff);
      }
    }
  }, [selectedStaffId, assignedStaffId, staffMembers]);

  const subscriptionIdRaw = resolveRouteParam(params.subscription_id);
  const subscriptionId = subscriptionIdRaw
    ? parseInt(subscriptionIdRaw, 10)
    : undefined;
  const subscriptionData: SubscriptionData | null = useMemo(() => {
    const itemRaw = resolveRouteParam(params.item);
    if (itemRaw) {
      try {
        return JSON.parse(itemRaw);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [params.item]);
  const resolvedCheckoutBusinessId = resolveBusinessIdParam(
    resolveRouteParam(params.business_id),
    businessId,
    subscriptionData?.businessId,
  );
  const isSubscriptionMode = Boolean(
    subscriptionId != null && subscriptionData,
  );
  const selectedSubscriptionServiceIds = useMemo(() => {
    const raw = resolveRouteParam(params.selected_subscription_service_ids);
    if (!raw || typeof raw !== "string") {
      return [] as number[];
    }
    try {
      const parsed = JSON.parse(raw) as number[];
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (id) => typeof id === "number" && !Number.isNaN(id),
        );
      }
    } catch (_) {
      return raw
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
    }
    return [];
  }, [params.selected_subscription_service_ids]);
  const selectedSubscriptionPlanServices = useMemo(() => {
    if (!subscriptionData?.subscriptionPlanServices) {
      return [] as SubscriptionPlanService[];
    }
    if (selectedSubscriptionServiceIds.length === 0) {
      return [] as SubscriptionPlanService[];
    }
    return subscriptionData.subscriptionPlanServices.filter((service) =>
      selectedSubscriptionServiceIds.includes(service.id),
    );
  }, [subscriptionData, selectedSubscriptionServiceIds]);

  const formatServiceDuration = useCallback(
    (hours: number, minutes: number): string => {
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return "";
    },
    [],
  );

  const completeSubscriptionBooking = async () => {
    if (!resolvedCheckoutBusinessId) {
      showBanner(
        "Booking Failed",
        "Business ID is missing. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }
    if (!reduxSelectedDate || !reduxSelectedTimeSlot) {
      showBanner(
        "Select time",
        "Please select a date and time slot.",
        "warning",
        4000,
      );
      return;
    }

    dispatch(setActionLoader(true));
    const resolvedStaffId = resolveAppointmentStaffId({
      selectedStaff: selectedStaffId,
      assignedStaffId,
    });

    if (
      selectedStaffId === "anyone" &&
      resolvedStaffId == null &&
      !isSoloPlan
    ) {
      dispatch(setActionLoader(false));
      showBanner(
        "Booking Failed",
        "Staff could not be assigned. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }

    const requestBody: {
      business_id: number;
      appointment_type: string;
      appointment_date: string;
      appointment_time: string;
      notes?: string;
      staff_id?: number;
      subscription_id?: number;
      service_ids: number[];
      image_urls?: string[];
      policy_accepted: boolean;
    } = {
      business_id: parseInt(resolvedCheckoutBusinessId, 10),
      appointment_type: "subscription",
      appointment_date: reduxSelectedDate || "",
      appointment_time: reduxSelectedTimeSlot || "",
      service_ids: selectedSubscriptionServiceIds,
      policy_accepted: true,
    };
    if (note && note.trim()) {
      requestBody.notes = note.trim();
    }
    if (resolvedStaffId != null) {
      requestBody.staff_id = resolvedStaffId;
    }
    if (subscriptionId != null) {
      requestBody.subscription_id = subscriptionId;
    }
    Logger.log("requestBody (subscription)", requestBody);
    try {
      const response = (await postCreateAppointment(requestBody)) as {
        success?: boolean;
        message?: string;
        data?: {
          success: boolean;
          message: string;
          data: { id: number; appointmentDate?: string; [key: string]: any };
        };
      } | null;
      if (!response) {
        dispatch(setActionLoader(false));
        return;
      }
      dispatch(setActionLoader(false));
      const isSuccess = response?.success || response?.data?.success;
      if (isSuccess) {
        const appointmentId =
          (response?.data as any)?.id ||
          (response?.data as any)?.data?.id ||
          null;
        const appointmentDate =
          (response?.data as any)?.appointmentDate ||
          (response?.data as any)?.data?.appointmentDate ||
          null;
        let dateFormatted = "";
        if (appointmentDate) {
          const dateParts = String(appointmentDate).split("/");
          if (dateParts.length === 3) {
            const [month, day, year] = dateParts;
            dateFormatted = `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
          }
        }
        const bookingId =
          appointmentId && dateFormatted
            ? `${dateFormatted}${appointmentId}`
            : `${Date.now()}${Math.floor(Math.random() * 10000)}`;
        showBanner("Success", "Your booking is confirmed.", "success", 3000);
        router.push({
          pathname: "/(main)/bookingDetail",
          params: {
            appointmentId: appointmentId ? String(appointmentId) : "",
            bookingId: bookingId,
            selectedStaff: selectedStaffId,
            selectedStaffMember: selectedStaffMember
              ? JSON.stringify(selectedStaffMember)
              : "",
            selectedDate: reduxSelectedDate || "",
            selectedTimeSlot: reduxSelectedTimeSlot || "",
            businessId: resolvedCheckoutBusinessId,
            business_id: resolvedCheckoutBusinessId,
            subscriptionId:
              subscriptionId != null ? String(subscriptionId) : "",
            note: note || "",
            fromCheckoutBooking: "true",
          },
        });
      } else {
        showBanner(
          "Booking Failed",
          response?.message ||
            "Failed to book appointment. Please try again.",
          "error",
          4000,
        );
      }
    } catch (error: any) {
      dispatch(setActionLoader(false));
      Logger.error("Appointment API Error:", error);
      showBanner(
        "Booking Failed",
        getAppointmentImageErrorMessage(error),
        "error",
        4000,
      );
    }
  };

  const handleBookNow = async () => {
    if (!resolvedCheckoutBusinessId) {
      showBanner(
        "Booking Failed",
        "Business ID is missing. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }
    if (isSubscriptionMode) {
      if (!reduxSelectedTimeSlot) {
        showBanner(
          "Time Slot Required",
          "Please select a time slot to proceed with booking.",
          "warning",
          4000,
        );
        return;
      }
      if (!subscriptionData) {
        showBanner(
          "Subscription Required",
          "Subscription data is missing. Please try again.",
          "error",
          4000,
        );
        return;
      }
      if (selectedSubscriptionServiceIds.length === 0) {
        showBanner(
          "No Service Selected",
          "Please select at least one plan service before confirming booking.",
          "warning",
          4000,
        );
        return;
      }
      if (isGuest) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }

      dispatch(setActionLoader(true));
      try {
        const quoteResponse = await ApiService.get<{
          success: boolean;
          message?: string;
          data: CancellationPolicyQuote;
        }>(
          appointmentsEndpoints.cancellationPolicyQuote({
            business_id: parseInt(resolvedCheckoutBusinessId, 10),
            appointment_date: reduxSelectedDate || "",
            appointment_time: reduxSelectedTimeSlot || "",
            appointment_type: "subscription",
          }),
        );

        if (!quoteResponse?.success || !quoteResponse.data) {
          showBanner(
            "Error",
            quoteResponse?.message ||
              "Could not load the cancellation policy. Please try again.",
            "error",
            4000,
          );
          return;
        }

        setPolicyQuote({
          ...quoteResponse.data,
          appointmentType:
            quoteResponse.data.appointmentType || "subscription",
        });
        setPolicySheetVisible(true);
      } catch (error: any) {
        Logger.error("Membership cancellation policy quote error:", error);
        showBanner(
          "Error",
          error?.response?.data?.message ||
            error?.message ||
            "Could not load the cancellation policy. Please try again.",
          "error",
          4000,
        );
      } finally {
        dispatch(setActionLoader(false));
      }
      return;
    }

    if (!reduxSelectedTimeSlot) {
      showBanner(
        "Time Slot Required",
        "Please select a time slot to proceed with booking.",
        "warning",
        4000,
      );
      return;
    }
    if (selectedServices.length === 0) {
      showBanner(
        "No Service Selected",
        "Please select at least one service to proceed with checkout.",
        "warning",
        4000,
      );
      return;
    }

    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }

    dispatch(setActionLoader(true));
    try {
      const quoteResponse = await ApiService.get<{
        success: boolean;
        message?: string;
        data: CancellationPolicyQuote;
      }>(
        appointmentsEndpoints.cancellationPolicyQuote({
          business_id: parseInt(resolvedCheckoutBusinessId, 10),
          appointment_date: reduxSelectedDate || "",
          appointment_time: reduxSelectedTimeSlot || "",
          service_ids: selectedServices.map((service) => service.id),
        }),
      );

      if (!quoteResponse?.success || !quoteResponse.data) {
        showBanner(
          "Error",
          quoteResponse?.message ||
            "Could not load the cancellation policy. Please try again.",
          "error",
          4000,
        );
        return;
      }

      setPolicyQuote(quoteResponse.data);
      setPolicySheetVisible(true);
    } catch (error: any) {
      Logger.error("Cancellation policy quote error:", error);
      showBanner(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Could not load the cancellation policy. Please try again.",
        "error",
        4000,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  const completeServiceBooking = async (setupIntentId?: string) => {
    if (!resolvedCheckoutBusinessId) {
      showBanner(
        "Booking Failed",
        "Business ID is missing. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }
    if (!reduxSelectedDate || !reduxSelectedTimeSlot) {
      showBanner(
        "Select time",
        "Please select a date and time slot.",
        "warning",
        4000,
      );
      return;
    }

    dispatch(setActionLoader(true));
    const resolvedStaffId = resolveAppointmentStaffId({
      selectedStaff: selectedStaffId,
      assignedStaffId,
    });

    if (
      selectedStaffId === "anyone" &&
      resolvedStaffId == null &&
      !isSoloPlan
    ) {
      dispatch(setActionLoader(false));
      showBanner(
        "Booking Failed",
        "Staff could not be assigned. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }

    const requestBody: {
      business_id: number;
      appointment_type: string;
      payment_method: string;
      service_ids: number[];
      appointment_date: string;
      appointment_time: string;
      notes?: string;
      staff_id?: number;
      subscription_id?: number;
      image_urls?: string[];
      policy_accepted: boolean;
      setup_intent_id?: string;
      reel_id?: number;
      saved_look_id?: number;
    } = {
      business_id: parseInt(resolvedCheckoutBusinessId, 10),
      appointment_type: "service",
      payment_method: paymentMethod === "payNow" ? "pay_now" : "pay_later",
      service_ids: selectedServices.map((service) => service.id),
      appointment_date: reduxSelectedDate || "",
      appointment_time: reduxSelectedTimeSlot || "",
      policy_accepted: true,
    };

    if (note && note.trim()) {
      requestBody.notes = note.trim();
    }

    if (resolvedStaffId != null) {
      requestBody.staff_id = resolvedStaffId;
    }

    if (setupIntentId) {
      requestBody.setup_intent_id = setupIntentId;
    }

    if (attributionReelId) {
      requestBody.reel_id = attributionReelId;
    }

    if (attributionSavedLookId) {
      requestBody.saved_look_id = attributionSavedLookId;
    }

    Logger.log("requestBody", requestBody);

    try {
      if (paymentMethod === "payNow") {
        const checkout = await postAppointmentCheckout(requestBody);
        dispatch(setActionLoader(false));

        if (!checkout) {
          return;
        }

        const {
          checkoutId,
          paymentIntent,
          setupIntent,
          customerSessionClientSecret,
          ephemeralKey,
          customer,
          connectedAccountId,
          serviceAmount,
          totalAmount,
        } = checkout;

        if (!checkoutId) {
          showBanner(
            "Payment Failed",
            "Checkout could not be started. Please try again.",
            "error",
            4000,
          );
          return;
        }

        const chargedService =
          typeof serviceAmount === "number" ? serviceAmount : totalPrice;
        const chargedTotal =
          typeof totalAmount === "number"
            ? totalAmount
            : chargedService + tax;

        try {
          await useStripeAccount(connectedAccountId);

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
            throw new Error(
              initError.message || "Failed to initialize payment",
            );
          }

          const { error: presentError } = await presentPaymentSheet();

          if (presentError) {
            // Sheet closed without paying — nothing was booked; user can retry Pay Now.
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

          setProcessingPayment(true);

          try {
            const checkoutStatus = await pollAppointmentCheckoutStatus(
              checkoutId,
            );

            if (checkoutStatus.status === "completed") {
              const appointmentId = checkoutStatus.appointmentId;
              const appointmentDate =
                checkoutStatus.appointment?.appointmentDate ||
                checkoutStatus.appointment?.appointment_date ||
                null;

              showBanner(
                "Success",
                "Payment successful! Your booking is confirmed.",
                "success",
                3000,
              );

              let dateFormatted = "";
              if (appointmentDate) {
                const dateParts = String(appointmentDate).split("/");
                if (dateParts.length === 3) {
                  const [month, day, year] = dateParts;
                  dateFormatted = `${year}${month.padStart(
                    2,
                    "0",
                  )}${day.padStart(2, "0")}`;
                }
              }
              const bookingId =
                appointmentId && dateFormatted
                  ? `${dateFormatted}${appointmentId}`
                  : `${Date.now()}${Math.floor(Math.random() * 10000)}`;

              router.push({
                pathname: "/(main)/bookingDetail",
                params: {
                  appointmentId: appointmentId
                    ? appointmentId.toString()
                    : "",
                  bookingId: bookingId,
                  selectedServices: JSON.stringify(selectedServices),
                  selectedStaff: selectedStaffId,
                  selectedStaffMember: selectedStaffMember
                    ? JSON.stringify(selectedStaffMember)
                    : "",
                  selectedDate: reduxSelectedDate || "",
                  selectedTimeSlot: reduxSelectedTimeSlot || "",
                  paymentMethod: paymentMethod,
                  totalPrice: chargedService.toFixed(2),
                  tax: tax.toFixed(2),
                  estimatedTotal: chargedTotal.toFixed(2),
                  businessId: resolvedCheckoutBusinessId,
                  business_id: resolvedCheckoutBusinessId,
                  note: note || "",
                },
              });
              return;
            }

            if (checkoutStatus.status === "failed") {
              // Backend message already covers reason + refund; show as-is.
              showBanner(
                "Booking not completed",
                checkoutStatus.message ||
                  "Your booking could not be completed. Please pick another time.",
                "error",
                6000,
              );
              router.back();
              return;
            }

            // Still pending after timeout — webhook will finish booking.
            showBanner(
              "Payment Received",
              "Your payment was received. Your booking will appear in your appointments shortly.",
              "success",
              5000,
            );
          } finally {
            setProcessingPayment(false);
          }
        } finally {
          await useStripeAccount(null);
        }
        return;
      }

      const response = (await postCreateAppointment(requestBody)) as {
        success?: boolean;
        message?: string;
        data?: {
          success: boolean;
          message: string;
          data: {
            id: number;
            [key: string]: any;
          };
        };
      } | null;

      if (!response) {
        dispatch(setActionLoader(false));
        return;
      }

      dispatch(setActionLoader(false));

      Logger.log(
        "Appointment API Response:",
        JSON.stringify(response, null, 2),
      );

      const isSuccess = response?.success || response?.data?.success;

      Logger.log("isSuccess:", isSuccess, "response:", response);

      if (isSuccess) {
        const appointmentId =
          (response?.data as any)?.id ||
          (response?.data as any)?.data?.id ||
          null;
        const appointmentDate =
          (response?.data as any)?.appointmentDate ||
          (response?.data as any)?.data?.appointmentDate ||
          null;

        if (paymentMethod === "payLater") {
          let dateFormatted = "";
          if (appointmentDate) {
            const dateParts = appointmentDate.split("/");
            if (dateParts.length === 3) {
              const [month, day, year] = dateParts;
              dateFormatted = `${year}${month.padStart(2, "0")}${day.padStart(
                2,
                "0",
              )}`;
            }
          }
          const bookingId =
            appointmentId && dateFormatted
              ? `${dateFormatted}${appointmentId}`
              : `${Date.now()}${Math.floor(Math.random() * 10000)}`;

          showBanner("Success", "Your booking is confirmed.", "success", 3000);

          router.push({
            pathname: "/(main)/bookingDetail",
            params: {
              appointmentId: appointmentId ? appointmentId.toString() : "",
              bookingId: bookingId,
              selectedServices: JSON.stringify(selectedServices),
              selectedStaff: selectedStaffId,
              selectedStaffMember: selectedStaffMember
                ? JSON.stringify(selectedStaffMember)
                : "",
              selectedDate: reduxSelectedDate || "",
              selectedTimeSlot: reduxSelectedTimeSlot || "",
              paymentMethod: paymentMethod,
              totalPrice: totalPrice.toFixed(2),
              tax: tax.toFixed(2),
              estimatedTotal: estimatedTotal.toFixed(2),
              businessId: resolvedCheckoutBusinessId,
              business_id: resolvedCheckoutBusinessId,
              note: note || "",
            },
          });
        }
      } else {
        showBanner(
          "Booking Failed",
          response?.message || "Failed to book appointment. Please try again.",
          "error",
          4000,
        );
      }
    } catch (error: any) {
      dispatch(setActionLoader(false));
      setProcessingPayment(false);

      Logger.error("Appointment API Error:", error);

      const apiMessage =
        error?.data?.message ||
        error?.response?.data?.message ||
        error?.message;

      showBanner(
        paymentMethod === "payNow" ? "Payment Failed" : "Booking Failed",
        paymentMethod === "payNow"
          ? apiMessage || "Failed to process payment"
          : getAppointmentImageErrorMessage(error),
        "error",
        4000,
      );
    }
  };

  const handlePolicyConfirm = async () => {
    if (policyConfirming) return;
    setPolicyConfirming(true);

    try {
      if (isSubscriptionMode) {
        setPolicySheetVisible(false);
        await completeSubscriptionBooking();
        return;
      }

      if (paymentMethod === "payLater") {
        dispatch(setActionLoader(true));
        let setupIntentId: string | undefined;
        try {
          const stripeHeaders = await getStripeModeHeaders();
          const setupResponse = await ApiService.post<{
            success: boolean;
            message?: string;
            data: CardSetupResponse;
          }>(
            appointmentsEndpoints.cardSetup,
            { business_id: parseInt(resolvedCheckoutBusinessId, 10) },
            { headers: stripeHeaders },
          );

          if (!setupResponse?.success || !setupResponse.data) {
            showBanner(
              "Error",
              setupResponse?.message ||
                "This business is not set up to accept online payments yet.",
              "error",
              4000,
            );
            return;
          }

          const {
            customer,
            setupIntent,
            setupIntentId: intentId,
            customerSessionClientSecret,
            ephemeralKey,
            connectedAccountId,
          } = setupResponse.data;

          setupIntentId = intentId;

          await useStripeAccount(connectedAccountId);
          try {
            const paymentConfig: any = {
              merchantDisplayName: "Fresh Pass",
              customerId: customer,
              setupIntentClientSecret: setupIntent,
              defaultBillingDetails: {
                name: user.name || undefined,
                email: user.email || undefined,
              },
            };

            if (customerSessionClientSecret) {
              paymentConfig.customerSessionClientSecret =
                customerSessionClientSecret;
            } else if (ephemeralKey) {
              paymentConfig.customerEphemeralKeySecret = ephemeralKey;
            }

            const { error: initError } = await initPaymentSheet(paymentConfig);
            if (initError) {
              throw new Error(
                initError.message || "Failed to initialize card setup",
              );
            }

            const { error: presentError } = await presentPaymentSheet();
            if (presentError) {
              if (!presentError.code?.includes("Canceled")) {
                showBanner(
                  "Card Setup Failed",
                  presentError.message || "Could not save your card.",
                  "error",
                  4000,
                );
              }
              return;
            }
          } finally {
            await useStripeAccount(null);
          }
        } catch (error: any) {
          Logger.error("Card setup error:", error);
          showBanner(
            "Error",
            error?.response?.data?.message ||
              error?.message ||
              "Could not save your card. Please try again.",
            "error",
            4000,
          );
          return;
        } finally {
          dispatch(setActionLoader(false));
        }

        setPolicySheetVisible(false);
        await completeServiceBooking(setupIntentId);
        return;
      }

      setPolicySheetVisible(false);
      await completeServiceBooking();
    } finally {
      setPolicyConfirming(false);
    }
  };

  // Typed as a number, but the API sends the staff's own text (e.g. "3 year exp").
  const staffExperience = selectedStaffMember?.experience as unknown;
  const staffName =
    selectedStaffId === "anyone" && assignedStaffId == null
      ? t("bkCheckoutAnyone")
      : (selectedStaffMember?.name ?? "—");
  const staffSub =
    selectedStaffId === "anyone"
      ? assignedStaffId != null
        ? t("bkCheckoutAutoAssigned")
        : t("bkFlowAnyoneSub")
      : staffExperience == null || String(staffExperience).trim() === ""
        ? null
        : typeof staffExperience === "number"
          ? t("bkCheckoutYearsExp", { count: staffExperience })
          : String(staffExperience);
  const isPayNow = paymentMethod === "payNow";

  const summaryRow = (
    key: string,
    icon: React.ReactNode,
    title: string,
    sub: string | null,
    first: boolean,
  ) => (
    <View key={key} style={[styles.ckRow, !first && styles.ckRowBorder]}>
      {icon}
      <View style={styles.ckRowText}>
        <Text style={styles.ckRowTitle} numberOfLines={2}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.ckRowSub} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const roundIcon = (name: React.ComponentProps<typeof MaterialIcons>["name"]) => (
    <View style={styles.ckIcon}>
      <MaterialIcons
        name={name}
        size={moderateWidthScale(22)}
        color={theme.darkGreen}
      />
    </View>
  );

  const summaryRows = [
    summaryRow(
      "when",
      roundIcon("event"),
      formatDateDisplay(reduxSelectedDate || ""),
      reduxSelectedTimeSlot
        ? formatSlotTo12h(reduxSelectedTimeSlot)
        : t("bkCheckoutTimeMissing"),
      true,
    ),
    ...(!isSoloPlan
      ? [
          summaryRow(
            "staff",
            <View style={styles.ckAvatarWrap}>
              {staffImageUri ? (
                <AppImage
                  uri={staffImageUri}
                  style={styles.ckAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.ckAvatar} />
              )}
            </View>,
            staffName,
            staffSub,
            false,
          ),
        ]
      : []),
    ...(!isSubscriptionMode
      ? [
          summaryRow(
            "payment",
            roundIcon(isPayNow ? "credit-card" : "storefront"),
            isPayNow ? t("bkFlowPayNow") : t("bkFlowPayLater"),
            isPayNow ? t("bkFlowPayNowSub") : t("bkFlowPayLaterSub"),
            false,
          ),
        ]
      : []),
  ];

  const renderPlanCard = () => {
    if (!subscriptionData) return null;
    const pill = getCustomerSubscriptionPill(subscriptionData);
    const dateDisplay = getCustomerSubscriptionDateDisplay(subscriptionData);
    const scheduleDate = formatCustomerScheduleDate(
      dateDisplay.kind,
      dateDisplay.date,
    );
    const displayPrice = getCustomerSubscriptionDisplayPrice(subscriptionData);
    return (
      <FlowCard style={styles.ckCard}>
        <View style={styles.ckPlanHeader}>
          <View style={styles.ckPlanTitleRow}>
            <Feather
              name="star"
              size={moderateWidthScale(18)}
              color={theme.selectCard}
            />
            <Text style={styles.ckPlanTitle} numberOfLines={2}>
              {subscriptionData.subscriptionPlan}
            </Text>
          </View>
          <View style={styles.ckPill}>
            <Text style={styles.ckPillText}>{pill.label.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.ckPlanMeta}>
          <Text style={styles.ckRowSub} numberOfLines={1}>
            {subscriptionData.business}
          </Text>
          <Text style={styles.ckPlanPrice}>
            ${displayPrice}
            <Text style={styles.ckRowSub}>{t("bkFlowPerMonth")}</Text>
          </Text>
        </View>
        {subscriptionData.paymentDate || scheduleDate ? (
          <View style={styles.ckPlanDates}>
            {subscriptionData.paymentDate ? (
              <View style={styles.ckPlanDate}>
                <Text style={styles.ckLineLabel}>{t("bkFlowPlanPayment")}</Text>
                <Text style={styles.ckPlanDateValue}>
                  {subscriptionData.paymentDate}
                </Text>
              </View>
            ) : null}
            {scheduleDate ? (
              <View style={styles.ckPlanDate}>
                <Text style={styles.ckLineLabel}>
                  {getCustomerScheduleDateLabel(dateDisplay.kind)}
                </Text>
                <Text style={styles.ckPlanDateValue}>{scheduleDate}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {selectedSubscriptionPlanServices &&
        selectedSubscriptionPlanServices.length > 0 ? (
          <View style={styles.ckLines}>
            <SectionLabel label={t("bkFlowPlanServicesLabel")} />
            {selectedSubscriptionPlanServices.map((svc) => {
              const duration =
                svc.durationHours > 0 || svc.durationMinutes > 0
                  ? formatServiceDuration(svc.durationHours, svc.durationMinutes)
                  : null;
              return (
                <View key={svc.id} style={styles.ckLine}>
                  <View style={styles.ckRowText}>
                    <Text style={styles.ckLineName}>
                      {svc.name} × {svc.quantity ?? 1}
                    </Text>
                    {duration ? (
                      <Text style={styles.ckRowSub}>{duration}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.ckLinePrice}>${svc.price}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </FlowCard>
    );
  };

  return (
    <View style={styles.ckRoot}>
      <StatusBar barStyle="light-content" />
      <FlowHeader title={t("bkCheckoutTitle")} onBack={handleBackNavigation} />

      <ScrollView
        style={styles.ckFlex}
        contentContainerStyle={styles.ckContent}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle
          title={t("bkCheckoutReviewTitle")}
          subtitle={t("bkCheckoutReviewSub")}
        />

        <FlowCard style={styles.ckSummary}>{summaryRows}</FlowCard>

        {!isSubscriptionMode ? (
          <FlowCard style={styles.ckCard}>
            <SectionLabel
              label={t("bkCheckoutServices")}
              meta={String(selectedServices.length)}
            />
            <View style={styles.ckLines}>
              {selectedServices.map((service) => (
                <View key={service.id} style={styles.ckLine}>
                  <View style={styles.ckRowText}>
                    <Text style={styles.ckLineName} numberOfLines={2}>
                      {service.name}
                    </Text>
                    {service.duration && service.duration !== "N/A" ? (
                      <Text style={styles.ckRowSub}>{service.duration}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.ckLinePrice}>
                    ${service.price.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.ckDivider} />
            <View style={styles.ckLine}>
              <Text style={styles.ckLineLabel}>{t("bkCheckoutSubtotal")}</Text>
              <Text style={styles.ckLineValue}>
                ${totalPrice.toFixed(2)} USD
              </Text>
            </View>
            <View style={styles.ckLine}>
              <Text style={styles.ckLineLabel}>{t("bkCheckoutTax")}</Text>
              <Text style={styles.ckLineValue}>${tax.toFixed(2)} USD</Text>
            </View>
          </FlowCard>
        ) : (
          renderPlanCard()
        )}

        {attachedImageUris.length > 0 ? (
          <View style={styles.ckSection}>
            <SectionLabel label={t("bkFlowPhotos")} />
            <View style={styles.ckPhotos}>
              {attachedImageUris.map((uri, index) => (
                <AppImage
                  key={`${uri}-${index}`}
                  uri={uri}
                  style={styles.ckPhoto}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        ) : null}

        {note.trim() ? (
          <View style={styles.ckSection}>
            <SectionLabel label={t("bkFlowNote")} />
            <FlowCard style={styles.ckNote}>
              <MaterialIcons
                name="format-quote"
                size={moderateWidthScale(22)}
                color={theme.selectCard}
              />
              <Text style={styles.ckNoteText} numberOfLines={8}>
                {note.trim()}
              </Text>
            </FlowCard>
          </View>
        ) : null}
      </ScrollView>

      {!isSubscriptionMode ? (
        <View style={styles.ckTotalBar}>
          <Text style={styles.ckTotalLabel}>{t("bkCheckoutTotal")}</Text>
          <Text style={styles.ckTotalValue}>
            ${estimatedTotal.toFixed(2)} USD
          </Text>
        </View>
      ) : null}
      <FlowFooter
        primary={{
          label: t("confirmBooking"),
          icon: "event-available",
          onPress: handleBookNow,
          disabled: processingPayment,
        }}
      />

      {processingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.processingText}>Processing payment...</Text>
          </View>
        </View>
      )}

      <CancellationPolicySheet
        visible={policySheetVisible}
        onClose={() => {
          if (!policyConfirming) {
            setPolicySheetVisible(false);
          }
        }}
        onConfirm={handlePolicyConfirm}
        quote={policyQuote}
        isPayLater={!isSubscriptionMode && paymentMethod === "payLater"}
        confirming={policyConfirming}
      />
    </View>
  );
}

export default function Checkout() {
  return <CheckoutContent />;
}
