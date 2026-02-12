import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Octicons } from "@expo/vector-icons";
import Button from "@/src/components/button";
import StackHeader from "@/src/components/StackHeader";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchPaymentSheetParams } from "@/src/services/stripeService";
import Logger from "@/src/services/logger";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import SubscriptionPickerBottomSheet from "@/src/components/SubscriptionPickerBottomSheet";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    backButton: {
      padding: moderateWidthScale(8),
    },
    headerTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    content: {
      flex: 1,
    },
    businessInfo: {
      flexDirection: "row",
      alignItems: "center",
      // marginBottom: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(16),
      // borderBottomWidth: 1,
      // borderBottomColor: theme.borderLight,
    },
    businessLogo: {
      width: widthScale(50),
      height: widthScale(50),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen2,
      marginRight: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    businessName: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    plansContainer: {
      gap: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(30),
    },
    planCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      position: "relative",
      overflow: "hidden",
    },
    planCardWithBadge: {
      borderColor: theme.borderLine,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    decorativeCircle: {
      position: "absolute",
      top: moderateHeightScale(-30),
      right: moderateWidthScale(-30),
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: widthScale(60),
      backgroundColor: theme.lightGreen015,
      opacity: 0.3,
    },
    planHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(16),
      position: "relative",
    },
    planIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    planTitleContainer: {
      flex: 1,
    },
    planTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "capitalize",
    },
    planSubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      flexDirection: "row",
      alignItems: "center",
    },
    starIcon: {
      marginLeft: moderateWidthScale(4),
    },
    pricingBadge: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pricingAmount: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      maxWidth: "50%",
    },
    pricingPeriod: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    monthlyTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      alignSelf: "flex-start",
      marginBottom: moderateHeightScale(12),
    },
    monthlyTagIcon: {
      marginRight: moderateWidthScale(6),
    },
    monthlyTagText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    planDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(16),
      lineHeight: fontSize.size20,
    },
    featuresContainer: {
      gap: moderateHeightScale(12),
      // marginBottom: moderateHeightScale(20),
    },
    featureBlock: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
    },
    featureBlockService: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      gap: moderateHeightScale(15),
    },
    featureIcon: {
      marginRight: moderateWidthScale(10),
    },
    featureText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    featureCheck: {
      marginLeft: moderateWidthScale(8),
    },
    serviceTag: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(5),
    },
    serviceTagIcon: {},
    serviceTagText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bottomContainer: {
      // backgroundColor: theme.white,
      // paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(16),
      marginVertical : moderateHeightScale(16),
    },
    subscribeButton: {
      marginTop: moderateHeightScale(8),
    },
    successContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    successIcon: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      backgroundColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(24),
    },
    successTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
    successMessage: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: fontSize.size24,
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    loadingText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginTop: moderateHeightScale(16),
      textAlign: "center",
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
      marginBottom: moderateHeightScale(20),
    },
    changeSubscriptionCard: {
      backgroundColor: theme.orangeBrown30,
      // borderRadius: moderateWidthScale(8),
      // marginHorizontal: moderateWidthScale(20),
      // marginTop: moderateHeightScale(16),
      // marginBottom: moderateHeightScale(16),
      overflow: "hidden",
    },
    changeSubscriptionItem: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
    },
    changeSubscriptionButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    changeSubscriptionText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(12),
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
  });

