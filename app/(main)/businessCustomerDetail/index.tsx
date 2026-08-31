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
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import { fetchBusinessCustomerDetail } from "@/src/services/customersService";
import type {
  BusinessCustomer,
  BusinessCustomerPurchase,
  BusinessCustomerSubscription,
} from "@/src/types/customers";
import {
  formatBusinessCustomerDate,
  formatBusinessCustomerPrice,
  formatBusinessCustomerTime,
  formatPaymentMethodLabel,
  formatPurchaseServicesLabel,
  getBusinessCustomerInitials,
  getBusinessCustomerListStatus,
  getStatusPillColors,
  getSubscriptionPeriodLabel,
  getSubscriptionStartDate,
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
      paddingTop: moderateHeightScale(8),
    },
    heroCard: {
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(16),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(18),
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(8),
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
    avatar: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: widthScale(32),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    avatarText: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    heroInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      marginBottom: moderateHeightScale(4),
    },
    profileMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    overallStatusPill: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    overallStatusText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    actionRow: {
      flexDirection: "row",
      marginTop: moderateHeightScale(16),
      gap: moderateWidthScale(10),
    },
    actionChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      backgroundColor: theme.lightGreen1,
      borderRadius: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(8),
    },
    actionChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    sectionContainer: {
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(18),
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionCount: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    contactCard: {
      backgroundColor: theme.lightGreen1,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(6),
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    contactRowLast: {
      borderBottomWidth: 0,
    },
    contactIconWrap: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
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
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
      gap: moderateWidthScale(8),
    },
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statusPill: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    statusPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    priceText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
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
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    emptyCard: {
      backgroundColor: theme.lightGreen1,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
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
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    purchaseServices: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
      textTransform: "capitalize",
    },
  });

function mapSubscriptionToPillFields(sub: BusinessCustomerSubscription) {
  return {
    status: sub.status,
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
          image: process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "",
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

  const renderSubscriptionCard = (
    sub: BusinessCustomerSubscription,
    index: number,
  ) => {
    const pill = getCustomerSubscriptionPill(mapSubscriptionToPillFields(sub));
    const pillColors = getStatusPillColors(pill.tone, theme);
    const periodStart = formatBusinessCustomerDate(sub.currentPeriodStart);
    const periodEnd = formatBusinessCustomerDate(sub.currentPeriodEnd);
    const hasPeriodStart = periodStart !== "--";
    const hasPeriodEnd = periodEnd !== "--";

    return (
      <View key={`${sub.plan}-${index}`} style={styles.card}>
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

        <Text style={styles.priceText}>
          {formatBusinessCustomerPrice(sub.price)}
        </Text>

        <View style={styles.detailGrid}>
          {renderDetailRow(t("subscriptionStartDate"), getSubscriptionStartDate(sub))}
          {hasPeriodStart && hasPeriodEnd && periodStart !== periodEnd ? (
            <>
              {renderDetailRow(t("currentPeriodStart"), periodStart)}
              {renderDetailRow(t("currentPeriodEnd"), periodEnd)}
            </>
          ) : (
            renderDetailRow(t("currentPeriod"), getSubscriptionPeriodLabel(sub))
          )}
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
                t("subscriptionEnd"),
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
    const timeLabel = formatBusinessCustomerTime(purchase.appointmentTime);
    const dateLabel = purchase.appointmentDate
      ? formatBusinessCustomerDate(purchase.appointmentDate)
      : formatBusinessCustomerDate(purchase.purchasedAt);

    return (
      <View key={`${purchase.purchasedAt}-${index}`} style={styles.card}>
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
            timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel,
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getBusinessCustomerInitials(data.name)}
              </Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.profileName}>{data.name}</Text>
              {data.customerSince ? (
                <Text style={styles.profileMeta}>
                  {t("customerSince")} {formatBusinessCustomerDate(data.customerSince)}
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
            <Text style={styles.sectionTitle}>{t("contactInfo")}</Text>
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
            <Text style={styles.sectionCount}>
              {data.subscriptions.length}
            </Text>
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
            <Text style={styles.sectionCount}>{data.purchases.length}</Text>
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
