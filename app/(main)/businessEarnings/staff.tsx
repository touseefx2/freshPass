import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  iconScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import EarningsFilterModal, {
  type EarningsCoreFilters,
} from "@/src/components/earningsFilterModal";
import EarningsStaffRow from "@/src/components/earningsStaffRow";
import {
  DEFAULT_EARNINGS_FILTERS,
  fetchEarningsMonths,
  fetchStaffEarnings,
  formatMoneyPlain,
  getCurrentMonthKey,
} from "@/src/services/businessEarningsService";
import type {
  EarningsMonthRow,
  PaymentStatusFilter,
  RevenueSourceFilter,
  StaffEarningsReport,
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

export default function BusinessEarningsStaffScreen() {
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

  const initialMonth =
    (Array.isArray(params.month) ? params.month[0] : params.month) ||
    getCurrentMonthKey();
  const paramCurrency =
    (Array.isArray(params.currency) ? params.currency[0] : params.currency) ||
    "USD";

  const [months, setMonths] = useState<EarningsMonthRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [filters, setFilters] = useState<EarningsCoreFilters>({
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
  });
  const [filterVisible, setFilterVisible] = useState(false);
  const [staffReport, setStaffReport] = useState<StaffEarningsReport | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [monthsLoaded, setMonthsLoaded] = useState(false);

  useEffect(() => {
    if (userRole !== "business") {
      router.back();
    }
  }, [userRole, router]);

  const monthIndex = useMemo(
    () => months.findIndex((m) => m.month === selectedMonth),
    [months, selectedMonth],
  );

  const selectedMonthLabel = useMemo(() => {
    if (staffReport?.period?.label) return staffReport.period.label;
    const fromList = months.find((m) => m.month === selectedMonth);
    const paramLabel = Array.isArray(params.label)
      ? params.label[0]
      : params.label;
    return fromList?.label ?? paramLabel ?? selectedMonth;
  }, [staffReport, months, selectedMonth, params.label]);

  const filtersActive =
    filters.revenueSource !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.transactionType !== "all";

  const loadMonths = useCallback(async () => {
    const list = await fetchEarningsMonths();
    setMonths(list);
    if (list.length > 0) {
      setSelectedMonth((prev: string) =>
        list.some((m) => m.month === prev) ? prev : list[0].month,
      );
    }
    setMonthsLoaded(true);
  }, []);

  const loadStaff = useCallback(
    async (month: string, nextFilters: EarningsCoreFilters) => {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchStaffEarnings(month, nextFilters);
        setStaffReport(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (userRole !== "business") return;
    loadMonths().catch(() => setMonthsLoaded(true));
  }, [userRole, loadMonths]);

  useEffect(() => {
    if (userRole !== "business" || !monthsLoaded) return;
    loadStaff(selectedMonth, filters);
  }, [userRole, monthsLoaded, selectedMonth, filters, loadStaff]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMonths();
    } catch {
      // ignore
    }
    await loadStaff(selectedMonth, filters);
    setRefreshing(false);
  }, [loadMonths, loadStaff, selectedMonth, filters]);

  const canGoNewer = monthIndex > 0;
  const canGoOlder = monthIndex >= 0 && monthIndex < months.length - 1;

  const goNewer = () => {
    if (!canGoNewer) return;
    setSelectedMonth(months[monthIndex - 1].month);
  };

  const goOlder = () => {
    if (!canGoOlder) return;
    setSelectedMonth(months[monthIndex + 1].month);
  };

  const currency = staffReport?.currency ?? paramCurrency;
  const showEmptyRoster =
    !!staffReport &&
    staffReport.totals.transactionsCount === 0 &&
    staffReport.staff.every((s) => s.grossEarnings === 0);

  const openStaffOnMain = (staffId: number) => {
    router.replace({
      pathname: "/(main)/businessEarnings",
      params: {
        staff_id: String(staffId),
      },
    });
  };

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
      <StackHeader title={t("earningsByStaffTitle")} showLine={false} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        <View style={styles.monthBar}>
          <View style={styles.monthStepper}>
            <TouchableOpacity
              style={[
                styles.monthArrow,
                !canGoOlder && styles.monthArrowDisabled,
              ]}
              onPress={goOlder}
              disabled={!canGoOlder}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={iconScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <Text style={styles.monthLabel} numberOfLines={1}>
              {selectedMonthLabel}
            </Text>
            <TouchableOpacity
              style={[
                styles.monthArrow,
                !canGoNewer && styles.monthArrowDisabled,
              ]}
              onPress={goNewer}
              disabled={!canGoNewer}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={iconScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, filtersActive && styles.filterBtnActive]}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="tune"
              size={iconScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.filterBtnText}>{t("earningsFilters")}</Text>
          </TouchableOpacity>
        </View>

        {loading && !staffReport ? (
          <ActivityIndicator
            style={{ marginTop: moderateHeightScale(24) }}
            color={theme.darkGreen}
          />
        ) : error && !staffReport ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{t("earningsStaffLoadError")}</Text>
            <Button title={t("retry")} onPress={handleRefresh} />
          </View>
        ) : showEmptyRoster ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {t("earningsEmptyMonth", { month: selectedMonthLabel })}
            </Text>
            <Text style={styles.emptySubtitle}>{t("earningsEmptyHint")}</Text>
          </View>
        ) : (
          <View style={loading && staffReport ? styles.contentFaded : undefined}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t("earningsByStaffTitle")}
              </Text>
              {(staffReport?.staff ?? []).map((row, idx, arr) => (
                <EarningsStaffRow
                  key={row.staffId ?? `unassigned-${idx}`}
                  item={row}
                  currency={currency}
                  isLast={idx === arr.length - 1}
                  onPress={
                    row.staffId != null
                      ? () => openStaffOnMain(row.staffId as number)
                      : undefined
                  }
                />
              ))}
              {!!staffReport && (
                <View style={styles.staffTotalsBar}>
                  <Text style={styles.staffTotalsLabel}>{t("earningsTotal")}</Text>
                  <Text style={styles.staffTotalsValue}>
                    {formatMoneyPlain(staffReport.totals.netEarnings, currency)}{" "}
                    {t("earningsNet").toLowerCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <EarningsFilterModal
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
      />
    </View>
  );
}
