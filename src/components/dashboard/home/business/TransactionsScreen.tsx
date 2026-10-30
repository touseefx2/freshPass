import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { checkInternetConnection } from "@/src/services/api";
import type {
  EarningsTransaction,
  RevenueSourceFilter,
} from "@/src/types/businessEarnings";
import {
  buildPeriod,
  isSameDashboardPeriod,
  isSingleDayPeriod,
  periodFromParams,
  periodToParams,
  type DashboardPeriod,
  type DashboardPeriodKey,
} from "@/src/utils/dashboardPeriod";
import PeriodTabs from "./PeriodTabs";
import DateRangeSheet from "./DateRangeSheet";
import { RevenueBreakdownGrid } from "./HomeStatCards";
import { ListEmpty, ListSkeleton, StaffAppointmentsCard } from "./AppointmentRows";
import {
  RevenueBarChart,
  TransactionDetailSheet,
  TransactionRow,
  useTransactionPress,
} from "./TransactionParts";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  SectionHeader,
  createCardStyle,
  formatAmount,
  resolveImageUri,
  sortAppointmentsByTime,
  type HomeAppointment,
} from "./shared";
import { usePeriodDashboardData } from "./usePeriodDashboardData";
import { transactionKey } from "@/src/services/businessEarningsService";

