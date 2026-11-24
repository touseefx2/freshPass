import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

/**
 * Client 11-24 samples: fixed plan + Promotion Add-on points, shared by the
 * plan picker (buy), onboarding plan step and Manage Subscription.
 */
const SOLO_POINT_KEYS = [
  "planPointLocalRecommendations",
  "planPointAiReels",
  "planPointServicesMemberships",
  "planPointBookingCalendar",
  "planPointHiringTools",
  "planPointLastMinuteDeals",
  "planPointPromotionalPosts",
  "planPointCustomerManagement",
] as const;

const BUSINESS_POINT_KEYS = [
  "planPointUnlimitedStaff",
  "planPointBusinessProfile",
  "planPointLocalRecommendations",
  "planPointAiReels",
  "planPointServicesMemberships",
  "planPointBookingCalendars",
  "planPointHiringTools",
  "planPointLastMinuteDeals",
  "planPointPromotionalPosts",
  "planPointCustomerManagement",
] as const;

const PROMOTION_POINT_KEYS = [
  "promotionAddOnPoint1",
  "promotionAddOnPoint2",
  "promotionAddOnPoint3",
] as const;

export const getPlanPoints = (t: TFunction, isSolo: boolean): string[] =>
  (isSolo ? SOLO_POINT_KEYS : BUSINESS_POINT_KEYS).map((key) => t(key));

export const getPromotionAddOnPoints = (t: TFunction): string[] =>
  PROMOTION_POINT_KEYS.map((key) => t(key));

/** "30.00" → "$30", "19.99" → "$19.99" */
export const formatPlanMoney = (amount: string | number | null | undefined) => {
  const value = Number(amount);
  if (amount == null || amount === "" || !Number.isFinite(value)) return "";
  return `$${value.toFixed(2).replace(/\.00$/, "")}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: moderateHeightScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    check: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(1),
    },
    rowText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
    },
    // Client 11-24 sample: cream box, thin light-gold border, all olive accents
    addOnBox: {
      borderWidth: 1,
      borderColor: theme.addOnBorder,
      backgroundColor: theme.addOnCream,
      borderRadius: moderateWidthScale(12),
      // Sample: box sits slightly wider than the plan list above it
      marginHorizontal: -moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(14),
    },
    addOnHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(28),
    },
    checkbox: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(5),
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    checkboxOff: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.white,
    },
    addOnIcon: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    addOnTitle: {
      flex: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    addOnPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    addOnIntro: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.addOnBodyText,
      lineHeight: fontSize.size20,
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(8),
    },
    addOnPoints: {
      gap: moderateHeightScale(6),
    },
    addOnPointRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    addOnBullet: {
      width: moderateWidthScale(18),
      height: moderateWidthScale(18),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    addOnPointText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.addOnPointText,
      lineHeight: fontSize.size18,
    },
  });

function usePlanStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { styles, theme };
}

export function PlanPointsList({ items }: { items: string[] }) {
  const { styles, theme } = usePlanStyles();
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={styles.row}>
          <View style={styles.check}>
            <Feather name="check" size={iconScale(12)} color={theme.white} />
          </View>
          <Text style={styles.rowText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** "Included in your Solo plan" + checklist (light cards) */
export function PlanIncludesSection({ isSolo }: { isSolo: boolean }) {
  const { t } = useTranslation();
  const { styles } = usePlanStyles();
  return (
    <View>
      <Text style={styles.sectionTitle}>
        {isSolo ? t("includedInSoloPlan") : t("includedInBusinessPlan")}
      </Text>
      <PlanPointsList items={getPlanPoints(t, isSolo)} />
    </View>
  );
}

/**
 * Gold Promotion Add-on box. With onToggle it is a checkbox (buy screen);
 * without it, it only shows what the add-on gives (onboarding preview).
 */
export function PromotionAddOnBox({
  price,
  title,
  selected,
  onToggle,
  showPoints = true,
}: {
  price: string;
  title?: string;
  selected?: boolean;
  onToggle?: () => void;
  showPoints?: boolean;
}) {
  const { t } = useTranslation();
  const { styles, theme } = usePlanStyles();
  const body = (
    <>
      <View style={styles.addOnHeader}>
        {onToggle ? (
          <View
            style={[
              styles.checkbox,
              selected ? styles.checkboxOn : styles.checkboxOff,
            ]}
          >
            {selected ? (
              <Feather name="check" size={iconScale(16)} color={theme.white} />
            ) : null}
          </View>
        ) : (
          <View style={styles.addOnIcon}>
            {/* Preview only (nothing bought here): star, not a tick */}
            <Feather name="star" size={iconScale(13)} color={theme.white} />
          </View>
        )}
        <Text style={styles.addOnTitle} numberOfLines={2}>
          {title ?? t("promotionAddOnTitle")}
        </Text>
        {price ? (
          <Text style={styles.addOnPrice}>
            {t("featuredAddOnPerMonth", { price })}
          </Text>
        ) : null}
      </View>
      {showPoints ? (
        <>
          <Text style={styles.addOnIntro}>{t("promotionAddOnIntro")}</Text>
          <View style={styles.addOnPoints}>
            {getPromotionAddOnPoints(t).map((item) => (
              <View key={item} style={styles.addOnPointRow}>
                <View style={styles.addOnBullet}>
                  <Feather
                    name="check"
                    size={iconScale(12)}
                    color={theme.white}
                  />
                </View>
                <Text style={styles.addOnPointText}>{item}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
  );

  if (!onToggle) return <View style={styles.addOnBox}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.addOnBox}
      onPress={onToggle}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
    >
      {body}
    </TouchableOpacity>
  );
}
