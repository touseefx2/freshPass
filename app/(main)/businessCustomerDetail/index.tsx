import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import BusinessCustomerAvatar from "@/src/components/businessCustomerAvatar";
import { fetchBusinessCustomerDetail } from "@/src/services/customersService";
import type {
  BusinessCustomer,
  BusinessCustomerPurchase,
  BusinessCustomerSubscription,
  BusinessCustomerSubscriptionAppointment,
  BusinessCustomerSubscriptionService,
} from "@/src/types/customers";
import {
  formatAppointmentDateTime,
  formatBusinessCustomerDate,
  formatBusinessCustomerPrice,
  formatPaymentMethodLabel,
  formatPurchaseServicesLabel,
  formatStatusLabel,
  getBusinessCustomerListStatus,
  getServiceUsageProgress,
  getStaffDisplayName,
  getStatusPillColors,
  getSubscriptionServiceTotals,
  getSubscriptionStartDate,
  resolveBusinessCustomerAvatarUrl,
} from "@/src/utils/businessCustomerDisplay";
import { getCustomerSubscriptionPill } from "@/src/utils/customerSubscriptionLifecycle";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(40),
      paddingTop: moderateHeightScale(12),
    },
    heroCard: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(20),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(20),
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: moderateWidthScale(12),
        },
        android: {
          elevation: 3,
        },
      }),
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      marginBottom: moderateHeightScale(4),
    },
    profileMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(10),
    },
    overallStatusPill: {
      alignSelf: "flex-start",
      flexShrink: 0,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
    },
    overallStatusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
    },
    actionRow: {
      flexDirection: "row",
      marginTop: moderateHeightScale(18),
      gap: moderateWidthScale(10),
    },
    actionChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      backgroundColor: theme.lightGreen1,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    actionChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    sectionContainer: {
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(22),
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionCount: {
      minWidth: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    sectionCountText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    contactCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(4),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    contactRowLast: {
      borderBottomWidth: 0,
    },
    contactIconWrap: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    contactTextWrap: {
      flex: 1,
    },
    contactLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    contactValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    subCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      marginBottom: moderateHeightScale(14),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(14),
        },
        android: {
          elevation: 4,
        },
      }),
    },
    subHeaderGradient: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(18),
    },
    subHeaderTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(14),
    },
    subHeaderLeft: {
      flex: 1,
      minWidth: 0,
    },
    cardTitle: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    planDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginTop: moderateHeightScale(6),
      lineHeight: fontSize.size18,
    },
    statusPill: {
      flexShrink: 0,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
    },
    statusPillOnDark: {
      backgroundColor: theme.green,
    },
    statusPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    statusPillTextOnDark: {
      color: theme.darkGreen,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(12),
    },
    priceAmount: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      lineHeight: fontSize.size32,
    },
    pricePeriod: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      marginBottom: moderateHeightScale(4),
    },
    renewChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      backgroundColor: theme.white15,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
    },
    renewChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    subBody: {
      paddingHorizontal: moderateWidthScale(14),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(14),
    },
    mutedNote: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
      marginBottom: moderateHeightScale(12),
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
    },
    visitsBox: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    visitsTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    visitsLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    visitsIconWrap: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.apptMintBg,
      alignItems: "center",
      justifyContent: "center",
    },
    visitsLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    visitsValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    visitsMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(8),
    },
    includedPanel: {
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    includedHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
      gap: moderateWidthScale(8),
    },
    includedTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    includedSummaryPill: {
      backgroundColor: theme.green,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(9),
      paddingVertical: moderateHeightScale(4),
    },
    includedSummary: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceRow: {
      marginBottom: moderateHeightScale(12),
    },
    serviceRowLast: {
      marginBottom: 0,
    },
    serviceTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
      gap: moderateWidthScale(10),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    serviceRemaining: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
    },
    serviceRemainingDepleted: {
      color: theme.red,
    },
    progressTrack: {
      height: heightScale(7),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen1,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.green,
    },
    progressFillLow: {
      backgroundColor: theme.orangeBrown,
    },
    emptyInline: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    appointmentsPanel: {
      marginBottom: moderateHeightScale(4),
    },
    appointmentsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
    },
    appointmentsTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    appointmentRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(10),
      marginBottom: moderateHeightScale(8),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      gap: moderateWidthScale(10),
    },
    appointmentRowLast: {
      marginBottom: 0,
    },
    appointmentBody: {
      flex: 1,
      minWidth: 0,
    },
    appointmentDate: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    appointmentMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    appointmentStaff: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    appointmentStatusPill: {
      flexShrink: 0,
      maxWidth: widthScale(88),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen1,
    },
    appointmentStatus: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      textAlign: "center",
    },
    detailGrid: {
      gap: moderateHeightScale(8),
      marginTop: moderateHeightScale(8),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    detailLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      flexShrink: 0,
      maxWidth: "42%",
    },
    detailValue: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "right",
    },
    helperNote: {
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    emptyCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(28),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderStyle: "dashed",
    },
    emptyCardText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    purchaseCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      marginBottom: moderateHeightScale(12),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: moderateWidthScale(10),
        },
        android: {
          elevation: 3,
        },
      }),
    },
    purchaseAccent: {
      height: heightScale(4),
      backgroundColor: theme.buttonBack,
    },
    purchaseBody: {
      paddingHorizontal: moderateWidthScale(14),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(14),
    },
    purchaseTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
    },
    purchaseIconWrap: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.apptPeachBg,
      alignItems: "center",
      justifyContent: "center",
    },
    purchaseTitleBlock: {
      flex: 1,
      minWidth: 0,
    },
    purchaseServices: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      marginBottom: moderateHeightScale(4),
    },
    purchaseAmount: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
    },
    purchaseMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    purchaseMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    purchaseMetaChipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      maxWidth: widthScale(160),
    },
    purchaseDateNote: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(2),
    },
    staffRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(12),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateWidthScale(10),
    },
    staffLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    staffName: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

