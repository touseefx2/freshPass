import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
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
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(18),
    },
    cardsStack: {
      gap: moderateHeightScale(12),
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(18),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(16),
    },
    warningCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      backgroundColor: theme.upcomingCard,
      borderRadius: moderateWidthScale(18),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(16),
    },
    iconWrap: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      backgroundColor: theme.apptPeachBg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    solidIconWrap: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    cardBody: {
      flex: 1,
      minWidth: 0,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(6),
    },
    cardTitle: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    cardTitleSpaced: {
      marginBottom: moderateHeightScale(6),
    },
    cardValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
      flexShrink: 0,
      textAlign: "right",
    },
    cardDesc: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    warningTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
      marginBottom: moderateHeightScale(6),
    },
    warningBody: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: moderateHeightScale(20),
      gap: moderateWidthScale(12),
    },
    checkbox: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(5),
      borderWidth: 1.5,
      borderColor: theme.black,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(2),
      flexShrink: 0,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
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
  const cutoffHours = quote?.cutoffHours ?? null;
  const alwaysCharge = !!(quote?.alwaysCharge || quote?.alwaysLate);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setAgreed(false);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

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

  const isWithinCutoffWindow = (() => {
    if (!quote) return false;
    if (alwaysCharge) return true;
    if (quote.freeCancellationUntil) {
      const until = new Date(quote.freeCancellationUntil).getTime();
      return !Number.isNaN(until) && until <= Date.now();
    }
    return (
      (quote.cancellationFeePercent ?? 0) > 0 ||
      (quote.noShowFeePercent ?? 0) > 0
    );
  })();

  const cancelPercent = quote?.cancellationFeePercent ?? 0;
  const noShowPercent = quote?.noShowFeePercent ?? 0;
  const cancelAmountLabel = formatCurrencyAmount(
    quote?.cancellationFeeAmount ?? 0,
    quote?.currency,
  );
  const noShowAmountLabel = formatCurrencyAmount(
    quote?.noShowFeeAmount ?? 0,
    quote?.currency,
  );

  const cancellationDesc = (() => {
    if (isMembership) {
      if (alwaysCharge || !cutoffHours) {
        return t("lateCancelVisitCardDescAlways");
      }
      return t("lateCancelVisitCardDesc", { hours: cutoffHours });
    }
    if (alwaysCharge || !cutoffHours) {
      return t("cancellationFeeCardDescAlways", { percent: cancelPercent });
    }
    return t("cancellationFeeCardDesc", {
      percent: cancelPercent,
      hours: cutoffHours,
    });
  })();

  const noShowDesc = isMembership
    ? t("noShowVisitCardDesc")
    : t("noShowFeeCardDesc", { percent: noShowPercent });

  const warningTitle =
    alwaysCharge || !cutoffHours
      ? t("withinCutoffWarningTitleAlways")
      : t("withinCutoffWarningTitle", { hours: cutoffHours });

  const warningBody = isMembership
    ? t("withinCutoffWarningBodyMembership", {
        hours: cutoffHours ?? 24,
        lateAction: lateVisitValue,
        noShowAction: noShowVisitValue,
      })
    : t("withinCutoffWarningBody", {
        cancelAmount: cancelAmountLabel,
        cancelPercent,
        noShowAmount: noShowAmountLabel,
        noShowPercent,
      });

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
      maxHeightPercent={0.94}
      showsVerticalScrollIndicator
    >
      <Text style={styles.subtitle}>
        {t("cancellationPolicyReviewSubtitle")}
      </Text>

      <View style={styles.cardsStack}>
        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="calendar-outline"
              size={iconScale(20)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {isMembership ? t("lateCancellation") : t("cancellationFee")}
              </Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {isMembership ? lateVisitValue : lateFeeValue}
              </Text>
            </View>
            <Text style={styles.cardDesc}>{cancellationDesc}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="person-outline"
              size={iconScale(20)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {isMembership ? t("statusNoShow") : t("noShowFee")}
              </Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {isMembership ? noShowVisitValue : noShowFeeValue}
              </Text>
            </View>
            <Text style={styles.cardDesc}>{noShowDesc}</Text>
          </View>
        </View>

        {isWithinCutoffWindow ? (
          <View style={styles.warningCard}>
            <View style={styles.solidIconWrap}>
              <FontAwesome5
                name="exclamation"
                size={iconScale(14)}
                color={theme.white}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.warningTitle}>{warningTitle}</Text>
              <Text style={styles.warningBody}>{warningBody}</Text>
            </View>
          </View>
        ) : null}

        {isPayLater && !isMembership ? (
          <View style={styles.infoCard}>
            <View style={styles.solidIconWrap}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={iconScale(20)}
                color={theme.white}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>
                {t("payLaterNoteTitle")}
              </Text>
              <Text style={styles.cardDesc}>{t("payLaterCardNote")}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Pressable
        style={styles.checkboxRow}
        onPress={() => setAgreed((prev) => !prev)}
        hitSlop={moderateWidthScale(8)}
      >
        <View style={styles.checkbox}>
          {agreed ? (
            <FontAwesome5
              name="check"
              size={moderateWidthScale(12)}
              color={theme.orangeBrown}
            />
          ) : null}
        </View>
        <Text style={styles.checkboxLabel}>{t("agreeToPolicy")}</Text>
      </Pressable>
    </ModalizeBottomSheet>
  );
}
