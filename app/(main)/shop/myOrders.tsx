import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import {
  OrderSummaryCard,
  formatOrderDateTime,
} from "@/src/components/shopOrderParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchCustomerOrders } from "@/src/services/orderService";
import type { ShopOrder } from "@/src/types/shopOrder";
import {
  getOrderErrorMessage,
  hasMoreOrderPages,
} from "@/src/utils/shopOrderHelpers";

/**
 * Customer's "My orders": every product order with its status; tapping one
 * opens the order screen (tracking, shipping details, history).
 */
const PAGE_SIZE = 20;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    emptyContent: {
      flexGrow: 1,
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

export default function CustomerOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers for an older refresh are dropped
  const requestRef = useRef(0);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const pageRef = useRef(page);
  pageRef.current = page;
  const firstFocusRef = useRef(true);
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      const request = ++requestRef.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      try {
        const { orders: list, meta } = await fetchCustomerOrders({
          page: 1,
          per_page: PAGE_SIZE,
        });
        if (request !== requestRef.current) return;
        setOrders(list);
        setPage(1);
        setHasMore(hasMoreOrderPages(meta));
      } catch (err) {
        if (request !== requestRef.current) return;
        const message = getOrderErrorMessage(err, t("somethingWentWrong"));
        if (ordersRef.current.length > 0) {
          // Keep the rows that are already shown
          if (mode === "refresh") {
            showBannerRef.current(t("ordersLoadFailed"), message, "error");
          }
        } else {
          setError(message);
        }
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { orders: list, meta } = await fetchCustomerOrders({
        page: nextPage,
        per_page: PAGE_SIZE,
      });
      if (request !== requestRef.current) return;
      setOrders((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...list.filter((o) => !seen.has(o.id))];
      });
      setPage(nextPage);
      setHasMore(hasMoreOrderPages(meta));
    } catch {
      // Keep what is loaded; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, refreshing]);

  useEffect(() => {
    void loadFirstPage("initial");
  }, [loadFirstPage]);

  // Back from an order: statuses may have moved on (notifications). Refresh
  // quietly while only the first page is loaded, so scrolling never jumps.
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (pageRef.current === 1) void loadFirstPage("silent");
    }, [loadFirstPage]),
  );

  const openOrder = useCallback(
    (order: ShopOrder) => {
      router.push({
        pathname: "/(main)/shop/orderDetail" as any,
        params: { orderId: order.id },
      });
    },
    [router],
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <EmptyState
          icon="error-outline"
          title={t("ordersLoadFailed")}
          subtitle={error}
          actionTitle={t("orderRetry")}
          onActionPress={() => void loadFirstPage("initial")}
        />
      );
    }
    return (
      <EmptyState
        icon="receipt-long"
        title={t("myOrdersEmptyTitle")}
        subtitle={t("myOrdersEmptySubtitle")}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("myOrders")} />
      {loading && orders.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderSummaryCard
              order={item}
              meta={formatOrderDateTime(item.createdAt)}
              onPress={() => openOrder(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            orders.length === 0 && styles.emptyContent,
            { paddingBottom: insets.bottom + moderateHeightScale(24) },
          ]}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.darkGreen} />
              </View>
            ) : null
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadFirstPage("refresh")}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
