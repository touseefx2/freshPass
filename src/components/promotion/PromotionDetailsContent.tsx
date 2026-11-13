import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import type { Promotion } from "@/src/types/promotion";
import { savingsHeadline } from "@/src/utils/promotionDisplay";

type Props = {
  promotion: Promotion;
  /** Shown with "Sign in to check eligibility" (guest / signed out). */
  onSignIn?: () => void;
};

/**
 * One offer's details (profile sheet + shared-link screen): savings, who it's
 * for, services, dates, rules and the customer's eligibility. Every label
 * comes from the server.
 */
export default function PromotionDetailsContent({ promotion, onSignIn }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const eligibility = promotion.eligibility;
  const signedOut = !eligibility || eligibility.eligible === null;
  const serviceNames = promotion.services.map((s) => s.name).filter(Boolean);

  const rows: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }[] = [];
  if (serviceNames.length > 0) {
    rows.push({
      icon: "content-cut",
      label: t("pcuServices"),
      value: serviceNames.join(", "),
    });
  }
  if (promotion.booking_label) {
    rows.push({ icon: "event", label: "", value: promotion.booking_label });
  }
  if (promotion.visit_label) {
    rows.push({ icon: "event-available", label: "", value: promotion.visit_label });
  }

  return (
    <View>
      {!!promotion.image_url && (
        <AppImage
          uri={promotion.image_url}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {!!promotion.savings_label && (
        <Text style={styles.savings} accessibilityRole="header">
          {savingsHeadline(promotion)}
        </Text>
      )}
      {!!promotion.audience_label && (
        <View style={styles.audiencePill}>
          <Text style={styles.audienceText}>{promotion.audience_label}</Text>
        </View>
      )}

      {!!promotion.title && <Text style={styles.title}>{promotion.title}</Text>}
      {!!promotion.description && (
        <Text style={styles.description}>{promotion.description}</Text>
      )}

      {rows.length > 0 && (
        <View style={styles.infoCard}>
          {rows.map((row, index) => (
            <View
              key={`${row.icon}-${index}`}
              style={[styles.infoRow, index > 0 && styles.infoRowDivider]}
            >
              <MaterialIcons
                name={row.icon}
                size={moderateWidthScale(18)}
                color={theme.darkGreenLight}
                style={styles.infoIcon}
              />
              <View style={styles.infoTextWrap}>
                {!!row.label && <Text style={styles.infoLabel}>{row.label}</Text>}
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {promotion.restrictions.length > 0 && (
        <View style={styles.rules}>
          {promotion.restrictions.map((line, index) => (
            <View key={index} style={styles.ruleRow}>
              <View style={styles.ruleDot} />
              <Text style={styles.ruleText}>{line}</Text>
            </View>
          ))}
        </View>
      )}

      {signedOut ? (
        <View style={styles.notice}>
          <MaterialIcons
            name="info-outline"
            size={moderateWidthScale(18)}
            color={theme.darkGreenLight}
          />
          <Text style={styles.noticeText}>
            {eligibility?.message || t("pcuSignInToCheck")}
          </Text>
          {!!onSignIn && (
            <TouchableOpacity
              onPress={onSignIn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
            >
              <Text style={styles.noticeLink}>{t("signIn")}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : eligibility?.eligible === false && !!eligibility.message ? (
        <View style={[styles.notice, styles.noticeWarn]}>
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(18)}
            color={theme.orangeBrownText}
          />
          <Text style={[styles.noticeText, styles.noticeWarnText]}>
            {eligibility.message}
          </Text>
        </View>
      ) : eligibility?.eligible === true && !!eligibility.message ? (
        <View style={[styles.notice, styles.noticeOk]}>
          <MaterialIcons
            name="check-circle"
            size={moderateWidthScale(18)}
            color={theme.successGreen}
          />
          <Text style={styles.noticeText}>{eligibility.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    image: {
      width: "100%",
      height: moderateHeightScale(150),
      borderRadius: moderateWidthScale(14),
      marginBottom: moderateHeightScale(16),
      backgroundColor: theme.lightGreen07,
    },
    savings: {
      fontSize: fontSize.size40,
      fontFamily: fonts.fontExtraBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size40 * 1.15,
    },
    audiencePill: {
      alignSelf: "flex-start",
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.orangeBrown,
    },
    audienceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    title: {
      marginTop: moderateHeightScale(16),
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    description: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size15 * 1.45,
    },
    infoCard: {
      marginTop: moderateHeightScale(16),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(14),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
    },
    infoRowDivider: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    infoIcon: {
      marginTop: moderateHeightScale(1),
    },
    infoTextWrap: {
      flex: 1,
    },
    infoLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    infoValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size14 * 1.4,
    },
    rules: {
      marginTop: moderateHeightScale(14),
      gap: moderateHeightScale(6),
    },
    ruleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    ruleDot: {
      width: moderateWidthScale(5),
      height: moderateWidthScale(5),
      borderRadius: moderateWidthScale(3),
      backgroundColor: theme.darkGreenLight,
      marginTop: moderateHeightScale(7),
    },
    ruleText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size13 * 1.45,
    },
    notice: {
      marginTop: moderateHeightScale(14),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    noticeWarn: {
      backgroundColor: theme.apptPeachBg,
    },
    noticeOk: {
      backgroundColor: theme.mintTint,
    },
    noticeText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size13 * 1.4,
    },
    noticeWarnText: {
      color: theme.orangeBrownText,
    },
    noticeLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
      textDecorationLine: "underline",
    },
  });
