import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Button from "@/src/components/button";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { fetchPaymentSheetParams } from "@/src/services/stripeService";
import { useAppSelector } from "@/src/hooks/hooks";
import NotificationBanner from "@/src/components/notificationBanner";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { fetchUserStatus } from "../state/thunks/businessThunks";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  planType: string;
  active: boolean;
  visits: number | null;
  createdAt: string;
  services: any[];
}

interface BusinessPlansModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalContainer: {
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
    headerTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    closeButton: {
      padding: moderateWidthScale(8),
      marginLeft: moderateWidthScale(12),
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
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
    plansContainer: {
      gap: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(30),
    },
    planCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
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
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(12),
    },
    planName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    planPrice: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontExtraBold,
      color: theme.buttonBack,
    },
    planDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(16),
      lineHeight: fontSize.size20,
    },
    planDetails: {
      marginBottom: moderateHeightScale(20),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    detailIcon: {
      marginRight: moderateWidthScale(8),
    },
    detailText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      flex: 1,
    },
    subscribeButton: {
      marginTop: moderateHeightScale(8),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
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
  });

function BusinessPlansModalContent({
  visible,
  onClose,
  onSuccess,
}: BusinessPlansModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state: any) => state.user);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<number | null>(
    null
  );
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isSetupIntent, setIsSetupIntent] = useState(false);
  const dispatch = useAppDispatch();

  const [localBanner, setLocalBanner] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    setApiError(false);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          data: SubscriptionPlan[];
        };
      }>(businessEndpoints.subscriptionPlans());

      if (response.success && response.data?.data) {
        setPlans(response.data.data);
      } else {
        setError("Failed to load subscription plans");
        setApiError(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription plans");
      setApiError(true);
      showBanner(
        "Error",
        err.message || "Failed to load subscription plans",
        "error",
        2500
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchPlans();
    }
  }, [visible]);

  const handleSubscribe = async (planId: number) => {
    setSubscribingPlanId(planId);
    setIsSetupIntent(false);

    try {
      // Step 1: Fetch payment sheet parameters from backend
      const {
        paymentIntent,
        customerSessionClientSecret,
        ephemeralKey,
        customer,
        setupIntent,
      } = await fetchPaymentSheetParams(planId);

      // Step 2: Initialize payment sheet directly
      const paymentConfig: any = {
        merchantDisplayName: "Fresh Pass",
        customerId: customer,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user.name || undefined,
          email: user.email || undefined,
        },
        // Explicitly set customFlow to false to prevent native SDK crash
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

      // Use setupIntent for subscriptions if available, otherwise use paymentIntent
      if (setupIntent && setupIntent.includes("_secret_")) {
        // SetupIntent is in correct client secret format
        paymentConfig.setupIntentClientSecret = setupIntent;
        const trialDays = process.env.EXPO_PUBLIC_TRAILDAY || "0";
        paymentConfig.primaryButtonLabel = `Start ${trialDays} Days Free Trial`;
        setIsSetupIntent(true);
      } else if (paymentIntent && paymentIntent.trim() !== "") {
        setIsSetupIntent(false);
        // Use paymentIntent if setupIntent is not available or not in correct format
        paymentConfig.paymentIntentClientSecret = paymentIntent;
      } else if (setupIntent) {
        // SetupIntent exists but is not in client secret format
        throw new Error(
          "SetupIntent must be in client secret format (seti_xxxxx_secret_xxxxx). " +
            "The backend returned just the setup intent ID. Please update the backend to return the full client secret."
        );
      } else {
        throw new Error("Either setupIntent or paymentIntent must be provided");
      }

      const { error: initError } = await initPaymentSheet(paymentConfig);

      if (initError) {
        throw new Error(initError.message || "Failed to initialize payment");
      }

      // Step 3: Present payment sheet to user
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // Payment was cancelled or failed
        if (!presentError.code?.includes("Canceled")) {
          setLocalBanner({
            visible: true,
            title: "Payment Failed",
            message: presentError.message || "Payment could not be completed",
            type: "error",
          });

          setTimeout(() => {
            setLocalBanner((prev) => ({ ...prev, visible: false }));
          }, 2500);
        }
        // If user canceled, don't show error (silent cancel)
        return;
      }

      // Show processing loader
      setProcessingPayment(true);

      // Wait 2-3 seconds before showing success and closing
      setTimeout(() => {
        setProcessingPayment(false);
        const successMessage = isSetupIntent
          ? "Trial started successfully! Your free trial will be activated."
          : "Payment successful! Your subscription will be activated.";
        showBanner("Success", successMessage, "success", 4000);
        onClose();

        dispatch(fetchUserStatus({ showError: true })).unwrap();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      }, 2500);
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

      // Show banner inside modal (Modal covers external banners)
      setLocalBanner({
        visible: true,
        title: "Error",
        message: errorMessage,
        type: "error",
      });
      // Auto-hide banner after 3 seconds
      setTimeout(() => {
        setLocalBanner((prev) => ({ ...prev, visible: false }));
      }, 2500);
    } finally {
      setSubscribingPlanId(null);
    }
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.modalOverlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + moderateHeightScale(20),
        },
      ]}
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Business Plans</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Feather
              name="x"
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </View>

        {loading && plans.length === 0 ? (
          <Skeleton screenType="BusinessPlans" styles={styles} />
        ) : apiError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <RetryButton onPress={fetchPlans} loading={loading} />
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No subscription plans available
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.plansContainer}
          >
            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planCard, styles.shadow]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>${plan.price}</Text>
                </View>
                {plan.description && (
                  <Text style={styles.planDescription}>{plan.description}</Text>
                )}
                <View style={styles.planDetails}>
                  {plan.visits !== null && (
                    <View style={styles.detailRow}>
                      <Feather
                        name="calendar"
                        size={moderateWidthScale(16)}
                        color={theme.darkGreen}
                        style={styles.detailIcon}
                      />
                      <Text style={styles.detailText}>
                        {plan.visits} visits included
                      </Text>
                    </View>
                  )}
                  {plan.services && plan.services.length > 0 && (
                    <View style={styles.detailRow}>
                      <Feather
                        name="check-circle"
                        size={moderateWidthScale(16)}
                        color={theme.darkGreen}
                        style={styles.detailIcon}
                      />
                      <Text style={styles.detailText}>
                        {plan.services.length} services included
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Feather
                      name="check-circle"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                      style={styles.detailIcon}
                    />
                    <Text style={styles.detailText}>
                      Active plan - Ready to use
                    </Text>
                  </View>
                </View>
                <Button
                  title="Subscribe Now"
                  onPress={() => handleSubscribe(plan.id)}
                  loading={subscribingPlanId === plan.id}
                  disabled={subscribingPlanId !== null}
                  containerStyle={styles.subscribeButton}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <NotificationBanner
        visible={localBanner.visible}
        title={localBanner.title}
        message={localBanner.message}
        type={localBanner.type}
        duration={3000}
        onDismiss={() =>
          setLocalBanner((prev) => ({ ...prev, visible: false }))
        }
      />

      {processingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.processingText}>
              {isSetupIntent ? "Processing trial..." : "Processing payment..."}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function BusinessPlansModal({
  visible,
  onClose,
  onSuccess,
}: BusinessPlansModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
      >
        <BusinessPlansModalContent visible={visible} onClose={onClose} onSuccess={onSuccess} />
      </StripeProvider>
    </Modal>
  );
}
