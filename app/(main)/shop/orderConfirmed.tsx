import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchCustomerOrder } from "@/src/services/orderService";
import type { ShopOrderRefund } from "@/src/types/shopOrder";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(24),
      gap: moderateHeightScale(14),
    },
    ring: {
      width: widthScale(132),
      height: widthScale(132),
      borderRadius: widthScale(66),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    iconWrap: {
      width: widthScale(92),
      height: widthScale(92),
      borderRadius: widthScale(46),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size30,
    },
    orderPill: {
      minHeight: heightScale(40),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: heightScale(20),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      alignItems: "center",
      justifyContent: "center",
    },
    orderId: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    note: {
      alignSelf: "stretch",
      marginTop: moderateHeightScale(10),
    },
  });

/** After payment: order placed. */
export default function OrderConfirmedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { orderId: paramOrderId, source } = useLocalSearchParams<{
    orderId?: string;
    /** "marketplace" from the Marketplace checkout; absent for a reel's Shop Now. */
    source?: string;
  }>();
  const isMarketplace = source === "marketplace";
  const shopLastOrderId = useAppSelector((s) => s.shopCart.lastOrderId);
  const marketLastOrderId = useAppSelector((s) => s.marketCart.lastOrderId);
  const lastOrderId = isMarketplace ? marketLastOrderId : shopLastOrderId;
  const orderId = paramOrderId || lastOrderId || "FP000000";

  // The last unit can sell out while the sheet is open: the server then
  // refunds this payment straight away and cancels the order.
  const [refund, setRefund] = useState<ShopOrderRefund | null>(null);
  useEffect(() => {
    if (!paramOrderId) return;
    let cancelled = false;
    fetchCustomerOrder(paramOrderId)
      .then((order) => {
        if (!cancelled && order.status === "cancelled") setRefund(order.refund);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [paramOrderId]);

  const goHome = () => resetToDashboardHome();

  // Back to the catalog: pop the whole buy flow off the (main) stack, then
  // open the Marketplace again (main stack, no tab bar) so Back lands on Home.
  const continueMarketplace = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate("/(main)/marketplace" as any);
  };

  const viewOrder = () =>
    paramOrderId || lastOrderId
      ? router.push({
          pathname: "/(main)/shop/orderDetail" as any,
          params: { orderId },
        })
      : showBanner(t("viewOrder"), t("paymentMockNote"), "info");

  return (
    <View style={styles.container}>
      <FlowHeader
        title={isMarketplace ? t("checkout") : t("shopFlowTitle")}
        onBack={goHome}
        backIcon="close"
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ring}>
          <View style={styles.iconWrap}>
            <MaterialIcons
              name={refund ? "currency-exchange" : "check"}
              size={moderateWidthScale(48)}
              color={theme.white}
            />
          </View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {refund ? t("orderStageAutoRefundedTitle") : t("orderConfirmedTitle")}
        </Text>
        <View style={styles.orderPill}>
          <Text style={styles.orderId}>
            {t("orderNumber", { id: `#${orderId}` })}
          </Text>
        </View>
        <InfoNote
          icon="notifications-none"
          title={isMarketplace && !refund ? t("staffOnboardingNextTitle") : null}
          text={
            refund
              ? t(
                  refund.status === "refunded"
                    ? "orderStageAutoRefundedCustomer"
                    : "orderStageAutoRefundPendingCustomer",
                )
              : isMarketplace
                ? t("mpCoConfirmedNote")
                : t("shopConfirmedNote")
          }
          style={styles.note}
        />
      </ScrollView>
      {isMarketplace ? (
        <FlowFooter
          secondary={{
            label: t("viewOrder"),
            onPress: viewOrder,
            icon: "receipt-long",
          }}
          primary={{
            label: t("continueShopping"),
            onPress: continueMarketplace,
            icon: "storefront",
          }}
          tertiary={{
            label: t("mpCoReturnHome"),
            onPress: goHome,
          }}
        />
      ) : (
        <FlowFooter
          secondary={{
            label: t("viewOrder"),
            onPress: viewOrder,
            icon: "receipt-long",
          }}
          primary={{
            label: t("continueShopping"),
            onPress: goHome,
          }}
        />
      )}
    </View>
  );
}
