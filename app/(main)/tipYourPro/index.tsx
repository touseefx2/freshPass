import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import RetryButton from "@/src/components/retryButton";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { useStripeAccount } from "@/src/services/stripeService";
import {
  confirmTipPaid,
  createTipPaymentSheet,
  fetchTipDetails,
  formatTipAmount,
  getTipHeaderTitle,
  resolveApiImageUrl,
  type TipDetails,
} from "@/src/services/tipService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(32),
    },
    centerContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    recipientCard: {
      alignItems: "center",
      marginBottom: moderateHeightScale(28),
    },
    recipientImage: {
      width: widthScale(88),
      height: widthScale(88),
      borderRadius: widthScale(44),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(12),
    },
    recipientPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    recipientInitial: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    recipientName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    subtitle: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
    },
    sectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(20),
    },
    chip: {
      minWidth: widthScale(72),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(24),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      alignItems: "center",
    },
    chipSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen07,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    customAmountContainer: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(24),
    },
    customAmountLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(6),
    },
    customAmountInputRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    currencyPrefix: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(4),
    },
    customAmountInput: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      padding: 0,
    },
    amountHint: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    bottomButton: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
      paddingTop: moderateHeightScale(8),
    },
    receiptCard: {
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      padding: moderateWidthScale(16),
      borderLeftWidth: moderateWidthScale(3),
      borderLeftColor: theme.darkGreen,
    },
    receiptTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    receiptText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    reasonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
    },
    successText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(12),
    },
  });

function resolveRecipientImage(image?: string | null): string | null {
  return resolveApiImageUrl(image);
}

