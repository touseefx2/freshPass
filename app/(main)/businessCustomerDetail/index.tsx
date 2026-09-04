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
  formatSubscriptionPriceSubtitle,
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
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionCount: {
      minWidth: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    sectionCountText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
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
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      marginBottom: moderateHeightScale(12),
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: moderateWidthScale(8),
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
      gap: moderateWidthScale(8),
    },
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statusPill: {
      flexShrink: 0,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
    },
    statusPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    planDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
      lineHeight: fontSize.size18,
    },
    priceSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(14),
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginBottom: moderateHeightScale(14),
    },
    includedHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    includedTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    includedSummary: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
    },
    serviceRow: {
      marginBottom: moderateHeightScale(14),
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
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    progressTrack: {
      height: heightScale(6),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen1,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.green,
    },
    visitsBox: {
      backgroundColor: theme.lightGreen1,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(14),
    },
    visitsTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    visitsLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    visitsValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
    },
    visitsMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(8),
    },
    mutedNote: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(12),
    },
    emptyInline: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    appointmentsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(4),
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
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateWidthScale(10),
    },
    appointmentBody: {
      flex: 1,
      minWidth: 0,
    },
    appointmentDate: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
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
    appointmentStatus: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      maxWidth: widthScale(80),
      textAlign: "right",
    },
    detailGrid: {
      gap: moderateHeightScale(8),
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
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    emptyCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(22),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    emptyCardText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    purchaseTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(8),
    },
    purchaseAmount: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    purchaseServices: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
      textTransform: "capitalize",
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
    const progress = getServiceUsageProgress(service.used, service.quantity);

    return (
      <View
        key={service.id}
        style={[styles.serviceRow, isLast && styles.serviceRowLast]}
      >
        <View style={styles.serviceTop}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {service.name}
          </Text>
          <Text style={styles.serviceRemaining}>
            {t("remainingOfQuantity", {
              remaining: service.remaining,
              quantity: service.quantity,
            })}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>
    );
  };

  const renderAppointmentRow = (
    appointment: BusinessCustomerSubscriptionAppointment,
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
      <View key={appointment.id} style={styles.appointmentRow}>
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
        <Text
          style={[styles.appointmentStatus, { color: statusColors.color }]}
          numberOfLines={2}
        >
          {formatStatusLabel(appointment.status)}
        </Text>
      </View>
    );
  };

  const renderSubscriptionCard = (
    sub: BusinessCustomerSubscription,
    index: number,
  ) => {
    const pill = getCustomerSubscriptionPill(mapSubscriptionToPillFields(sub));
    const pillColors = getStatusPillColors(pill.tone, theme);
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

    return (
      <View key={`${sub.id ?? sub.plan}-${index}`} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{sub.plan}</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: pillColors.backgroundColor },
            ]}
          >
            <Text style={[styles.statusPillText, { color: pillColors.color }]}>
              {pill.label}
            </Text>
          </View>
        </View>

        {sub.planDescription?.trim() ? (
          <Text style={styles.planDescription}>{sub.planDescription.trim()}</Text>
        ) : null}

        <Text style={styles.priceSubtitle}>
          {formatSubscriptionPriceSubtitle(sub, {
            perMonth: t("perMonth"),
            renews: (date) => t("renewsOnDate", { date }),
            accessUntil: (date) => t("accessUntilDate", { date }),
          })}
        </Text>

        {!reflectsPlan ? (
          <Text style={styles.mutedNote}>{t("planEndedAllowanceNote")}</Text>
        ) : null}

        <View style={styles.divider} />

        {sub.visits ? (
          <View style={styles.visitsBox}>
            <View style={styles.visitsTop}>
              <Text style={styles.visitsLabel}>{t("visitAllowance")}</Text>
              <Text style={styles.visitsValue}>
                {t("remainingOfQuantity", {
                  remaining: sub.visits.remaining,
                  quantity: sub.visits.total,
                })}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      getServiceUsageProgress(
                        sub.visits.used + sub.visits.upcoming,
                        sub.visits.total,
                      ) * 100
                    }%`,
                  },
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

        <View style={styles.includedHeader}>
          <Text style={styles.includedTitle}>{t("whatsIncluded")}</Text>
          {totals && totals.quantity > 0 ? (
            <Text style={styles.includedSummary}>
              {t("remainingOfQuantity", {
                remaining: totals.remaining,
                quantity: totals.quantity,
              })}
            </Text>
          ) : null}
        </View>

        {services.length > 0 ? (
          services.map((service, serviceIndex) =>
            renderServiceRow(service, serviceIndex === services.length - 1),
          )
        ) : (
          <Text style={styles.emptyInline}>{t("noServicesIncluded")}</Text>
        )}

        <View style={styles.divider} />

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
          appointments.map(renderAppointmentRow)
        ) : (
          <Text style={styles.emptyInline}>{t("noSubscriptionAppointments")}</Text>
        )}

        <View style={[styles.divider, { marginTop: moderateHeightScale(12) }]} />

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

    return (
      <View key={`${purchase.id ?? purchase.purchasedAt}-${index}`} style={styles.card}>
        <View style={styles.purchaseTopRow}>
          <Text style={styles.purchaseAmount}>
            {formatBusinessCustomerPrice(purchase.amount)}
          </Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: pillColors.backgroundColor },
            ]}
          >
            <Text style={[styles.statusPillText, { color: pillColors.color }]}>
              {statusPill.label}
            </Text>
          </View>
        </View>

        <Text style={styles.purchaseServices}>
          {servicesLabel || t("service")}
        </Text>

        <View style={styles.detailGrid}>
          {renderDetailRow(
            t("appointment"),
            formatAppointmentDateTime(
              purchase.appointmentDate,
              purchase.appointmentTime,
            ),
          )}
          {renderDetailRow(
            t("purchasedOn"),
            formatBusinessCustomerDate(purchase.purchasedAt),
          )}
          {purchase.paymentMethod
            ? renderDetailRow(
                t("paymentMethod"),
                formatPaymentMethodLabel(purchase.paymentMethod),
              )
            : null}
        </View>

        <View style={styles.staffRow}>
          <BusinessCustomerAvatar
            name={purchase.staffId ? purchase.staffName : null}
            profileImageUrl={purchase.staffId ? purchase.staffImageUrl : null}
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
