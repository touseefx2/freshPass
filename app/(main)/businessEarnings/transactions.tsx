import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import EarningsTransactionRow from "@/src/components/earningsTransactionRow";
import {
  DEFAULT_EARNINGS_FILTERS,
  EARNINGS_TRANSACTIONS_PER_PAGE,
  fetchEarningsTransactions,
  getCurrentMonthKey,
} from "@/src/services/businessEarningsService";
import type {
  EarningsFilters,
  EarningsTransaction,
  PaymentStatusFilter,
  RevenueSourceFilter,
  TransactionTypeFilter,
} from "@/src/types/businessEarnings";
import { createStyles } from "./styles";

function asFilterValue<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return fallback;
}

export default function BusinessEarningsTransactionsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const userRole = useAppSelector((state) => state.user.userRole);
  const params = useLocalSearchParams<{
    month?: string;
    revenue_source?: string;
    payment_status?: string;
    transaction_type?: string;
    label?: string;
    currency?: string;
  }>();

  const month = (Array.isArray(params.month) ? params.month[0] : params.month) ||
    getCurrentMonthKey();
  const currency =
    (Array.isArray(params.currency) ? params.currency[0] : params.currency) ||
    "USD";
  const label =
    (Array.isArray(params.label) ? params.label[0] : params.label) || month;

  const filters: Required<EarningsFilters> = useMemo(
    () => ({
      revenueSource: asFilterValue(
        params.revenue_source,
        ["all", "subscription", "appointment", "tip", "other"] as const,
        DEFAULT_EARNINGS_FILTERS.revenueSource,
      ) as RevenueSourceFilter,
      paymentStatus: asFilterValue(
        params.payment_status,
        ["all", "paid", "refunded", "partially_refunded"] as const,
        DEFAULT_EARNINGS_FILTERS.paymentStatus,
      ) as PaymentStatusFilter,
      transactionType: asFilterValue(
        params.transaction_type,
        ["all", "charge", "refund"] as const,
        DEFAULT_EARNINGS_FILTERS.transactionType,
      ) as TransactionTypeFilter,
    }),
    [params.revenue_source, params.payment_status, params.transaction_type],
  );

  const [transactions, setTransactions] = useState<EarningsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (userRole !== "business") {
      router.back();
    }
  }, [userRole, router]);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(false);

      try {
        const { transactions: rows, meta } = await fetchEarningsTransactions(
          month,
          filters,
          page,
          EARNINGS_TRANSACTIONS_PER_PAGE,
        );
        if (append) {
          setTransactions((prev) => [...prev, ...rows]);
        } else {
          setTransactions(rows);
        }
        setCurrentPage(meta.currentPage ?? page);
        setHasMore(!!meta.hasMore);
      } catch {
        if (!append) {
          setTransactions([]);
          setError(true);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [month, filters],
  );

  useEffect(() => {
    if (userRole === "business") {
      hasScrolledRef.current = false;
      fetchPage(1, false);
    }
  }, [userRole, fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    if (!hasScrolledRef.current) return;
    fetchPage(currentPage + 1, true);
  }, [loadingMore, hasMore, loading, currentPage, fetchPage]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (e.nativeEvent.contentOffset.y > 20) {
        hasScrolledRef.current = true;
      }
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    hasScrolledRef.current = false;
    setRefreshing(true);
    fetchPage(1, false);
  }, [fetchPage]);

  const renderItem = useCallback(
    ({ item }: { item: EarningsTransaction }) => (
      <EarningsTransactionRow item={item} currency={currency} />
    ),
    [currency],
  );

  const keyExtractor = useCallback(
    (item: EarningsTransaction) => item.id.toString(),
    [],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.darkGreen} />
      </View>
    );
  }, [loadingMore, styles.loadingFooter, theme.darkGreen]);

  const listEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{t("earningsTransactionsError")}</Text>
          <Button title={t("retry")} onPress={() => fetchPage(1, false)} />
        </View>
      );
    }
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>{t("earningsNoTransactions")}</Text>
      </View>
    );
  }, [
    loading,
    error,
    styles,
    theme.darkGreen,
    t,
    fetchPage,
  ]);

  if (userRole !== "business") {
    return <View style={styles.safeArea} />;
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader
        title={t("earningsTransactionsTitle")}
        showLine={false}
      />
      <Text style={styles.periodSubtitle}>{label}</Text>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      />
    </View>
  );
}
