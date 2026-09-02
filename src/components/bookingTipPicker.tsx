import React, { useMemo, useState, useEffect } from "react";
import {
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
import {
  TIP_MAX_AMOUNT,
  TIP_MIN_AMOUNT,
  computeSuggestedTipAmounts,
  formatTipAmount,
} from "@/src/services/tipService";

type BookingTipPickerProps = {
  serviceTotal: number;
  tipAmount: number | null;
  onTipAmountChange: (amount: number | null) => void;
  recipientName?: string | null;
  compact?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(14),
      marginBottom: moderateHeightScale(8),
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
      lineHeight: fontSize.size18,
      textTransform: "capitalize",
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
    },
    chip: {
      minWidth: widthScale(64),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    chipSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    chipTextSelected: {
      color: theme.buttonText,
    },
    customRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    customLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginRight: moderateWidthScale(10),
      paddingRight: moderateWidthScale(10),
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
    },
    currencyPrefix: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(4),
    },
    customInput: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      padding: 0,
    },
    hint: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "right",
    },
  });

export default function BookingTipPicker({
  serviceTotal,
  tipAmount,
  onTipAmountChange,
  recipientName,
  compact = false,
}: BookingTipPickerProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const suggestedAmounts = useMemo(
    () => computeSuggestedTipAmounts(serviceTotal),
    [serviceTotal],
  );

  const [customAmount, setCustomAmount] = useState("");
  const isCustomSelected =
    tipAmount != null &&
    tipAmount > 0 &&
    !suggestedAmounts.includes(tipAmount);

  useEffect(() => {
    if (isCustomSelected && tipAmount != null) {
      setCustomAmount(String(tipAmount));
    }
  }, [isCustomSelected, tipAmount]);

  const handleSelectSuggested = (amount: number) => {
    setCustomAmount("");
    onTipAmountChange(amount);
  };

  const handleSelectNoTip = () => {
    setCustomAmount("");
    onTipAmountChange(null);
  };

  const handleCustomChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    setCustomAmount(sanitized);
    if (!sanitized.trim()) {
      onTipAmountChange(null);
      return;
    }
    const parsed = Number.parseFloat(sanitized);
    if (!Number.isFinite(parsed)) {
      onTipAmountChange(null);
      return;
    }
    onTipAmountChange(parsed);
  };

  const noTipSelected = tipAmount == null || tipAmount <= 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Add a tip</Text>
      {!compact ? (
        <Text style={styles.subtitle}>
          {recipientName?.trim()
            ? `Optional tip for ${recipientName.trim()}`
            : "Say thanks with an optional tip"}
        </Text>
      ) : null}

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, noTipSelected && styles.chipSelected]}
          onPress={handleSelectNoTip}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.chipText, noTipSelected && styles.chipTextSelected]}
          >
            No tip
          </Text>
        </TouchableOpacity>
        {suggestedAmounts.map((amount) => {
          const selected = tipAmount === amount && customAmount.trim() === "";
          return (
            <TouchableOpacity
              key={amount}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handleSelectSuggested(amount)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {formatTipAmount(amount, "usd")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.customRow}>
        <Text style={styles.customLabel}>Other</Text>
        <Text style={styles.currencyPrefix}>$</Text>
        <TextInput
          style={styles.customInput}
          value={customAmount}
          onChangeText={handleCustomChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={theme.lightGreen5}
        />
      </View>
      <Text style={styles.hint}>
        Min {formatTipAmount(TIP_MIN_AMOUNT)} · Max{" "}
        {formatTipAmount(TIP_MAX_AMOUNT)}
      </Text>
    </View>
  );
}
