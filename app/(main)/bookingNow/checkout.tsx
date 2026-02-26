import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import {
  setSelectedStaff,
  type StaffMember,
} from "@/src/state/slices/bsnsSlice";
import {
  setActionLoader,
  setGuestModeModalVisible,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import ApiService from "@/src/services/api";
import Logger from "@/src/services/logger";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchAppointmentPaymentSheetParams } from "@/src/services/stripeService";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import { SvgXml } from "react-native-svg";
import Button from "@/src/components/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
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

const calendarIconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z" fill="{{COLOR}}"/></svg>`;
const personIconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="{{COLOR}}"/></svg>`;
const listIconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18H21V20H3V18ZM3 13H21V15H3V13ZM3 8H21V10H3V8ZM3 3H21V5H3V3Z" fill="{{COLOR}}"/></svg>`;
const paymentIconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="{{COLOR}}"/></svg>`;

const SummaryIcon = ({
  type,
  color,
}: {
  type: "calendar" | "person" | "list" | "payment";
  color: string;
}) => {
  const xml =
    type === "calendar"
      ? calendarIconSvg.replace(/{{COLOR}}/g, color)
      : type === "person"
        ? personIconSvg.replace(/{{COLOR}}/g, color)
        : type === "list"
          ? listIconSvg.replace(/{{COLOR}}/g, color)
          : paymentIconSvg.replace(/{{COLOR}}/g, color);
  return <SvgXml xml={xml} width={widthScale(20)} height={heightScale(20)} />;
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

const formatSlotTo12h = (time24: string): string => {
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
  if (staffId === "anyone") {
    return process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  }
  const img = staffMember?.image;
  if (!img) return process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  const isAbsolute =
    typeof img === "string" &&
    (img.startsWith("http://") || img.startsWith("https://"));
  return isAbsolute
    ? img
    : `${process.env.EXPO_PUBLIC_API_BASE_URL ?? ""}${img}`;
};

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
    logoContainer: {},
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    line: {
      width: "100%",
      height: 1.1,
      backgroundColor: theme.borderLight,
      marginTop: moderateHeightScale(12),
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(32),
    },
    section: {
      marginTop: moderateHeightScale(16),
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    // Availability Section
    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    weekNavigationButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(6),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    weekRangeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    calendarGrid: {
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    daysHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    dayHeader: {
      flex: 1,
      alignItems: "center",
    },
    dayHeaderText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dayContainer: {
      flex: 1,
      alignItems: "center",
    },
    dayNumberContainer: {
      width: widthScale(35),
      height: widthScale(35),
      borderRadius: widthScale(35 / 2),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "transparent",
    },
    dayNumberSelected: {
      backgroundColor: theme.orangeBrown30,
      borderColor: theme.selectCard,
    },
    dayNumber: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    dayNumberSelectedText: {
      color: theme.darkGreen,
    },
    dayNumberDisabled: {
      opacity: 0.3,
    },
    dayNumberDisabledText: {
      color: theme.lightGreen,
    },
    timezoneText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(5),
      paddingHorizontal: moderateWidthScale(20),
    },
    timeSlotSection: {
      marginTop: moderateHeightScale(16),
    },
    timeSlotCategoryRow: {
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
    },
    timeSlotCategoryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      position: "relative",
    },
    timeSlotCategoryButtonSelected: {
      // Selected state handled by underline
    },
    timeSlotCategoryUnderline: {
      position: "absolute",
      bottom: -1,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: theme.orangeBrown,
    },
    timeSlotCategoryIcon: {
      marginRight: moderateWidthScale(6),
    },
    timeSlotCategoryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    timeSlotCategoryTextSelected: {
      color: theme.darkGreen,
    },
    timeSlotsContainer: {
      marginBottom: moderateHeightScale(5),
    },
    timeSlotsContentContainer: {
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    timeSlotButton: {
      width: widthScale(90),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    timeSlotButtonSelected: {
      backgroundColor: theme.darkGreenLight,
      borderColor: theme.darkGreen,
    },
    timeSlotButtonDisabled: {
      opacity: 0.4,
      backgroundColor: theme.background,
    },
    timeSlotText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    timeSlotTextSelected: {
      color: theme.white,
    },
    timeSlotTextDisabled: {
      color: theme.lightGreen,
    },
    noSlotsContainer: {
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
    },
    noSlotsText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    // Payment Method Section
    paymentCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(20),
      overflow: "hidden",
      marginBottom: moderateHeightScale(12),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    paymentOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: moderateWidthScale(12),
    },
    paymentOptionSelected: {
      // Selected state handled by radio button
    },
    paymentDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    paymentRadioButton: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 2,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
      marginTop: moderateHeightScale(2),
    },
    paymentRadioButtonSelected: {},
    paymentRadioButtonInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
    },
    paymentOptionContent: {
      flex: 1,
    },
    paymentOptionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(3),
    },
    paymentOptionDescription: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // Service Details Section
    serviceDetailsCard: {
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(20),
      overflow: "hidden",
    },
    serviceItem: {
      padding: moderateWidthScale(16),
    },
    serviceDetailsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(4),
    },
    addServiceButton: {
      width: widthScale(22),
      height: heightScale(22),
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.selectCard,
    },
    serviceDetailsName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(12),
    },
    serviceDetailsPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(8),
    },
    serviceDetailsOriginalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    serviceDetailsPriceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    serviceDetailsPriceColumn: {
      alignItems: "flex-end",
    },
    serviceDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(16),
    },
    serviceDetailsStaff: {
      flexDirection: "row",
      alignItems: "center",
      padding: moderateWidthScale(16),
    },
    serviceDetailsStaffImageWrapper: {
      position: "relative",
      width: widthScale(32),
      height: widthScale(32),
      marginRight: moderateWidthScale(8),
      justifyContent: "center",
      alignItems: "center",
    },
    serviceDetailsStaffImage: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(32 / 2),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    serviceDetailsStaffStatusDot: {
      position: "absolute",
      bottom: 2,
      right: 0,
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(7) / 2,
    },
    serviceDetailsStaffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    serviceDetailsStaffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
    },
    serviceDetailsStaffName: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    serviceDetailsChangeButton: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    serviceDetailsChangeButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Price Breakdown Section
    priceBreakdown: {
      padding: moderateWidthScale(20),
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
    },
    priceRowLast: {
      marginBottom: 0,
    },
    priceLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    priceValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // Privacy Policy Section
    privacyText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(16),
      marginHorizontal: moderateWidthScale(20),
    },
    privacyLink: {
      color: theme.primary,
      fontFamily: fonts.fontMedium,
    },
    // Subscription Section
    subscriptionSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    subscriptionText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(12),
    },
    subscriptionButton: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    subscriptionButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // Note Input Section
    noteInputContainer: {
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(20),
      marginHorizontal: moderateWidthScale(20),
      position: "relative",
    },
    noteInput: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      paddingRight: moderateWidthScale(40),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: heightScale(100),
      textAlignVertical: "top",
    },
    noteInputIcon: {
      position: "absolute",
      left: moderateWidthScale(16),
      top: moderateHeightScale(12),
      zIndex: 1,
    },
    noteInputWithIcon: {
      paddingLeft: moderateWidthScale(48),
    },
    noteClearButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
    },
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
    summaryCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      marginTop: moderateHeightScale(24),
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 6,
    },
    summaryCardBody: {
      padding: moderateWidthScale(24),
    },
    footerCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      marginTop: moderateHeightScale(24),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(24),
    },
    footerCardBody: {
      padding: 0,
    },
    footerSubRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(10),
    },
    footerSubLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    footerSubValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    footerDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },
    footerTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      paddingTop: moderateHeightScale(4),
    },
    footerTotalLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    footerTotalValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    footerButtonWrap: {
      marginTop: moderateHeightScale(20),
    },
    dateTimeBlock: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(20),
      paddingLeft: moderateWidthScale(16),
      borderLeftWidth: 4,
      borderLeftColor: theme.orangeBrown,
      paddingVertical: moderateHeightScale(4),
    },
    dateTimeTextWrap: {
      flex: 1,
    },
    dateTimeIconWrap: {
      marginLeft: moderateWidthScale(12),
      marginTop: moderateHeightScale(2),
    },
    dateTimeLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    dateTimeValue: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(22),
    },
    staffSection: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(16),
      marginBottom: moderateHeightScale(20),
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    staffAvatarWrap: {
      position: "relative",
      marginRight: moderateWidthScale(14),
    },
    staffAvatar: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(28),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 2,
      borderColor: theme.orangeBrown30,
    },
    staffStatusDot: {
      position: "absolute",
      bottom: 2,
      right: 2,
      width: moderateWidthScale(12),
      height: moderateWidthScale(12),
      borderRadius: moderateWidthScale(6),
      borderWidth: 2,
      borderColor: theme.white,
    },
    staffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    staffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
    },
    staffLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    staffName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    staffExperience: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    sectionLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(10),
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    serviceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
      backgroundColor: theme.white,
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(12),
      borderLeftWidth: 4,
      borderLeftColor: theme.orangeBrown30,
      borderWidth: 1,
      borderRightWidth: 1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    serviceName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
      marginRight: moderateWidthScale(12),
    },
    servicePrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    noteBlock: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      marginTop: moderateHeightScale(16),
      borderLeftWidth: 4,
      borderLeftColor: theme.orangeBrown30,
    },
    noteLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(6),
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    noteText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      fontStyle: "italic",
      lineHeight: moderateHeightScale(18),
    },
    paymentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(4),
    },
    paymentLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    paymentBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      backgroundColor: theme.background,
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    paymentBadgeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(14),
    },
    summaryLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    summaryValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
      textAlign: "right",
    },
    summaryDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },
    // Subscription Card (when from subscription booking)
    subscriptionCard: {
      // marginHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
      padding: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
    selectedPaymentMethod: reduxPaymentMethod,
    selectedNote: reduxNote,
  } = businessData;

  // Use Redux directly - no local state needed
  const selectedServices = reduxSelectedServices || [];
  const selectedStaffId = reduxSelectedStaff || "anyone";
  const paymentMethod = reduxPaymentMethod || "payNow";
  const note = reduxNote || "";
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

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

  // Update selected staff member when staff ID changes
  useEffect(() => {
    if (selectedStaffId === "anyone") {
      setSelectedStaffMember(null);
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
  }, [selectedStaffId, staffMembers]);

  const params = useLocalSearchParams<{
    subscription_id?: string;
    business_id?: string;
    item?: string;
  }>();
  const subscriptionId = params.subscription_id
    ? parseInt(params.subscription_id, 10)
    : undefined;
  const subscriptionData: SubscriptionData | null = useMemo(() => {
    if (params.item) {
      try {
        return JSON.parse(params.item);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [params.item]);
  const isSubscriptionMode = Boolean(
    subscriptionId != null && subscriptionData,
  );

  const handleBookNow = async () => {
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
      if (isGuest) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const isAnyoneSelected = selectedStaffId === "anyone";
      const requestBody: {
        business_id: number;
        appointment_type: string;
        appointment_date: string;
        appointment_time: string;
        notes?: string;
        staff_id?: number;
        subscription_id?: number;
      } = {
        business_id: parseInt(params.business_id || businessId || "0", 10),
        appointment_type: "subscription",
        appointment_date: reduxSelectedDate || "",
        appointment_time: reduxSelectedTimeSlot || "",
      };
      if (note && note.trim()) {
        requestBody.notes = note.trim();
      }
      if (!isAnyoneSelected) {
        requestBody.staff_id = parseInt(selectedStaffId, 10);
      }
      if (subscriptionId != null) {
        requestBody.subscription_id = subscriptionId;
      }
      Logger.log("requestBody (subscription)", requestBody);
      dispatch(setActionLoader(true));
      try {
        const response = (await ApiService.post(
          appointmentsEndpoints.create,
          requestBody,
        )) as {
          success?: boolean;
          message?: string;
          data?: {
            success: boolean;
            message: string;
            data: { id: number; appointmentDate?: string; [key: string]: any };
          };
        };
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
              businessId: params.business_id || businessId || "",
              business_id: params.business_id || businessId || "",
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
          error?.message || "Failed to book appointment. Please try again.",
          "error",
          4000,
        );
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

    // Prepare request body
    const isAnyoneSelected = selectedStaffId === "anyone";

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
    } = {
      business_id: parseInt(businessId || "0", 10),
      appointment_type: subscriptionId ? "subscription" : "service",
      payment_method: paymentMethod === "payNow" ? "pay_now" : "pay_later",
      service_ids: selectedServices.map((service) => service.id),
      appointment_date: reduxSelectedDate || "",
      appointment_time: reduxSelectedTimeSlot || "",
    };

    // Add notes only if it exists
    if (note && note.trim()) {
      requestBody.notes = note.trim();
    }

    // Add staff_id only if staff is selected (not "anyone")
    if (!isAnyoneSelected) {
      requestBody.staff_id = parseInt(selectedStaffId, 10);
    }

    // Add subscription_id only if it exists
    if (subscriptionId) {
      requestBody.subscription_id = subscriptionId;
    }

    Logger.log("requestBody", requestBody);

    // Show loader
    dispatch(setActionLoader(true));

    try {
      const response = (await ApiService.post(
        appointmentsEndpoints.create,
        requestBody,
      )) as {
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
      };

      // Hide loader
      dispatch(setActionLoader(false));

      // Console log response
      Logger.log(
        "Appointment API Response:",
        JSON.stringify(response, null, 2),
      );

      // Check success - ApiService.post returns response.data, so structure is:
      // { success: true, message: "...", data: { id: ... } }
      // But terminal shows nested structure, so check both
      const isSuccess = response?.success || response?.data?.success;

      Logger.log("isSuccess:", isSuccess, "response:", response);

      if (isSuccess) {
        // Extract appointment ID and date from response
        // Response structure: response.data.id and response.data.appointmentDate
        const appointmentId =
          (response?.data as any)?.id ||
          (response?.data as any)?.data?.id ||
          null;
        const appointmentDate =
          (response?.data as any)?.appointmentDate ||
          (response?.data as any)?.data?.appointmentDate ||
          null;

        if (paymentMethod === "payNow") {
          if (!appointmentId) {
            showBanner(
              "Payment Failed",
              "Appointment ID is missing. Please try again.",
              "error",
              4000,
            );
            return;
          }

          try {
            // Step 1: Fetch payment sheet parameters from backend
            const {
              paymentIntent,
              setupIntent,
              customerSessionClientSecret,
              ephemeralKey,
              customer,
            } = await fetchAppointmentPaymentSheetParams(appointmentId);

            // Step 2: Initialize payment sheet
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

            // Use CustomerSession (newer approach) if available, otherwise fall back to EphemeralKey
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

            // Use paymentIntent for subscription payment, or setupIntent as fallback
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

            // Step 3: Present payment sheet to user
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
              // Payment was cancelled or failed
              if (!presentError.code?.includes("Canceled")) {
                showBanner(
                  "Payment Failed",
                  presentError.message || "Payment could not be completed",
                  "error",
                  4000,
                );
              }
              // If user canceled, don't show error (silent cancel)
              return;
            }

            // Show processing loader
            setProcessingPayment(true);

            // Wait 2 seconds before showing success and navigating
            setTimeout(() => {
              setProcessingPayment(false);
              showBanner(
                "Success",
                "Payment successful! Your booking is confirmed.",
                "success",
                3000,
              );

              // Create bookingId: appointmentDate (YYYYMMDD format) + appointmentId
              let dateFormatted = "";
              if (appointmentDate) {
                // Parse date from "MM/DD/YYYY" format and convert to "YYYYMMDD"
                const dateParts = appointmentDate.split("/");
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

              // Navigate to booking detail page
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
                  businessId: businessId || "",
                  business_id: businessId || "",
                  note: note || "",
                },
              });
            }, 2000);
          } catch (err: any) {
            // Extract clean error message
            let errorMessage = "Failed to process payment";

            // Check error response data first (from API)
            if (err.data?.message) {
              errorMessage = err.data.message;
            } else if (err.data?.error) {
              errorMessage = err.data.error;
            } else if (err.message) {
              // Use error message directly (API service already extracts clean message)
              errorMessage = err.message;
            }

            showBanner("Payment Failed", errorMessage, "error", 4000);
          }
          return;
        }

        if (paymentMethod === "payLater") {
          // Create bookingId: appointmentDate (YYYYMMDD format) + appointmentId
          // Example: "01/08/2026" -> "20260108" + "54" = "2026010854"
          let dateFormatted = "";
          if (appointmentDate) {
            // Parse date from "MM/DD/YYYY" format and convert to "YYYYMMDD"
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
              businessId: businessId || "",
              business_id: businessId || "",
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
      // Hide loader
      dispatch(setActionLoader(false));

      // Console log error
      Logger.error("Appointment API Error:", error);

      showBanner(
        "Booking Failed",
        error?.message || "Failed to book appointment. Please try again.",
        "error",
        4000,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackNavigation}
          >
            <BackArrowIcon
              width={widthScale(25)}
              height={heightScale(25)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Checkout</Text>
          </View>
        </View>
      </View>

      <View style={styles.line} />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardBody}>
              {/* Date & Time — left accent */}
              <View style={styles.dateTimeBlock}>
                <View style={styles.dateTimeTextWrap}>
                  <Text style={styles.dateTimeLabel}>Date & time</Text>
                  <Text style={styles.dateTimeValue}>
                    {formatDateDisplay(reduxSelectedDate || "")}
                    {reduxSelectedTimeSlot
                      ? ` • ${formatSlotTo12h(reduxSelectedTimeSlot)}`
                      : ""}
                  </Text>
                </View>
                <View style={styles.dateTimeIconWrap}>
                  <SummaryIcon type="calendar" color={theme.orangeBrown} />
                </View>
              </View>

              {/* Staff — card with avatar */}
              <Text style={styles.sectionLabel}>Staff</Text>
              <View style={styles.staffSection}>
                <View style={styles.staffAvatarWrap}>
                  {staffImageUri ? (
                    <Image
                      source={{ uri: staffImageUri }}
                      style={styles.staffAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.staffAvatar} />
                  )}
                  {selectedStaffId !== "anyone" && selectedStaffMember && (
                    <View
                      style={[
                        styles.staffStatusDot,
                        selectedStaffMember.active
                          ? styles.staffStatusDotActive
                          : styles.staffStatusDotInactive,
                      ]}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>
                    {selectedStaffId === "anyone"
                      ? "Anyone available"
                      : (selectedStaffMember?.name ?? "—")}
                  </Text>
                  {selectedStaffId !== "anyone" &&
                    selectedStaffMember?.experience != null && (
                      <Text style={styles.staffExperience} numberOfLines={1}>
                        {selectedStaffMember.experience === 1
                          ? "1 year experience"
                          : `${selectedStaffMember.experience} years experience`}
                      </Text>
                    )}
                </View>
                <SummaryIcon type="person" color={theme.lightGreen} />
              </View>

              {/* Services - hide for subscription mode */}
              {!isSubscriptionMode && (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { marginBottom: moderateHeightScale(10) },
                    ]}
                  >
                    Services
                  </Text>
                  {selectedServices.map((service) => (
                    <View key={service.id} style={styles.serviceRow}>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {service.name}
                      </Text>
                      <Text style={styles.servicePrice}>
                        ${service.price.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {note.trim() ? (
                <View style={styles.noteBlock}>
                  <Text style={styles.noteLabel}>Note</Text>
                  <Text style={styles.noteText} numberOfLines={8}>
                    {note.trim()}
                  </Text>
                </View>
              ) : null}

              {/* Payment - hide for subscription mode */}
              {!isSubscriptionMode && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment</Text>
                  <View style={styles.paymentBadge}>
                    <SummaryIcon type="payment" color={theme.text} />
                    <Text style={styles.paymentBadgeText}>
                      {paymentMethod === "payNow" ? "Pay now" : "Pay later"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Subscription Card - show only in subscription mode */}
              {isSubscriptionMode && subscriptionData && (
                <View style={styles.subscriptionCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.planTitleRow}>
                      <Feather
                        name="star"
                        size={moderateWidthScale(16)}
                        color={theme.orangeBrown}
                        style={styles.starIcon}
                      />
                      <Text style={styles.planTitle}>
                        {subscriptionData.subscriptionPlan}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {subscriptionData.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.topSection}>
                    <View style={styles.userInfoRow}>
                      <Feather
                        name="user"
                        size={moderateWidthScale(14)}
                        color={theme.darkGreen}
                        style={styles.userIcon}
                      />
                      <Text style={styles.userText} numberOfLines={1}>
                        {subscriptionData.business}
                      </Text>
                    </View>
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>
                        ${subscriptionData.subscriptionPlanPrice}
                      </Text>
                      <Text style={styles.planPriceLabel}>/month</Text>
                    </View>
                  </View>
                  {subscriptionData.subscriptionPlanDescription && (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {subscriptionData.subscriptionPlanDescription}
                    </Text>
                  )}
                  <View style={styles.usageSection}>
                    <View style={styles.usageHeader}>
                      <Feather
                        name="zap"
                        size={moderateWidthScale(14)}
                        color={theme.orangeBrown}
                      />
                      <Text style={styles.usageTitle}>
                        {subscriptionData.visits.total} Visits Per Month
                      </Text>
                    </View>
                    <View style={styles.usageStats}>
                      <View style={styles.usageItem}>
                        <Text style={styles.usageLabel}>Used</Text>
                        <Text style={styles.usageValue}>
                          {subscriptionData.visits.used}
                        </Text>
                      </View>
                      <View style={styles.usageItem}>
                        <Text style={styles.usageLabel}>Upcoming</Text>
                        <Text style={styles.usageValue}>
                          {subscriptionData.visits.upcoming}
                        </Text>
                      </View>
                      <View style={styles.usageItem}>
                        <Text style={styles.usageLabel}>Remaining</Text>
                        <Text style={styles.usageValue}>
                          {subscriptionData.visits.remaining}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {(subscriptionData.paymentDate ||
                    subscriptionData.status?.trim()?.toLowerCase() ===
                      "active") && (
                    <View style={styles.paymentRenewalRow}>
                      {subscriptionData.paymentDate && (
                        <View style={styles.paymentDateContainer}>
                          <Feather
                            name="credit-card"
                            size={moderateWidthScale(12)}
                            color={theme.darkGreen}
                          />
                          <View style={styles.dateInfoContainer}>
                            <Text style={styles.dateLabel}>Payment</Text>
                            <Text style={styles.dateValue}>
                              {subscriptionData.paymentDate}
                            </Text>
                          </View>
                        </View>
                      )}
                      {subscriptionData.status?.trim()?.toLowerCase() ===
                        "active" && (
                        <View
                          style={[
                            styles.renewalContainer,
                            !subscriptionData.paymentDate && { marginLeft: 0 },
                          ]}
                        >
                          <Feather
                            name="calendar"
                            size={moderateWidthScale(12)}
                            color={theme.darkGreen}
                          />
                          <View style={styles.dateInfoContainer}>
                            <Text style={styles.dateLabel}>Renewal</Text>
                            <Text style={styles.dateValue}>
                              {subscriptionData.nextPaymentDate}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Footer card - hide Subtotal/Tax/Total for subscription mode */}
          <View style={styles.footerCard}>
            <View style={styles.footerCardBody}>
              {!isSubscriptionMode && (
                <>
                  <View style={styles.footerSubRow}>
                    <Text style={styles.footerSubLabel}>Subtotal:</Text>
                    <Text style={styles.footerSubValue}>
                      ${totalPrice.toFixed(2)} USD
                    </Text>
                  </View>
                  <View style={styles.footerSubRow}>
                    <Text style={styles.footerSubLabel}>Tax:</Text>
                    <Text style={styles.footerSubValue}>
                      ${tax.toFixed(2)} USD
                    </Text>
                  </View>
                  <View style={styles.footerDivider} />
                  <View style={styles.footerTotalRow}>
                    <Text style={styles.footerTotalLabel}>Total:</Text>
                    <Text style={styles.footerTotalValue}>
                      ${estimatedTotal.toFixed(2)} USD
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.footerButtonWrap}>
                <Button title={t("checkout")} onPress={handleBookNow} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {processingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.processingText}>Processing payment...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function Checkout() {
  return <CheckoutContent />;
}
