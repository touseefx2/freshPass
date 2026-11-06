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
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { LinearGradient } from "expo-linear-gradient";
import BusinessPlansModal from "@/src/components/businessPlansModal";
import CancelSubscriptionConfirmModal from "@/src/components/cancelSubscriptionConfirmModal";
import RemovePromotionConfirmModal from "@/src/components/removePromotionConfirmModal";
import { showAppleManageSubscriptions } from "@/src/services/iapService";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { formatCardLabel } from "@/src/utils/cardLabel";
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
  /** "visa", "mastercard"... (pending backend; label falls back to "Card ending") */
  cardBrand?: string | null;
  paymentProvider: string | null;
  appStoreProductId?: string | null;
  /** Still in FreshPass Deals (stays true until promotionEndsAt) */
  hasFeaturedAddOn?: boolean;
  /** Actually shown in Deals now; false after Promote until the renewal is paid */
  businessIsFeatured?: boolean;
  /** Promotion removal pending: Deals ends on this date */
  promotionEndsAt?: string | null;
  /** Next renewal amount after any pending change; null = won't renew */
  renewalPrice?: string | null;
  /** Monthly price of the Deals promotion, also when it isn't on the plan (pending backend) */
  promotionPrice?: string | null;
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

/** "60.00" + "USD" → "$60"; "19.99" → "$19.99"; "16900.00" + "PKR" → "PKR 16,900" */
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
    })
      .format(value)
      .replace(/\.00$/, "");
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
      marginHorizontal: moderateWidthScale(16),
      marginTop: moderateHeightScale(16),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      marginBottom: moderateHeightScale(16),
    },
    headerGradient: {
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(18),
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(14),
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.surfaceRaised,
    },
    statusText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statusBadgeFailed: {
      backgroundColor: theme.lightRedSolid,
    },
    statusTextFailed: {
      color: theme.red,
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
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginRight: moderateWidthScale(2),
    },
    planPrice: {
      fontSize: fontSize.size40,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
    },
    pricePeriod: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      marginLeft: moderateWidthScale(6),
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
      marginHorizontal: moderateWidthScale(16),
      marginTop: moderateHeightScale(8),
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
      borderRadius: moderateWidthScale(12),
      // Same cream tiles as the cards above (client sample 11-05)
      backgroundColor: theme.tileGoldCream,
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
      marginBottom: moderateHeightScale(6),
    },
    addOnName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      flex: 1,
      marginRight: moderateWidthScale(12),
    },
    addOnPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    breakdownDivider: {
      height: 1,
      backgroundColor: theme.white50,
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(10),
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
    planNameRow: {
      flex: 1,
      marginRight: moderateWidthScale(12),
      marginBottom: 0,
    },
    breakdown: {
      marginTop: moderateHeightScale(4),
    },
    totalRow: {
      marginBottom: 0,
    },
    nextTotalRow: {
      marginTop: moderateHeightScale(6),
      marginBottom: 0,
    },
    nextTotalText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.goldenBuy,
    },
    totalLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    noticeCard: {
      marginHorizontal: moderateWidthScale(16),
      marginBottom: moderateHeightScale(16),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
    },
    noticeTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    goldIconTile: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    goldIconTileNotice: {
      backgroundColor: theme.tileGoldCream,
    },
    flexCopy: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    noticeTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    noticeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      lineHeight: fontSize.size20,
    },
    noticeDivider: {
      height: StyleSheet.hairlineWidth * 2,
      backgroundColor: theme.goldenBuy,
      marginTop: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
    },
    noticeFooter: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    promoCard: {
      marginHorizontal: moderateWidthScale(16),
      marginBottom: moderateHeightScale(16),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    promoCardGold: {
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
    },
    promoButtonText: {
      fontSize: fontSize.size17,
    },
    promoTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    promoButton: {
      marginTop: moderateHeightScale(16),
    },
    promoPriceLine: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(12),
    },
    promoFootnote: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: fontSize.size17,
      marginTop: moderateHeightScale(4),
    },
    manageCard: {
      marginHorizontal: moderateWidthScale(16),
      marginBottom: moderateHeightScale(16),
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
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    manageRowCopy: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    manageRowTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    manageRowText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      lineHeight: fontSize.size19,
    },
    manageDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
    },
    // Green card: "What's included" checklist
    includesBlock: {
      marginTop: moderateHeightScale(14),
      borderTopWidth: 1,
      borderTopColor: theme.white15,
    },
    includesHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: moderateHeightScale(44),
      paddingTop: moderateHeightScale(10),
      marginBottom: -moderateHeightScale(4),
    },
    includesBody: {
      gap: moderateHeightScale(8),
      paddingTop: moderateHeightScale(8),
    },
    includesTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.goldenBuy,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    includesIntro: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      lineHeight: fontSize.size18,
      marginBottom: moderateHeightScale(2),
    },
    includesRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    includesCheck: {
      width: moderateWidthScale(18),
      height: moderateWidthScale(18),
      borderRadius: moderateWidthScale(9),
      backgroundColor: theme.goldenBuy,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(1),
    },
    includesText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: fontSize.size20,
    },
    // Subscription details card
    detailsCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    periodHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    periodTitle: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sinceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(2),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    promoteIosNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(4),
    },
    trialNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.noticeCream,
    },
    trialNoteTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    trialNoteText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      lineHeight: fontSize.size18,
    },
    sinceText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    daysChip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.tileGoldCream,
    },
    daysChipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      // Darker gold for AA contrast on the cream chip (apptGoldAccent was 3.9:1)
      color: theme.goldTextDark,
    },
    timelineBar: {
      flexDirection: "row",
      alignItems: "center",
    },
    timelineDotStart: {
      width: moderateWidthScale(12),
      height: moderateWidthScale(12),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.buttonBack,
    },
    timelineDotEnd: {
      width: moderateWidthScale(12),
      height: moderateWidthScale(12),
      borderRadius: moderateWidthScale(6),
      borderWidth: 2,
      borderColor: theme.goldBorder,
      backgroundColor: theme.white,
    },
    progressTrack: {
      flex: 1,
      height: moderateHeightScale(6),
      marginHorizontal: moderateWidthScale(4),
      borderRadius: moderateHeightScale(3),
      backgroundColor: theme.lightGreen1,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: moderateHeightScale(3),
      backgroundColor: theme.buttonBack,
    },
    timelineDates: {
      flexDirection: "row",
      gap: moderateWidthScale(16),
    },
    detailLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
    timelineDate: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    textEnd: {
      textAlign: "right",
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
  const [promoteVisible, setPromoteVisible] = useState(false);
  const [includesExpanded, setIncludesExpanded] = useState(false);
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

  const handleConfirmPromote = () => {
    setPromoteVisible(false);
    void runSubscriptionAction(
      () =>
        ApiService.post<SubscriptionActionResponse>(
          businessEndpoints.keepPromotionAddOn,
          {},
        ),
      t("promotionAddedFallback"),
    );
  };

  /** Stripe-billed: in-app Stripe card form (client 11-05, no browser) */
  const handleChangeCard = () => {
    if (!subscription || managing) return;
    router.push({
      pathname: "/(main)/dashboard/(account)/paymentMethod",
      params: {
        subscriptionId: String(subscription.id),
        cardLastFour: subscription.cardLastFour ?? "",
        cardBrand: subscription.cardBrand ?? "",
      },
    } as any);
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

  const capitalizeFirstLetter = (text: string | null) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
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

  /** Cards (client sample): "November 20"; the year only when it isn't this year */
  const formatShortDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const parsed = parseSubscriptionDate(dateString);
    if (!parsed) return dateString;
    return parsed.year() === dayjs().year()
      ? parsed.format("MMMM D")
      : parsed.format("MMMM D, YYYY");
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

  /**
   * Stripe renewal charge failed but access continues during retries
   * (status stays "active"): say so in the header badge.
   */
  const paymentFailed = [
    "past_due",
    "unpaid",
    "incomplete",
  ].includes((subscription?.stripeStatus ?? "").toLowerCase());

  const statusBadgeLabel = useMemo(() => {
    if (!subscription) return "";
    if (paymentFailed) return t("paymentFailedStatus");
    // Sentence case pill, like the client sample ("Active")
    if (isTrialing) return t("active");
    if (isCancelled) return t("cancelled");
    return getDisplayStatus(subscription.status);
  }, [subscription, isTrialing, isCancelled, paymentFailed, t]);


  /**
   * Plan description from the backend: "Designed for …\n\nIncludes:\nItem\nItem"
   * → intro line + checklist for the green card. No "Includes:" line → intro only.
   */
  const planInfo = (() => {
    const raw = subscription?.subscriptionPlanDescription?.trim();
    if (!raw) return { intro: null as string | null, items: [] as string[] };
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const includesAt = lines.findIndex((line) =>
      /^(includes|what'?s included)\s*:?$/i.test(line),
    );
    if (includesAt === -1) {
      return { intro: capitalizeFirstLetter(raw), items: [] as string[] };
    }
    return {
      intro: lines.slice(0, includesAt).join(" ") || null,
      items: lines
        .slice(includesAt + 1)
        .map((line) => line.replace(/^[-•*✓✔]\s*/, ""))
        .filter(Boolean),
    };
  })();
  /**
   * Details card = the CURRENT billing period (client 11-05): last payment
   * (or trial start) on the left, renewal / trial end / access-until on the
   * right. The first purchase date is a separate "Subscribed since" line.
   */
  const periodEnd = dateDisplay?.date
    ? parseSubscriptionDate(dateDisplay.date)
    : null;
  const periodStart = (() => {
    const raw = isTrialing
      ? subscription?.trialStartsAt
      : subscription?.paymentDate;
    const parsed = raw ? parseSubscriptionDate(raw) : null;
    if (parsed) return parsed;
    // Monthly plans: no payment date yet → one month before the renewal
    return !isTrialing && periodEnd ? periodEnd.subtract(1, "month") : null;
  })();
  const periodStartLabel = isTrialing
    ? t("trialStarted")
    : t("lastPaymentLabel");
  const periodEndLabel =
    dateDisplay?.kind === "nextPayment" ? t("renewsOnLabel") : dateLabel;
  /** Share of the period already passed, 0–1 (null = no bar) */
  const periodProgress = (() => {
    if (!periodStart || !periodEnd) return null;
    const total = periodEnd.diff(periodStart, "day");
    if (total <= 0) return null;
    const used = dayjs().startOf("day").diff(periodStart, "day");
    return Math.min(1, Math.max(0, used / total));
  })();
  /** Trial length from the server's dates (14 today), not hard-coded */
  const trialDays =
    isTrialing && periodStart && periodEnd
      ? Math.max(0, periodEnd.diff(periodStart, "day"))
      : 0;
  const subscribedSinceText = formatTrialEndDate(
    subscription?.createdAt ?? null,
  );

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
  const promotionEndsAtDay =
    subscription?.promotionEndsAt?.match(/^\d{4}-\d{2}-\d{2}(?=T)/)?.[0] ??
    subscription?.promotionEndsAt ??
    null;
  const promotionEndDate = formatTrialEndDate(promotionEndsAtDay);
  const promotionEndShort = formatShortDate(promotionEndsAtDay);
  /** "FreshPass Business" → "Business" (sample: "Your Business plan continues…") */
  const planShortName = (subscription?.subscriptionPlan ?? "").replace(
    /^FreshPass\s+/i,
    "",
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

  /** Prices for the plan card + promotion card ("$60", "$20", "$80") */
  const basePriceValue = Number(subscription?.subscriptionPlanPrice) || 0;
  const activeAddOnTotal = activeAddOns.reduce(
    (sum, service) => sum + (Number(service.price) || 0),
    0,
  );
  const basePriceText =
    formatMoney(subscription?.subscriptionPlanPrice, "USD") ??
    `$${subscription?.subscriptionPlanPrice ?? ""}`;
  const currentTotalText = formatMoney(
    String(subscription?.totalPrice ?? basePriceValue + activeAddOnTotal),
    "USD",
  );
  // An ended promotion can still come back as an inactive add-on row
  const promotionPriceRaw =
    subscription?.promotionPrice ??
    activeAddOns[0]?.price ??
    subscription?.additionalServices?.[0]?.price ??
    null;
  const promotionPriceText = formatMoney(promotionPriceRaw, "USD");
  const totalWithPromotionText =
    promotionPriceRaw != null && Number.isFinite(Number(promotionPriceRaw))
      ? formatMoney(String(basePriceValue + Number(promotionPriceRaw)), "USD")
      : null;
  const cardLabel = subscription?.cardLastFour
    ? formatCardLabel(t, subscription.cardLastFour, subscription.cardBrand)
    : null;
  /** Apple-billed on Android: nothing can be changed here */
  const appleOnAndroid = isApplePayment && !isIosDevice;
  /**
   * Stripe "Promote My Business" done, not in Deals yet: the add-on is on the
   * plan but Deals starts once the next renewal is paid (backend 11-05:
   * hasFeaturedAddOn true + businessIsFeatured false; trial = featured at once).
   */
  const promotionStartsPending =
    isRenewing &&
    !isApplePayment &&
    subscription?.hasFeaturedAddOn === true &&
    subscription?.businessIsFeatured === false &&
    !promotionPending;
  const showPendingNotice =
    isRenewing &&
    (promotionPending ||
      promotionStartsPending ||
      !!subscription?.pendingPlanName);
  /** "keep" while removal is pending, "promote" once the promotion is gone */
  const promoCardMode: "keep" | "promote" | null =
    !subscription || !isRenewing || appleOnAndroid
      ? null
      : promotionPending
        ? "keep"
        : !hasPromotion &&
            !promotionStartsPending &&
            // Paid placement bought through Stripe on an iPhone = App Store
            // 3.1.1/3.1.3(g) risk; Stripe-billed owners can promote on Android
            (isApplePayment || !isIosDevice)
          ? "promote"
          : null;
  /** Explains the missing Promote card; doesn't point to buying elsewhere (App Store) */
  const showPromoteIosNote =
    !!subscription &&
    isRenewing &&
    isIosDevice &&
    !isApplePayment &&
    !hasPromotion &&
    !promotionPending &&
    !promotionStartsPending;
  // Not paying for the add-on yet: keep it out of "Current total"
  const breakdownAddOns = promotionStartsPending ? [] : activeAddOns;
  /** Removal pending: the total stays until the period ends, then this price */
  const showPriceDropRows =
    isRenewing && promotionPending && !!renewalPriceText;
  /**
   * Apple can bill in local currency (PKR...) but plan and add-on prices only
   * come in USD, so never show dollars to those owners. With no pending change
   * the renewal price IS today's price; otherwise today's price is unknown.
   */
  const localCurrencyBilling =
    isApplePayment &&
    !!subscription?.renewalCurrency &&
    subscription.renewalCurrency.toUpperCase() !== "USD";
  const localCurrentPrice =
    localCurrencyBilling && !promotionPending && !subscription?.pendingPlanName
      ? renewalPriceText
      : null;
  const bigPriceText = localCurrencyBilling ? localCurrentPrice : basePriceText;
  const totalRowText = localCurrencyBilling
    ? localCurrentPrice
    : currentTotalText;

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

    if (appleOnAndroid) {
      rows.push({
        key: "apple-android",
        icon: "smartphone",
        text: t("billedThroughAppleManageOnIphone"),
      });
      return rows;
    }

    // Keep / Promote live in the promotion card above; only Remove stays here
    if (hasPromotion && !promotionPending) {
      rows.push({
        key: "remove",
        icon: "tag",
        title: t("removePromotionAddOn"),
        text: isApplePayment
          ? t("appleRemovePromotionDesc")
          : t("removePromotionAddOnDesc"),
        onPress: isApplePayment
          ? () => void handleOpenAppleSheet()
          : () => setRemovePromotionVisible(true),
      });
    }

    rows.push(
      isApplePayment
        ? {
            key: "card",
            icon: "credit-card",
            title: t("paymentManagedByApple"),
            text: t("paymentManagedByAppleSteps"),
          }
        : {
            key: "card",
            icon: "credit-card",
            title: t("changePaymentMethod"),
            text: paymentFailed
              ? t("paymentFailedUpdateCard")
              : (cardLabel ?? t("changePaymentMethodDesc")),
            onPress: handleChangeCard,
          },
    );
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
              colors={[theme.darkGreen, theme.darkGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerTop}>
                <Text style={[styles.planName, styles.planNameRow]}>
                  {subscription.subscriptionPlan}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    paymentFailed && styles.statusBadgeFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      paymentFailed && styles.statusTextFailed,
                    ]}
                  >
                    {statusBadgeLabel}
                  </Text>
                </View>
              </View>
              {breakdownAddOns.length > 0 ? (
                <View style={styles.breakdown}>
                  <View style={styles.addOnRow}>
                    {/* Client 11-05: "Pro plan" for Business, "Solo plan" for Solo */}
                    <Text style={styles.addOnName}>
                      {/solo/i.test(subscription.subscriptionPlan ?? "")
                        ? t("soloPlanLabel")
                        : t("proPlanLabel")}
                    </Text>
                    {localCurrencyBilling ? null : (
                      <Text style={styles.addOnPrice}>
                        {t("pricePerMonth", { price: basePriceText })}
                      </Text>
                    )}
                  </View>
                  {breakdownAddOns.map((service) => (
                    <View key={service.id} style={styles.addOnRow}>
                      <Text style={styles.addOnName}>
                        {/* Business add-on = the Deals promotion (sample: "Promotion") */}
                        {subscription.hasFeaturedAddOn &&
                        breakdownAddOns.length === 1
                          ? t("promotionLineLabel")
                          : service.name}
                      </Text>
                      {localCurrencyBilling ? null : (
                        <Text style={styles.addOnPrice}>
                          {t("pricePerMonth", {
                            price:
                              formatMoney(service.price, "USD") ??
                              `$${service.price}`,
                          })}
                        </Text>
                      )}
                    </View>
                  ))}
                  {showPriceDropRows ? (
                    <Text style={styles.addOnNote}>
                      {t("promotionEndsShort", { date: promotionEndShort })}
                    </Text>
                  ) : null}
                  {totalRowText || showPriceDropRows ? (
                    <View style={styles.breakdownDivider} />
                  ) : null}
                  {totalRowText ? (
                    <View style={[styles.addOnRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>
                        {t("currentTotalLabel")}
                      </Text>
                      <Text style={styles.totalLabel}>
                        {t("pricePerMonth", { price: totalRowText })}
                      </Text>
                    </View>
                  ) : null}
                  {/* Client 11-06: show the lower price right under the total */}
                  {showPriceDropRows ? (
                    <View style={[styles.addOnRow, styles.nextTotalRow]}>
                      <Text style={styles.nextTotalText}>
                        {t("fromDateLabel", { date: promotionEndShort })}
                      </Text>
                      <Text style={styles.nextTotalText}>
                        {t("pricePerMonth", { price: renewalPriceText })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : bigPriceText ? (
                <View style={styles.planPriceContainer}>
                  {/* Sample: small "$", big "60", then "/month" */}
                  <Text style={styles.currencySymbol}>
                    {bigPriceText.match(/^[^\d]*/)?.[0]?.trim()}
                  </Text>
                  <Text style={styles.planPrice}>
                    {bigPriceText.replace(/^[^\d]*/, "")}
                  </Text>
                  <Text style={styles.pricePeriod}>{t("perMonthCompact")}</Text>
                </View>
              ) : null}

              {/* Client 11-05: what the plan includes, inside the plan card */}
              {/* Closed by default; tap the heading row to open (client 11-05) */}
              {planInfo.intro || planInfo.items.length > 0 ? (
                <View style={styles.includesBlock}>
                  <TouchableOpacity
                    onPress={() => setIncludesExpanded((v) => !v)}
                    style={styles.includesHeader}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: includesExpanded }}
                  >
                    <Text style={styles.includesTitle}>
                      {t("whatsIncluded")}
                    </Text>
                    <Feather
                      name={includesExpanded ? "chevron-up" : "chevron-down"}
                      size={iconScale(20)}
                      color={theme.goldenBuy}
                    />
                  </TouchableOpacity>
                  {includesExpanded ? (
                    <View style={styles.includesBody}>
                      {planInfo.intro ? (
                        <Text style={styles.includesIntro}>
                          {planInfo.intro}
                        </Text>
                      ) : null}
                      {planInfo.items.map((item, index) => (
                        <View
                          key={`${index}-${item}`}
                          style={styles.includesRow}
                        >
                          <View style={styles.includesCheck}>
                            <Feather
                              name="check"
                              size={iconScale(12)}
                              color={theme.darkGreen}
                            />
                          </View>
                          <Text style={styles.includesText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </LinearGradient>
          </View>

          {/* Stays on screen until the change happens (client 11-05) */}
          {showPendingNotice && (
            <View style={styles.noticeCard}>
              <View style={styles.noticeTop}>
                <View style={[styles.goldIconTile, styles.goldIconTileNotice]}>
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={iconScale(22)}
                    color={theme.apptGoldAccent}
                  />
                </View>
                <View style={styles.flexCopy}>
                  <Text style={styles.noticeTitle}>
                    {subscription.pendingPlanName
                      ? t("planChangeScheduledTitle")
                      : promotionStartsPending
                        ? t("promotionStartsCardTitle", {
                            date: formatShortDate(subscription.nextPaymentDate),
                          })
                        : t("promotionEndsCardTitle", {
                            date: promotionEndShort,
                          })}
                  </Text>
                  {subscription.pendingPlanName ? (
                    pendingChangeLines.map((line) => (
                      <Text key={line} style={styles.noticeText}>
                        {line}
                      </Text>
                    ))
                  ) : promotionStartsPending ? (
                    <Text style={styles.noticeText}>
                      {t("promotionStartsCardBody")}
                    </Text>
                  ) : (
                    <Text style={styles.noticeText}>
                      {t("promotionEndsCardBody", {
                        plan: planShortName,
                        price: renewalPriceText ?? basePriceText,
                      })}
                    </Text>
                  )}
                </View>
              </View>
              {renewalPriceText && subscription.nextPaymentDate ? (
                <>
                  <View style={styles.noticeDivider} />
                  <Text style={styles.noticeFooter}>
                    {t("nextRenewalLine", {
                      date: formatShortDate(subscription.nextPaymentDate),
                      price: renewalPriceText,
                    })}
                  </Text>
                </>
              ) : null}
            </View>
          )}

          {promoCardMode && (
            <View
              style={[
                styles.promoCard,
                promoCardMode === "promote" && styles.promoCardGold,
              ]}
            >
              <View style={styles.noticeTop}>
                <View style={styles.goldIconTile}>
                  {promoCardMode === "keep" ? (
                    <Ionicons
                      name="megaphone-outline"
                      size={iconScale(22)}
                      color={theme.darkGreen}
                    />
                  ) : (
                    <Feather
                      name="tag"
                      size={iconScale(20)}
                      color={theme.darkGreen}
                    />
                  )}
                </View>
                <View style={styles.flexCopy}>
                  <Text style={styles.promoTitle}>
                    {promoCardMode === "keep"
                      ? t("keepReachingTitle")
                      : t("getDiscoveredTitle")}
                  </Text>
                  <Text style={styles.noticeText}>
                    {promoCardMode === "keep"
                      ? t("keepReachingSubtitle")
                      : t("getDiscoveredSubtitle")}
                  </Text>
                </View>
              </View>
              <Button
                title={
                  promoCardMode === "keep"
                    ? t("keepMyBusinessFeatured")
                    : promotionPriceText
                      ? t("promoteMyBusinessPrice", {
                          price: promotionPriceText,
                        })
                      : t("promoteMyBusiness")
                }
                onPress={() => {
                  if (isApplePayment) void handleOpenAppleSheet();
                  else if (promoCardMode === "keep") handleKeepPromotion();
                  else setPromoteVisible(true);
                }}
                disabled={managing}
                backgroundColor={theme.bookNowButton}
                textColor={theme.darkGreen}
                containerStyle={styles.promoButton}
                textStyle={styles.promoButtonText}
              />
              {isApplePayment ? (
                <Text style={styles.promoFootnote}>
                  {promoCardMode === "keep"
                    ? t("appleKeepPromotionDesc")
                    : t("appleAddPromotionDesc")}
                </Text>
              ) : (
                <>
                  {promotionPriceText && totalWithPromotionText ? (
                    <Text style={styles.promoPriceLine}>
                      {promoCardMode === "keep"
                        ? t("keepFeaturedPriceLine", {
                            price: promotionPriceText,
                            total: totalWithPromotionText,
                          })
                        : t("withPromotionTotal", {
                            total: totalWithPromotionText,
                          })}
                    </Text>
                  ) : null}
                  <Text style={styles.promoFootnote}>
                    {promoCardMode === "keep"
                      ? t("keepFeaturedNoCharge")
                      : t("reviewBillingBeforeConfirming")}
                  </Text>
                </>
              )}
            </View>
          )}

          {manageRows.map((row) => {
            const content = (
              <>
                <View style={styles.manageRowIcon}>
                  <Feather
                    name={row.icon}
                    size={moderateWidthScale(20)}
                    color={theme.darkGreen}
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
                    size={moderateWidthScale(20)}
                    color={theme.darkGreen}
                  />
                ) : null}
              </>
            );
            return row.onPress ? (
              <TouchableOpacity
                key={row.key}
                style={[styles.manageCard, styles.manageRow]}
                onPress={row.onPress}
                disabled={managing}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                {content}
              </TouchableOpacity>
            ) : (
              <View key={row.key} style={[styles.manageCard, styles.manageRow]}>
                {content}
              </View>
            );
          })}

          {/* Subscription Details */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>{t("subscriptionDetails")}</Text>
            <View style={styles.detailsCard}>
              {/* Current billing period (client 11-05): last payment ●━━━○
                  renews on. Status + payment method already show above. */}
              <View style={styles.periodHeader}>
                <Text style={styles.periodTitle}>
                  {isTrialing
                    ? t("trialPeriodTitle")
                    : t("currentBillingPeriod")}
                </Text>
                {remainingDays != null ? (
                  <View style={styles.daysChip}>
                    <Text style={styles.daysChipText}>
                      {t("daysLeftCount", { count: remainingDays })}
                    </Text>
                  </View>
                ) : null}
              </View>
              {periodProgress != null ? (
                <View
                  style={styles.timelineBar}
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.round(periodProgress * 100),
                  }}
                >
                  <View style={styles.timelineDotStart} />
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(periodProgress * 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.timelineDotEnd} />
                </View>
              ) : null}
              <View style={styles.timelineDates}>
                <View style={styles.flexCopy}>
                  <Text style={styles.detailLabel}>{periodStartLabel}</Text>
                  <Text style={styles.timelineDate}>
                    {periodStart
                      ? formatShortDate(periodStart.format("YYYY-MM-DD"))
                      : t("notAvailable")}
                  </Text>
                </View>
                <View style={styles.flexCopy}>
                  <Text style={[styles.detailLabel, styles.textEnd]}>
                    {periodEndLabel}
                  </Text>
                  <Text style={[styles.timelineDate, styles.textEnd]}>
                    {dateDisplay?.date
                      ? formatShortDate(dateDisplay.date)
                      : t("notAvailable")}
                  </Text>
                </View>
              </View>
              {/* Trial: no charge yet, and how to avoid it (11-06). The start
                  date is already on the timeline, so no "Subscribed since" here. */}
              {isTrialing ? (
                <View style={styles.trialNote}>
                  <Feather
                    name="info"
                    size={iconScale(18)}
                    color={theme.darkGreen}
                  />
                  <View style={styles.flexCopy}>
                    <Text style={styles.trialNoteTitle}>
                      {trialDays
                        ? t("trialActiveTitleDays", { days: trialDays })
                        : t("trialActiveTitle")}
                    </Text>
                    <Text style={styles.trialNoteText}>
                      {renewalPriceText
                        ? t("trialFirstPayment", {
                            price: renewalPriceText,
                            date: formatShortDate(subscription.trialEndsAt),
                          })
                        : t("trialFirstPaymentNoPrice", {
                            date: formatShortDate(subscription.trialEndsAt),
                          })}
                    </Text>
                    <Text style={styles.trialNoteText}>
                      {isApplePayment
                        ? t("trialCancelBeforeApple")
                        : t("trialCancelBefore")}
                    </Text>
                  </View>
                </View>
              ) : subscribedSinceText ? (
                <View style={styles.sinceRow}>
                  <Feather
                    name="calendar"
                    size={iconScale(15)}
                    color={theme.textMuted}
                  />
                  <Text style={styles.sinceText}>
                    {t("subscribedSince", { date: subscribedSinceText })}
                  </Text>
                </View>
              ) : null}
            </View>
            {showPromoteIosNote ? (
              <View style={styles.promoteIosNote}>
                <Feather
                  name="info"
                  size={iconScale(15)}
                  color={theme.textMuted}
                />
                <Text style={styles.sinceText}>{t("promoteIosNote")}</Text>
              </View>
            ) : null}
          </View>

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
        notStarted={promotionStartsPending}
        endDate={formatTrialEndDate(subscription?.nextPaymentDate ?? null)}
        basePrice={
          formatMoney(subscription?.subscriptionPlanPrice, "USD") ??
          `$${subscription?.subscriptionPlanPrice ?? ""}`
        }
        onClose={() => setRemovePromotionVisible(false)}
        onConfirm={handleConfirmRemovePromotion}
      />
      <RemovePromotionConfirmModal
        visible={promoteVisible}
        mode="promote"
        endDate=""
        basePrice={basePriceText}
        promotionPrice={promotionPriceText}
        isTrial={isTrialing}
        startDate={formatTrialEndDate(
          (isTrialing
            ? subscription?.trialEndsAt
            : subscription?.nextPaymentDate) ?? null,
        )}
        onClose={() => setPromoteVisible(false)}
        onConfirm={handleConfirmPromote}
      />
    </SafeAreaView>
  );
}
