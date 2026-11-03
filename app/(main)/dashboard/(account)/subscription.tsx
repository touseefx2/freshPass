import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Linking,
  Pressable,
  ActivityIndicator,
  AppState,
  Platform,
  TouchableOpacity,
  type AppStateStatus,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { isSoloSubscription } from "@/src/state/slices/userSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Button from "@/src/components/button";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { LinearGradient } from "expo-linear-gradient";
import BusinessPlansModal from "@/src/components/businessPlansModal";
import CancelSubscriptionConfirmModal from "@/src/components/cancelSubscriptionConfirmModal";
import RemovePromotionConfirmModal from "@/src/components/removePromotionConfirmModal";
import { showAppleManageSubscriptions } from "@/src/services/iapService";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  canRepurchaseCancelledSubscription,
  getSubscriptionDateDisplay,
  isStripeCancelled,
  isSubscriptionTrialing,
  pickAccessibleSubscription,
} from "@/src/utils/subscriptionLifecycle";

dayjs.extend(customParseFormat);

interface AdditionalService {
  id: number;
  name: string;
  price: string;
  ai_requests?: number | null;
  type: string | null;
  active: boolean;
}

interface SubscriptionData {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlan: string;
  subscriptionPlanPrice: string;
  additionalServicesTotal?: number;
  totalPrice?: number;
  additionalServices?: AdditionalService[];
  subscriptionPlanType: string;
  subscriptionPlanDescription: string;
  userId: number;
  user: string;
  businessId: number;
  business: string;
  subscriber: string;
  visits: any;
  status: string;
  stripeStatus: string;
  hasAccess?: boolean;
  hasEnded?: boolean;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  endsAt: string | null;
  paymentDate: string | null;
  nextPaymentDate: string | null;
  remainingDays: number | null;
  stripePaymentIntentId: string;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  paymentProvider: string | null;
  appStoreProductId?: string | null;
  /** Still in FreshPass Deals (stays true until promotionEndsAt) */
  hasFeaturedAddOn?: boolean;
  /** Promotion removal pending: Deals ends on this date */
  promotionEndsAt?: string | null;
  /** Next renewal amount after any pending change; null = won't renew */
  renewalPrice?: string | null;
  /** Apple can bill in local currency (e.g. PKR); Stripe is USD */
  renewalCurrency?: string | null;
  /** Apple only: plan the subscription switches to at renewal */
  pendingPlanName?: string | null;
  /** On Solo with staff: staff paused, not deleted */
  teamPaused?: boolean;
  pausedStaffCount?: number;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
  hasTrialAvailable?: boolean;
}

type SubscriptionActionResponse = {
  success: boolean;
  message?: string;
  data?: SubscriptionData;
};

/** Delay before re-reading after Apple's sheet: the server hears from Apple a few seconds later */
const APPLE_SYNC_REFETCH_MS = 5000;

