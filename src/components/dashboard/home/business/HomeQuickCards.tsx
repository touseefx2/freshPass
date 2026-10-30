import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useBusinessOrdersCount } from "@/src/hooks/useBusinessOrdersCount";
import { setStripeConnectModalVisible } from "@/src/state/slices/generalSlice";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    ordersSlot: {
      flex: 1,
    },
    // Client sample: white pill, solid honey border + soft honey glow
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: moderateHeightScale(52),
      paddingHorizontal: moderateWidthScale(14),
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
    },
    stripeCard: {
      flex: 1.55,
      justifyContent: "flex-start",
      paddingHorizontal: moderateWidthScale(18),
      gap: moderateWidthScale(14),
      borderRadius: moderateHeightScale(26),
      borderWidth: 2,
      borderColor: theme.orangeBrown,
      shadowColor: theme.orangeBrown,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 10,
      elevation: 6,
    },
    // Done state: calm green outline instead of the "do this" honey glow
    stripeCardConnected: {
      borderColor: theme.buttonBack,
      shadowOpacity: 0,
      elevation: 2,
    },
    ordersCard: {
      paddingHorizontal: moderateWidthScale(10),
      gap: moderateWidthScale(10),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardText: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    stripeCardText: {
      flex: 1,
    },
    badge: {
      position: "absolute",
      top: -moderateWidthScale(8),
      right: -moderateWidthScale(6),
      minWidth: moderateWidthScale(22),
      height: moderateWidthScale(22),
      paddingHorizontal: moderateWidthScale(5),
      borderRadius: moderateWidthScale(11),
      backgroundColor: theme.red,
      borderWidth: 2,
      borderColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
  });

/**
 * Owner home: Connect Stripe + Orders (product orders to act on). Lives in the
 * scroll content above the period tabs so it scrolls with the page (client 10-30).
 */
export default function HomeQuickCards() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);

  const isOnboardedOwner =
    userRole === "business" && businessStatus?.onboarding_completed === true;

  // Stripe Connect is optional — it only turns on customer payments
  const stripeStatus = businessStatus?.stripe_onboarding_status;
  const stripeDeadline = businessStatus?.requirements_deadline
    ? dayjs(businessStatus.requirements_deadline)
    : null;
  const isStripeConnected = isStripeOnboardingCompleted(businessStatus);
  const stripeLabel = isStripeConnected
    ? t("stripeCardConnected")
    : stripeStatus === "action_required"
      ? t("stripeCardFinishSetup")
      : stripeStatus === "under_review"
        ? t("stripeCardInReview")
        : t("stripeCardConnect");
  // Full sentence for screen readers (the card only fits a short label)
  const stripeA11y = isStripeConnected
    ? t("stripeCardConnectedA11y")
    : stripeStatus === "action_required"
      ? stripeDeadline?.isValid()
        ? t("stripeNeedsDetailsByDate", { date: stripeDeadline.format("MMM D") })
        : t("stripeNeedsDetails")
      : stripeStatus === "under_review"
        ? t("stripeReviewingDetails")
        : t("getPaidFromCustomers");

  // Always shown; once connected it says so and opens earnings / payouts
  const handleStripePress = () => {
    if (isStripeConnected) {
      router.push("/(main)/businessEarnings" as any);
    } else if (
      stripeStatus === "action_required" ||
      stripeStatus === "under_review"
    ) {
      router.push("/(main)/stripeConnectOnboarding" as any);
    } else {
      dispatch(setStripeConnectModalVisible(true));
    }
  };

  // Same live count as the Business Management Orders tile
  const ordersCount = useBusinessOrdersCount(isOnboardedOwner);
  const handleOrdersPress = useCallback(() => {
    router.push(
      "/(main)/dashboard/(account)/(businessProfileSettings)/orders" as any,
    );
  }, [router]);

  if (!isOnboardedOwner) return null;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[
          styles.card,
          styles.stripeCard,
          isStripeConnected && styles.stripeCardConnected,
        ]}
        onPress={handleStripePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${stripeLabel}. ${stripeA11y}`}
      >
        <MaterialCommunityIcons
          name={
            isStripeConnected
              ? "check-circle"
              : stripeStatus === "action_required"
                ? "alert-circle"
                : stripeStatus === "under_review"
                  ? "clock"
                  : "credit-card"
          }
          size={moderateWidthScale(26)}
          color={
            !isStripeConnected && stripeStatus === "action_required"
              ? theme.orangeBrownText
              : theme.buttonBack
          }
        />
        <Text style={[styles.cardText, styles.stripeCardText]} numberOfLines={1}>
          {stripeLabel}
        </Text>
      </TouchableOpacity>
      <View style={styles.ordersSlot}>
        <TouchableOpacity
          style={[styles.card, styles.ordersCard]}
          onPress={handleOrdersPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("ordersNeedActionA11y", {
            count: ordersCount ?? 0,
          })}
        >
          <MaterialCommunityIcons
            name="shopping"
            size={moderateWidthScale(22)}
            color={theme.red}
          />
          <Text style={styles.cardText} numberOfLines={1}>
            {t("ordersTitle")}
          </Text>
        </TouchableOpacity>
        {ordersCount != null && ordersCount > 0 && (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>
              {ordersCount > 99 ? "99+" : ordersCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
