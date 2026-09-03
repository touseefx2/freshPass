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
import { useLocalSearchParams, useRouter } from "expo-router";
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
import EarningsStaffPickerModal from "@/src/components/earningsStaffPickerModal";
import EarningsStaffRow from "@/src/components/earningsStaffRow";
import EarningsTransactionRow from "@/src/components/earningsTransactionRow";
import {
  DEFAULT_EARNINGS_FILTERS,
  EARNINGS_PREVIEW_PER_PAGE,
  EARNINGS_STAFF_PREVIEW_COUNT,
  fetchEarningsMonths,
  fetchEarningsReport,
  fetchEarningsTransactions,
  fetchStaffEarnings,
  formatMoney,
  formatMoneyPlain,
  getCurrentMonthKey,
  isStaffIdValidationError,
} from "@/src/services/businessEarningsService";
import type {
  EarningsFilters,
  EarningsMonthRow,
  EarningsReport,
  EarningsTransaction,
  StaffEarningsReport,
  StaffEarningsRow,
  StaffIdFilter,
} from "@/src/types/businessEarnings";
import { createStyles } from "./styles";

function parseStaffIdParam(
  value: string | string[] | undefined,
): StaffIdFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw === "all") return "all";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "all";
}

export default function BusinessEarningsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const userRole = useAppSelector((state) => state.user.userRole);
  const params = useLocalSearchParams<{ staff_id?: string }>();

  const [months, setMonths] = useState<EarningsMonthRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [filters, setFilters] = useState<EarningsCoreFilters>({
    revenueSource: DEFAULT_EARNINGS_FILTERS.revenueSource,
    paymentStatus: DEFAULT_EARNINGS_FILTERS.paymentStatus,
    transactionType: DEFAULT_EARNINGS_FILTERS.transactionType,
  });
  const [selectedStaffId, setSelectedStaffId] =
    useState<StaffIdFilter>("all");
  const [filterVisible, setFilterVisible] = useState(false);
  const [staffPickerVisible, setStaffPickerVisible] = useState(false);

  const [report, setReport] = useState<EarningsReport | null>(null);
  const [staffReport, setStaffReport] = useState<StaffEarningsReport | null>(
    null,
  );
  const [previewTxns, setPreviewTxns] = useState<EarningsTransaction[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [txnError, setTxnError] = useState(false);
  const [staffError, setStaffError] = useState(false);
  const [monthsLoaded, setMonthsLoaded] = useState(false);

  useEffect(() => {
    if (userRole !== "business") {
      router.back();
    }
  }, [userRole, router]);

  useEffect(() => {
    if (params.staff_id === undefined) return;
    setSelectedStaffId(parseStaffIdParam(params.staff_id));
  }, [params.staff_id]);

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

  const combinedFilters: Required<EarningsFilters> = useMemo(
    () => ({ ...filters, staffId: selectedStaffId }),
    [filters, selectedStaffId],
  );

  const filtersActive =
    filters.revenueSource !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.transactionType !== "all";

  const staffFilterActive = selectedStaffId !== "all";

  const selectedStaffLabel = useMemo(() => {
    if (!staffFilterActive) return t("earningsAllStaff");
    if (report?.staff?.name) {
      return report.staff.removed
        ? `${report.staff.name} (${t("earningsStaffRemoved")})`
        : report.staff.name;
    }
    const fromList = staffReport?.staff.find(
      (s) => s.staffId === selectedStaffId,
    );
    return fromList?.name ?? t("earningsAllStaff");
  }, [staffFilterActive, report, staffReport, selectedStaffId, t]);

  const staffPreviewRows = useMemo(() => {
    if (!staffReport?.staff?.length) return [];
    const people = staffReport.staff.filter((s) => !s.isUnassigned);
    const unassigned = staffReport.staff.find((s) => s.isUnassigned);
    const top = people.slice(0, EARNINGS_STAFF_PREVIEW_COUNT);
    const rows: StaffEarningsRow[] = [...top];
    if (unassigned && unassigned.grossEarnings > 0) {
      rows.push(unassigned);
    }
    return rows;
  }, [staffReport]);

  const loadMonths = useCallback(async (staffId: StaffIdFilter = "all") => {
    const list = await fetchEarningsMonths(undefined, staffId);
    setMonths(list);
    if (list.length > 0) {
      const current = getCurrentMonthKey();
      const hasCurrent = list.some((m) => m.month === current);
      if (!hasCurrent) {
        setSelectedMonth((prev) =>
          list.some((m) => m.month === prev) ? prev : list[0].month,
        );
      }
    }
    setMonthsLoaded(true);
  }, []);

  const clearStaffFilter = useCallback(() => {
    setSelectedStaffId("all");
    router.setParams({ staff_id: "all" });
  }, [router]);

  const loadReport = useCallback(
    async (month: string, nextFilters: Required<EarningsFilters>) => {
      setReportLoading(true);
      setReportError(false);
      try {
        const data = await fetchEarningsReport(month, nextFilters);
        setReport(data);
      } catch (error) {
        if (
          nextFilters.staffId !== "all" &&
          isStaffIdValidationError(error)
        ) {
          clearStaffFilter();
          return;
        }
        setReportError(true);
      } finally {
        setReportLoading(false);
        setInitialLoading(false);
      }
    },
    [clearStaffFilter],
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
      } catch (error) {
        if (
          nextFilters.staffId !== "all" &&
          isStaffIdValidationError(error)
        ) {
          clearStaffFilter();
          return;
        }
        setTxnError(true);
        setPreviewTxns([]);
      }
    },
    [clearStaffFilter],
  );

  const loadStaff = useCallback(
    async (month: string, nextFilters: EarningsCoreFilters) => {
      setStaffError(false);
      try {
        const data = await fetchStaffEarnings(month, nextFilters);
        setStaffReport(data);
      } catch {
        setStaffError(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (userRole !== "business") return;
    loadMonths(selectedStaffId).catch(() => setMonthsLoaded(true));
  }, [userRole, selectedStaffId, loadMonths]);

  useEffect(() => {
    if (userRole !== "business" || !monthsLoaded) return;
    loadReport(selectedMonth, combinedFilters);
    loadPreview(selectedMonth, combinedFilters);
  }, [
    userRole,
    monthsLoaded,
    selectedMonth,
    combinedFilters,
    loadReport,
    loadPreview,
  ]);

  useEffect(() => {
    if (userRole !== "business" || !monthsLoaded) return;
    loadStaff(selectedMonth, filters);
  }, [userRole, monthsLoaded, selectedMonth, filters, loadStaff]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMonths(selectedStaffId);
    } catch {
      // ignore
    }
    await Promise.all([
      loadReport(selectedMonth, combinedFilters),
      loadPreview(selectedMonth, combinedFilters),
      loadStaff(selectedMonth, filters),
    ]);
    setRefreshing(false);
  }, [
    loadMonths,
    loadReport,
    loadPreview,
    loadStaff,
    selectedMonth,
    combinedFilters,
    filters,
    selectedStaffId,
  ]);

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

  const currency = report?.currency ?? staffReport?.currency ?? "USD";
  const hasActivity = report?.summary?.hasActivity === true;
  const showFaded = reportLoading && !!report && !initialLoading;
  const showStaffBreakdown =
    !staffFilterActive &&
    hasActivity &&
    !!staffReport &&
    staffReport.totals.transactionsCount > 0;

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
        staff_id:
          selectedStaffId === "all" ? "all" : String(selectedStaffId),
        label: selectedMonthLabel,
        currency,
      },
    });
  };

  const openStaffScreen = () => {
    router.push({
      pathname: "/(main)/businessEarnings/staff",
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

  const applyStaffFilter = (staffId: StaffIdFilter) => {
    setSelectedStaffId(staffId);
    router.setParams({
      staff_id: staffId === "all" ? "all" : String(staffId),
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

  const renderStaffControls = () => (
    <>
      <TouchableOpacity
        style={styles.staffPickerBtn}
        onPress={() => setStaffPickerVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.staffPickerLabel} numberOfLines={1}>
          {selectedStaffLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={iconScale(18)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>

      {staffFilterActive && (
        <View style={styles.staffChipRow}>
          <View style={styles.staffChip}>
            <Text style={styles.staffChipText} numberOfLines={1}>
              {selectedStaffLabel}
            </Text>
            <TouchableOpacity
              style={styles.staffChipClear}
              onPress={clearStaffFilter}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close"
                size={iconScale(14)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
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

  const renderStaffSection = () => {
    if (staffFilterActive) return null;

    if (staffError) {
      return (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("earningsByStaff")}</Text>
          <View style={styles.txnErrorWrap}>
            <Text style={styles.txnErrorText}>
              {t("earningsStaffLoadError")}
            </Text>
            <TouchableOpacity
              onPress={() => loadStaff(selectedMonth, filters)}
            >
              <Text style={styles.retryLink}>{t("retry")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!showStaffBreakdown || staffPreviewRows.length === 0) return null;

    return (
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleInline}>{t("earningsByStaff")}</Text>
          <TouchableOpacity onPress={openStaffScreen} activeOpacity={0.7}>
            <Text style={styles.seeAll}>{t("seeAll")}</Text>
          </TouchableOpacity>
        </View>
        {staffPreviewRows.map((row, idx) => (
          <EarningsStaffRow
            key={row.staffId ?? `unassigned-${idx}`}
            item={row}
            currency={currency}
            compact
            isLast={idx === staffPreviewRows.length - 1}
            onPress={
              row.staffId != null
                ? () => applyStaffFilter(row.staffId as number)
                : undefined
            }
          />
        ))}
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

    const sourceRows = staffFilterActive
      ? report.revenueBySource.filter((src) => src.source !== "subscription")
      : report.revenueBySource;

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

        {sourceRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("earningsWhereFrom")}</Text>
            {sourceRows.map((src) => (
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

        {renderStaffSection()}

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
                onPress={() => loadPreview(selectedMonth, combinedFilters)}
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
        {renderStaffControls()}
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

      <EarningsStaffPickerModal
        visible={staffPickerVisible}
        staff={staffReport?.staff ?? []}
        selectedStaffId={selectedStaffId}
        onClose={() => setStaffPickerVisible(false)}
        onSelect={applyStaffFilter}
      />
    </View>
  );
}
