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
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  iconScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import EarningsFilterModal from "@/src/components/earningsFilterModal";
import EarningsTransactionRow from "@/src/components/earningsTransactionRow";
import {
  DEFAULT_EARNINGS_FILTERS,
  EARNINGS_PREVIEW_PER_PAGE,
  fetchEarningsMonths,
  fetchEarningsReport,
  fetchEarningsTransactions,
  formatMoney,
  formatMoneyPlain,
  getCurrentMonthKey,
} from "@/src/services/businessEarningsService";
import type {
  EarningsFilters,
  EarningsMonthRow,
  EarningsReport,
  EarningsTransaction,
} from "@/src/types/businessEarnings";
import { createStyles } from "./styles";

export default function BusinessEarningsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const userRole = useAppSelector((state) => state.user.userRole);

  const [months, setMonths] = useState<EarningsMonthRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [filters, setFilters] =
    useState<Required<EarningsFilters>>(DEFAULT_EARNINGS_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const [report, setReport] = useState<EarningsReport | null>(null);
  const [previewTxns, setPreviewTxns] = useState<EarningsTransaction[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [txnError, setTxnError] = useState(false);
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
    if (report?.period?.label) return report.period.label;
    const fromList = months.find((m) => m.month === selectedMonth);
    return fromList?.label ?? selectedMonth;
  }, [report, months, selectedMonth]);

  const previousMonthRow = useMemo(() => {
    if (monthIndex < 0 || monthIndex >= months.length - 1) return null;
    return months[monthIndex + 1] ?? null;
  }, [months, monthIndex]);

  const filtersActive =
    filters.revenueSource !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.transactionType !== "all";

  const loadMonths = useCallback(async () => {
    const list = await fetchEarningsMonths();
    setMonths(list);
    if (list.length > 0) {
      const current = getCurrentMonthKey();
      const hasCurrent = list.some((m) => m.month === current);
      if (!hasCurrent) {
        setSelectedMonth(list[0].month);
      }
    }
    setMonthsLoaded(true);
  }, []);

  const loadReport = useCallback(
    async (month: string, nextFilters: Required<EarningsFilters>) => {
      setReportLoading(true);
      setReportError(false);
      try {
        const data = await fetchEarningsReport(month, nextFilters);
        setReport(data);
      } catch {
        setReportError(true);
      } finally {
        setReportLoading(false);
        setInitialLoading(false);
      }
    },
    [],
  );

  const loadPreview = useCallback(
    async (month: string, nextFilters: Required<EarningsFilters>) => {
      setTxnError(false);
      try {
        const { transactions } = await fetchEarningsTransactions(
          month,
          nextFilters,
          1,
          EARNINGS_PREVIEW_PER_PAGE,
        );
        setPreviewTxns(transactions);
      } catch {
        setTxnError(true);
        setPreviewTxns([]);
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
    loadReport(selectedMonth, filters);
    loadPreview(selectedMonth, filters);
  }, [
    userRole,
    monthsLoaded,
    selectedMonth,
    filters,
    loadReport,
    loadPreview,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMonths();
    } catch {
      // ignore
    }
    await Promise.all([
      loadReport(selectedMonth, filters),
      loadPreview(selectedMonth, filters),
    ]);
    setRefreshing(false);
  }, [loadMonths, loadReport, loadPreview, selectedMonth, filters]);

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

  const currency = report?.currency ?? "USD";
  const hasActivity = report?.summary?.hasActivity === true;
  const showFaded = reportLoading && !!report && !initialLoading;

  const netDelta = useMemo(() => {
    if (!report || !previousMonthRow) return null;
    return report.summary.netEarnings - previousMonthRow.netEarnings;
  }, [report, previousMonthRow]);

  const openTransactions = () => {
    router.push({
      pathname: "/(main)/businessEarnings/transactions",
      params: {
        month: selectedMonth,
        revenue_source: filters.revenueSource,
        payment_status: filters.paymentStatus,
        transaction_type: filters.transactionType,
        label: selectedMonthLabel,
        currency,
      },
    });
  };

  const renderMonthBar = () => (
    <View style={styles.monthBar}>
      <View style={styles.monthStepper}>
        <TouchableOpacity
          style={[styles.monthArrow, !canGoOlder && styles.monthArrowDisabled]}
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
          style={[styles.monthArrow, !canGoNewer && styles.monthArrowDisabled]}
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
  );

  const renderSkeleton = () => (
    <View>
      <View style={styles.skeletonHero} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
  );

  const renderDeductions = () => {
    if (!report) return null;
    const d = report.deductions;
    const rows: {
      key: string;
      label: string;
      amount: number;
      credit?: boolean;
    }[] = [];

    if (d.stripeFees !== 0) {
      rows.push({
        key: "stripe",
        label: t("earningsStripeFees"),
        amount: -d.stripeFees,
      });
    }
    if (d.platformFees !== 0) {
      rows.push({
        key: "platform",
        label: t("earningsPlatformFees"),
        amount: -d.platformFees,
      });
    }
    if (d.refunds !== 0) {
      rows.push({
        key: "refunds",
        label: t("earningsRefunds"),
        amount: -d.refunds,
      });
    }
    if (d.refundedPlatformFees !== 0) {
      rows.push({
        key: "returned",
        label: t("earningsPlatformFeesReturned"),
        amount: d.refundedPlatformFees,
        credit: true,
      });
    }
    if (d.otherDeductions !== 0) {
      rows.push({
        key: "other",
        label: t("earningsOtherDeductions"),
        amount: -d.otherDeductions,
      });
    }

    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("earningsWhatDeducted")}</Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text
              style={[
                styles.rowValue,
                row.credit ? styles.creditValue : styles.deductionValue,
              ]}
            >
              {row.credit
                ? formatMoney(row.amount, currency, { signed: true })
                : formatMoney(row.amount, currency)}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.netRowLabel}>{t("earningsTotalDeductions")}</Text>
          <Text style={[styles.netRowValue, styles.deductionValue]}>
            {formatMoney(-d.total, currency)}
          </Text>
        </View>
        {!report.feeDataCoverage.isComplete &&
          report.feeDataCoverage.transactionsMissingFeeData > 0 && (
            <Text style={styles.feeNote}>
              {t("earningsFeeDataIncomplete", {
                count: report.feeDataCoverage.transactionsMissingFeeData,
              })}
            </Text>
          )}
      </View>
    );
  };

  const renderBody = () => {
    if (initialLoading) return renderSkeleton();

    if (reportError && !report) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{t("earningsLoadError")}</Text>
          <Button title={t("retry")} onPress={handleRefresh} />
        </View>
      );
    }

    if (!report) return null;

    if (!hasActivity) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {t("earningsEmptyMonth", { month: selectedMonthLabel })}
          </Text>
          <Text style={styles.emptySubtitle}>{t("earningsEmptyHint")}</Text>
        </View>
      );
    }

    return (
      <View style={showFaded ? styles.contentFaded : undefined}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{t("earningsNetEarnings")}</Text>
          <Text style={styles.heroAmount}>
            {formatMoneyPlain(report.summary.netEarnings, currency)}
          </Text>
          {netDelta != null && previousMonthRow && (
            <Text
              style={[
                styles.heroDelta,
                netDelta === 0 && styles.heroDeltaFlat,
              ]}
            >
              {netDelta === 0
                ? t("earningsVsMonthFlat", { month: previousMonthRow.label })
                : t("earningsVsMonth", {
                    amount: formatMoneyPlain(Math.abs(netDelta), currency),
                    direction: netDelta > 0 ? "↑" : "↓",
                    month: previousMonthRow.label,
                  })}
            </Text>
          )}
          {!!report.payouts?.note && (
            <Text style={styles.payoutNote}>{report.payouts.note}</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("earningsGross")}</Text>
            <Text style={styles.rowValue}>
              {formatMoney(report.summary.grossEarnings, currency)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("earningsTotalDeductions")}</Text>
            <Text style={[styles.rowValue, styles.deductionValue]}>
              {formatMoney(-report.summary.totalDeductions, currency)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.netRowLabel}>{t("earningsNetEarnings")}</Text>
            <Text style={styles.netRowValue}>
              {formatMoney(report.summary.netEarnings, currency)}
            </Text>
          </View>
        </View>

        {report.revenueBySource.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("earningsWhereFrom")}</Text>
            {report.revenueBySource.map((src) => (
              <View key={src.source} style={styles.sourceRow}>
                <View style={styles.sourceTop}>
                  <Text style={styles.rowLabel}>{src.label}</Text>
                  <Text style={styles.rowValue}>
                    {formatMoney(src.gross, currency)}
                  </Text>
                </View>
                <Text style={styles.rowValueMuted}>
                  {t("earningsPaymentsCount", { count: src.transactions })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {renderDeductions()}

        {(report.tips.total > 0 || report.tips.byRecipient.length > 0) && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.sectionTitle}>{t("earningsTips")}</Text>
              <Text style={styles.rowValue}>
                {formatMoney(report.tips.total, currency)}
              </Text>
            </View>
            {report.tips.byRecipient.map((r, idx) => (
              <View
                key={`${r.recipientType}-${r.recipientStaffId ?? "biz"}-${idx}`}
                style={styles.row}
              >
                <Text style={styles.rowLabel}>
                  {r.recipientName}
                  {r.recipientType === "business"
                    ? ` (${t("earningsBusinessRecipient")})`
                    : ""}
                </Text>
                <Text style={styles.rowValue}>
                  {formatMoney(r.amount, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {report.collectedAtLocation.total > 0 && (
          <View style={styles.mutedCard}>
            <Text style={styles.mutedTitle}>
              {t("earningsCollectedInPerson")}
            </Text>
            <Text style={styles.mutedAmount}>
              {formatMoney(report.collectedAtLocation.total, currency)}
            </Text>
            <Text style={styles.mutedNote}>
              {report.collectedAtLocation.note}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleInline}>
              {t("earningsTransactions")}
            </Text>
            <TouchableOpacity onPress={openTransactions} activeOpacity={0.7}>
              <Text style={styles.seeAll}>{t("seeAll")}</Text>
            </TouchableOpacity>
          </View>

          {txnError ? (
            <View style={styles.txnErrorWrap}>
              <Text style={styles.txnErrorText}>
                {t("earningsTransactionsError")}
              </Text>
              <TouchableOpacity
                onPress={() => loadPreview(selectedMonth, filters)}
              >
                <Text style={styles.retryLink}>{t("retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : previewTxns.length === 0 ? (
            <Text style={styles.emptyStateText}>
              {t("earningsNoTransactions")}
            </Text>
          ) : (
            previewTxns.map((txn) => (
              <EarningsTransactionRow
                key={txn.id}
                item={txn}
                currency={currency}
              />
            ))
          )}
        </View>
      </View>
    );
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
      <StackHeader title={t("businessEarnings")} showLine={false} />
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
        {renderMonthBar()}
        {reportLoading && !report && !initialLoading ? (
          <ActivityIndicator
            style={{ marginTop: moderateHeightScale(24) }}
            color={theme.darkGreen}
          />
        ) : (
          renderBody()
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