const STAFF_APPOINTMENTS_LIMIT = 5;
const CHART_HEIGHT = moderateHeightScale(64);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
    },
    heroShadow: {
      marginTop: moderateHeightScale(14),
      borderRadius: moderateWidthScale(18),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
      elevation: 3,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      borderRadius: moderateWidthScale(18),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(18),
      overflow: "hidden",
    },
    heroCopy: {
      flex: 1.1,
      minWidth: 0,
    },
    heroLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    heroAmount: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    heroSub: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    heroPlaceholder: {
      marginTop: moderateHeightScale(8),
      height: moderateHeightScale(30),
      width: "80%",
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white15,
    },
    chartDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor: theme.white15,
    },
    chartCol: {
      flex: 1,
    },
    section: {
      marginTop: moderateHeightScale(24),
    },
    breakdown: {
      marginTop: moderateHeightScale(14),
    },
    earningsLink: {
      marginTop: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(14),
      height: moderateHeightScale(48),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.surfaceRaised,
    },
    earningsLinkText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    listCard: {
      ...createCardStyle(theme),
      overflow: "hidden",
    },
  });

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ period?: string; from?: string; to?: string }>();
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  // Staff see their own gross work only (no fees, payouts, products, staff rows)
  const isStaff = userRole === "staff";
  const allowed = userRole === "business" || isStaff;
  const isSolo = businessStatus?.subscription_is_single === true;
  const isPro = !isSolo && !isStaff;

  const [period, setPeriod] = useState<DashboardPeriod>(() => periodFromParams(params));
  const [rangeVisible, setRangeVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [detailItem, setDetailItem] = useState<EarningsTransaction | null>(null);

  useEffect(() => {
    if (!allowed) router.back();
  }, [allowed, router]);

  // Refetch every time the screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((key) => key + 1);
    }, []),
  );

  const data = usePeriodDashboardData(period, {
    refreshKey,
    isPro,
    // Only Pro shows "Current staff appointments"
    appointments: isPro,
    transactionsPreview: true,
    onError: (message) =>
      showBanner(t("apiFailed"), message || t("earningsTransactionsError"), "error", 2500),
    onTimezoneChanged: () =>
      setPeriod((current) => {
        if (current.key === "custom") return current;
        const next = buildPeriod(current.key);
        return isSameDashboardPeriod(current, next) ? current : next;
      }),
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const online = await checkInternetConnection();
    if (!online) {
      setRefreshing(false);
      showBanner(t("noInternetConnection"), t("pleaseCheckInternetConnection"), "error", 2500);
      return;
    }
    await data.reload();
    setRefreshing(false);
  }, [data, showBanner, t]);

  const selectPeriod = useCallback(
    (key: Exclude<DashboardPeriodKey, "custom">) => setPeriod(buildPeriod(key)),
    [],
  );

  const overview = data.report?.overview ?? null;
  const reportLoading = data.report == null && !data.failed;
  const showDate = !isSingleDayPeriod(period);
  const onTransactionPress = useTransactionPress(setDetailItem);

  const openList = (source?: Exclude<RevenueSourceFilter, "all">) =>
    router.push({
      pathname: "/(main)/businessTransactions/list" as any,
      params: { ...periodToParams(period), ...(source ? { source } : {}) },
    });

  const staffById = useMemo(() => {
    const map = new Map<number, string>();
    (data.staffList ?? []).forEach((s) => map.set(s.id, resolveImageUri(s.user?.profile_image_url)));
    return map;
  }, [data.staffList]);

  const staffImageFor = useCallback(
    (appt: HomeAppointment) => {
      if (appt.staffId != null && staffById.has(appt.staffId)) {
        return staffById.get(appt.staffId) as string;
      }
      const byName = (data.staffList ?? []).find(
        (s) => s.name?.trim().toLowerCase() === appt.staffName?.trim().toLowerCase(),
      );
      return resolveImageUri(byName?.user?.profile_image_url);
    },
    [staffById, data.staffList],
  );

  const staffAppointments = useMemo(() => {
    if (data.appointments == null) return null;
    return sortAppointmentsByTime(
      data.appointments.filter((a) => ACTIVE_APPOINTMENT_STATUSES.includes(a.status)),
    ).slice(0, STAFF_APPOINTMENTS_LIMIT);
  }, [data.appointments]);

  if (!allowed) {
    return <View style={styles.container} />;
  }

  const renderTransactions = () => {
    if (data.transactions == null) return <ListSkeleton rows={4} />;
    if (data.transactions.length === 0) {
      return (
        <View style={styles.listCard}>
          <ListEmpty icon="receipt-text-outline" text={t("bhNoTransactions")} />
        </View>
      );
    }
    return (
      <View style={styles.listCard}>
        {data.transactions.map((item, index) => (
          <TransactionRow
            key={transactionKey(item)}
            item={item}
            isFirst={index === 0}
            showStaff={isPro}
            showDate={showDate}
            onPress={onTransactionPress}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.darkGreen} barStyle="light-content" translucent />
      <StackHeader
        title={t("bhTransactions")}
        showLine={false}
        rightIcon={<Feather name="calendar" size={iconScale(22)} color={theme.white} />}
        onRightPress={() => setRangeVisible(true)}
        rightAccessibilityLabel={t("bhPickDates")}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          // Own screen, no tab bar: clear the home indicator
          { paddingBottom: insets.bottom + moderateHeightScale(28) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        <PeriodTabs period={period} onSelect={selectPeriod} />

        <View style={styles.heroShadow}>
          <LinearGradient
            colors={[theme.darkGreen, theme.darkGreenDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel} numberOfLines={1}>
                {t("totalRevenue")}
              </Text>
              {reportLoading ? (
                <View style={styles.heroPlaceholder} />
              ) : (
                <Text
                  style={styles.heroAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {overview ? formatAmount(overview.totalRevenue) : "—"}
                </Text>
              )}
              <Text style={styles.heroSub} numberOfLines={1}>
                {overview ? t("bhTxCount", { count: overview.transactionsCount }) : " "}
              </Text>
            </View>
            <View style={styles.chartDivider} />
            <View style={styles.chartCol}>
              <RevenueBarChart chart={data.report?.chart} height={CHART_HEIGHT} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.breakdown}>
          <RevenueBreakdownGrid
            overview={overview}
            hideProducts={isStaff}
            onPressSource={(source) => openList(source)}
          />
        </View>

        {isStaff ? null : (
          <TouchableOpacity
            style={styles.earningsLink}
            activeOpacity={0.7}
            onPress={() => router.push("/(main)/businessEarnings")}
            accessibilityRole="button"
          >
            <Ionicons name="wallet-outline" size={iconScale(18)} color={theme.buttonBack} />
            <Text style={styles.earningsLinkText} numberOfLines={1}>
              {t("bhNetEarningsLink")}
            </Text>
            <Feather name="chevron-right" size={iconScale(18)} color={theme.lightGreen5} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <SectionHeader
            title={t("bhTransactionList")}
            actionLabel={t("seeAll")}
            onAction={() => openList()}
          />
          {renderTransactions()}
        </View>

        {isPro ? (
          <View style={styles.section}>
            <SectionHeader
              title={t("bhCurrentStaffAppointments")}
              actionLabel={t("seeAll")}
              onAction={() => router.push("/(main)/dashboard/(calendar)")}
            />
            <StaffAppointmentsCard
              appointments={staffAppointments}
              staffImageFor={staffImageFor}
              showDate={showDate}
              emptyText={t("bhNoCurrentAppointments")}
            />
          </View>
        ) : null}
      </ScrollView>

      <DateRangeSheet
        visible={rangeVisible}
        period={period}
        onClose={() => setRangeVisible(false)}
        onApply={(range) => {
          setRangeVisible(false);
          setPeriod(buildPeriod("custom", range));
        }}
      />
      <TransactionDetailSheet item={detailItem} onClose={() => setDetailItem(null)} />
    </View>
  );
}
