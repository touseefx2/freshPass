import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { useStripeAccount } from "@/src/services/stripeService";
import {
  confirmTipPaid,
  createTipPaymentSheet,
  fetchTipDetails,
  formatTipAmount,
  getTipPromptLabel,
  resolveApiImageUrl,
  type PaidTip,
  type TipDetails,
  type TipRecipient,
} from "@/src/services/tipService";

type TipSectionProps = {
  appointmentId: number;
  initialCanTip?: boolean;
  initialTip?: PaidTip | null;
  fallbackRecipientName?: string;
  fallbackRecipientType?: "staff" | "business";
  fallbackRecipientImage?: string | null;
  onTipComplete?: () => void;
};

type RecipientAvatarProps = {
  name: string;
  image?: string | null;
  styles: ReturnType<typeof createStyles>;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      paddingHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(8),
    },
    card: {
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(8),
      elevation: 3,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      backgroundColor: theme.lightGreen07,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: moderateWidthScale(12),
    },
    headerIconWrap: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextWrap: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionSubtitle: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    body: {
      padding: moderateWidthScale(16),
    },
    recipientCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      marginBottom: moderateHeightScale(4),
    },
    avatarRing: {
      padding: moderateWidthScale(3),
      borderRadius: widthScale(36),
      borderWidth: 2,
      borderColor: theme.orangeBrown,
      marginRight: moderateWidthScale(14),
    },
    recipientImage: {
      width: widthScale(58),
      height: widthScale(58),
      borderRadius: widthScale(29),
      backgroundColor: theme.lightGreen05,
    },
    recipientPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.emptyProfileImage,
    },
    recipientInitial: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    recipientInfo: {
      flex: 1,
    },
    recipientLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: moderateHeightScale(4),
    },
    recipientName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    subtitle: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    tipFormPanel: {
      marginTop: moderateHeightScale(16),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      padding: moderateWidthScale(14),
    },
    amountSectionTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: moderateHeightScale(12),
    },
    amountDisplay: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(14),
    },
    amountDisplayActive: {
      borderColor: theme.orangeBrown,
      backgroundColor: theme.background,
    },
    amountInputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    currencyPrefix: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(2),
    },
    customAmountInput: {
      minWidth: widthScale(80),
      maxWidth: widthScale(160),
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      padding: 0,
      textAlign: "center",
    },
    amountPlaceholderLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(4),
      letterSpacing: 0.3,
    },
    sendButtonWrap: {
      marginTop: moderateHeightScale(2),
    },
    receiptCard: {
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    receiptTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    receiptAvatarWrap: {
      position: "relative",
    },
    receiptBadge: {
      position: "absolute",
      right: -moderateWidthScale(2),
      bottom: -moderateHeightScale(2),
      width: widthScale(20),
      height: widthScale(20),
      borderRadius: widthScale(10),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.white,
      zIndex: 1,
    },
    receiptInfo: {
      flex: 1,
    },
    receiptEyebrow: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      letterSpacing: 0.4,
      marginBottom: moderateHeightScale(4),
    },
    receiptName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      marginBottom: moderateHeightScale(2),
    },
    receiptSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    receiptAmountPill: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      minWidth: widthScale(64),
    },
    receiptAmount: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    receiptFooter: {
      marginTop: moderateHeightScale(12),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    receiptFooterText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    receiptIconWrap: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: widthScale(26),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(12),
    },
    receiptText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
      textTransform: "capitalize",
    },
    reasonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
      textAlign: "center",
      paddingVertical: moderateHeightScale(8),
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(24),
      gap: moderateWidthScale(10),
    },
    loadingText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

function getNameInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function RecipientAvatar({ name, image, styles }: RecipientAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUri = useMemo(() => resolveApiImageUrl(image), [image]);
  const initial = getNameInitial(name);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  const showImage = Boolean(imageUri) && !imageFailed;

  return (
    <View style={styles.avatarRing}>
      {showImage && imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.recipientImage}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.recipientImage, styles.recipientPlaceholder]}>
          <Text style={styles.recipientInitial}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

function buildFallbackRecipient(
  name?: string,
  type?: "staff" | "business",
  image?: string | null,
): TipRecipient | null {
  if (!name?.trim()) return null;
  return {
    type: type ?? "staff",
    staffId: null,
    name: name.trim(),
    image: image ?? null,
  };
}

function mergeRecipientImage(
  recipient: TipRecipient | null,
  fallbackImage?: string | null,
): TipRecipient | null {
  if (!recipient) return null;
  if (recipient.image?.trim() || !fallbackImage?.trim()) {
    return recipient;
  }
  return { ...recipient, image: fallbackImage.trim() };
}

