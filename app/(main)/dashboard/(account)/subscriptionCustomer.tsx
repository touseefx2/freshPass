import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  AppState,
  type AppStateStatus,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";

// Details open top-down, each section a beat after the last.
const detailEnter = (index: number) =>
  FadeInDown.duration(320)
    .delay(index * 70)
    .reduceMotion(ReduceMotion.System);
const detailExit = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);
const cardLayout = LinearTransition.duration(280).reduceMotion(
  ReduceMotion.System,
);
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useFocusEffect, useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import RetryButton from "@/src/components/retryButton";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { Dropdown } from "react-native-element-dropdown";
import { useTranslation } from "react-i18next";
import {
  canBookCustomerSubscription,
  canCancelCustomerSubscription,
  formatCustomerServiceDuration,
  formatCustomerSubscriptionDate,
  getCustomerSubscriptionDateDisplay,
  getCustomerSubscriptionDisplayPrice,
  getCustomerSubscriptionPill,
  matchesCustomerCancelledFilter,
  type CustomerSubscriptionPillTone,
} from "@/src/utils/customerSubscriptionLifecycle";

interface SubscriptionPlanService {
  id: number;
  name: string;
  price: string;
  description: string | null;
  durationHours: number;
  durationMinutes: number;
  quantity?: number;
}

interface AdditionalService {
  id: number;
  name: string;
  price: string;
  ai_requests?: number;
  type: string | null;
  active: boolean;
}

interface SubscriptionVisits {
  remaining: number;
  total: number;
  bookable?: number;
}

interface SubscriptionData {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlan: string;
  subscriptionPlanPrice: string;
  additionalServicesTotal?: number;
  totalPrice?: number;
  additionalServices?: AdditionalService[];
  subscriptionPlanServices?: SubscriptionPlanService[];
  subscriptionPlanType: string;
  subscriptionPlanDescription: string;
  userId: number;
  user: string;
  businessId: number | null;
  business_id?: number | null;
  business: string;
  subscriber: string;
  status: string;
  stripeStatus: string;
  hasAccess?: boolean;
  hasEnded?: boolean;
  endsAt: string | null;
  paymentDate: string | null;
  nextPaymentDate: string | null;
  remainingDays: number | null;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
  visits?: SubscriptionVisits | SubscriptionVisits[] | null;
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingBottom: moderateHeightScale(30),
    },
    // ── Membership card: dark "pass" header, light body
    card: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    pass: {
      borderTopLeftRadius: moderateWidthScale(19),
      borderTopRightRadius: moderateWidthScale(19),
      paddingHorizontal: moderateWidthScale(18),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(16),
      gap: moderateHeightScale(12),
      overflow: "hidden",
    },
    passCollapsed: {
      borderBottomLeftRadius: moderateWidthScale(19),
      borderBottomRightRadius: moderateWidthScale(19),
    },
    passWatermark: {
      position: "absolute",
      right: -moderateWidthScale(18),
      bottom: -moderateHeightScale(26),
      opacity: 0.07,
    },
    passTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    passBrand: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    passBadge: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    passEyebrow: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    passTitleWrap: { gap: moderateHeightScale(4) },
    passTitle: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    passBusinessRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    passBusiness: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white15,
    },
    statusDot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
    },
    statusLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    passRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.white50,
      opacity: 0.5,
    },
    passBottom: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    passBottomText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    passPriceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(4),
    },
    passPrice: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    passPer: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    passSummary: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    toggleBtn: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(16),
    },
    description: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    visitsHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    sectionLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    visitsCount: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    visitsTotal: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    track: {
      height: moderateHeightScale(8),
      borderRadius: moderateHeightScale(4),
      backgroundColor: theme.lightGreen07,
      overflow: "hidden",
    },
    trackFill: {
      height: "100%",
      borderRadius: moderateHeightScale(4),
      backgroundColor: theme.buttonBack,
    },
    dateTiles: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    dateTile: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen05,
    },
    dateIcon: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(17),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    dateText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    dateLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    dateValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    services: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginTop: moderateHeightScale(8),
    },
    serviceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
    },
    serviceRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    serviceUsedUp: { opacity: 0.5 },
    serviceText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    serviceName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    serviceMeta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    qtyChip: {
      minWidth: moderateWidthScale(40),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.mintTint,
      alignItems: "center",
    },
    qtyChipEmpty: { backgroundColor: theme.lightGreen07 },
    qtyText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
      fontVariant: ["tabular-nums"],
    },
    qtyTextEmpty: { color: theme.lightGreen },
    actions: { gap: moderateHeightScale(10) },
    helper: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size18,
    },
    helperWarning: { color: theme.orangeBrownText },
    cancelLink: {
      minHeight: moderateHeightScale(44),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
      paddingTop: moderateHeightScale(12),
    },
    cancelLinkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    cancelledBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.upcomingCard,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
    },
    cancelledTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      marginBottom: moderateHeightScale(2),
    },
    cancelledSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
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
  });

