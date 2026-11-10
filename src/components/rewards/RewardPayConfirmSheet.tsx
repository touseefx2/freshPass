import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import RewardBalanceToggle from "@/src/components/rewards/RewardBalanceToggle";
import {
  estimateAppointmentReward,
  formatRewardMoney,
} from "@/src/utils/rewardMath";

/**
 * Pay-later "Pay now" on Appointment Details: there is no review step, so when
 * the customer has a reward balance this sheet shows the split first.
 * Service / Reward balance −R / Tip / Card total — all estimates; the real
 * numbers come from POST /api/payment-sheet.
 */
type RewardPayConfirmSheetProps = {
  visible: boolean;
  /** Full service price (dollars) — the only part the balance can pay */
  serviceAmount: number;
  /** Tip already on this payment (dollars); never paid from the balance */
  tipAmount?: number | null;
  balanceCents: number;
  /** Toggle state each time the sheet opens (default ON) */
  defaultUseReward?: boolean;
  currency?: string;
  onClose: () => void;
  onConfirm: (useRewardBalance: boolean) => void;
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
      backgroundColor: theme.tileGoldCream,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.goldBorder,
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
      gap: moderateHeightScale(14),
    },
    breakdownCard: {
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(10),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    label: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    value: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    rewardValue: {
      color: theme.successGreen,
      fontFamily: fonts.fontSemiBold,
    },
    divider: {
      height: 1,
      backgroundColor: theme.lightGreen1,
    },
    totalLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      gap: moderateHeightScale(4),
      marginTop: moderateHeightScale(2),
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      minHeight: 44,
    },
    secondaryButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

export default function RewardPayConfirmSheet({
  visible,
  serviceAmount,
  tipAmount,
  balanceCents,
  defaultUseReward = true,
  currency = "USD",
  onClose,
  onConfirm,
}: RewardPayConfirmSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [useReward, setUseReward] = useState(defaultUseReward);

  // Default ON every time the sheet opens (a retry keeps the last choice).
  useEffect(() => {
    if (visible) setUseReward(defaultUseReward);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const service =
    Number.isFinite(serviceAmount) && serviceAmount > 0 ? serviceAmount : 0;
  const tip =
    tipAmount != null && Number.isFinite(tipAmount) && tipAmount > 0
      ? tipAmount
      : 0;
  const reward = useReward
    ? estimateAppointmentReward(balanceCents, service)
    : 0;
  const cardTotal = Math.max(0, Math.round((service - reward + tip) * 100) / 100);
  const money = (amount: number) => formatRewardMoney(amount, currency);

  const renderRow = (
    label: string,
    value: string,
    valueStyle?: object,
  ) => (
    <View style={styles.row} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueStyle]}>{value}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
        >
          <View style={styles.overlayFill} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <MaterialCommunityIcons
                name="gift-outline"
                size={moderateWidthScale(22)}
                color={theme.orangeBrownText}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title} accessibilityRole="header">
                {t("rwPayConfirmTitle")}
              </Text>
              <Text style={styles.subtitle}>{t("rwPayConfirmSub")}</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom:
                  Math.max(insets.bottom, moderateHeightScale(16)) +
                  moderateHeightScale(8),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <RewardBalanceToggle
              value={useReward}
              onValueChange={setUseReward}
              balanceCents={balanceCents}
              appliedAmount={reward}
              variant="light"
            />

            <View style={styles.breakdownCard}>
              {renderRow(t("rwPayService"), money(service))}
              {reward > 0
                ? renderRow(
                    t("rwPayRewardLine"),
                    `−${money(reward)}`,
                    styles.rewardValue,
                  )
                : null}
              {tip > 0 ? renderRow(t("avTipLabel"), money(tip)) : null}
              <View style={styles.divider} />
              <View
                style={styles.row}
                accessible
                accessibilityLabel={`${t("rwPayCardTotal")}, ${money(cardTotal)}`}
              >
                <Text style={styles.totalLabel}>{t("rwPayCardTotal")}</Text>
                <Text style={styles.totalValue}>{money(cardTotal)}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title={t("avPayAmount", { amount: money(cardTotal) })}
                onPress={() => onConfirm(useReward)}
              />
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