function mapSubscriptionToPillFields(sub: BusinessCustomerSubscription) {
  return {
    status: sub.status,
    stripeStatus: sub.stripeStatus,
    hasAccess: sub.hasAccess,
    endsAt: sub.endsAt,
    trialStartsAt: sub.trialStartsAt,
    trialEndsAt: sub.trialEndsAt,
  };
}

function getPurchaseStatusPill(status?: string | null) {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (normalized === "completed" || normalized === "paid") {
    return { label: status || "Completed", tone: "success" as const };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return { label: "Cancelled", tone: "warning" as const };
  }
  if (normalized === "scheduled" || normalized === "pending") {
    return { label: status || "Scheduled", tone: "info" as const };
  }
  return {
    label: status?.trim() || "Unknown",
    tone: "neutral" as const,
  };
}

function getAppointmentStatusTone(status?: string | null) {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (normalized === "completed") return "success" as const;
  if (normalized === "cancelled" || normalized === "canceled") {
    return "warning" as const;
  }
  if (normalized === "expired") return "danger" as const;
  if (normalized === "scheduled" || normalized === "pending") {
    return "info" as const;
  }
  return "neutral" as const;
}

export default function BusinessCustomerDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const customerId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BusinessCustomer | null>(null);

  const fetchCustomer = useCallback(async () => {
    if (!customerId) {
      setError(t("customerNotFound"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customer = await fetchBusinessCustomerDetail(customerId);
      setData(customer);
    } catch (err: any) {
      setData(null);
      setError(err?.message || t("customerNotFound"));
    } finally {
      setLoading(false);
    }
  }, [customerId, t]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomer();
    }, [fetchCustomer]),
  );

  const handleCall = async () => {
    const phone = data?.phone?.trim();
    if (!phone) return;
    const phoneUrl = `tel:${phone.replace(/[^\d+]/g, "")}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(t("error"), t("unableToMakePhoneCall"));
      }
    } catch {
      Alert.alert(t("error"), t("unableToMakePhoneCall"));
    }
  };

  const handleEmail = async () => {
    const email = data?.email?.trim();
    if (!email) return;
    const emailUrl = `mailto:${email}`;
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(t("error"), t("somethingWentWrong"));
      }
    } catch {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleChat = () => {
    if (!data?.id) return;
    router.push({
      pathname: "/(main)/chatBox",
      params: {
        id: String(data.id),
        chatItem: JSON.stringify({
          id: String(data.id),
          name: data.name ?? "",
          image:
            resolveBusinessCustomerAvatarUrl(data.profile_image_url) ??
            process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ??
            "",
        }),
      },
    });
  };

  const renderDetailRow = (label: string, value: string) => {
    if (!value || value === "--") return null;
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    );
  };

  const renderServiceRow = (
    service: BusinessCustomerSubscriptionService,
    isLast: boolean,
  ) => {
    const remainingRatio = getServiceUsageProgress(
      service.remaining,
      service.quantity,
    );
    const isDepleted = service.remaining <= 0;
    const isLow =
      !isDepleted &&
      service.quantity > 0 &&
      service.remaining / service.quantity <= 0.34;

    return (
      <View
        key={service.id}
        style={[styles.serviceRow, isLast && styles.serviceRowLast]}
      >
        <View style={styles.serviceTop}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {service.name}
          </Text>
          <Text
            style={[
              styles.serviceRemaining,
              isDepleted && styles.serviceRemainingDepleted,
            ]}
          >
            {t("remainingOfQuantity", {
              remaining: service.remaining,
              quantity: service.quantity,
            })}
          </Text>
        </View>
        <View
          style={[
            styles.progressTrack,
            isDepleted && { backgroundColor: theme.lightRed },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              isLow && styles.progressFillLow,
              { width: `${remainingRatio * 100}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderAppointmentRow = (
    appointment: BusinessCustomerSubscriptionAppointment,
    isLast: boolean,
  ) => {
    const servicesLabel = formatPurchaseServicesLabel(appointment.services);
    const statusTone = getAppointmentStatusTone(appointment.status);
    const statusColors = getStatusPillColors(statusTone, theme);
    const hasAssignedStaff =
      appointment.staffId != null || !!appointment.staffName?.trim();
    const staffName = hasAssignedStaff
      ? getStaffDisplayName(appointment.staffName, t("anyAvailableStaff"))
      : t("anyAvailableStaff");

    return (
      <View
        key={appointment.id}
        style={[styles.appointmentRow, isLast && styles.appointmentRowLast]}
      >
        <BusinessCustomerAvatar
          name={hasAssignedStaff ? appointment.staffName : null}
          profileImageUrl={
            hasAssignedStaff ? appointment.staffImageUrl : null
          }
          size={moderateWidthScale(32)}
          textSize={fontSize.size11}
        />
        <View style={styles.appointmentBody}>
          <Text style={styles.appointmentDate} numberOfLines={1}>
            {formatAppointmentDateTime(
              appointment.appointmentDate,
              appointment.appointmentTime,
            )}
          </Text>
          <Text style={styles.appointmentMeta} numberOfLines={1}>
            {servicesLabel || t("service")}
          </Text>
          <Text style={styles.appointmentStaff} numberOfLines={1}>
            {staffName}
          </Text>
        </View>
        <View
          style={[
            styles.appointmentStatusPill,
            { backgroundColor: statusColors.backgroundColor },
          ]}
        >
          <Text
            style={[styles.appointmentStatus, { color: statusColors.color }]}
            numberOfLines={2}
          >
            {formatStatusLabel(appointment.status)}
          </Text>
        </View>
      </View>
    );
  };

  const renderSubscriptionCard = (
    sub: BusinessCustomerSubscription,
    index: number,
  ) => {
    const pill = getCustomerSubscriptionPill(mapSubscriptionToPillFields(sub));
    const services = sub.services ?? [];
    const appointments = sub.appointments ?? [];
    const totals = getSubscriptionServiceTotals(sub);
    const reflectsPlan =
      typeof sub.reflectsPlanChanges === "boolean"
        ? sub.reflectsPlanChanges
        : sub.hasAccess;
    const periodStart = formatBusinessCustomerDate(sub.currentPeriodStart);
    const periodEnd = formatBusinessCustomerDate(sub.currentPeriodEnd);
    const hasPeriodStart = periodStart !== "--";
    const hasPeriodEnd = periodEnd !== "--";
    const planDescription = sub.planDescription?.trim() ?? "";
    const showPlanDescription =
      !!planDescription &&
      planDescription.toLowerCase() !== sub.plan.trim().toLowerCase();

    let renewLabel: string | null = null;
    if (sub.endsAt && sub.hasAccess) {
      renewLabel = t("accessUntilDate", {
        date: formatBusinessCustomerDate(sub.endsAt),
      });
    } else if (sub.currentPeriodEnd && sub.hasAccess) {
      renewLabel = t("renewsOnDate", {
        date: formatBusinessCustomerDate(sub.currentPeriodEnd),
      });
    }

    const visitsRemainingRatio = sub.visits
      ? getServiceUsageProgress(sub.visits.remaining, sub.visits.total)
      : 0;
    const visitsDepleted = !!sub.visits && sub.visits.remaining <= 0;
    const visitsLow =
      !!sub.visits &&
      !visitsDepleted &&
      sub.visits.total > 0 &&
      sub.visits.remaining / sub.visits.total <= 0.34;

    return (
      <View key={`${sub.id ?? sub.plan}-${index}`} style={styles.subCard}>
        <LinearGradient
          colors={[theme.darkGreen, theme.darkGreenLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.subHeaderGradient}
        >
          <View style={styles.subHeaderTop}>
            <View style={styles.subHeaderLeft}>
              <Text style={styles.cardTitle}>{sub.plan}</Text>
              {showPlanDescription ? (
                <Text style={styles.planDescription}>{planDescription}</Text>
              ) : null}
            </View>
            <View style={[styles.statusPill, styles.statusPillOnDark]}>
              <Text
                style={[styles.statusPillText, styles.statusPillTextOnDark]}
              >
                {pill.label}
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>
              {formatBusinessCustomerPrice(sub.price)}
            </Text>
            <Text style={styles.pricePeriod}>{t("perMonth")}</Text>
          </View>

          {renewLabel ? (
            <View style={styles.renewChip}>
              <MaterialIcons
                name="event"
                size={moderateWidthScale(14)}
                color={theme.white85}
              />
              <Text style={styles.renewChipText}>{renewLabel}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.subBody}>
          {!reflectsPlan ? (
            <Text style={styles.mutedNote}>{t("planEndedAllowanceNote")}</Text>
          ) : null}

          {sub.visits ? (
            <View style={styles.visitsBox}>
              <View style={styles.visitsTop}>
                <View style={styles.visitsLabelRow}>
                  <View style={styles.visitsIconWrap}>
                    <MaterialIcons
                      name="confirmation-number"
                      size={moderateWidthScale(14)}
                      color={theme.buttonBack}
                    />
                  </View>
                  <Text style={styles.visitsLabel}>{t("visitAllowance")}</Text>
                </View>
                <Text style={styles.visitsValue}>
                  {t("remainingOfQuantity", {
                    remaining: sub.visits.remaining,
                    quantity: sub.visits.total,
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.progressTrack,
                  visitsDepleted && { backgroundColor: theme.lightRed },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    visitsLow && styles.progressFillLow,
                    { width: `${visitsRemainingRatio * 100}%` },
                  ]}
                />
              </View>
              {sub.visits.upcoming > 0 ? (
                <Text style={styles.visitsMeta}>
                  {t("visitsUpcoming", { count: sub.visits.upcoming })}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.includedPanel}>
            <View style={styles.includedHeader}>
              <Text style={styles.includedTitle}>{t("whatsIncluded")}</Text>
              {totals && totals.quantity > 0 ? (
                <View style={styles.includedSummaryPill}>
                  <Text style={styles.includedSummary}>
                    {t("remainingOfQuantity", {
                      remaining: totals.remaining,
                      quantity: totals.quantity,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>

            {services.length > 0 ? (
              services.map((service, serviceIndex) =>
                renderServiceRow(service, serviceIndex === services.length - 1),
              )
            ) : (
              <Text style={styles.emptyInline}>{t("noServicesIncluded")}</Text>
            )}
          </View>

          <View style={styles.appointmentsPanel}>
            <View style={styles.appointmentsHeader}>
              <Text style={styles.appointmentsTitle}>
                {t("appointments")} (
                {typeof sub.appointmentCount === "number"
                  ? sub.appointmentCount
                  : appointments.length}
                )
              </Text>
            </View>

            {appointments.length > 0 ? (
              appointments.map((appointment, appointmentIndex) =>
                renderAppointmentRow(
                  appointment,
                  appointmentIndex === appointments.length - 1,
                ),
              )
            ) : (
              <Text style={styles.emptyInline}>
                {t("noSubscriptionAppointments")}
              </Text>
            )}
          </View>

          <View style={styles.detailGrid}>
            {renderDetailRow(
              t("subscriptionStartDate"),
              getSubscriptionStartDate(sub),
            )}
            {hasPeriodStart
              ? renderDetailRow(t("currentPeriodStart"), periodStart)
              : null}
            {hasPeriodEnd
              ? renderDetailRow(t("currentPeriodEnd"), periodEnd)
              : null}
            {sub.trialStartsAt || sub.trialEndsAt
              ? renderDetailRow(
                  t("trialPeriod"),
                  `${formatBusinessCustomerDate(sub.trialStartsAt)} – ${formatBusinessCustomerDate(sub.trialEndsAt)}`,
                )
              : null}
            {sub.cancelledAt
              ? renderDetailRow(
                  t("cancelledOn"),
                  formatBusinessCustomerDate(sub.cancelledAt),
                )
              : null}
            {sub.endsAt
              ? renderDetailRow(
                  sub.hasAccess ? t("accessUntil") : t("subscriptionEnd"),
                  formatBusinessCustomerDate(sub.endsAt),
                )
              : null}
            {renderDetailRow(
              t("hasAccess"),
              sub.hasAccess ? t("yes") : t("no"),
            )}
          </View>

          <Text style={styles.helperNote}>{t("subscriptionDatesHelper")}</Text>
        </View>
      </View>
    );
  };

  const renderPurchaseCard = (
    purchase: BusinessCustomerPurchase,
    index: number,
  ) => {
    const servicesLabel = formatPurchaseServicesLabel(
      purchase.services,
      purchase.additionalServices,
    );
    const statusPill = getPurchaseStatusPill(purchase.status);
    const pillColors = getStatusPillColors(statusPill.tone, theme);
    const staffName = getStaffDisplayName(
      purchase.staffName,
      t("anyAvailableStaff"),
    );
    const appointmentLabel = formatAppointmentDateTime(
      purchase.appointmentDate,
      purchase.appointmentTime,
    );
    const purchasedLabel = formatBusinessCustomerDate(purchase.purchasedAt);
    const paymentLabel = purchase.paymentMethod
      ? formatPaymentMethodLabel(purchase.paymentMethod)
      : null;

    return (
      <View
        key={`${purchase.id ?? purchase.purchasedAt}-${index}`}
        style={styles.purchaseCard}
      >
        <View style={styles.purchaseAccent} />
        <View style={styles.purchaseBody}>
          <View style={styles.purchaseTopRow}>
            <View style={styles.purchaseIconWrap}>
              <MaterialIcons
                name="receipt-long"
                size={moderateWidthScale(20)}
                color={theme.selectCard}
              />
            </View>
            <View style={styles.purchaseTitleBlock}>
              <Text style={styles.purchaseServices} numberOfLines={2}>
                {servicesLabel || t("service")}
              </Text>
              <Text style={styles.purchaseAmount}>
                {formatBusinessCustomerPrice(purchase.amount)}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: pillColors.backgroundColor },
              ]}
            >
              <Text
                style={[styles.statusPillText, { color: pillColors.color }]}
              >
                {statusPill.label}
              </Text>
            </View>
          </View>

          <View style={styles.purchaseMetaRow}>
            {appointmentLabel && appointmentLabel !== "--" ? (
              <View style={styles.purchaseMetaChip}>
                <MaterialIcons
                  name="event"
                  size={moderateWidthScale(13)}
                  color={theme.buttonBack}
                />
                <Text style={styles.purchaseMetaChipText} numberOfLines={1}>
                  {appointmentLabel}
                </Text>
              </View>
            ) : null}
            {paymentLabel ? (
              <View style={styles.purchaseMetaChip}>
                <MaterialIcons
                  name="payments"
                  size={moderateWidthScale(13)}
                  color={theme.buttonBack}
                />
                <Text style={styles.purchaseMetaChipText} numberOfLines={1}>
                  {paymentLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {purchasedLabel && purchasedLabel !== "--" ? (
            <Text style={styles.purchaseDateNote}>
              {t("purchasedOn")} {purchasedLabel}
            </Text>
          ) : null}

          <View style={styles.staffRow}>
            <BusinessCustomerAvatar
              name={purchase.staffId ? purchase.staffName : null}
              profileImageUrl={
                purchase.staffId ? purchase.staffImageUrl : null
              }
              size={moderateWidthScale(32)}
              textSize={fontSize.size11}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.staffLabel}>{t("staff")}</Text>
              <Text style={styles.staffName} numberOfLines={1}>
                {staffName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("customerDetail")} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StackHeader title={t("customerDetail")} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t("customerNotFound")}</Text>
          <RetryButton onPress={fetchCustomer} loading={loading} />
        </View>
      </View>
    );
  }

  const hasSubscriptions = data.subscriptions.length > 0;
  const hasPurchases = data.purchases.length > 0;
  const hasPhone = !!data.phone?.trim();
  const hasEmail = !!data.email?.trim();
  const overallStatus = getBusinessCustomerListStatus(data);
  const overallPillColors = getStatusPillColors(overallStatus.tone, theme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader title={t("customerDetail")} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <BusinessCustomerAvatar
              name={data.name}
              profileImageUrl={data.profile_image_url}
              size={widthScale(68)}
              style={{ marginRight: moderateWidthScale(14) }}
              textSize={fontSize.size22}
            />
            <View style={styles.heroInfo}>
              <Text style={styles.profileName}>
                {data.name?.trim() || "Unknown"}
              </Text>
              {data.customerSince ? (
                <Text style={styles.profileMeta}>
                  {t("customerSince")}{" "}
                  {formatBusinessCustomerDate(data.customerSince)}
                </Text>
              ) : null}
              <View
                style={[
                  styles.overallStatusPill,
                  { backgroundColor: overallPillColors.backgroundColor },
                ]}
              >
                <Text
                  style={[
                    styles.overallStatusText,
                    { color: overallPillColors.color },
                  ]}
                >
                  {overallStatus.label === "No subscription"
                    ? t("noSubscription")
                    : overallStatus.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            {hasPhone ? (
              <TouchableOpacity style={styles.actionChip} onPress={handleCall}>
                <MaterialIcons
                  name="phone"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <Text style={styles.actionChipText}>{t("call")}</Text>
              </TouchableOpacity>
            ) : null}
            {hasEmail ? (
              <TouchableOpacity style={styles.actionChip} onPress={handleEmail}>
                <MaterialIcons
                  name="email"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <Text style={styles.actionChipText}>{t("email")}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.actionChip} onPress={handleChat}>
              <MaterialIcons
                name="chat"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
              <Text style={styles.actionChipText}>{t("chat")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(hasPhone || hasEmail) && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { marginBottom: moderateHeightScale(12) }]}>
              {t("contactInfo")}
            </Text>
            <View style={styles.contactCard}>
              {hasPhone ? (
                <View
                  style={[
                    styles.contactRow,
                    !hasEmail && styles.contactRowLast,
                  ]}
                >
                  <View style={styles.contactIconWrap}>
                    <MaterialIcons
                      name="phone"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.contactTextWrap}>
                    <Text style={styles.contactLabel}>{t("phone")}</Text>
                    <Text style={styles.contactValue}>{data.phone}</Text>
                  </View>
                </View>
              ) : null}
              {hasEmail ? (
                <View style={[styles.contactRow, styles.contactRowLast]}>
                  <View style={styles.contactIconWrap}>
                    <MaterialIcons
                      name="email"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.contactTextWrap}>
                    <Text style={styles.contactLabel}>{t("email")}</Text>
                    <Text style={styles.contactValue}>{data.email}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t("subscriptions")}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>
                {data.subscriptionCount ?? data.subscriptions.length}
              </Text>
            </View>
          </View>
          {hasSubscriptions ? (
            data.subscriptions.map(renderSubscriptionCard)
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                {hasPurchases
                  ? t("noActiveSubscriptionOneOffOnly")
                  : t("noSubscriptionHistory")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t("oneOffPurchases")}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>
                {data.purchaseCount ?? data.purchases.length}
              </Text>
            </View>
          </View>
          {hasPurchases ? (
            data.purchases.map(renderPurchaseCard)
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>{t("noOneOffPurchases")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
