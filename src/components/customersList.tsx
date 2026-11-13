import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import FloatingInput from "@/src/components/floatingInput";
import RetryButton from "@/src/components/retryButton";
import BusinessCustomerAvatar from "@/src/components/businessCustomerAvatar";
import { Skeleton } from "@/src/components/skeletons";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { EditorSheet } from "@/src/components/masterClasses/editorSheets";
import { EditorChips, EditorLabel, EditorPickerBox } from "@/src/components/masterClasses/editorFields";
import PastDateSheet from "@/src/components/businessCustomers/PastDateSheet";
import {
  emailStatusInfo,
  formatCustomerDate,
  lastVisitLine,
  sourceLabel,
} from "@/src/components/businessCustomers/customerDisplay";
import {
  countBusinessCustomers,
  customerErrorText,
  isForbiddenError,
  listBusinessCustomers,
} from "@/src/services/businessCustomerService";
import type {
  BusinessCustomerListParams,
  BusinessCustomerRecord,
} from "@/src/types/businessCustomer";

// Owner customer list on GET /api/business-customers (FreshPass bookings,
// walk-ins and imports). Old subscription-based list: customersListClassic.tsx
// — to switch back, `export { default } from "./customersListClassic";`.

const DEBOUNCE_MS = 400;
const INACTIVE_DAYS = 30;

type QuickFilter = "all" | "inactive" | "upcoming";
type SourceFilter = "any" | "booking" | "walk_in" | "import";
type HistoryFilter = "any" | "yes" | "no" | "unknown";
type EmailFilter = "any" | "subscribed" | "unsubscribed" | "unknown" | "suppressed";
type SortKey = "last_visit" | "name" | "created_at";

type AdvancedFilters = {
  source: SourceFilter;
  history: HistoryFilter;
  email: EmailFilter;
  from: string | null;
  to: string | null;
  sort: SortKey;
};

const DEFAULT_ADVANCED: AdvancedFilters = {
  source: "any",
  history: "any",
  email: "any",
  from: null,
  to: null,
  sort: "last_visit",
};

const advancedCount = (f: AdvancedFilters) =>
  (f.source !== "any" ? 1 : 0) +
  (f.history !== "any" ? 1 : 0) +
  (f.email !== "any" ? 1 : 0) +
  (f.from || f.to ? 1 : 0) +
  (f.sort !== "last_visit" ? 1 : 0);