export default function TipSection({
  appointmentId,
  initialCanTip = false,
  initialTip = null,
  fallbackRecipientName,
  fallbackRecipientType,
  fallbackRecipientImage,
  onTipComplete,
}: TipSectionProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const { showBanner } = useNotificationContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(initialCanTip && !initialTip);
  const [tipDetails, setTipDetails] = useState<TipDetails | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paidTip = tipDetails?.tip ?? initialTip ?? null;
  // pendingTip is ignored for UI — still show the tip card so user can tip/retry
  const canTip =
    !paidTip &&
    (tipDetails?.canTip === true ||
      tipDetails?.pendingTip != null ||
      (tipDetails == null && !!initialCanTip));

  const loadTipDetails = useCallback(async () => {
    if (paidTip && !initialCanTip) {
      return;
    }

    try {
      setLoading(true);
      const details = await fetchTipDetails(appointmentId);
      setTipDetails(details);
    } catch {
      if (!paidTip) {
        setTipDetails(null);
      }
    } finally {
      setLoading(false);
    }
  }, [appointmentId, initialCanTip, paidTip]);

  useEffect(() => {
    if (initialCanTip || initialTip) {
      loadTipDetails();
    }
  }, [initialCanTip, initialTip, loadTipDetails]);

  const recipient = useMemo(() => {
    let base: TipRecipient | null = null;

    if (tipDetails?.recipient) {
      base = tipDetails.recipient;
    } else if (paidTip) {
      base = {
        type: paidTip.recipientType,
        staffId: paidTip.recipientStaffId,
        name: paidTip.recipientName,
        image: null,
      };
    } else {
      base = buildFallbackRecipient(
        fallbackRecipientName,
        fallbackRecipientType,
        fallbackRecipientImage,
      );
    }

    return mergeRecipientImage(base, fallbackRecipientImage);
  }, [
    tipDetails?.recipient,
    paidTip,
    fallbackRecipientName,
    fallbackRecipientType,
    fallbackRecipientImage,
  ]);

  const activeAmount = useMemo(() => {
    if (!customAmount.trim()) return null;
    const parsed = Number.parseFloat(customAmount);
    return Number.isFinite(parsed) ? parsed : null;
  }, [customAmount]);

  const handleCustomAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    setCustomAmount(sanitized);
  };

  const validateAmount = (): string | null => {
    if (!tipDetails) return "Tip details are unavailable.";
    if (activeAmount == null || Number.isNaN(activeAmount)) {
      return "Please enter a tip amount.";
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
    if (!canTip || !tipDetails || activeAmount == null) {
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

        showBanner("Thank you!", "Your tip was sent successfully.", "success", 3000);

        const confirmedTip = await confirmTipPaid(appointmentId);
        if (confirmedTip) {
          setTipDetails((prev) =>
            prev
              ? { ...prev, canTip: false, reason: null, tip: confirmedTip }
              : prev,
          );
        } else {
          await loadTipDetails();
        }
        onTipComplete?.();
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

  if (!paidTip && !canTip && !loading && !tipDetails) {
    return null;
  }

  const renderRecipient = () => {
    if (!recipient) return null;

    return (
      <View style={styles.recipientCard}>
        <RecipientAvatar
          name={recipient.name}
          image={recipient.image}
          styles={styles}
        />
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientLabel}>Tip for</Text>
          <Text style={styles.recipientName}>{recipient.name}</Text>
          {canTip ? (
            <Text style={styles.subtitle}>{getTipPromptLabel(recipient)}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderReceipt = () => {
    if (!paidTip || !recipient) return null;

    return (
      <View style={styles.receiptCard}>
        <View style={styles.receiptTopRow}>
          <View style={styles.receiptAvatarWrap}>
            <RecipientAvatar
              name={recipient.name}
              image={recipient.image}
              styles={styles}
            />
            <View style={styles.receiptBadge}>
              <Ionicons
                name="heart"
                size={moderateWidthScale(10)}
                color={theme.buttonText}
              />
            </View>
          </View>

          <View style={styles.receiptInfo}>
            <Text style={styles.receiptEyebrow}>Thank you</Text>
            <Text style={styles.receiptName}>{recipient.name}</Text>
            <Text style={styles.receiptSubtitle}>
              Received your appreciation
            </Text>
          </View>

          <View style={styles.receiptAmountPill}>
            <Text style={styles.receiptAmount}>
              {formatTipAmount(paidTip.amount, paidTip.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.receiptFooter}>
          <Ionicons
            name="checkmark-circle"
            size={moderateWidthScale(16)}
            color={theme.buttonBack}
          />
          <Text style={styles.receiptFooterText}>
            Your tip of {formatTipAmount(paidTip.amount, paidTip.currency)} was
            shared successfully
          </Text>
        </View>
      </View>
    );
  };

  const renderTipForm = () => {
    if (!canTip || !tipDetails) return null;

    const hasAmount = customAmount.trim().length > 0;

    return (
      <View style={styles.tipFormPanel}>
        <Text style={styles.amountSectionTitle}>Amount</Text>

        <View
          style={[
            styles.amountDisplay,
            hasAmount && styles.amountDisplayActive,
          ]}
        >
          <Text style={styles.amountPlaceholderLabel}>Your tip</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.customAmountInput}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.lightGreen5}
              selectionColor={theme.orangeBrown}
            />
          </View>
        </View>

        <View style={styles.sendButtonWrap}>
          <Button
            title="Send tip"
            onPress={handleConfirmTip}
            disabled={submitting || activeAmount == null}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons
              name="heart"
              size={moderateWidthScale(20)}
              color={theme.orangeBrown}
            />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.sectionTitle}>Tip Your Pro</Text>
            <Text style={styles.sectionSubtitle}>
              Show appreciation for great service
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
              <Text style={styles.loadingText}>Loading tip options...</Text>
            </View>
          ) : (
            <>
              {paidTip ? renderReceipt() : renderRecipient()}
              {!paidTip && canTip ? renderTipForm() : null}
              {!paidTip && !canTip && tipDetails?.reason ? (
                <Text style={styles.reasonText}>{tipDetails.reason}</Text>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