export default function TipYourProScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const { showBanner } = useNotificationContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const params = useLocalSearchParams<{ appointmentId?: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tipDetails, setTipDetails] = useState<TipDetails | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const appointmentId = Number(params.appointmentId);
  const hasValidAppointmentId =
    params.appointmentId != null && !Number.isNaN(appointmentId);

  const loadTipDetails = useCallback(async () => {
    if (!hasValidAppointmentId) {
      setLoading(false);
      setError(true);
      return;
    }

    try {
      setLoading(true);
      setError(false);
      const details = await fetchTipDetails(appointmentId);
      setTipDetails(details);
      if (details.suggestedAmounts.length > 0) {
        setSelectedAmount(details.suggestedAmounts[0]);
        setCustomAmount("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, hasValidAppointmentId]);

  useFocusEffect(
    useCallback(() => {
      loadTipDetails();
    }, [loadTipDetails]),
  );

  const activeAmount = useMemo(() => {
    if (customAmount.trim()) {
      const parsed = Number.parseFloat(customAmount);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return selectedAmount;
  }, [customAmount, selectedAmount]);

  const headerTitle = useMemo(() => {
    if (!tipDetails?.recipient) {
      return "Tip Your Pro";
    }
    return getTipHeaderTitle(tipDetails.recipient);
  }, [tipDetails?.recipient]);

  const handleSelectSuggested = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    setCustomAmount(sanitized);
    setSelectedAmount(null);
  };

  const validateAmount = (): string | null => {
    if (!tipDetails) return "Tip details are unavailable.";
    if (activeAmount == null || Number.isNaN(activeAmount)) {
      return "Please choose or enter a tip amount.";
    }
    if (activeAmount < tipDetails.minAmount) {
      return `Minimum tip is ${formatTipAmount(tipDetails.minAmount, tipDetails.currency)}.`;
    }
    if (activeAmount > tipDetails.maxAmount) {
      return `Maximum tip is ${formatTipAmount(tipDetails.maxAmount, tipDetails.currency)}.`;
    }
    return null;
  };

  const handleConfirmTip = async () => {
    if (!tipDetails?.canTip || activeAmount == null) {
      return;
    }

    const validationError = validateAmount();
    if (validationError) {
      showBanner("Tip", validationError, "error", 3000);
      return;
    }

    setSubmitting(true);
    dispatch(setActionLoader(true));

    try {
      const sheetData = await createTipPaymentSheet(appointmentId, activeAmount);
      dispatch(setActionLoader(false));
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        await useStripeAccount(sheetData.connectedAccountId);

        const paymentConfig: Record<string, unknown> = {
          merchantDisplayName: sheetData.recipient.name,
          customerId: sheetData.customer,
          paymentIntentClientSecret: sheetData.paymentIntent,
          allowsDelayedPaymentMethods: true,
          defaultBillingDetails: {
            name: user.name || undefined,
            email: user.email || undefined,
          },
        };

        if (sheetData.customerSessionClientSecret) {
          paymentConfig.customerSessionClientSecret =
            sheetData.customerSessionClientSecret;
        }

        const { error: initError } = await initPaymentSheet(paymentConfig as any);
        if (initError) {
          throw new Error(initError.message || "Failed to initialize payment");
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (!presentError.code?.includes("Canceled")) {
            showBanner(
              "Payment Failed",
              presentError.message || "Payment could not be completed",
              "error",
              4000,
            );
          }
          return;
        }

        setPaymentSuccess(true);
        showBanner("Thank you!", "Your tip was sent successfully.", "success", 3000);

        const paidTip = await confirmTipPaid(appointmentId);
        if (paidTip) {
          setTipDetails((prev) =>
            prev
              ? {
                  ...prev,
                  canTip: false,
                  reason: null,
                  tip: paidTip,
                }
              : prev,
          );
        } else {
          await loadTipDetails();
        }
      } finally {
        await useStripeAccount(null);
      }
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || "Failed to process tip payment";
      showBanner("Tip", message, "error", 4000);
    } finally {
      setSubmitting(false);
      dispatch(setActionLoader(false));
    }
  };

  const renderRecipient = () => {
    if (!tipDetails?.recipient) return null;

    const imageUri = resolveRecipientImage(tipDetails.recipient.image);
    const initial = tipDetails.recipient.name?.charAt(0)?.toUpperCase() || "?";

    return (
      <View style={styles.recipientCard}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.recipientImage} />
        ) : (
          <View style={[styles.recipientImage, styles.recipientPlaceholder]}>
            <Text style={styles.recipientInitial}>{initial}</Text>
          </View>
        )}
        <Text style={styles.recipientName}>{tipDetails.recipient.name}</Text>
        <Text style={styles.subtitle}>
          Happy with your visit? Say thanks with a tip.
        </Text>
      </View>
    );
  };

  const renderTipForm = () => {
    if (!tipDetails) return null;

    return (
      <>
        {renderRecipient()}
        <Text style={styles.sectionTitle}>Choose an amount</Text>
        <View style={styles.chipsRow}>
          {tipDetails.suggestedAmounts.map((amount) => {
            const isSelected =
              selectedAmount === amount && customAmount.trim() === "";
            return (
              <TouchableOpacity
                key={amount}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => handleSelectSuggested(amount)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText}>
                  {formatTipAmount(amount, tipDetails.currency)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.customAmountContainer}>
          <Text style={styles.customAmountLabel}>Custom amount</Text>
          <View style={styles.customAmountInputRow}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.customAmountInput}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.lightGreen5}
            />
          </View>
          <Text style={styles.amountHint}>
            Min {formatTipAmount(tipDetails.minAmount, tipDetails.currency)} · Max{" "}
            {formatTipAmount(tipDetails.maxAmount, tipDetails.currency)}
          </Text>
        </View>
      </>
    );
  };

  const renderReceipt = () => {
    if (!tipDetails?.tip) return null;

    return (
      <View style={styles.receiptCard}>
        <Text style={styles.receiptTitle}>Tip sent</Text>
        <Text style={styles.receiptText}>
          You tipped {formatTipAmount(tipDetails.tip.amount, tipDetails.tip.currency)}{" "}
          to {tipDetails.tip.recipientName}.
        </Text>
      </View>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      );
    }

    if (error || !hasValidAppointmentId) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.reasonText}>
            Unable to load tip details. Please try again.
          </Text>
          <RetryButton onPress={loadTipDetails} loading={loading} />
        </View>
      );
    }

    if (tipDetails?.tip) {
      return (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderRecipient()}
          {renderReceipt()}
        </ScrollView>
      );
    }

    if (!tipDetails?.canTip) {
      return (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderRecipient()}
          <Text style={styles.reasonText}>
            {tipDetails?.reason || "Tipping is not available for this appointment."}
          </Text>
        </ScrollView>
      );
    }

    return (
      <>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderTipForm()}
          {paymentSuccess ? (
            <Text style={styles.successText}>
              Processing your tip. This may take a moment.
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.bottomButton}>
          <Button
            title="Send tip"
            onPress={handleConfirmTip}
            disabled={submitting || activeAmount == null}
          />
        </View>
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={headerTitle} />
      {renderBody()}
    </SafeAreaView>
  );
}
