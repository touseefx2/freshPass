import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { isRequestCanceled } from "@/src/services/api";
import {
  fetchPeriodTransactions,
  transactionKey,
} from "@/src/services/businessEarningsService";
import Logger from "@/src/services/logger";
import type {
  EarningsTransaction,
  RevenueSourceFilter,
} from "@/src/types/businessEarnings";
import {
  formatPeriodRange,
  isSingleDayPeriod,
  periodApiQuery,
  periodFromParams,
} from "@/src/utils/dashboardPeriod";
import { ListEmpty } from "./AppointmentRows";
import {
  TransactionDetailSheet,
  TransactionRow,
  useTransactionPress,
} from "./TransactionParts";

const SOURCES: Array<{ key: RevenueSourceFilter; label: string }> = [
  { key: "all", label: "bhAll" },
  { key: "appointment", label: "bhServices" },
  { key: "tip", label: "bhTips" },
  { key: "subscription", label: "bhMembership" },
  { key: "product", label: "bhProducts" },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    subtitle: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(14),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    chips: {
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
    },
    chip: {
      height: moderateHeightScale(36),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(999),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    chipSelected: {
      backgroundColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    list: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(36),
    },
    rowFirst: {
      borderTopLeftRadius: moderateWidthScale(16),
      borderTopRightRadius: moderateWidthScale(16),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    rowLast: {
      borderBottomLeftRadius: moderateWidthScale(16),
      borderBottomRightRadius: moderateWidthScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rowSides: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderLeftColor: theme.borderLight,
      borderRightColor: theme.borderLight,
    },
    footer: {
      paddingVertical: moderateHeightScale(18),
      alignItems: "center",
    },
    emptyCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    errorWrap: {
      alignItems: "center",
      gap: moderateHeightScale(12),
      paddingVertical: moderateHeightScale(28),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
  });

/** Staff: products belong to the business, so no Products chip */
const STAFF_SOURCES = SOURCES.filter((s) => s.key !== "product");

function parseSource(
  raw: string | string[] | undefined,
  sources: typeof SOURCES,
): RevenueSourceFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return sources.some((s) => s.key === value) ? (value as RevenueSourceFilter) : "all";
}

export default function TransactionListScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    period?: string;
    from?: string;
    to?: string;
    source?: string;
  }>();
  const userRole = useAppSelector((state) => state.user.userRole);
  const isStaff = userRole === "staff";
  const allowed = userRole === "business" || isStaff;
  const isSoloBusiness = useAppSelector(
    (state) => state.user.businessStatus?.subscription_is_single === true,
  );
  // Staff rows are all their own: no staff name on them
  const isPro = !isSoloBusiness && !isStaff;
  const sources = isStaff ? STAFF_SOURCES : SOURCES;

  const period = useMemo(
    () => periodFromParams(params),
    [params.period, params.from, params.to],
  );
  const [source, setSource] = useState<RevenueSourceFilter>(() =>
    parseSource(params.source, sources),
  );
  const [rows, setRows] = useState<EarningsTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [detailItem, setDetailItem] = useState<EarningsTransaction | null>(null);
  const requestId = useRef(0);
  const onTransactionPress = useTransactionPress(setDetailItem);

  useEffect(() => {
    if (!allowed) router.back();
  }, [allowed, router]);

  const loadPage = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      const id = ++requestId.current;
      if (mode === "append") setLoadingMore(true);
      else setLoading(true);
      setError(false);
      try {
        const { transactions, meta } = await fetchPeriodTransactions(
          periodApiQuery(period),
          { revenueSource: source, page: nextPage },
        );
        if (id !== requestId.current) return;
        setRows((prev) => (mode === "append" ? [...prev, ...transactions] : transactions));
        setPage(meta.currentPage ?? nextPage);
        setHasMore(!!meta.hasMore);
      } catch (err) {
        if (id !== requestId.current || isRequestCanceled(err)) return;
        Logger.error("Transaction list failed:", err);
        if (mode === "replace") {
          setRows([]);
          setError(true);
        }
        setHasMore(false);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [period, source],
  );

  useEffect(() => {
    if (!allowed) return;
    // New filter: don't show the previous filter's rows while loading
    setRows([]);
    void loadPage(1, "replace");
  }, [allowed, loadPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void loadPage(page + 1, "append");
  }, [loading, loadingMore, hasMore, page, loadPage]);

  const showDate = !isSingleDayPeriod(period);
  const periodLabel =
    period.key === "today"
      ? `${t("bhToday")} · ${formatPeriodRange(period)}`
      : period.key === "week"
        ? `${t("bhThisWeek")} · ${formatPeriodRange(period)}`
        : period.key === "month"
          ? `${t("bhThisMonth")} · ${formatPeriodRange(period)}`
          : formatPeriodRange(period);

  const renderItem = useCallback(
    ({ item, index }: { item: EarningsTransaction; index: number }) => (
      <TransactionRow
        item={item}
        isFirst={index === 0}
        showStaff={isPro}
        showDate={showDate}
        onPress={onTransactionPress}
        style={StyleSheet.flatten([
          styles.rowSides,
          index === 0 && styles.rowFirst,
          index === rows.length - 1 && styles.rowLast,
        ])}
      />
    ),
    [isPro, showDate, onTransactionPress, styles, rows.length],
  );

  if (!allowed) {
    return <View style={styles.container} />;
  }

  const listEmpty = () => {
    if (loading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{t("earningsTransactionsError")}</Text>
          <Button title={t("retry")} onPress={() => void loadPage(1, "replace")} />
        </View>
      );
    }
    return (
      <View style={styles.emptyCard}>
        <ListEmpty icon="receipt-text-outline" text={t("bhNoTransactions")} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.darkGreen} barStyle="light-content" translucent />
      <StackHeader title={t("bhTransactionList")} showLine={false} />
      <Text style={styles.subtitle} numberOfLines={1}>
        {periodLabel}
      </Text>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {sources.map((item) => {
            const selected = item.key === source;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, selected && styles.chipSelected]}
                activeOpacity={0.75}
                onPress={() => setSource(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {t(item.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={rows}
        keyExtractor={transactionKey}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          // Own screen, no tab bar: clear the home indicator
          { paddingBottom: insets.bottom + moderateHeightScale(28) },
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadPage(1, "replace");
            }}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      />
      <TransactionDetailSheet item={detailItem} onClose={() => setDetailItem(null)} />
    </View>
  );
}
