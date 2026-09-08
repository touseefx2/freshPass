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
      opacity: 0.5,
    },
    sheet: {
      backgroundColor: theme.white,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(28),
      maxHeight: "88%",
    },
    handle: {
      alignSelf: "center",
      width: widthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.borderLight,
      marginBottom: moderateHeightScale(16),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(18),
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
      marginBottom: moderateHeightScale(16),
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
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
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
    noTipButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    noTipButtonSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen07,
    },
    noTipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    breakdownCard: {
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(16),
      gap: moderateHeightScale(8),
    },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    breakdownLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    breakdownValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    breakdownTotalLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    breakdownTotalValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
      paddingVertical: moderateHeightScale(32),
      gap: moderateWidthScale(10),
    },
    loadingText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    actions: {
      gap: moderateHeightScale(4),
      marginTop: moderateHeightScale(4),
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
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [noTip, setNoTip] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetLocalState = useCallback(() => {
    setTipDetails(null);
    setLoadError(null);
    setSelectedAmount(null);
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

  const suggestedAmounts = useMemo(() => {
    if (!tipDetails) return [];
    return tipDetails.suggestedAmounts.filter(
      (amount) => amount >= tipDetails.minAmount && amount <= tipDetails.maxAmount,
    );
  }, [tipDetails]);

  const activeAmount = useMemo(() => {
    if (noTip) return null;
    if (customAmount.trim()) {
      const parsed = Number.parseFloat(customAmount);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return selectedAmount;
  }, [customAmount, selectedAmount, noTip]);

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

  const handleSelectSuggested = (amount: number) => {
    setNoTip(false);
    setSelectedAmount(amount);
    setCustomAmount("");
    setValidationError(null);
  };

  const handleCustomAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    setNoTip(false);
    setCustomAmount(sanitized);
    setSelectedAmount(null);
    setValidationError(null);
  };

  const handleSelectNoTip = () => {
    setNoTip(true);
    setSelectedAmount(null);
    setCustomAmount("");
    setValidationError(null);
  };

  const handleContinue = () => {
    if (noTip) {
      onContinue(null);
      return;
    }

    if (activeAmount == null || Number.isNaN(activeAmount)) {
      setValidationError("Choose a tip amount or select No Tip.");
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
      ? `Add an optional tip for ${recipientLabel}, or continue with No Tip.`
      : "Add an optional tip, or continue with No Tip.";

  const canContinue = noTip || activeAmount != null;

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
          <Text style={styles.title}>Pay for your visit</Text>
          <Text style={styles.subtitle}>{promptText}</Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
              <Text style={styles.loadingText}>Loading tip options...</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {loadError ? (
                <Text style={styles.errorText}>{loadError}</Text>
              ) : null}

              {suggestedAmounts.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Suggested tip</Text>
                  <View style={styles.chipsRow}>
                    {suggestedAmounts.map((amount) => {
                      const isSelected =
                        !noTip &&
                        selectedAmount === amount &&
                        customAmount.trim() === "";
                      return (
                        <TouchableOpacity
                          key={amount}
                          style={[styles.chip, isSelected && styles.chipSelected]}
                          onPress={() => handleSelectSuggested(amount)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.chipText}>
                            {formatTipAmount(
                              amount,
                              tipDetails?.currency ?? "usd",
                            )}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <View style={styles.customAmountContainer}>
                <Text style={styles.customAmountLabel}>Custom tip</Text>
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
                {tipDetails ? (
                  <Text style={styles.amountHint}>
                    Min{" "}
                    {formatTipAmount(tipDetails.minAmount, tipDetails.currency)}{" "}
                    · Max{" "}
                    {formatTipAmount(tipDetails.maxAmount, tipDetails.currency)}
                  </Text>
                ) : (
                  <Text style={styles.amountHint}>Min $1.00 · Max $1,000.00</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.noTipButton,
                  noTip && styles.noTipButtonSelected,
                ]}
                onPress={handleSelectNoTip}
                activeOpacity={0.8}
              >
                <Text style={styles.noTipText}>No Tip</Text>
              </TouchableOpacity>

              {typeof serviceAmount === "number" &&
              Number.isFinite(serviceAmount) ? (
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service</Text>
                    <Text style={styles.breakdownValue}>
                      {formatMoney(serviceAmount)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {recipientLabel ? `Tip for ${recipientLabel}` : "Tip"}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {noTip || activeAmount == null
                        ? formatMoney(0)
                        : formatMoney(activeAmount)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
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
