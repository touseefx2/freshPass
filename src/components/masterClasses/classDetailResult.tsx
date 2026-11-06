// After the enrollment payment sheet: confirming spinner, then
// "You're enrolled!", refunded (seat lost while paying) or still confirming.

import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { MasterClass } from "@/src/types/masterClass";
import {
  formatClassPrice,
  getClassAddress,
  getClassWhenText,
} from "@/src/utils/masterClassHelpers";
import { ClassSummaryRow, IoniconName, MetaRow } from "./parts";

export type ClassEnrollResultKind = "confirmed" | "refunded" | "pending";

// ── Confirming ──────────────────────────────────────────────────────

export function ClassDetailConfirming() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return (
    <View
      style={styles.confirming}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t("mcConfirmingPayment")}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.tileMint }]}>
        <ActivityIndicator size="large" color={theme.darkGreen} />
      </View>
      <Text style={styles.title}>{t("mcConfirmingPayment")}</Text>
      <Text style={styles.message}>{t("mcConfirmingPaymentText")}</Text>
    </View>
  );
}

// ── Result ──────────────────────────────────────────────────────────

type ResultProps = {
  kind: ClassEnrollResultKind;
  masterClass: MasterClass;
  /** What the student paid (payment sheet amount). */
  amount?: number | null;
  /** `refund.reason` from the enrollment. */
  refundReason?: string | null;
  onViewMine: () => void;
  onGoHome: () => void;
  bottomInset: number;
};

export function ClassDetailResult({
  kind,
  masterClass,
  amount,
  refundReason,
  onViewMine,
  onGoHome,
  bottomInset,
}: ResultProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const config: {
    icon: IoniconName;
    circle: string;
    fg: string;
    title: string;
    message: string;
  } =
    kind === "confirmed"
      ? {
          icon: "checkmark",
          circle: theme.successGreen,
          fg: theme.white,
          title: t("mcEnrolledTitle"),
          message: t("mcEnrolledText"),
        }
      : kind === "refunded"
        ? {
            icon: "return-down-back",
            circle: theme.tilePeach,
            fg: theme.orangeBrownText,
            title: t("mcEnrollRefundedTitle"),
            message: refundReason
              ? `${refundReason} ${t("mcEnrollRefundedText")}`
              : t("mcEnrollRefundedText"),
          }
        : {
            icon: "hourglass-outline",
            circle: theme.tileGoldCream,
            fg: theme.goldTextDark,
            title: t("mcPaymentPendingTitle"),
            message: t("mcEnrollPendingText"),
          };

  const online = masterClass.format === "online";
  const where = online ? t("mcEnrolledOnlineNote") : getClassAddress(masterClass) || "";
  const paid = kind === "confirmed" ? formatClassPrice(amount) : "";
  // Refunded: the seat is gone, so home is the main way out.
  const viewMinePrimary = kind !== "refunded";

  const viewMine = (
    <TouchableOpacity
      key="mine"
      activeOpacity={0.8}
      onPress={onViewMine}
      style={viewMinePrimary ? styles.primary : styles.secondary}
      accessibilityRole="button"
      accessibilityLabel={t("mcViewMyClass")}
    >
      <Text style={viewMinePrimary ? styles.primaryText : styles.secondaryText}>
        {t("mcViewMyClass")}
      </Text>
    </TouchableOpacity>
  );
  const goHome = (
    <TouchableOpacity
      key="home"
      activeOpacity={0.8}
      onPress={onGoHome}
      style={viewMinePrimary ? styles.secondary : styles.primary}
      accessibilityRole="button"
      accessibilityLabel={t("goToHome")}
    >
      <Ionicons
        name="home-outline"
        size={iconScale(18)}
        color={viewMinePrimary ? theme.darkGreen : theme.white}
      />
      <Text style={viewMinePrimary ? styles.secondaryText : styles.primaryText}>
        {t("goToHome")}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + moderateHeightScale(24) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.iconCircle, { backgroundColor: config.circle }]}>
        <Ionicons name={config.icon} size={iconScale(44)} color={config.fg} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {config.title}
      </Text>
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {config.message}
      </Text>

      <View style={styles.card}>
        <ClassSummaryRow masterClass={masterClass} thumbSize={moderateWidthScale(72)}>
          <MetaRow icon="calendar-outline" text={getClassWhenText(masterClass)} numberOfLines={2} />
          <MetaRow
            icon={online ? "videocam-outline" : "location-outline"}
            text={where}
            numberOfLines={2}
          />
        </ClassSummaryRow>
        {paid ? (
          <View style={styles.paidRow}>
            <Text style={styles.paidLabel}>{t("mcAmountPaid")}</Text>
            <Text style={styles.paidValue}>{paid}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {viewMinePrimary ? [viewMine, goHome] : [goHome, viewMine]}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(36),
    },
    confirming: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      paddingBottom: moderateHeightScale(60),
    },
    iconCircle: {
      width: moderateWidthScale(88),
      height: moderateWidthScale(88),
      borderRadius: moderateWidthScale(44),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(18),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    message: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
    card: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(24),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.surfaceRaised,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    paidRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(12),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    paidLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
    paidValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actions: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(28),
      gap: moderateHeightScale(12),
    },
    primary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(52),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
    },
    primaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    secondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(52),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    secondaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });
