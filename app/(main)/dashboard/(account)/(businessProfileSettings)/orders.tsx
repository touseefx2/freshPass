import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  OrderSummaryCard,
  formatOrderDateTime,
} from "@/src/components/shopOrderParts";
import {
  fetchBusinessOrderStats,
  fetchBusinessOrders,
  subscribeToBusinessOrderUpdates,
} from "@/src/services/orderService";
import type {
  BusinessShopOrder,
  ShopOrderFilter,
  ShopOrderStats,
} from "@/src/types/shopOrder";
import {
  ORDER_FILTERS,
  applyOrderUpdateToList,
  getOrderActionLabelKey,
  getOrderErrorMessage,
  getOrderFilterLabelKey,
  hasMoreOrderPages,
  splitNextStatuses,
} from "@/src/utils/shopOrderHelpers";

const PAGE_SIZE = 20;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(12),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    chipCount: {
      minWidth: widthScale(22),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(1),
      borderRadius: moderateWidthScale(11),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
    },
    chipCountActive: {
      backgroundColor: theme.white15,
    },
    chipCountText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    chipCountTextActive: {
      color: theme.white,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(4),
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

export default function BusinessOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [filter, setFilter] = useState<ShopOrderFilter>("all");
  const [orders, setOrders] = useState<BusinessShopOrder[]>([]);
  const [stats, setStats] = useState<ShopOrderStats | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Answers for an older filter / refresh are dropped
  const requestRef = useRef(0);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const loadStats = useCallback(() => {
    fetchBusinessOrderStats()
      .then(setStats)
      .catch(() => {
        // Counts are optional; the list still works without them
      });
  }, []);

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh") => {
      const request = ++requestRef.current;
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const { orders: list, meta } = await fetchBusinessOrders({
          status: filter,
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
        // A failed pull-to-refresh keeps the rows that are already shown
        if (mode === "refresh" && ordersRef.current.length > 0) {
          showBannerRef.current(t("ordersLoadFailed"), message, "error");
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
    [filter, t],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { orders: list, meta } = await fetchBusinessOrders({
        status: filter,
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
  }, [filter, hasMore, loading, loadingMore, page, refreshing]);

  // First page whenever the status filter changes
  useEffect(() => {
    setOrders([]);
    void loadFirstPage("initial");
  }, [loadFirstPage]);

  // Back from an order: its row is already patched below; refresh the counts
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  useEffect(
    () =>
      subscribeToBusinessOrderUpdates((updated) => {
        setOrders((prev) => applyOrderUpdateToList(prev, updated, filter));
      }),
    [filter],
  );

  const onRefresh = useCallback(() => {
    loadStats();
    void loadFirstPage("refresh");
  }, [loadFirstPage, loadStats]);

  const openOrder = useCallback(
    (order: BusinessShopOrder) => {
      router.push({
        pathname: "./orderDetail" as any,
        params: { id: order.id },
      });
    },
    [router],
  );

  const renderChips = () => (
    <View style={styles.chips}>
      {ORDER_FILTERS.map((key) => {
        const active = filter === key;
        const label = t(getOrderFilterLabelKey(key));
        const count = key === "all" || !stats ? null : stats[key];
        return (
          <TouchableOpacity
            key={key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              count != null ? t("orderFilterCountA11y", { label, count }) : label
            }
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {label}
            </Text>
            {count != null ? (
              <View style={[styles.chipCount, active && styles.chipCountActive]}>
                <Text
                  style={[
                    styles.chipCountText,
                    active && styles.chipCountTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
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
    if (filter === "all") {
      return (
        <EmptyState
          icon="receipt-long"
          title={t("ordersEmptyTitle")}
          subtitle={t("ordersEmptySubtitle")}
        />
      );
    }
    return (
      <EmptyState
        icon="receipt-long"
        title={t("ordersEmptyFilteredTitle")}
        subtitle={t("ordersEmptyFilteredSubtitle", {
          status: t(getOrderFilterLabelKey(filter)),
        })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("ordersTitle")} />
      {renderChips()}
      {loading && orders.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const next = splitNextStatuses(item.nextStatuses).forward[0];
            return (
              <OrderSummaryCard
                order={item}
                meta={[item.customer?.name, formatOrderDateTime(item.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
                nextLabel={
                  next
                    ? t("orderNextStep", {
                        action: t(getOrderActionLabelKey(next)),
                      })
                    : null
                }
                onPress={() => openOrder(item)}
              />
            );
          }}
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
              onRefresh={onRefresh}
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