/** "60.00" + "USD" → "$60.00"; "16900.00" + "PKR" → "PKR 16,900.00" */
const formatMoney = (
  amount: string | null | undefined,
  currency: string | null | undefined,
): string | null => {
  const value = Number(amount);
  if (amount == null || amount === "" || !Number.isFinite(value)) return null;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(value);
  } catch {
    return `${code} ${amount}`;
  }
};

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
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: moderateHeightScale(30),
    },
    headerCard: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      marginBottom: moderateHeightScale(12),
    },
    headerGradient: {
      padding: moderateWidthScale(24),
      paddingTop: moderateHeightScale(28),
      paddingBottom: moderateHeightScale(28),
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(16),
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      opacity: 0.95,
    },
    statusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
      letterSpacing: 0.5,
    },
    planName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(8),
      textTransform: "capitalize",
    },
    planPriceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: moderateHeightScale(4),
    },
    currencySymbol: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginRight: moderateWidthScale(4),
      opacity: 0.9,
    },
    planPrice: {
      fontSize: fontSize.size30,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
    },
    pricePeriod: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      opacity: 0.85,
      marginLeft: moderateWidthScale(4),
    },
    planDescription: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      opacity: 0.9,
      lineHeight: fontSize.size20,
      marginTop: moderateHeightScale(8),
    },
    infoSection: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(20),
    },
    sectionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    infoCard: {
      paddingVertical: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    infoRow: {
      flexDirection: "column",
      alignItems: "center",
      flex: 1,
    },
    infoRowLast: {
      marginBottom: 0,
    },
    infoIconContainer: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    infoIcon: {
      // Icon styling handled by Feather component
    },
    infoContent: {
      alignItems: "center",
    },
    infoLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      textAlign: "center",
    },
    infoValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    divider: {
      width: 1,
      height: moderateHeightScale(60),
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(12),
    },
    daysRemainingCard: {
      borderRadius: moderateWidthScale(16),
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(20),
      overflow: "hidden",
    },
    cardGradient: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(12),
      justifyContent: "space-between",
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(20),
    },
    cardChip: {
      width: moderateWidthScale(50),
      height: moderateHeightScale(40),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
      opacity: 0.3,
    },
    cardNetwork: {
      width: moderateWidthScale(50),
      height: moderateWidthScale(30),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.white,
      opacity: 0.2,
    },
    cardMiddle: {
      flex: 1,
      justifyContent: "center",
    },
    cardNumberContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    cardNumberText: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: moderateWidthScale(2),
    },
    daysRemainingLeft: {
      flex: 1,
    },
    daysRemainingLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.8,
      marginBottom: moderateHeightScale(4),
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    daysRemainingValue: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontExtraBold,
      color: theme.buttonBack,
    },
    daysRemainingIcon: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: theme.lightBeige,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    cardLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.8,
      marginBottom: moderateHeightScale(4),
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    cardValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: moderateWidthScale(1),
    },
    buttonContainer: {
      marginHorizontal: moderateWidthScale(20),
      marginVertical: moderateHeightScale(32),
    },
    actionsSection: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(28),
    },
    actionHintText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size18,
      marginBottom: moderateHeightScale(12),
    },
    actionHintTextAfterPrimary: {
      marginTop: moderateHeightScale(16),
    },
    secondaryAction: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(14),
      minHeight: moderateHeightScale(44),
      marginTop: moderateHeightScale(4),
    },
    secondaryActionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    cancelActionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      textAlign: "center",
    },
    outlinedButton: {
      height: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderMedium,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen05,
    },
    outlinedButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cancelOutlinedButton: {
      height: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightRedBorder,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightRed,
    },
    cancelOutlinedButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "flex-start",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(8),
      gap: moderateHeightScale(20),
    },
    emptyIntroCard: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(20),
      borderLeftWidth: 4,
      borderLeftColor: theme.buttonBack,
    },
    emptyIntroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      marginBottom: moderateHeightScale(14),
    },
    emptyIntroTextWrap: {
      flex: 1,
    },
    emptyIconWrap: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyEyebrow: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    emptyTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptySubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    emptyBenefitsCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(6),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    emptyBenefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
    },
    emptyBenefitIconWrap: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(1),
    },
    emptyBenefitCopy: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    emptyBenefitTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptyBenefitText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    emptyBenefitDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
    },
    emptyFooterHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(10),
      lineHeight: fontSize.size16,
    },
    emptySubtext: {
      fontSize: fontSize.size14,
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
    trialBanner: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    trialBannerGradient: {
      padding: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    trialBannerLeft: {
      flex: 1,
      marginRight: moderateWidthScale(12),
    },
    trialBannerTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(4),
    },
    trialBannerSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      opacity: 0.9,
    },
    trialBannerIcon: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(24),
      backgroundColor: theme.white,
      opacity: 0.2,
      alignItems: "center",
      justifyContent: "center",
    },
    paymentProviderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(16),
      paddingTop: moderateHeightScale(16),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    paymentProviderContent: {
      flex: 1,
      marginLeft: moderateWidthScale(12),
    },
    paymentProviderLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    paymentProviderValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    applePaymentBanner: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(20),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    applePaymentBannerGradient: {
      padding: moderateWidthScale(20),
      flexDirection: "row",
      alignItems: "center",
    },
    applePaymentBannerContent: {
      flex: 1,
      marginLeft: moderateWidthScale(14),
    },
    applePaymentBannerLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      opacity: 0.85,
      marginBottom: moderateHeightScale(4),
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    applePaymentBannerValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    applePaymentBannerIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.white,
      opacity: 0.2,
      alignItems: "center",
      justifyContent: "center",
    },
    addOnDivider: {
      height: 1,
      backgroundColor: theme.white15,
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(16),
    },
    addOnSectionTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white80,
      marginBottom: moderateHeightScale(12),
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    addOnRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    addOnName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      flex: 1,
      marginRight: moderateWidthScale(12),
    },
    addOnPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    addOnNote: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white80,
      marginBottom: moderateHeightScale(8),
    },
    manageSection: {
      marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(20),
    },
    manageCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    manageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(16),
    },
    manageRowIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
    },
    manageRowCopy: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    manageRowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    manageRowText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    manageDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
    },
  });

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { t } = useTranslation();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [businessPlansModalVisible, setBusinessPlansModalVisible] =
    useState(false);
  const [businessPlansModalBusinessOnly, setBusinessPlansModalBusinessOnly] =
    useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [removePromotionVisible, setRemovePromotionVisible] = useState(false);
  const [managing, setManaging] = useState(false);

  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const isSoloPlanActive = isSoloSubscription(businessStatus);

  const isCancelled = isStripeCancelled(subscription?.stripeStatus);
  const isTrialing = subscription
    ? isSubscriptionTrialing(subscription)
    : false;
  // Route by who bills the plan, not by the device (client 11-03)
  const isApplePayment =
    subscription?.paymentProvider?.toLowerCase() === "apple";
  const isIosDevice = Platform.OS === "ios";
  const isRenewing =
    !!subscription && !isCancelled && !subscription.hasEnded;
  const canCancel = isRenewing && !isApplePayment;
  // Apple's subscription pages only open on an Apple device
  const showAppleCancelHelp = isRenewing && isApplePayment && isIosDevice;
  const showBuyNewPlan =
    !!subscription && canRepurchaseCancelledSubscription(subscription);
  const showUpgradePlan =
    !!subscription && isSoloPlanActive && !isCancelled && !subscription.hasEnded;
  const hasPrimaryPlanAction = showUpgradePlan || showBuyNewPlan;

  const openBusinessPlansModal = useCallback((businessOnly = false) => {
    setBusinessPlansModalBusinessOnly(businessOnly);
    setBusinessPlansModalVisible(true);
  }, []);

  const closeBusinessPlansModal = useCallback(() => {
    setBusinessPlansModalVisible(false);
    setBusinessPlansModalBusinessOnly(false);
  }, []);
  const dateDisplay = subscription
    ? getSubscriptionDateDisplay(subscription)
    : null;

  const fetchSeqRef = useRef(0);
  const refetchingAfterPurchaseRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const appleSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const fetchSubscription = useCallback(
    async (options?: { retries?: number }) => {
      const retries = options?.retries ?? 0;
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      setError(null);
      setApiError(false);
      try {
        // `status=active` can still include ended rows until the daily close job
        // runs. Entitlement is decided by hasAccess, not the stored status.
        for (let attempt = 0; attempt <= retries; attempt++) {
          const response = await ApiService.get<SubscriptionResponse>(
            businessEndpoints.subscriptions("active", "business"),
          );

          if (seq !== fetchSeqRef.current) return;

          const rows = Array.isArray(response.data?.data)
            ? response.data.data
            : [];
          const accessible = pickAccessibleSubscription(rows);

          if (response.success && accessible) {
            setSubscription(accessible);
            setError(null);
            setApiError(false);
            return;
          }

          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            if (seq !== fetchSeqRef.current) return;
          }
        }

        setSubscription(null);
        setError(null);
        setApiError(false);
      } catch (err: any) {
        if (seq !== fetchSeqRef.current) return;
        setError(err.message || t("failedToLoadSubscription"));
        setApiError(true);
        showBanner(
          t("error"),
          err.message || t("failedToLoadSubscription"),
          "error",
          2500,
        );
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [showBanner, t],
  );

  const handlePlanPurchaseSuccess = useCallback(() => {
    refetchingAfterPurchaseRef.current = true;
    void fetchSubscription({ retries: 3 }).finally(() => {
      refetchingAfterPurchaseRef.current = false;
    });
  }, [fetchSubscription]);

  useFocusEffect(
    useCallback(() => {
      if (!refetchingAfterPurchaseRef.current) {
        fetchSubscription();
      }

      const onAppStateChange = (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active" &&
          !refetchingAfterPurchaseRef.current
        ) {
          fetchSubscription();
        }
        appStateRef.current = nextState;
      };

      const appStateSub = AppState.addEventListener("change", onAppStateChange);
      return () => {
        appStateSub.remove();
        if (appleSyncTimerRef.current) {
          clearTimeout(appleSyncTimerRef.current);
          appleSyncTimerRef.current = null;
        }
      };
    }, [fetchSubscription]),
  );

  /**
   * Remove / keep the promotion and change the card. Shows the server message;
   * on a refusal (already removed, billed by Apple...) re-reads so the screen
   * matches the server.
   */
  const runSubscriptionAction = async (
    request: () => Promise<SubscriptionActionResponse>,
    fallbackSuccess: string,
  ) => {
    if (managing) return;
    setManaging(true);
    dispatch(setActionLoader(true));
    try {
      const response = await request();
      if (response.success) {
        if (response.data) setSubscription(response.data);
        showBanner(
          t("success"),
          response.message || fallbackSuccess,
          "success",
          3000,
        );
      } else {
        showBanner(
          t("error"),
          response.message || t("failedToUpdateSubscription"),
          "error",
          3000,
        );
      }
    } catch (err: any) {
      showBanner(
        t("error"),
        err?.message || t("failedToUpdateSubscription"),
        "error",
        3000,
      );
    } finally {
      setManaging(false);
      dispatch(setActionLoader(false));
      await fetchSubscription();
    }
  };

  const handleConfirmRemovePromotion = () => {
    setRemovePromotionVisible(false);
    void runSubscriptionAction(
      () =>
        ApiService.post<SubscriptionActionResponse>(
          businessEndpoints.removePromotionAddOn,
          {},
        ),
      t("promotionRemovedFallback"),
    );
  };

  const handleKeepPromotion = () => {
    void runSubscriptionAction(
      () =>
        ApiService.post<SubscriptionActionResponse>(
          businessEndpoints.keepPromotionAddOn,
          {},
        ),
      t("promotionKeptFallback"),
    );
  };

  /** Stripe card-update page; a fresh link every tap (they expire). */
  const handleChangeCard = async () => {
    if (!subscription || managing) return;
    setManaging(true);
    dispatch(setActionLoader(true));
    try {
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
        data?: { url?: string };
      }>(businessEndpoints.subscriptionBillingPortal(subscription.id), {});
      const url = response.data?.url;
      if (!response.success || !url) {
        throw new Error(response.message || t("failedToOpenBillingPortal"));
      }
      // Real browser (not a WebView). The return link lands back here and the
      // foreground refetch picks up the new card.
      await Linking.openURL(url);
    } catch (err: any) {
      showBanner(
        t("error"),
        err?.message || t("failedToOpenBillingPortal"),
        "error",
        3000,
      );
      if (err?.data?.data?.error_code === "billed_by_apple") {
        void fetchSubscription();
      }
    } finally {
      setManaging(false);
      dispatch(setActionLoader(false));
    }
  };

  /**
   * Apple-billed on iPhone: the owner picks the plan in Apple's own sheet
   * (no backend call). Re-read now and again shortly after, once Apple has
   * told the server.
   */
  const handleOpenAppleSheet = async () => {
    if (managing) return;
    setManaging(true);
    try {
      await showAppleManageSubscriptions();
    } catch {
      await handleOpenAppStoreSubscriptions();
    } finally {
      setManaging(false);
      void fetchSubscription();
      if (appleSyncTimerRef.current) clearTimeout(appleSyncTimerRef.current);
      appleSyncTimerRef.current = setTimeout(() => {
        appleSyncTimerRef.current = null;
        void fetchSubscription();
      }, APPLE_SYNC_REFETCH_MS);
    }
  };

  const cancelCurrentSubscription = async () => {
    if (!subscription) return;

    setCancelling(true);
    dispatch(setActionLoader(true));
    try {
      const response = await ApiService.patch<{
        success: boolean;
        message: string;
      }>(businessEndpoints.cancelSubscription(subscription.id), {});

      if (response.success) {
        showBanner(
          t("success"),
          response.message ||
            (isTrialing
              ? t("trialCancelledSuccessfully")
              : t("subscriptionCancelledSuccessfully")),
          "success",
          2500,
        );
        await fetchSubscription();
      } else {
        showBanner(
          t("error"),
          response.message ||
            (isTrialing
              ? t("failedToCancelTrial")
              : t("failedToCancelSubscription")),
          "error",
          2500,
        );
      }
    } catch (err: any) {
      showBanner(
        t("error"),
        err.message ||
          (isTrialing
            ? t("failedToCancelTrial")
            : t("failedToCancelSubscription")),
        "error",
        2500,
      );
    } finally {
      setCancelling(false);
      dispatch(setActionLoader(false));
    }
  };

  const handleOpenAppStoreSubscriptions = async () => {
    const url = "https://apps.apple.com/account/subscriptions";
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showBanner(
          t("error"),
          t("failedToOpenAppStoreSubscriptions"),
          "error",
          2500,
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      showBanner(
        t("error"),
        t("failedToOpenAppStoreSubscriptions"),
        "error",
        2500,
      );
    }
  };

  const handleCancel = () => {
    if (!subscription || cancelling) return;
    setCancelConfirmVisible(true);
  };

  const handleCloseCancelConfirm = () => {
    if (cancelling) return;
    setCancelConfirmVisible(false);
  };

  const handleConfirmCancel = () => {
    setCancelConfirmVisible(false);
    void cancelCurrentSubscription();
  };

  const formatCardNumber = (lastFour: string | null) => {
    if (!lastFour) {
      return "**** **** **** ----";
    }
    return `**** **** **** ${lastFour}`;
  };

  const capitalizeFirstLetter = (text: string | null) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const getPaymentProviderLabel = (provider: string | null | undefined) => {
    if (!provider) return t("notAvailable");
    const normalized = provider.toLowerCase();
    if (normalized === "apple") return t("appleInAppPurchase");
    if (normalized === "stripe") return t("cardPayment");
    return capitalizeFirstLetter(provider);
  };

  /** Parse API dates: "MM/DD/YYYY" or ISO. Hermes rejects bare MM/DD/YYYY via `new Date()`. */
  const parseSubscriptionDate = (dateString: string) => {
    const slashFormat = dayjs(dateString, "MM/DD/YYYY", true);
    if (slashFormat.isValid()) return slashFormat.startOf("day");

    const iso = dayjs(dateString);
    if (iso.isValid()) return iso.startOf("day");

    return null;
  };

  const formatTrialEndDate = (dateString: string | null) => {
    if (!dateString) return "";
    const parsed = parseSubscriptionDate(dateString);
    if (!parsed) return dateString;
    return parsed.format("MMMM D, YYYY");
  };

  /** Days left until next payment / trial end — calculated on device, not from API. */
  const calculateRemainingDays = (
    targetDate: string | null | undefined,
  ): number | null => {
    if (!targetDate) return null;
    const next = parseSubscriptionDate(targetDate);
    if (!next) return null;

    const days = next.diff(dayjs().startOf("day"), "day");
    return Math.max(0, days);
  };

  const remainingDays = useMemo(() => {
    if (!subscription || !dateDisplay) return null;
    return calculateRemainingDays(dateDisplay.date);
  }, [subscription, dateDisplay]);

  const dateLabel = useMemo(() => {
    if (!dateDisplay) return t("nextPaymentDate");
    switch (dateDisplay.kind) {
      case "trialEnds":
        return t("trialEnds");
      case "accessUntil":
        return t("accessUntil");
      case "endedOn":
        return t("endedOn");
      default:
        return t("nextPaymentDate");
    }
  }, [dateDisplay, t]);

  const getDisplayStatus = (status: string | null | undefined) => {
    if (!status) return "";
    if (status.trim().toLowerCase() === "trialing") return t("active");
    return capitalizeFirstLetter(status);
  };

  const statusBadgeLabel = useMemo(() => {
    if (!subscription) return "";
    if (isTrialing) return t("active").toUpperCase();
    if (isCancelled) return t("cancelled").toUpperCase();
    return getDisplayStatus(subscription.status).toUpperCase();
  }, [subscription, isTrialing, isCancelled, t]);

  const formattedScheduleDate = dateDisplay?.date
    ? formatTrialEndDate(dateDisplay.date)
    : t("notAvailable");

  const activeAddOns = useMemo(
    () =>
      (subscription?.additionalServices ?? []).filter(
        (service) => service.active !== false,
      ),
    [subscription?.additionalServices],
  );

  const hasPromotion =
    subscription?.hasFeaturedAddOn ?? activeAddOns.length > 0;
  const promotionPending = !!subscription?.promotionEndsAt;
  // "2026-11-28T19:00:00-05:00": keep the server's calendar day so it matches
  // nextPaymentDate (converting to the phone's zone can show the 29th)
  const promotionEndDate = formatTrialEndDate(
    subscription?.promotionEndsAt?.match(/^\d{4}-\d{2}-\d{2}(?=T)/)?.[0] ??
      subscription?.promotionEndsAt ??
      null,
  );
  const renewalPriceText = formatMoney(
    subscription?.renewalPrice,
    subscription?.renewalCurrency,
  );

  /** "Promotion removed" / "Plan change scheduled" banner lines */
  const pendingChangeLines = (() => {
    if (!subscription || !isRenewing) return [];
    const lines: string[] = [];
    const planName = subscription.pendingPlanName;
    if (promotionPending) {
      lines.push(
        renewalPriceText && !planName
          ? t("promotionEndsMessage", {
              date: promotionEndDate,
              price: renewalPriceText,
            })
          : t("promotionEndsOn", { date: promotionEndDate }),
      );
    }
    if (planName) {
      const changeDate = formatTrialEndDate(subscription.nextPaymentDate);
      lines.push(
        renewalPriceText
          ? t("planChangeMessage", {
              plan: planName,
              date: changeDate,
              price: renewalPriceText,
            })
          : t("planChangeMessageNoPrice", { plan: planName, date: changeDate }),
      );
    }
    return lines;
  })();

  /** Manage plan rows — what each one shows depends on who bills the plan */
  const manageRows = (() => {
    type ManageRow = {
      key: string;
      icon: React.ComponentProps<typeof Feather>["name"];
      title?: string;
      text: string;
      onPress?: () => void;
    };
    if (!subscription || !isRenewing) return [] as ManageRow[];
    const rows: ManageRow[] = [];

    if (isApplePayment && !isIosDevice) {
      rows.push({
        key: "apple-android",
        icon: "smartphone",
        text: t("billedThroughAppleManageOnIphone"),
      });
      return rows;
    }

    if (isApplePayment) {
      if (promotionPending) {
        rows.push({
          key: "keep",
          icon: "tag",
          title: t("keepPromotionAddOn"),
          text: t("appleKeepPromotionDesc"),
          onPress: () => void handleOpenAppleSheet(),
        });
      } else if (hasPromotion) {
        rows.push({
          key: "remove",
          icon: "tag",
          title: t("removePromotionAddOn"),
          text: t("appleRemovePromotionDesc"),
          onPress: () => void handleOpenAppleSheet(),
        });
      }
      rows.push({
        key: "card",
        icon: "credit-card",
        title: t("paymentManagedByApple"),
        text: t("paymentManagedByAppleSteps"),
      });
      return rows;
    }

    if (promotionPending) {
      rows.push({
        key: "keep",
        icon: "tag",
        title: t("keepPromotionAddOn"),
        text: t("keepPromotionAddOnDesc"),
        onPress: handleKeepPromotion,
      });
    } else if (hasPromotion) {
      rows.push({
        key: "remove",
        icon: "tag",
        title: t("removePromotionAddOn"),
        text: t("removePromotionAddOnDesc"),
        onPress: () => setRemovePromotionVisible(true),
      });
    }
    rows.push({
      key: "card",
      icon: "credit-card",
      title: t("changePaymentMethod"),
      text: t("changePaymentMethodDesc"),
      onPress: () => void handleChangeCard(),
    });
    return rows;
  })();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("subscription")} />
      {loading && !subscription ? (
        <View style={styles.content}>
          <Skeleton screenType="Subscription" styles={styles} />
        </View>
      ) : apiError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={fetchSubscription} loading={loading} />
        </View>
      ) : !subscription ? (
        <>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIntroCard}>
              <View style={styles.emptyIntroTop}>
                <View style={styles.emptyIconWrap}>
                  <Feather
                    name="briefcase"
                    size={iconScale(22)}
                    color={theme.buttonBack}
                  />
                </View>
                <View style={styles.emptyIntroTextWrap}>
                  <Text style={styles.emptyEyebrow}>{t("subscription")}</Text>
                  <Text style={styles.emptyTitle}>
                    {t("noActiveSubscriptionFound")}
                  </Text>
                </View>
              </View>
              <Text style={styles.emptySubtitle}>
                {t("noActiveSubscriptionSubtitle")}
              </Text>
            </View>

            <View style={styles.emptyBenefitsCard}>
              {(
                [
                  {
                    icon: "globe" as const,
                    title: t("noActiveSubscriptionBenefit1"),
                    text: t("noActiveSubscriptionBenefit1Desc"),
                  },
                  {
                    icon: "calendar" as const,
                    title: t("noActiveSubscriptionBenefit2"),
                    text: t("noActiveSubscriptionBenefit2Desc"),
                  },
                  {
                    icon: "zap" as const,
                    title: t("noActiveSubscriptionBenefit3"),
                    text: t("noActiveSubscriptionBenefit3Desc"),
                  },
                ] as const
              ).map((item, index, list) => (
                <React.Fragment key={item.icon}>
                  <View style={styles.emptyBenefitRow}>
                    <View style={styles.emptyBenefitIconWrap}>
                      <Feather
                        name={item.icon}
                        size={iconScale(15)}
                        color={theme.buttonBack}
                      />
                    </View>
                    <View style={styles.emptyBenefitCopy}>
                      <Text style={styles.emptyBenefitTitle}>{item.title}</Text>
                      <Text style={styles.emptyBenefitText}>{item.text}</Text>
                    </View>
                  </View>
                  {index < list.length - 1 ? (
                    <View style={styles.emptyBenefitDivider} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title={t("chooseAPlan")}
              onPress={() => openBusinessPlansModal(false)}
            />
            <Text style={styles.emptyFooterHint}>
              {t("noActiveSubscriptionFooterHint")}
            </Text>
          </View>
        </>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {isTrialing && (
            <View style={styles.trialBanner}>
              <LinearGradient
                colors={[theme.darkGreenLight, theme.darkGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trialBannerGradient}
              >
                <View style={styles.trialBannerLeft}>
                  <Text style={styles.trialBannerTitle}>
                    {t("freeTrialActive")}
                  </Text>
                  <Text style={styles.trialBannerSubtitle}>
                    {t("yourTrialEndsOn")}{" "}
                    {formatTrialEndDate(subscription.trialEndsAt)}
                  </Text>
                </View>
                <View style={styles.trialBannerIcon}>
                  <Feather
                    name="gift"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {isCancelled && (
            <View style={styles.trialBanner}>
              <LinearGradient
                colors={[theme.darkGreenLight, theme.darkGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trialBannerGradient}
              >
                <View style={styles.trialBannerLeft}>
                  <Text style={styles.trialBannerTitle}>
                    {t("subscriptionCancelled")}
                  </Text>
                  <Text style={styles.trialBannerSubtitle}>
                    {t("cancelledKeepsAccess", {
                      date: formatTrialEndDate(subscription.endsAt),
                    })}
                  </Text>
                </View>
                <View style={styles.trialBannerIcon}>
                  <Feather
                    name="clock"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {pendingChangeLines.length > 0 && (
            <View style={styles.trialBanner}>
              <LinearGradient
                colors={[theme.darkGreenLight, theme.darkGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trialBannerGradient}
              >
                <View style={styles.trialBannerLeft}>
                  <Text style={styles.trialBannerTitle}>
                    {subscription.pendingPlanName
                      ? t("planChangeScheduledTitle")
                      : t("promotionRemovedTitle")}
                  </Text>
                  {pendingChangeLines.map((line) => (
                    <Text key={line} style={styles.trialBannerSubtitle}>
                      {line}
                    </Text>
                  ))}
                </View>
                <View style={styles.trialBannerIcon}>
                  <Feather
                    name="calendar"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {subscription.teamPaused && (
            <View style={styles.trialBanner}>
              <LinearGradient
                colors={[theme.darkGreenLight, theme.darkGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trialBannerGradient}
              >
                <View style={styles.trialBannerLeft}>
                  <Text style={styles.trialBannerTitle}>
                    {t("teamPausedTitle")}
                  </Text>
                  <Text style={styles.trialBannerSubtitle}>
                    {t("teamPausedOwnerMessage", {
                      count: subscription.pausedStaffCount ?? 0,
                    })}
                  </Text>
                </View>
                <View style={styles.trialBannerIcon}>
                  <Feather
                    name="users"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Header Card with Gradient */}
          <View style={styles.headerCard}>
            <LinearGradient
              colors={[theme.darkGreen, theme.darkGreenLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>
                    {subscription.subscriptionPlan}
                  </Text>
                  <View style={styles.planPriceContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <Text style={styles.planPrice}>
                      {subscription.subscriptionPlanPrice}
                    </Text>
                    <Text style={styles.pricePeriod}>{t("perMonth")}</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{statusBadgeLabel}</Text>
                </View>
              </View>
              {subscription.subscriptionPlanDescription && (
                <Text style={styles.planDescription}>
                  {capitalizeFirstLetter(
                    subscription.subscriptionPlanDescription,
                  )}
                </Text>
              )}
              {activeAddOns.length > 0 && (
                <>
                  <View style={styles.addOnDivider} />
                  <Text style={styles.addOnSectionTitle}>
                    {t("addOnServices")}
                  </Text>
                  {activeAddOns.map((service) => (
                    <View key={service.id} style={styles.addOnRow}>
                      <Text style={styles.addOnName}>{service.name}</Text>
                      <Text style={styles.addOnPrice}>
                        $ {service.price} {t("perMonth")}
                      </Text>
                    </View>
                  ))}
                  {promotionPending && isRenewing && (
                    <Text style={styles.addOnNote}>
                      {t("promotionEndsShort", { date: promotionEndDate })}
                    </Text>
                  )}
                </>
              )}
            </LinearGradient>
          </View>

          {/* Apple Payment Provider Banner */}
          {isApplePayment && (
            <View style={styles.applePaymentBanner}>
              <LinearGradient
                colors={[theme.darkGreenLight, theme.darkGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applePaymentBannerGradient}
              >
                <View style={styles.applePaymentBannerIcon}>
                  <Feather
                    name="smartphone"
                    size={moderateWidthScale(22)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.applePaymentBannerContent}>
                  <Text style={styles.applePaymentBannerLabel}>
                    {t("paymentProvider")}
                  </Text>
                  <Text style={styles.applePaymentBannerValue}>
                    {getPaymentProviderLabel(subscription.paymentProvider)}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Card Last 4 Digits — hidden for Apple In-App Purchase */}
          {!isApplePayment && (
            <View style={styles.daysRemainingCard}>
              <LinearGradient
                colors={[theme.darkGreenLight, theme.darkGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardMiddle}>
                  <Text style={styles.cardLabel}>{t("cardLast4Digits")}</Text>
                  <View style={styles.cardNumberContainer}>
                    <Text style={styles.cardNumberText}>
                      {formatCardNumber(subscription.cardLastFour)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Subscription Details */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>{t("subscriptionDetails")}</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather
                    name="calendar"
                    size={moderateWidthScale(20)}
                    color={theme.darkGreenLight}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t("daysRemaining")}</Text>
                  <Text style={styles.infoValue}>
                    {remainingDays ?? t("notAvailable")}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather
                    name="clock"
                    size={moderateWidthScale(20)}
                    color={theme.darkGreenLight}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {isTrialing ? t("trialStarted") : t("subscriptionStarted")}
                  </Text>
                  <Text style={styles.infoValue}>
                    {formatTrialEndDate(
                      (isTrialing
                        ? subscription.trialStartsAt
                        : subscription.createdAt) || subscription.createdAt,
                    ) || t("notAvailable")}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather
                    name="calendar"
                    size={moderateWidthScale(20)}
                    color={theme.darkGreenLight}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{dateLabel}</Text>
                  <Text style={styles.infoValue}>{formattedScheduleDate}</Text>
                </View>
              </View>
            </View>
            <View style={styles.paymentProviderRow}>
              <View style={styles.infoIconContainer}>
                <Feather
                  name="check-circle"
                  size={moderateWidthScale(20)}
                  color={theme.darkGreenLight}
                />
              </View>
              <View style={styles.paymentProviderContent}>
                <Text style={styles.paymentProviderLabel}>
                  {isTrialing ? t("trialStatus") : t("subscriptionStatus")}
                </Text>
                <Text style={styles.paymentProviderValue}>
                  {getDisplayStatus(subscription.stripeStatus) ||
                    t("notAvailable")}
                </Text>
              </View>
            </View>
            {!isApplePayment && (
              <View style={styles.paymentProviderRow}>
                <View style={styles.infoIconContainer}>
                  <Feather
                    name="credit-card"
                    size={moderateWidthScale(20)}
                    color={theme.darkGreenLight}
                  />
                </View>
                <View style={styles.paymentProviderContent}>
                  <Text style={styles.paymentProviderLabel}>
                    {t("paymentProvider")}
                  </Text>
                  <Text style={styles.paymentProviderValue}>
                    {getPaymentProviderLabel(subscription.paymentProvider)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {manageRows.length > 0 && (
            <View style={styles.manageSection}>
              <Text style={styles.sectionTitle}>{t("managePlan")}</Text>
              <View style={styles.manageCard}>
                {manageRows.map((row, index) => {
                  const content = (
                    <>
                      <View style={styles.manageRowIcon}>
                        <Feather
                          name={row.icon}
                          size={moderateWidthScale(18)}
                          color={theme.darkGreenLight}
                        />
                      </View>
                      <View style={styles.manageRowCopy}>
                        {row.title ? (
                          <Text style={styles.manageRowTitle}>{row.title}</Text>
                        ) : null}
                        <Text style={styles.manageRowText}>{row.text}</Text>
                      </View>
                      {row.onPress ? (
                        <Feather
                          name="chevron-right"
                          size={moderateWidthScale(18)}
                          color={theme.lightGreen}
                        />
                      ) : null}
                    </>
                  );
                  return (
                    <React.Fragment key={row.key}>
                      {index > 0 ? <View style={styles.manageDivider} /> : null}
                      {row.onPress ? (
                        <TouchableOpacity
                          style={styles.manageRow}
                          onPress={row.onPress}
                          disabled={managing}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                        >
                          {content}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.manageRow}>{content}</View>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {(hasPrimaryPlanAction || canCancel || showAppleCancelHelp) && (
            <View style={styles.actionsSection}>
              {showUpgradePlan && (
                <>
                  <Text style={styles.actionHintText}>
                    {t("upgradePlanHint")}
                  </Text>
                  <Button
                    title={t("upgradePlan")}
                    onPress={() => openBusinessPlansModal(true)}
                  />
                </>
              )}

              {showBuyNewPlan && (
                <>
                  <Text style={styles.actionHintText}>
                    {t("buyNewPlanHint", {
                      date: formatTrialEndDate(
                        subscription.endsAt ||
                          subscription.trialEndsAt ||
                          subscription.nextPaymentDate,
                      ),
                    })}
                  </Text>
                  <Button
                    title={t("buyNewPlan")}
                    onPress={() => openBusinessPlansModal(false)}
                  />
                </>
              )}

              {canCancel && (
                <Pressable
                  onPress={handleCancel}
                  disabled={cancelling}
                  style={
                    hasPrimaryPlanAction
                      ? styles.secondaryAction
                      : styles.cancelOutlinedButton
                  }
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color={theme.red} />
                  ) : (
                    <Text
                      style={
                        hasPrimaryPlanAction
                          ? styles.cancelActionText
                          : styles.cancelOutlinedButtonText
                      }
                    >
                      {isTrialing
                        ? t("cancelTrial")
                        : t("cancelSubscription")}
                    </Text>
                  )}
                </Pressable>
              )}

              {showAppleCancelHelp && (
                <>
                  <Text
                    style={[
                      styles.actionHintText,
                      hasPrimaryPlanAction && styles.actionHintTextAfterPrimary,
                    ]}
                  >
                    {isTrialing
                      ? t("appleCancelTrialHint", {
                          date: formatTrialEndDate(subscription.trialEndsAt),
                        })
                      : t("appleCancelSubscriptionHint", {
                          date: formatTrialEndDate(
                            subscription.nextPaymentDate ||
                              subscription.endsAt,
                          ),
                        })}
                  </Text>
                  <Pressable
                    onPress={handleOpenAppStoreSubscriptions}
                    style={
                      hasPrimaryPlanAction
                        ? styles.secondaryAction
                        : styles.outlinedButton
                    }
                  >
                    <Text
                      style={
                        hasPrimaryPlanAction
                          ? styles.secondaryActionText
                          : styles.outlinedButtonText
                      }
                    >
                      {t("manageInAppStore")}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}
      <BusinessPlansModal
        visible={businessPlansModalVisible}
        onClose={closeBusinessPlansModal}
        onSuccess={handlePlanPurchaseSuccess}
        businessOnly={businessPlansModalBusinessOnly}
      />
      <CancelSubscriptionConfirmModal
        visible={cancelConfirmVisible}
        isTrialing={isTrialing}
        endDate={formatTrialEndDate(
          isTrialing
            ? subscription?.trialEndsAt ?? null
            : subscription?.nextPaymentDate ||
                subscription?.endsAt ||
                null,
        )}
        onClose={handleCloseCancelConfirm}
        onConfirm={handleConfirmCancel}
      />
      <RemovePromotionConfirmModal
        visible={removePromotionVisible}
        endDate={formatTrialEndDate(subscription?.nextPaymentDate ?? null)}
        basePrice={
          formatMoney(subscription?.subscriptionPlanPrice, "USD") ??
          `$${subscription?.subscriptionPlanPrice ?? ""}`
        }
        onClose={() => setRemovePromotionVisible(false)}
        onConfirm={handleConfirmRemovePromotion}
      />
    </SafeAreaView>
  );
}
