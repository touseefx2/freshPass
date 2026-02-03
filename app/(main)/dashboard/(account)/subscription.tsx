import React, { useMemo, useState, useCallback } from "react";
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useTheme, useAppDispatch } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
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
import { setActionLoader } from "@/src/state/slices/generalSlice";

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
  visits: any;
  status: string;
  stripeStatus: string;
  trialEndsAt: string | null;
  endsAt: string | null;
  paymentDate: string | null;
  nextPaymentDate: string;
  remainingDays: number;
  stripePaymentIntentId: string;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
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
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
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
  });

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [businessPlansModalVisible, setBusinessPlansModalVisible] =
    useState(false);

  const isTrialing =
    subscription?.status === "active" &&
    subscription?.stripeStatus === "trialing";
  const isActive =
    subscription?.status === "active" &&
    subscription?.stripeStatus === "active";

  console.log("----->isTrialing", isTrialing);
  console.log("------>isActive", isActive);

  const fetchSubscription = async () => {
    setLoading(true);
    setError(null);
    setApiError(false);
    try {
      const response = await ApiService.get<SubscriptionResponse>(
        businessEndpoints.subscriptions("active"),
      );

      if (
        response.success &&
        response.data?.data &&
        Array.isArray(response.data.data) &&
        response.data.data.length > 0
      ) {
        const firstSubscription = response.data.data[0];
        setSubscription(firstSubscription);
        setError(null);
        setApiError(false);
      } else {
        // Empty response - not an error, just no subscription
        setSubscription(null);
        setError(null);
        setApiError(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription");
      setApiError(true);
      showBanner(
        "Error",
        err.message || "Failed to load subscription",
        "error",
        2500,
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, []),
  );

  const cancelTrialSubscription = async () => {
    dispatch(setActionLoader(true));
  };

  const handleCancel = () => {
    if (!subscription) return;

    Alert.alert(
      isTrialing ? "Cancel Trial" : "Cancel Subscription",
      isTrialing
        ? "Are you sure you want to cancel your free trial? This action cannot be undone."
        : "Are you sure you want to cancel your subscription? This action cannot be undone.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel Trial",
          style: "destructive",
          onPress: async () => {},
        },
      ],
      { cancelable: true },
    );
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

  const formatTrialEndDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        month: "long",
        day: "numeric",
        year: "numeric",
      };
      return date.toLocaleDateString("en-US", options);
    } catch (error) {
      return dateString;
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Subscription" />
      {loading && !subscription ? (
        <View style={styles.content}>
          <Skeleton screenType="BusinessPlans" styles={styles} />
        </View>
      ) : apiError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={fetchSubscription} loading={loading} />
        </View>
      ) : !subscription ? (
        <>
          <View style={styles.emptyContainer}>
            <Feather
              name="credit-card"
              size={moderateWidthScale(64)}
              color={theme.lightGreen}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>No active subscription found</Text>
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Buy Plan"
              onPress={() => setBusinessPlansModalVisible(true)}
            />
          </View>
        </>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Trial Status Banner */}
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
                    🎉 Free Trial Active
                  </Text>
                  <Text style={styles.trialBannerSubtitle}>
                    Your trial ends on{" "}
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
                    <Text style={styles.pricePeriod}>/month</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {subscription.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              {subscription.subscriptionPlanDescription && (
                <Text style={styles.planDescription}>
                  {capitalizeFirstLetter(
                    subscription.subscriptionPlanDescription,
                  )}
                </Text>
              )}
            </LinearGradient>
          </View>

          {/* Card Last 4 Digits Card */}
          <View style={styles.daysRemainingCard}>
            <LinearGradient
              colors={[theme.darkGreenLight, theme.darkGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardMiddle}>
                <Text style={styles.cardLabel}>Card Last 4 Digits</Text>
                <View style={styles.cardNumberContainer}>
                  <Text style={styles.cardNumberText}>
                    {formatCardNumber(subscription.cardLastFour)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Subscription Details */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Subscription Details</Text>
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
                  <Text style={styles.infoLabel}>Days Remaining</Text>
                  <Text style={styles.infoValue}>
                    {subscription.remainingDays}
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
                    {isTrialing ? "Trial Started" : "Subscription Started"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {subscription.createdAt || "N/A"}
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
                  <Text style={styles.infoLabel}>Next Payment Date</Text>
                  <Text style={styles.infoValue}>
                    {subscription.nextPaymentDate || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cancel Trial Button */}
          {(isTrialing || isActive) && (
            <View style={styles.buttonContainer}>
              <Button
                title={isTrialing ? "Cancel Trial" : "Cancel Subscription"}
                onPress={handleCancel}
                loading={cancelling}
                disabled={cancelling}
                backgroundColor={theme.buttonBack}
              />
            </View>
          )}
        </ScrollView>
      )}
      {!subscription && (
        <BusinessPlansModal
          visible={businessPlansModalVisible}
          onClose={() => setBusinessPlansModalVisible(false)}
          onSuccess={fetchSubscription}
        />
      )}
    </SafeAreaView>
  );
}