export default function subscriptionCustomer() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { t } = useTranslation();

  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isFirstFocusRef = useRef(true);
  // Cards start collapsed: the pass header only, details on tap.
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Dot colour on the dark pass header; the label carries the meaning too.
  const getStatusDotColor = useCallback(
    (tone: CustomerSubscriptionPillTone) => {
      switch (tone) {
        case "success":
          return theme.green;
        case "warning":
          return theme.orangeBrown;
        case "danger":
          return theme.link;
        default:
          return theme.white70;
      }
    },
    [theme],
  );

  const resolveVisits = useCallback(
    (item: SubscriptionData): SubscriptionVisits | null => {
      if (!item.visits) return null;
      if (Array.isArray(item.visits)) {
        return item.visits.length > 0 ? item.visits[0] : null;
      }
      if (
        typeof item.visits.remaining === "number" &&
        typeof item.visits.total === "number"
      ) {
        return item.visits;
      }
      return null;
    },
    [],
  );

  const fetchSubscriptions = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      status?: string,
      options?: { silent?: boolean },
    ) => {
      const filterStatus = status !== undefined ? status : statusFilter;
      const silent = options?.silent === true;
      if (append) {
        setLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
      }
      setError(null);
      setApiError(false);

      try {
        // Cancelled rows often still have local status=active until period end.
        // Fetch unscoped by status, then client-filter (guide §4).
        const statusParam =
          filterStatus === "all" || filterStatus === "cancelled"
            ? undefined
            : filterStatus;
        const baseUrl = businessEndpoints.subscriptions(statusParam, "user");
        const separator = baseUrl.includes("?") ? "&" : "?";
        // Cancelled is client-filtered; pull a larger page so results aren't empty.
        const perPage = filterStatus === "cancelled" ? 100 : 10;
        const response = await ApiService.get<SubscriptionResponse>(
          `${baseUrl}${separator}page=${page}&per_page=${perPage}`,
        );

        if (response.success && response.data?.data) {
          let rows = response.data.data;
          if (filterStatus === "cancelled") {
            rows = rows.filter(matchesCustomerCancelledFilter);
          }

          if (append) {
            setSubscriptions((prev) => [...prev, ...rows]);
          } else {
            setSubscriptions(rows);
          }
          setCurrentPage(response.data.meta.current_page);
          setTotalPages(response.data.meta.last_page);
        } else {
          if (!append) {
            setError(t("cmNoMemberships"));
            setApiError(true);
          }
        }
      } catch (err: any) {
        setError(err.message || t("cmLoadFailed"));
        setApiError(true);
        if (!append) {
          showBanner(
            t("error"),
            err.message || t("cmLoadFailed"),
            "error",
            2500,
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [showBanner, statusFilter, t],
  );

  useEffect(() => {
    fetchSubscriptions(1, false);
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      // Skip the first focus — statusFilter effect already loads the list.
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      fetchSubscriptions(1, false, undefined, { silent: true });
    }, [fetchSubscriptions]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          fetchSubscriptions(1, false, undefined, { silent: true });
        }
        appStateRef.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [fetchSubscriptions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    setTotalPages(1);
    fetchSubscriptions(1, false, undefined, { silent: true });
  }, [fetchSubscriptions]);

  const handleStatusFilterChange = useCallback((status: string) => {
    setSubscriptions([]);
    setCurrentPage(1);
    setTotalPages(1);
    setStatusFilter(status);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && currentPage < totalPages) {
      fetchSubscriptions(currentPage + 1, true);
    }
  }, [loadingMore, currentPage, totalPages, fetchSubscriptions]);

  const handleBookAppointment = (subscription: SubscriptionData) => {
    const businessId = resolveBusinessIdParam(
      subscription.businessId,
      subscription.business_id,
    );
    if (!businessId) {
      showBanner(
        t("error"),
        "Business ID is missing for this membership. Please try again later.",
        "error",
        4000,
      );
      return;
    }
    router.push({
      pathname: "/(main)/bookingNow",
      params: {
        business_id: businessId,
        subscription_id: subscription.id.toString(),
        item: JSON.stringify(subscription),
      },
    });
  };

  const handleCancelSubscription = useCallback(
    (subscription: SubscriptionData) => {
      setSelectedSubscription(subscription);
      setCancelModalVisible(true);
    },
    [],
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
        showBanner(t("success"), t("cmCancelled"), "success", 2500);
        setCancelModalVisible(false);
        setSelectedSubscription(null);
        setConfirmChecked(false);
        setSubscriptions([]);
        setCurrentPage(1);
        setTotalPages(1);
        await fetchSubscriptions(1, false);
      } else {
        showBanner(
          t("error"),
          response.message || t("cmCancelFailed"),
          "error",
          2500,
        );
      }
    } catch (err: any) {
      showBanner(t("error"), err.message || t("cmCancelFailed"), "error", 2500);
    } finally {
      setIsCancelling(false);
    }
  }, [
    selectedSubscription,
    confirmChecked,
    isCancelling,
    showBanner,
    fetchSubscriptions,
    t,
  ]);

  const getScheduleDateLabel = useCallback(
    (kind: ReturnType<typeof getCustomerSubscriptionDateDisplay>["kind"]) => {
      switch (kind) {
        case "accessUntil":
          return "Access until";
        case "endedOn":
          return "Ended on";
        case "trialEnds":
          return "Trial ends";
        default:
          return "Renewal";
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: SubscriptionData }) => {
      const pill = getCustomerSubscriptionPill(item);
      const displayPrice = getCustomerSubscriptionDisplayPrice(item);
      const dateDisplay = getCustomerSubscriptionDateDisplay(item);
      const canBook = canBookCustomerSubscription(item);
      const canCancel = canCancelCustomerSubscription(item);
      const showCancelledBanner = pill.label === "Cancelled" && canBook;
      const visits = resolveVisits(item);
      const visitsLeft = visits ? (visits.bookable ?? visits.remaining) : null;
      const hasBookableService =
        visitsLeft != null
          ? visitsLeft > 0
          : (item.subscriptionPlanServices?.some(
              (svc) => (svc.quantity ?? 1) > 0,
            ) ?? false);
      const scheduleDate =
        dateDisplay.date != null
          ? dateDisplay.kind === "nextPayment"
            ? dateDisplay.date
            : formatCustomerSubscriptionDate(dateDisplay.date)
          : null;
      const visitsPercent =
        visits && visits.total > 0
          ? Math.min(100, Math.max(0, ((visitsLeft ?? 0) / visits.total) * 100))
          : 0;
      // The API often repeats the plan name as its description.
      const description = item.subscriptionPlanDescription?.trim();
      const showDescription =
        !!description &&
        description.toLowerCase() !==
          item.subscriptionPlan?.trim().toLowerCase();
      const services = item.subscriptionPlanServices ?? [];
      const expanded = expandedIds.has(item.id);
      const summary = [
        visits ? `${visitsLeft} of ${visits.total} visits left` : null,
        scheduleDate
          ? `${getScheduleDateLabel(dateDisplay.kind)} ${scheduleDate}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const dateTile = (
        icon: React.ComponentProps<typeof Feather>["name"],
        label: string,
        value: string,
      ) => (
        <View
          style={styles.dateTile}
          accessible
          accessibilityLabel={`${label}, ${value}`}
        >
          <View style={styles.dateIcon}>
            <Feather
              name={icon}
              size={moderateWidthScale(16)}
              color={theme.buttonBack}
            />
          </View>
          <View style={styles.dateText}>
            <Text style={styles.dateLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.dateValue} numberOfLines={1}>
              {value}
            </Text>
          </View>
        </View>
      );

      return (
        <Animated.View style={styles.card} layout={cardLayout}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => toggleExpanded(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.subscriptionPlan}, ${pill.label}, ${item.business}`}
            accessibilityHint={
              expanded ? "Hides membership details" : "Shows membership details"
            }
            accessibilityState={{ expanded }}
          >
            <LinearGradient
              colors={[
                theme.darkGreenDeep,
                theme.darkGreen,
                theme.darkGreenLight,
              ]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.pass, !expanded && styles.passCollapsed]}
            >
              <MaterialCommunityIcons
                name="crown"
                size={moderateWidthScale(150)}
                color={theme.white}
                style={styles.passWatermark}
                pointerEvents="none"
              />
              <View style={styles.passTop}>
                <View style={styles.passBrand}>
                  <View style={styles.passBadge}>
                    <MaterialCommunityIcons
                      name="crown"
                      size={moderateWidthScale(16)}
                      color={theme.orangeBrown}
                    />
                  </View>
                  <Text style={styles.passEyebrow}>Membership</Text>
                </View>
                <View style={styles.statusPill}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusDotColor(pill.tone) },
                    ]}
                  />
                  <Text style={styles.statusLabel}>{pill.label}</Text>
                </View>
              </View>

              <View style={styles.passTitleWrap}>
                <Text style={styles.passTitle} numberOfLines={2}>
                  {item.subscriptionPlan}
                </Text>
                <View style={styles.passBusinessRow}>
                  <Feather
                    name="map-pin"
                    size={moderateWidthScale(14)}
                    color={theme.white70}
                  />
                  <Text style={styles.passBusiness} numberOfLines={1}>
                    {item.business}
                  </Text>
                </View>
              </View>

              <View style={styles.passRule} />

              <View style={styles.passBottom}>
                <View style={styles.passBottomText}>
                  <View style={styles.passPriceRow}>
                    <Text style={styles.passPrice}>${displayPrice}</Text>
                    <Text style={styles.passPer}>/ month</Text>
                  </View>
                  {summary ? (
                    <Text style={styles.passSummary} numberOfLines={1}>
                      {summary}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.toggleBtn}>
                  <Feather
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={moderateWidthScale(22)}
                    color={theme.white}
                  />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {expanded ? (
            <Animated.View style={styles.body} exiting={detailExit}>
              {showDescription ? (
                <Animated.View entering={detailEnter(0)}>
                  <Text style={styles.description}>{description}</Text>
                </Animated.View>
              ) : null}

              {visits ? (
                <Animated.View entering={detailEnter(1)}>
                  <View
                    accessible
                    accessibilityLabel={`Visits left: ${visitsLeft} of ${visits.total}`}
                  >
                    <View style={styles.visitsHead}>
                      <Text style={styles.sectionLabel}>Visits left</Text>
                      <Text style={styles.visitsCount}>
                        {visitsLeft}
                        <Text style={styles.visitsTotal}>
                          {" "}
                          / {visits.total}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.trackFill,
                          { width: `${visitsPercent}%` },
                        ]}
                      />
                    </View>
                  </View>
                </Animated.View>
              ) : null}

              {item.paymentDate || scheduleDate ? (
                <Animated.View entering={detailEnter(2)}>
                  <View style={styles.dateTiles}>
                    {item.paymentDate
                      ? dateTile(
                          "credit-card",
                          "Last payment",
                          item.paymentDate,
                        )
                      : null}
                    {scheduleDate
                      ? dateTile(
                          "calendar",
                          getScheduleDateLabel(dateDisplay.kind),
                          scheduleDate,
                        )
                      : null}
                  </View>
                </Animated.View>
              ) : null}

              {services.length > 0 ? (
                <Animated.View entering={detailEnter(3)}>
                  <View>
                    <Text style={styles.sectionLabel}>Included services</Text>
                    <View style={styles.services}>
                      {services.map((svc, index) => {
                        const qty = svc.quantity ?? 1;
                        const duration =
                          svc.durationHours > 0 || svc.durationMinutes > 0
                            ? formatCustomerServiceDuration(
                                svc.durationHours,
                                svc.durationMinutes,
                              )
                            : null;
                        const meta = [
                          duration,
                          `$${svc.price}`,
                          svc.description,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <View
                            key={svc.id}
                            style={[
                              styles.serviceRow,
                              index > 0 && styles.serviceRowBorder,
                            ]}
                          >
                            <View
                              style={[
                                styles.serviceText,
                                qty <= 0 && styles.serviceUsedUp,
                              ]}
                            >
                              <Text
                                style={styles.serviceName}
                                numberOfLines={2}
                              >
                                {svc.name}
                              </Text>
                              <Text
                                style={styles.serviceMeta}
                                numberOfLines={2}
                              >
                                {meta}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.qtyChip,
                                qty <= 0 && styles.qtyChipEmpty,
                              ]}
                              accessible
                              accessibilityLabel={`${qty} left`}
                            >
                              <Text
                                style={[
                                  styles.qtyText,
                                  qty <= 0 && styles.qtyTextEmpty,
                                ]}
                              >
                                ×{qty}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              ) : null}

              {showCancelledBanner ? (
                <Animated.View entering={detailEnter(4)}>
                  <View style={styles.cancelledBanner}>
                    <Feather
                      name="info"
                      size={moderateWidthScale(20)}
                      color={theme.selectCard}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cancelledTitle}>
                        Membership Cancelled
                      </Text>
                      <Text style={styles.cancelledSub}>
                        You can still use this membership until{" "}
                        <Text style={{ fontFamily: fonts.fontBold }}>
                          {formatCustomerSubscriptionDate(item.endsAt)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ) : null}

              {canBook ? (
                <Animated.View entering={detailEnter(5)}>
                  <View style={styles.actions}>
                    <FlowButton
                      label="Book Appointment"
                      icon="event"
                      onPress={() => handleBookAppointment(item)}
                      disabled={!hasBookableService}
                    />
                    {!hasBookableService ? (
                      <Text style={[styles.helper, styles.helperWarning]}>
                        {canCancel
                          ? "All services for this billing period have been used. Booking will unlock again after your next auto-charge when counts reset."
                          : "All services for this billing period have been used. No more bookings are available on this membership."}
                      </Text>
                    ) : canCancel ? (
                      <Text style={styles.helper}>
                        Visits reset after each monthly payment.
                      </Text>
                    ) : null}
                  </View>
                </Animated.View>
              ) : null}

              {!showCancelledBanner && canCancel ? (
                <Animated.View entering={detailEnter(6)}>
                  <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={() => handleCancelSubscription(item)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                  >
                    <Feather
                      name="x-circle"
                      size={moderateWidthScale(16)}
                      color={theme.red}
                    />
                    <Text style={styles.cancelLinkText}>Cancel Membership</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}
        </Animated.View>
      );
    },
    [
      styles,
      theme,
      handleCancelSubscription,
      handleBookAppointment,
      getStatusDotColor,
      getScheduleDateLabel,
      expandedIds,
      toggleExpanded,
      resolveVisits,
    ],
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
    [statusFilter, styles],
  );

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerRow}>
        <View style={styles.headerDescriptionRow}>
          <Text style={styles.headerDescription}>
            Manage your active memberships and billing information here.
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
      all: "No memberships",
      active: "No active memberships",
      pending: "No pending memberships",
      paused: "No paused memberships",
      expired: "No expired memberships",
      cancelled: "No cancelled memberships",
    };
    return filterLabels[filter] || "No memberships";
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
          Manage your active memberships and billing information here.
        </Text>
      </View>
    );
  }, [loading, styles, theme, statusFilter, getEmptyText]);

  if (apiError && !loading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        <StackHeader title={t("memberships")} />
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
      <StackHeader title={t("memberships")} />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.buttonBack}
            colors={[theme.buttonBack]}
          />
        }
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
              <Text style={styles.modalTitle}>Cancel Membership</Text>
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
                  You can join again at any time.
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
                I understand that my membership will be cancelled.
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
