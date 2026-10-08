import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import EmptyState from "@/src/components/emptyState";
import {
  OrderDeliveryRows,
  OrderHistoryTimeline,
  OrderItemsAndTotals,
  OrderSection,
  OrderStageCard,
  ShippingDetailsText,
} from "@/src/components/shopOrderParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchCustomerOrder } from "@/src/services/orderService";
import type { ShopOrder } from "@/src/types/shopOrder";
import {
  getCustomerStageKeys,
  getOrderErrorMessage,
  isPickupOrder,
} from "@/src/utils/shopOrderHelpers";

/**
 * Customer's order: where it is now, the shipping details from the salon
 * (tracking number etc.), what was bought, and the history timeline.
 * Order notifications open this screen (GET /api/orders/{order}).
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(22),
    },
  });

function CustomerOrder({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const orderRef = useRef(order);
  orderRef.current = order;
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!orderId) {
        setLoading(false);
        setLoadError(t("orderLoadFailed"));
        return;
      }
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      try {
        const next = await fetchCustomerOrder(orderId);
        setOrder(next);
        setLoadError(null);
      } catch (err) {
        const message = getOrderErrorMessage(err, t("somethingWentWrong"));
        if (orderRef.current) {
          showBannerRef.current(t("orderLoadFailed"), message, "error");
        } else {
          setLoadError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, t],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const renderOrder = (current: ShopOrder) => {
    const stage = getCustomerStageKeys(current);
    const shipping = !isPickupOrder(current);
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(32) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        <OrderStageCard
          order={current}
          title={t(stage.title)}
          text={t(stage.text)}
        />

        {shipping && current.shippingDetails ? (
          <OrderSection title={t("orderShippingDetails")}>
            <ShippingDetailsText text={current.shippingDetails} />
          </OrderSection>
        ) : null}

        <OrderSection title={shipping ? t("orderShipTo") : t("pickup")}>
          <OrderDeliveryRows
            order={current}
            pickupText={t("orderPickupCustomerText")}
          />
        </OrderSection>

        <OrderSection title={t("orderItemsSection")}>
          <OrderItemsAndTotals order={current} />
        </OrderSection>

        {current.history.length > 0 ? (
          <OrderSection title={t("orderHistory")}>
            <OrderHistoryTimeline order={current} />
          </OrderSection>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      <FlowHeader
        title={orderId ? t("orderNumberTitle", { id: orderId }) : ""}
        onBack={() => router.back()}
      />
      {loading && !order ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : !order ? (
        <EmptyState
          icon="error-outline"
          title={t("orderLoadFailed")}
          subtitle={loadError ?? undefined}
          actionTitle={orderId ? t("orderRetry") : undefined}
          onActionPress={orderId ? () => void load("initial") : undefined}
        />
      ) : (
        renderOrder(order)
      )}
    </View>
  );
}

export default function CustomerOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = typeof orderId === "string" ? orderId : "";
  // Another order in the same screen (e.g. a second notification) starts clean
  return <CustomerOrder key={id} orderId={id} />;
}
