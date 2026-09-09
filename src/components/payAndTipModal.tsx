import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import {
  fetchTipDetails,
  formatTipAmount,
  formatTipRecipientName,
  getTipPromptLabel,
  type TipDetails,
} from "@/src/services/tipService";

type PayAndTipModalProps = {
  visible: boolean;
  appointmentId: number;
  serviceAmount?: number | null;
  fallbackRecipientName?: string;
  onClose: () => void;
  /** `null` = No Tip; number = tip amount chosen */
  onContinue: (tipAmount: number | null) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    overlayFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.black,
      opacity: 0.55,
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(28),
      borderTopRightRadius: moderateWidthScale(28),
      paddingBottom: moderateHeightScale(28),
      maxHeight: "90%",
      overflow: "hidden",
    },
    handle: {
      alignSelf: "center",
      width: widthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.lightGreen2,
      marginTop: moderateHeightScale(12),
      marginBottom: moderateHeightScale(4),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(16),
      gap: moderateWidthScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen1,
    },
    headerIconWrap: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: widthScale(24),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
    },
    headerTextWrap: {
      flex: 1,
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(18),
    },
    tipPanel: {
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      padding: moderateWidthScale(16),
      marginBottom: moderateHeightScale(14),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(8),
      elevation: 2,
    },
    recipientRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen1,
    },
    recipientBadge: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    recipientBadgeText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    recipientInfo: {
      flex: 1,
    },
    recipientEyebrow: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      letterSpacing: 0.4,
      marginBottom: moderateHeightScale(2),
    },
    recipientName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    amountSectionTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: moderateHeightScale(10),
    },
    amountDisplay: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(12),
    },
    amountDisplayActive: {
      borderColor: theme.orangeBrown,
      backgroundColor: theme.background,
    },
    amountPlaceholderLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(4),
      letterSpacing: 0.3,
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
    noTipButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.lightGreen2,
      borderStyle: "dashed",
      backgroundColor: theme.white,
    },
    noTipButtonSelected: {
      borderStyle: "solid",
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen07,
    },
    noTipText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    noTipTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    breakdownCard: {
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(16),
    },
    breakdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
    },
    breakdownHeaderText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
    },
    breakdownLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    breakdownValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    breakdownDivider: {
      height: 1,
      backgroundColor: theme.lightGreen1,
      marginBottom: moderateHeightScale(10),
    },
    breakdownTotalLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    breakdownTotalValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    errorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      marginBottom: moderateHeightScale(12),
      textAlign: "center",
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
      gap: moderateWidthScale(10),
    },
    loadingText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    actions: {
      gap: moderateHeightScale(4),
      marginTop: moderateHeightScale(2),
      paddingBottom: moderateHeightScale(4),
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(14),
      minHeight: moderateHeightScale(44),
    },
    secondaryButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getNameInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export default function PayAndTipModal({
  visible,
  appointmentId,
  serviceAmount,
  fallbackRecipientName,
  onClose,
  onContinue,
}: PayAndTipModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const [loading, setLoading] = useState(false);
  const [tipDetails, setTipDetails] = useState<TipDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [noTip, setNoTip] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetLocalState = useCallback(() => {
    setTipDetails(null);
    setLoadError(null);
    setCustomAmount("");
    setNoTip(false);
    setValidationError(null);
  }, []);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const details = await fetchTipDetails(appointmentId);
      setTipDetails(details);
    } catch (err: any) {
      setTipDetails(null);
      setLoadError(
        err?.message || "Could not load tip options. You can still pay without a tip.",
      );
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!visible) {
      resetLocalState();
      return;
    }
    void loadDetails();
  }, [visible, loadDetails, resetLocalState]);

  const activeAmount = useMemo(() => {
    if (noTip) return null;
    if (!customAmount.trim()) return null;
    const parsed = Number.parseFloat(customAmount);
    return Number.isFinite(parsed) ? parsed : null;
  }, [customAmount, noTip]);

  const recipientLabel = useMemo(() => {
    if (tipDetails?.recipient) {
      return formatTipRecipientName(tipDetails.recipient.name);
    }
    return formatTipRecipientName(fallbackRecipientName);
  }, [tipDetails?.recipient, fallbackRecipientName]);

  const estimatedTotal = useMemo(() => {
    const service =
      typeof serviceAmount === "number" && Number.isFinite(serviceAmount)
        ? serviceAmount
        : 0;
    const tip = activeAmount ?? 0;
    return service + tip;
  }, [serviceAmount, activeAmount]);

  const handleCustomAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    setNoTip(false);
    setCustomAmount(sanitized);
    setValidationError(null);
  };

  const handleSelectNoTip = () => {
    setNoTip(true);
    setCustomAmount("");
    setValidationError(null);
  };

  const handleContinue = () => {
    if (noTip) {
      onContinue(null);
      return;
    }

    if (activeAmount == null || Number.isNaN(activeAmount)) {
      setValidationError("Enter a tip amount or select No tip, thanks.");
      return;
    }

    if (tipDetails) {
      if (activeAmount < tipDetails.minAmount) {
        setValidationError(
          `Minimum tip is ${formatTipAmount(tipDetails.minAmount, tipDetails.currency)}.`,
        );
        return;
      }
      if (activeAmount > tipDetails.maxAmount) {
        setValidationError(
          `Maximum tip is ${formatTipAmount(tipDetails.maxAmount, tipDetails.currency)}.`,
        );
        return;
      }
    } else if (activeAmount < 1) {
      setValidationError("Minimum tip is $1.00.");
      return;
    }

    onContinue(activeAmount);
  };

  const promptText = tipDetails?.recipient
    ? getTipPromptLabel(tipDetails.recipient)
    : recipientLabel
      ? `Happy with your visit? Say thanks to ${recipientLabel} with a tip.`
      : "Happy with your visit? Add an optional tip.";

  const canContinue = noTip || activeAmount != null;
  const hasAmount = customAmount.trim().length > 0;
  const tipDisplayAmount =
    noTip || activeAmount == null ? 0 : activeAmount;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons
                name="heart"
                size={moderateWidthScale(22)}
                color={theme.orangeBrown}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Pay for your visit</Text>
              <Text style={styles.subtitle}>{promptText}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
              <Text style={styles.loadingText}>Loading tip options...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {loadError ? (
                <Text style={styles.errorText}>{loadError}</Text>
              ) : null}

              <View style={styles.tipPanel}>
                {recipientLabel ? (
                  <View style={styles.recipientRow}>
                    <View style={styles.recipientBadge}>
                      <Text style={styles.recipientBadgeText}>
                        {getNameInitial(recipientLabel)}
                      </Text>
                    </View>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientEyebrow}>Tipping</Text>
                      <Text style={styles.recipientName}>{recipientLabel}</Text>
                    </View>
                    <Ionicons
                      name="sparkles"
                      size={moderateWidthScale(16)}
                      color={theme.orangeBrown}
                    />
                  </View>
                ) : null}

                <Text style={styles.amountSectionTitle}>Amount</Text>
                <View
                  style={[
                    styles.amountDisplay,
                    hasAmount && !noTip && styles.amountDisplayActive,
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

                <TouchableOpacity
                  style={[
                    styles.noTipButton,
                    noTip && styles.noTipButtonSelected,
                  ]}
                  onPress={handleSelectNoTip}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={noTip ? "checkmark-circle" : "close-circle-outline"}
                    size={moderateWidthScale(18)}
                    color={noTip ? theme.buttonBack : theme.lightGreen}
                  />
                  <Text
                    style={[
                      styles.noTipText,
                      noTip && styles.noTipTextSelected,
                    ]}
                  >
                    No tip, thanks
                  </Text>
                </TouchableOpacity>
              </View>

              {typeof serviceAmount === "number" &&
              Number.isFinite(serviceAmount) ? (
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <Ionicons
                      name="receipt-outline"
                      size={moderateWidthScale(14)}
                      color={theme.lightGreen}
                    />
                    <Text style={styles.breakdownHeaderText}>
                      Payment summary
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service</Text>
                    <Text style={styles.breakdownValue}>
                      {formatMoney(serviceAmount)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {recipientLabel ? `Tip · ${recipientLabel}` : "Tip"}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatMoney(tipDisplayAmount)}
                    </Text>
                  </View>

                  <View style={styles.breakdownDivider} />

                  <View style={[styles.breakdownRow, { marginBottom: 0 }]}>
                    <Text style={styles.breakdownTotalLabel}>Total</Text>
                    <Text style={styles.breakdownTotalValue}>
                      {formatMoney(estimatedTotal)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {validationError ? (
                <Text style={styles.errorText}>{validationError}</Text>
              ) : null}

              <View style={styles.actions}>
                <Button
                  title="Continue to pay"
                  onPress={handleContinue}
                  disabled={!canContinue}
                />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
