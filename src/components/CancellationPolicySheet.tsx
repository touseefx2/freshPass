import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import type { CancellationPolicyQuote } from "@/src/types/cancellationPolicy";

interface CancellationPolicySheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quote: CancellationPolicyQuote | null;
  isPayLater: boolean;
  confirming?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(10),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rowLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
      paddingRight: moderateWidthScale(12),
    },
    rowValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      flex: 1,
      textAlign: "right",
    },
    policyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
      marginTop: moderateHeightScale(16),
    },
    payLaterCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(14),
      backgroundColor: theme.orangeBrown01,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      overflow: "hidden",
    },
    payLaterAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: moderateWidthScale(4),
      backgroundColor: theme.selectCard,
    },
    payLaterIconWrap: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginLeft: moderateWidthScale(4),
    },
    payLaterTextBlock: {
      flex: 1,
      gap: moderateHeightScale(2),
      paddingRight: moderateWidthScale(2),
    },
    payLaterTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    payLaterBody: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size16,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(20),
      gap: moderateWidthScale(12),
    },
    checkboxIconWrapper: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: moderateWidthScale(46 / 2),
      backgroundColor: theme.lightBeige,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    checkbox: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(5),
      borderWidth: 1.5,
      borderColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
  });

function formatCurrencyAmount(amount: number, currency?: string): string {
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatLocalDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CancellationPolicySheet({
  visible,
  onClose,
  onConfirm,
  quote,
  isPayLater,
  confirming = false,
}: CancellationPolicySheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const [agreed, setAgreed] = useState(false);
  const prevVisibleRef = useRef(false);

  const isMembership = quote?.appointmentType === "subscription";

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setAgreed(false);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const freeCancellationValue = (() => {
    if (!quote) return "—";
    if (
      !isMembership &&
      quote.cancellationFeePercent === 0 &&
      !quote.alwaysCharge
    ) {
      return t("freeCancellationAnyTime");
    }
    const formatted = formatLocalDateTime(quote.freeCancellationUntil);
    if (formatted) {
      return t("freeCancellationUntil", { date: formatted });
    }
    if (isMembership) {
      return t("visitReturned");
    }
    if (quote.cancellationFeePercent === 0) {
      return t("freeCancellationAnyTime");
    }
    return t("freeCancellationNotAvailable");
  })();

  const lateFeeValue = quote
    ? `${quote.cancellationFeePercent ?? 0}% (${formatCurrencyAmount(
        quote.cancellationFeeAmount ?? 0,
        quote.currency,
      )})`
    : "—";

  const noShowFeeValue = quote
    ? `${quote.noShowFeePercent ?? 0}% (${formatCurrencyAmount(
        quote.noShowFeeAmount ?? 0,
        quote.currency,
      )})`
    : "—";

  const lateVisitValue = quote?.lateCancelForfeitsVisit
    ? t("usesOneVisit")
    : t("visitReturned");
  const noShowVisitValue = quote?.noShowForfeitsVisit
    ? t("usesOneVisit")
    : t("visitReturned");

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("cancellationPolicy")}
      footerButtonTitle={
        isPayLater && !isMembership
          ? t("agreeAndAddCard")
          : t("agreeAndContinue")
      }
      onFooterButtonPress={onConfirm}
      footerButtonDisabled={!agreed || confirming || !quote}
    >
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t("freeCancellation")}</Text>
        <Text style={styles.rowValue}>{freeCancellationValue}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          {isMembership ? t("lateCancellation") : t("lateCancellationFee")}
        </Text>
        <Text style={styles.rowValue}>
          {isMembership ? lateVisitValue : lateFeeValue}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          {isMembership ? t("statusNoShow") : t("noShowFee")}
        </Text>
        <Text style={styles.rowValue}>
          {isMembership ? noShowVisitValue : noShowFeeValue}
        </Text>
      </View>

      {quote?.policyText ? (
        <Text style={styles.policyText}>{quote.policyText}</Text>
      ) : null}

      {isPayLater && !isMembership ? (
        <View style={styles.payLaterCard}>
          <View style={styles.payLaterAccent} />
          <View style={styles.payLaterIconWrap}>
            <MaterialCommunityIcons
              name="credit-card-outline"
              size={iconScale(20)}
              color={theme.white}
            />
          </View>
          <View style={styles.payLaterTextBlock}>
            <Text style={styles.payLaterTitle}>{t("payLaterNoteTitle")}</Text>
            <Text style={styles.payLaterBody}>{t("payLaterCardNote")}</Text>
          </View>
        </View>
      ) : null}

      <Pressable
        style={styles.checkboxRow}
        onPress={() => setAgreed((prev) => !prev)}
        hitSlop={moderateWidthScale(8)}
      >
        <View style={styles.checkboxIconWrapper}>
          <View style={styles.checkbox}>
            {agreed ? (
              <FontAwesome5
                name="check"
                size={moderateWidthScale(14)}
                color={theme.orangeBrown}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.checkboxLabel}>{t("agreeToPolicy")}</Text>
      </Pressable>
    </ModalizeBottomSheet>
  );
}