export default function CustomersList({
  importId,
  title,
}: {
  /** Only the customers an import created or updated */
  importId?: string | number;
  title?: string;
} = {}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const [customers, setCustomers] = useState<BusinessCustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [counts, setCounts] = useState<{ total: number | null; inactive: number | null }>({
    total: null,
    inactive: null,
  });

  // Filter sheet (edits a draft; Apply copies it)
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [datePick, setDatePick] = useState<"from" | "to" | null>(null);

  const isFirstFocusRef = useRef(true);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildParams = useCallback((): BusinessCustomerListParams => {
    const p: BusinessCustomerListParams = { per_page: 20 };
    if (importId != null) p.import_id = importId;
    if (debouncedSearch) p.search = debouncedSearch;
    if (quick === "inactive") p.inactive_days = INACTIVE_DAYS;
    if (quick === "upcoming") p.has_upcoming = 1;
    if (advanced.source !== "any") p.source = advanced.source;
    if (advanced.history !== "any") p.history = advanced.history;
    if (advanced.email !== "any") p.email_status = advanced.email;
    if (advanced.from) p.last_visit_from = advanced.from;
    if (advanced.to) p.last_visit_to = advanced.to;
    if (advanced.sort !== "last_visit") {
      p.sort = advanced.sort;
      p.direction = advanced.sort === "name" ? "asc" : "desc";
    }
    return p;
  }, [importId, debouncedSearch, quick, advanced]);

  const loadCounts = useCallback(async () => {
    if (importId != null) return;
    const [total, inactive] = await Promise.allSettled([
      countBusinessCustomers({}),
      countBusinessCustomers({ inactive_days: INACTIVE_DAYS }),
    ]);
    setCounts({
      total: total.status === "fulfilled" ? total.value : null,
      inactive: inactive.status === "fulfilled" ? inactive.value : null,
    });
  }, [importId]);

  const fetchCustomers = useCallback(
    async (page = 1, append = false, isRefresh = false) => {
      if (append && isFetchingRef.current) return;
      isFetchingRef.current = true;
      const requestId = ++requestIdRef.current;
      if (append) setLoadingMore(true);
      else if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const { items, meta } = await listBusinessCustomers({ ...buildParams(), page });
        if (requestId !== requestIdRef.current) return;
        setForbidden(false);
        setCustomers((prev) => (append ? [...prev, ...items] : items));
        currentPageRef.current = meta.current_page;
        hasMoreRef.current = meta.current_page < meta.last_page;
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        hasMoreRef.current = false;
        if (isForbiddenError(err)) {
          setForbidden(true);
          setCustomers([]);
        } else if (!append) {
          setCustomers([]);
          setError(customerErrorText(err, t("failedToLoadCustomers")));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false;
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [buildParams, t],
  );

  useEffect(() => {
    hasMoreRef.current = false;
    currentPageRef.current = 1;
    fetchCustomers(1, false);
  }, [fetchCustomers]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      fetchCustomers(1, false, true);
      loadCounts();
    }, [fetchCustomers, loadCounts]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    hasMoreRef.current = false;
    fetchCustomers(1, false, true);
    loadCounts();
  }, [fetchCustomers, loadCounts]);

  const handleLoadMore = useCallback(() => {
    if (isFetchingRef.current || loading || loadingMore || refreshing) return;
    if (!hasMoreRef.current || customers.length === 0) return;
    fetchCustomers(currentPageRef.current + 1, true);
  }, [loading, loadingMore, refreshing, customers.length, fetchCustomers]);

  const openCustomer = useCallback(
    (c: BusinessCustomerRecord) => {
      Keyboard.dismiss();
      router.push({
        pathname: "/(main)/customerRecord",
        params: { id: String(c.id) },
      } as any);
    },
    [router],
  );

  const renderRow = useCallback(
    ({ item }: { item: BusinessCustomerRecord }) => {
      const email = emailStatusInfo(t, theme, item);
      const source = sourceLabel(t, item.source);
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.75}
          onPress={() => openCustomer(item)}
          accessibilityRole="button"
          accessibilityLabel={item.name || t("bcuUnnamed")}
        >
          <BusinessCustomerAvatar
            name={item.name}
            profileImageUrl={item.profileImageUrl}
            size={moderateWidthScale(46)}
            style={{ marginRight: moderateWidthScale(12) }}
          />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name?.trim() || t("bcuUnnamed")}
              </Text>
              {source ? (
                <View style={styles.sourcePill}>
                  <Text style={styles.sourcePillText} numberOfLines={1}>
                    {source}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.rowLine,
                item.history === "unknown" && !item.lastVisitOn && styles.rowLineMuted,
              ]}
              numberOfLines={1}
            >
              {lastVisitLine(t, item)}
            </Text>
            {item.nextAppointmentOn ? (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={theme.selectCard} />
                <Text style={[styles.metaText, { color: theme.selectCard }]} numberOfLines={1}>
                  {t("bcuUpcomingOn", { date: formatCustomerDate(item.nextAppointmentOn) })}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <View style={[styles.dot, { backgroundColor: email.color }]} />
              <Text style={styles.metaText} numberOfLines={1}>
                {email.label}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.lightGreen} />
        </TouchableOpacity>
      );
    },
    [openCustomer, styles, t, theme],
  );

  const activeAdvanced = advancedCount(advanced);
  const chips: { key: QuickFilter; label: string; count: number | null }[] = [
    { key: "all", label: t("all"), count: importId == null ? counts.total : null },
    {
      key: "inactive",
      label: t("bcuInactiveChip", { days: INACTIVE_DAYS }),
      count: importId == null ? counts.inactive : null,
    },
    { key: "upcoming", label: t("bcuUpcomingChip"), count: null },
  ];

  const header = (
    <View>
      {importId == null ? (
        <>
          <Text style={styles.caption}>{t("bcuListCaption")}</Text>
          <View style={styles.summary}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryNumber}>{counts.total ?? "–"}</Text>
              <Text style={styles.summaryLabel}>{t("bcuSummaryCustomers")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <TouchableOpacity
              style={styles.summaryCell}
              activeOpacity={0.8}
              onPress={() => setQuick("inactive")}
              accessibilityRole="button"
            >
              <Text style={styles.summaryNumber}>{counts.inactive ?? "–"}</Text>
              <Text style={styles.summaryLabel}>
                {t("bcuSummaryInactive", { days: INACTIVE_DAYS })}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <View style={styles.searchBox}>
        <FloatingInput
          label={t("searchCustomers")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("bcuSearchPlaceholder")}
          placeholderTextColor={theme.lightGreen}
          showClearButton
          onClear={() => setSearchQuery("")}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {importId == null ? (
        <View style={styles.actions}>
          <FlowButton
            label={t("bcuImportCustomers")}
            variant="outline"
            icon="upload-file"
            compact
            onPress={() => router.push("/(main)/importCustomers" as any)}
          />
          <FlowButton
            label={t("bcuBringBack")}
            icon="send"
            compact
            onPress={() => router.push("/(main)/bringCustomersBack" as any)}
          />
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        {chips.map((chip) => {
          const on = quick === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, on && styles.chipOn]}
              activeOpacity={0.8}
              onPress={() => setQuick(chip.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.label}</Text>
              {chip.count != null ? (
                <View style={[styles.chipCount, on && styles.chipCountOn]}>
                  <Text style={[styles.chipCountText, on && styles.chipTextOn]}>
                    {chip.count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.chip, activeAdvanced > 0 && styles.chipOn]}
          activeOpacity={0.8}
          onPress={() => {
            setDraft(advanced);
            setFilterOpen(true);
          }}
          accessibilityRole="button"
        >
          <Ionicons
            name="options-outline"
            size={14}
            color={activeAdvanced > 0 ? theme.white : theme.darkGreen}
          />
          <Text style={[styles.chipText, activeAdvanced > 0 && styles.chipTextOn]}>
            {activeAdvanced > 0
              ? t("bcuFiltersCount", { count: activeAdvanced })
              : t("bcuFilters")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const empty = (() => {
    if (loading) return <Skeleton screenType="Customers" />;
    if (forbidden) {
      return (
        <EmptyState
          icon="lock-outline"
          title={t("bcuOwnerOnlyTitle")}
          subtitle={t("bcuOwnerOnlyText")}
        />
      );
    }
    if (error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton onPress={() => fetchCustomers(1, false)} loading={loading} />
        </View>
      );
    }
    const filtered = !!debouncedSearch || quick !== "all" || activeAdvanced > 0;
    return (
      <EmptyState
        icon="people-outline"
        title={filtered ? t("bcuNoMatches") : t("noCustomersYet")}
        subtitle={filtered ? t("bcuNoMatchesText") : t("bcuEmptyText")}
        actionTitle={!filtered && importId == null ? t("bcuImportCustomers") : undefined}
        onActionPress={
          !filtered && importId == null
            ? () => router.push("/(main)/importCustomers" as any)
            : undefined
        }
      />
    );
  })();

  const sourceOptions: { value: SourceFilter; label: string }[] = [
    { value: "any", label: t("bcuAny") },
    { value: "booking", label: t("bcuSourceBooking") },
    { value: "walk_in", label: t("bcuSourceWalkIn") },
    { value: "import", label: t("bcuSourceImport") },
  ];
  const historyOptions: { value: HistoryFilter; label: string }[] = [
    { value: "any", label: t("bcuAny") },
    { value: "yes", label: t("bcuHistoryYes") },
    { value: "no", label: t("bcuHistoryNo") },
    { value: "unknown", label: t("bcuHistoryUnknownShort") },
  ];
  const emailOptions: { value: EmailFilter; label: string }[] = [
    { value: "any", label: t("bcuAny") },
    { value: "subscribed", label: t("bcuEmailSubscribedShort") },
    { value: "unsubscribed", label: t("bcuEmailUnsubscribed") },
    { value: "unknown", label: t("bcuEmailUnknownShort") },
    { value: "suppressed", label: t("bcuEmailSuppressedShort") },
  ];
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "last_visit", label: t("bcuSortLastVisit") },
    { value: "name", label: t("bcuSortName") },
    { value: "created_at", label: t("bcuSortNewest") },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" />
      <StackHeader title={title ?? t("customers")} />
      <FlatList
        data={forbidden ? [] : customers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        ListHeaderComponent={forbidden ? null : header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={empty}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
      />

      <EditorSheet
        visible={filterOpen}
        title={t("bcuFilters")}
        onClose={() => setFilterOpen(false)}
        scroll
        footer={
          <View style={styles.sheetFooter}>
            <FlowButton
              label={t("bcuClearFilters")}
              variant="outline"
              compact
              style={{ flex: 1 }}
              onPress={() => {
                setAdvanced(DEFAULT_ADVANCED);
                setFilterOpen(false);
              }}
            />
            <FlowButton
              label={t("bcuApply")}
              compact
              style={{ flex: 1.4 }}
              onPress={() => {
                setAdvanced(draft);
                setFilterOpen(false);
              }}
            />
          </View>
        }
      >
        <EditorLabel label={t("bcuFilterSource")} />
        <EditorChips
          options={sourceOptions}
          value={draft.source}
          onChange={(v) => setDraft((d) => ({ ...d, source: v }))}
        />
        <EditorLabel label={t("bcuFilterHistory")} style={styles.sheetGap} />
        <EditorChips
          options={historyOptions}
          value={draft.history}
          onChange={(v) => setDraft((d) => ({ ...d, history: v }))}
        />
        <EditorLabel label={t("bcuFilterEmail")} style={styles.sheetGap} />
        <EditorChips
          options={emailOptions}
          value={draft.email}
          onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
        />
        <EditorLabel label={t("bcuFilterLastVisit")} style={styles.sheetGap} />
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <EditorPickerBox
              icon="calendar-outline"
              value={draft.from ? formatCustomerDate(draft.from) : null}
              placeholder={t("bcuFrom")}
              onPress={() => setDatePick("from")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <EditorPickerBox
              icon="calendar-outline"
              value={draft.to ? formatCustomerDate(draft.to) : null}
              placeholder={t("bcuTo")}
              onPress={() => setDatePick("to")}
            />
          </View>
        </View>
        {draft.from || draft.to ? (
          <TouchableOpacity
            onPress={() => setDraft((d) => ({ ...d, from: null, to: null }))}
            hitSlop={8}
            style={styles.clearDates}
          >
            <MaterialIcons name="close" size={14} color={theme.selectCard} />
            <Text style={styles.clearDatesText}>{t("bcuClearDates")}</Text>
          </TouchableOpacity>
        ) : null}
        <EditorLabel label={t("bcuSortBy")} style={styles.sheetGap} />
        <EditorChips
          options={sortOptions}
          value={draft.sort}
          onChange={(v) => setDraft((d) => ({ ...d, sort: v }))}
        />
      </EditorSheet>

      <PastDateSheet
        visible={datePick != null}
        title={datePick === "to" ? t("bcuTo") : t("bcuFrom")}
        value={datePick === "to" ? draft.to : draft.from}
        minDate={datePick === "to" ? draft.from : null}
        maxDate={datePick === "from" ? draft.to : null}
        onClose={() => setDatePick(null)}
        onConfirm={(date) => {
          setDraft((d) => (datePick === "to" ? { ...d, to: date } : { ...d, from: date }));
          setDatePick(null);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(28),
      flexGrow: 1,
    },
    caption: {
      marginTop: moderateHeightScale(14),
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.lightGreen,
    },
    summary: {
      marginTop: moderateHeightScale(8),
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    summaryCell: { flex: 1, alignItems: "center", justifyContent: "center" },
    summaryDivider: { width: 1, backgroundColor: theme.white70, opacity: 0.35 },
    summaryNumber: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size24,
      color: theme.white,
    },
    summaryLabel: {
      marginTop: moderateHeightScale(2),
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.white70,
      textAlign: "center",
    },
    searchBox: { marginTop: moderateHeightScale(14) },
    actions: {
      marginTop: moderateHeightScale(12),
      gap: moderateHeightScale(10),
    },
    chips: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(14),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(38),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    chipOn: { backgroundColor: theme.darkGreen, borderColor: theme.darkGreen },
    chipText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
    },
    chipTextOn: { color: theme.white },
    chipCount: {
      minWidth: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
    },
    chipCountOn: { backgroundColor: "rgba(255,255,255,0.18)" },
    chipCountText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.darkGreen,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      marginBottom: moderateHeightScale(10),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    rowBody: { flex: 1, marginRight: moderateWidthScale(8) },
    rowTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(3),
    },
    rowName: {
      flexShrink: 1,
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size15,
      color: theme.darkGreen,
    },
    sourcePill: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.lightGreen1,
    },
    sourcePillText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size10,
      color: theme.darkGreen,
    },
    rowLine: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.textMuted,
    },
    rowLineMuted: { color: theme.lightGreen },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(4),
    },
    metaText: {
      flexShrink: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    errorBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    errorText: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size14,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    footerLoader: { paddingVertical: moderateHeightScale(16), alignItems: "center" },
    sheetFooter: { flexDirection: "row", gap: moderateWidthScale(10) },
    sheetGap: { marginTop: moderateHeightScale(16) },
    dateRow: { flexDirection: "row", gap: moderateWidthScale(10) },
    clearDates: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: moderateHeightScale(8),
      alignSelf: "flex-start",
    },
    clearDatesText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.selectCard,
    },
  });