function CheckoutSubscriptionContent() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;
  const params = useLocalSearchParams<{
    subscriptionId?: string;
    businessId?: string;
    subscriptionName?: string;
    subscriptionPrice?: string;
    subscriptionOriginalPrice?: string;
    subscriptionVisits?: string;
    subscriptionInclusions?: string;
    businessName?: string;
    businessLogo?: string;
    screenName?: string;
  }>();

  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionPickerVisible, setSubscriptionPickerVisible] =
    useState(false);
  const [availableSubscriptions, setAvailableSubscriptions] = useState<any[]>(
    []
  );

  // Fetch business details and find matching subscription (only when coming from DashboardContent)
  const fetchBusinessDetails = async () => {
    if (!params.businessId || !params.subscriptionId) {
      setError("Business ID or Subscription ID is missing");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: any;
        };
      }>(businessEndpoints.businessDetails(params.businessId));

      if (response.success && response.data?.business) {
        setBusinessData(response.data.business);

        // Store all available subscriptions
        if (response.data.business.subscription_plans) {
          setAvailableSubscriptions(response.data.business.subscription_plans);
        }

        // Find matching subscription from subscription_plans
        const subscriptionId = parseInt(params.subscriptionId, 10);
        const subscriptionPlan =
          response.data.business.subscription_plans?.find(
            (plan: any) => plan.id === subscriptionId
          );

        if (subscriptionPlan) {
          // Map subscription data similar to businessDetail
          const mappedSubscription = {
            id: subscriptionPlan.id,
            title: subscriptionPlan.name,
            visits: `${subscriptionPlan.visits} visit${
              subscriptionPlan.visits !== 1 ? "s" : ""
            } per month`,
            price: parseFloat(subscriptionPlan.price),
            originalPrice: subscriptionPlan.original_price
              ? parseFloat(subscriptionPlan.original_price)
              : parseFloat(subscriptionPlan.price) * 1.25, // Fallback calculation if not provided
            inclusions:
              subscriptionPlan.services?.map(
                (service: any, index: number) => `${index + 1}. ${service.name}`
              ) || [],
          };
          setSubscriptionData(mappedSubscription);
        } else {
          setError("Subscription plan not found");
        }
      } else {
        setError("Failed to load business details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load business details");
    } finally {
      setLoading(false);
    }
  };

  // Initialize data from params or fetch from API based on screenName
  useEffect(() => {
    if (params.screenName === "businessDetail") {
      // Coming from businessDetail - use params directly (no API call)
      setLoading(false);
      setError(null);
      setBusinessData({
        id: params.businessId,
        title: params.businessName,
        name: params.businessName,
        logo_url: params.businessLogo,
      });
      setSubscriptionData({
        id: parseInt(params.subscriptionId || "0", 10),
        title: params.subscriptionName,
        price: parseFloat(params.subscriptionPrice || "0"),
        originalPrice: parseFloat(
          params.subscriptionOriginalPrice || params.subscriptionPrice || "0"
        ),
        visits: params.subscriptionVisits,
        inclusions: params.subscriptionInclusions
          ? (() => {
              try {
                return JSON.parse(params.subscriptionInclusions);
              } catch {
                return [];
              }
            })()
          : [],
      });
      // For businessDetail, we need to fetch subscriptions list separately
      if (params.businessId) {
        fetchBusinessSubscriptions(params.businessId);
      }
    } else if (
      params.screenName === "DashboardContent" &&
      params.businessId &&
      params.subscriptionId
    ) {
      // Coming from DashboardContent - fetch from API
      fetchBusinessDetails();
    } else if (params.businessId && params.subscriptionId) {
      // Fallback: if screenName not provided but we have IDs, fetch from API
      fetchBusinessDetails();
    } else {
      setError("Missing required parameters");
      setLoading(false);
    }
  }, []);

  // Fetch business subscriptions for the picker
  const fetchBusinessSubscriptions = async (businessId: string) => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: any;
        };
      }>(businessEndpoints.businessDetails(businessId));

      if (response.success && response.data?.business?.subscription_plans) {
        setAvailableSubscriptions(response.data.business.subscription_plans);
      }
    } catch (err: any) {
      Logger.error("Failed to fetch subscriptions:", err);
    }
  };

  // Get business logo URL
  const getBusinessLogoUrl = useMemo(() => {
    // If coming from businessDetail with logo in params
    if (params.businessLogo && params.businessLogo !== "") {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
      return `${baseUrl}${params.businessLogo}`;
    }
    // If coming from API
    if (businessData?.logo_url) {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
      return `${baseUrl}${businessData.logo_url}`;
    }
    // Default image if no logo available
    return "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";
  }, [businessData?.logo_url, params.businessLogo]);

  const handleSubscribe = async () => {
    if (!subscriptionData?.id) {
      showBanner(
        "Error",
        "Subscription ID is missing. Please try again.",
        "error",
        4000
      );
      return;
    }

    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }

    setIsSubscribing(true);

    try {
      const planId = subscriptionData.id;

      // Step 1: Fetch payment sheet parameters from backend
      const {
        paymentIntent,
        setupIntent,
        customerSessionClientSecret,
        ephemeralKey,
        customer,
      } = await fetchPaymentSheetParams(planId);

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
        paymentConfig.customerSessionClientSecret = customerSessionClientSecret;
      } else if (ephemeralKey) {
        paymentConfig.customerEphemeralKeySecret = ephemeralKey;
      } else {
        throw new Error(
          "Either customerSessionClientSecret or ephemeralKey must be provided"
        );
      }

      // Use paymentIntent for subscription payment, or setupIntent as fallback
      if (paymentIntent && paymentIntent.trim() !== "") {
        paymentConfig.paymentIntentClientSecret = paymentIntent;
      } else if (setupIntent && setupIntent.trim() !== "") {
        paymentConfig.setupIntentClientSecret = setupIntent;
      } else {
        throw new Error(
          "Either Payment Intent or Setup Intent must be provided"
        );
      }

      Logger.log("paymentConfig", paymentConfig);

      const { error: initError } = await initPaymentSheet(paymentConfig);

      if (initError) {
        throw new Error(initError.message || "Failed to initialize payment");
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
            4000
          );
        }
        // If user canceled, don't show error (silent cancel)
        return;
      }

      // Show processing loader
      setProcessingPayment(true);

      // Wait 2-3 seconds before showing success
      setTimeout(() => {
        setProcessingPayment(false);
        setPaymentSuccess(true);
        showBanner(
          "Success",
          "Payment successful! Your subscription will be activated.",
          "success",
          4000
        );

        dispatch(fetchUserStatus({ showError: true })).unwrap();
      }, 2500);
    } catch (err: any) {
      // Extract clean error message
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
      setIsSubscribing(false);
    }
  };

  const handleViewSubscriptions = () => {
    router.navigate("/(main)/dashboard/(account)/" as any);
    setTimeout(() => {
      const subscriptionPath =
        "/(main)/dashboard/(account)/subscriptionCustomer";
      router.push(subscriptionPath as any);
    }, 10);
  };

  const handleChangeSubscription = () => {
    setSubscriptionPickerVisible(true);
  };

  const handleSelectSubscription = (subscription: any) => {
    // Map subscription data similar to businessDetail
    const mappedSubscription = {
      id: subscription.id,
      title: subscription.name,
      visits: `${subscription.visits} visit${
        subscription.visits !== 1 ? "s" : ""
      } per month`,
      price: parseFloat(subscription.price),
      originalPrice: subscription.original_price
        ? parseFloat(subscription.original_price)
        : parseFloat(subscription.price) * 1.25,
      inclusions:
        subscription.services?.map(
          (service: any, index: number) => `${index + 1}. ${service.name}`
        ) || [],
    };
    setSubscriptionData(mappedSubscription);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <StackHeader title="Subscription Plans" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>
            Loading subscription details...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            onPress={fetchBusinessDetails}
            containerStyle={styles.subscribeButton}
          />
        </View>
      ) : paymentSuccess ? (
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather
              name="check-circle"
              size={moderateWidthScale(48)}
              color={theme.darkGreen}
            />
          </View>
          <Text style={styles.successTitle}>Congratulations!</Text>
          <Text style={styles.successMessage}>
            You have successfully subscribed to{" "}
            {subscriptionData?.title || "this plan"}.{"\n\n"}
            Your subscription is now active and ready to use.
          </Text>

          <View style={[styles.bottomContainer,{width:"60%"}]}>
              <Button
                title={"View Subscriptions"  }
                onPress={
                   handleViewSubscriptions  
                }
                loading={isSubscribing}
                disabled={isSubscribing}
                containerStyle={styles.subscribeButton}
              />
            </View>
        </View>
      ) : subscriptionData ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.plansContainer}
        >
          {/* Change Subscription Button - Full Width at Top */}
          <View style={styles.changeSubscriptionCard}>
            <View style={styles.changeSubscriptionItem}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleChangeSubscription}
                style={styles.changeSubscriptionButton}
              >
                <Text style={styles.changeSubscriptionText}>
                  Change subscription
                </Text>
                <View style={styles.addServiceButton}>
                  <Octicons
                    name="plus"
                    size={moderateWidthScale(16)}
                    color={theme.selectCard}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              paddingHorizontal: moderateWidthScale(20),
              paddingTop: moderateHeightScale(20),
            }}
          >
            {/* Business Info */}
            {businessData && (
              <View style={styles.businessInfo}>
                <Image
                  source={{ uri: getBusinessLogoUrl }}
                  style={styles.businessLogo}
                  resizeMode="cover"
                />
                <Text style={styles.businessName}>
                  {businessData.title || businessData.name || "Business"}
                </Text>
              </View>
            )}

            {/* Subscription Plan Card */}
            <View
              style={[styles.planCard, styles.planCardWithBadge, styles.shadow]}
            >
              {/* Decorative Circle */}
              <View style={styles.decorativeCircle} />

              {/* Plan Header with Pricing Badge */}
              <View style={styles.planHeader}>
                <View style={styles.planIcon}>
                  <Feather
                    name="star"
                    size={moderateWidthScale(20)}
                    color={theme.darkGreen}
                  />
                </View>
                <View style={styles.planTitleContainer}>
                  <Text style={styles.planTitle}>
                    {subscriptionData.title || "Subscription Plan"}
                  </Text>
                  <View style={styles.planSubtitle}>
                    <Text style={styles.planSubtitle}>Premium Plan</Text>
                    <Feather
                      name="star"
                      size={moderateWidthScale(12)}
                      color={theme.orangeBrown}
                      style={styles.starIcon}
                    />
                  </View>
                </View>
              </View>

              {/* Monthly Tag */}
              <View style={styles.monthlyTag}>
                <Feather
                  name="calendar"
                  size={moderateWidthScale(14)}
                  color={theme.darkGreen}
                  style={styles.monthlyTagIcon}
                />
                <Text style={styles.monthlyTagText}>
                  Monthly Subscription Available
                </Text>
              </View>

              {/* Description */}
              {subscriptionData.title && (
                <Text style={styles.planDescription}>
                  {subscriptionData.title} - Premium subscription plan with
                  exclusive benefits
                </Text>
              )}

              {/* Features */}
              <View style={styles.featuresContainer}>
                {/* Visits Feature */}
                {subscriptionData.visits && (
                  <View style={styles.featureBlock}>
                    <Feather
                      name="calendar"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                      style={styles.featureIcon}
                    />
                    <Text style={styles.featureText}>
                      {subscriptionData.visits}
                    </Text>
                    <Feather
                      name="check-circle"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                      style={styles.featureCheck}
                    />
                  </View>
                )}

                {/* Included Services */}
                {subscriptionData.inclusions &&
                  subscriptionData.inclusions.length > 0 && (
                    <View style={styles.featureBlockService}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: moderateWidthScale(10),
                        }}
                      >
                        <Feather
                          name="zap"
                          size={moderateWidthScale(16)}
                          color={theme.darkGreen}
                          style={styles.featureIcon}
                        />
                        <Text style={styles.featureText}>
                          Included Services
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: moderateWidthScale(10),
                        }}
                      >
                        {subscriptionData.inclusions.map(
                          (inclusion: string, index: number) => (
                            <View key={index} style={styles.serviceTag}>
                              <Feather
                                name="check-circle"
                                size={moderateWidthScale(12)}
                                color={theme.darkGreen}
                                style={styles.serviceTagIcon}
                              />
                              <Text style={styles.serviceTagText}>
                                {inclusion.replace(/^\d+\.\s*/, "")}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    </View>
                  )}

                {subscriptionData.price && (
                  <View style={styles.pricingBadge}>
                    <Text style={styles.pricingAmount}>
                      ${subscriptionData.price.toFixed(2)} /mo
                    </Text>
                    <Text style={styles.pricingPeriod}>
                      Monthly Subscription
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Bottom Button */}

            <View style={styles.bottomContainer}>
              <Button
                title={paymentSuccess ? "View Subscriptions" : "Subscribe"}
                onPress={
                  paymentSuccess ? handleViewSubscriptions : handleSubscribe
                }
                loading={isSubscribing}
                disabled={isSubscribing}
                containerStyle={styles.subscribeButton}
              />
            </View>
          </View>
        </ScrollView>
      ) : null}

      {/* Processing Payment Overlay */}
      {processingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.processingText}>Processing payment...</Text>
          </View>
        </View>
      )}

      {/* Subscription Picker Bottom Sheet */}
      {availableSubscriptions.length > 0 && (
        <SubscriptionPickerBottomSheet
          visible={subscriptionPickerVisible}
          onClose={() => setSubscriptionPickerVisible(false)}
          subscriptions={availableSubscriptions}
          selectedSubscriptionId={subscriptionData?.id || null}
          onSelectSubscription={handleSelectSubscription}
        />
      )}
    </SafeAreaView>
  );
}

export default function CheckoutSubscription() {
  return <CheckoutSubscriptionContent />;
}
