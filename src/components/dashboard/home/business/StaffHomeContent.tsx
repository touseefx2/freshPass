import React, { useCallback, useMemo, useState, type RefObject } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { RevenueSourceFilter } from "@/src/types/businessEarnings";
import {
  buildPeriod,
  isSameDashboardPeriod,
  isSingleDayPeriod,
  periodToParams,
  type DashboardPeriod,
  type DashboardPeriodKey,
} from "@/src/utils/dashboardPeriod";
import AwaitingOutcomeSection, {
  type AwaitingOutcomeAppointment,
} from "../components/AwaitingOutcomeSection";
import PaymentsToConfirmSection from "../components/PaymentsToConfirmSection";
import WelcomeSection from "../components/WelcomeSection";
import PeriodTabs from "./PeriodTabs";
import DateRangeSheet from "./DateRangeSheet";
import {
  AppointmentCountTiles,
  RevenueBreakdownTiles,
  RevenueRatingCards,
} from "./HomeStatCards";
import { PeriodAppointmentsCard } from "./AppointmentRows";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  SectionHeader,
  sortAppointmentsByTime,
} from "./shared";
import { usePeriodDashboardData } from "./usePeriodDashboardData";

const HOME_APPOINTMENTS_LIMIT = 5;
const GUTTER = moderateWidthScale(20);

const styles = StyleSheet.create({
  gutter: {
    paddingHorizontal: GUTTER,
  },
  section: {
    marginTop: moderateHeightScale(24),
  },
  tight: {
    marginTop: moderateHeightScale(14),
  },
});

type Props = {
  refreshKey: number;
  awaitingOutcomeData: AwaitingOutcomeAppointment[] | null;
  awaitingOutcomeLoading: boolean;
  onRefreshAwaitingOutcome: () => void;
  /** Home scrolls here when an appointment_outcomes push is tapped */
  awaitingOutcomeRef?: RefObject<View | null>;
  paymentsRefreshKey: number;
  onError: (message?: string) => void;
};

/**
 * Staff home: the business home layout narrowed to the staff member's own work.
 * The backend scopes earnings / stats / appointments to the caller and returns
 * gross only, so there's no Stripe, Orders, Products, booking profile or staff
 * overview here.
 */
export default function StaffHomeContent({
  refreshKey,
  awaitingOutcomeData,
  awaitingOutcomeLoading,
  onRefreshAwaitingOutcome,
  awaitingOutcomeRef,
  paymentsRefreshKey,
  onError,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const [period, setPeriod] = useState<DashboardPeriod>(() => buildPeriod("today"));
  const [rangeVisible, setRangeVisible] = useState(false);

  const data = usePeriodDashboardData(period, {
    refreshKey,
    // false = no staff list and no /earnings/staff (owner-only, 403 for staff)
    isPro: false,
    stats: true,
    staffEarnings: false,
    onError,
    onTimezoneChanged: () =>
      setPeriod((current) => {
        if (current.key === "custom") return current;
        const next = buildPeriod(current.key);
        return isSameDashboardPeriod(current, next) ? current : next;
      }),
  });

  const selectPeriod = useCallback(
    (key: Exclude<DashboardPeriodKey, "custom">) => setPeriod(buildPeriod(key)),
    [],
  );

  const overview = data.report?.overview ?? null;
  const reportLoading = data.report == null && !data.failed;
  const ownStaffId = data.report?.filters?.staffId ?? data.report?.staff?.id ?? null;

  /** Active first (what still needs doing), then the rest; cancelled left out. */
  const homeAppointments = useMemo(() => {
    if (data.appointments == null) return null;
    const visible = data.appointments.filter(
      (a) => a.status !== "cancelled" && a.status !== "canceled",
    );
    const active = sortAppointmentsByTime(
      visible.filter((a) => ACTIVE_APPOINTMENT_STATUSES.includes(a.status)),
    );
    const rest = sortAppointmentsByTime(
      visible.filter((a) => !ACTIVE_APPOINTMENT_STATUSES.includes(a.status)),
    );
    return [...active, ...rest].slice(0, HOME_APPOINTMENTS_LIMIT);
  }, [data.appointments]);

  const openTransactions = useCallback(
    (source?: Exclude<RevenueSourceFilter, "all">) => {
      if (source) {
        router.push({
          pathname: "/(main)/businessTransactions/list" as any,
          params: { ...periodToParams(period), source },
        });
        return;
      }
      router.push({
        pathname: "/(main)/businessTransactions" as any,
        params: periodToParams(period),
      });
    },
    [router, period],
  );

  // Reviews aren't narrowed for staff logins: send their own staff id
  const openReviews = useCallback(() => {
    if (ownStaffId == null) return;
    router.push({
      pathname: "/(main)/userReviews",
      params: { staff_id: String(ownStaffId) },
    });
  }, [router, ownStaffId]);

  const appointmentsTitle =
    period.key === "today"
      ? t("bhTodaysAppointments")
      : period.key === "week"
        ? t("bhWeekAppointments")
        : period.key === "month"
          ? t("bhMonthAppointments")
          : t("appointments");

  return (
    <View>
      <WelcomeSection />

      <View style={styles.gutter}>
        <PeriodTabs
          period={period}
          onSelect={selectPeriod}
          onCalendarPress={() => setRangeVisible(true)}
        />
      </View>

      <View style={[styles.gutter, styles.tight]}>
        <RevenueRatingCards
          totalRevenue={overview?.totalRevenue ?? null}
          revenueLoading={reportLoading}
          rating={data.stats?.rating?.overall_rating ?? null}
          ratingLoading={data.stats == null}
          onRevenuePress={() => openTransactions()}
          onRatingPress={openReviews}
        />
        <AppointmentCountTiles counts={data.stats?.appointments ?? null} />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader
          title={t("bhRevenueBreakdown")}
          actionLabel={t("viewAll")}
          onAction={() => openTransactions()}
        />
        <RevenueBreakdownTiles
          overview={overview}
          hideProducts
          onPressSource={(source) => openTransactions(source)}
        />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader
          title={appointmentsTitle}
          actionLabel={t("seeAll")}
          onAction={() =>
            router.push("/(main)/dashboard/(account)/myAppointments" as any)
          }
        />
        <PeriodAppointmentsCard
          appointments={homeAppointments}
          showStaff={false}
          showDate={!isSingleDayPeriod(period)}
          emptyText={t("bhNoAppointments")}
        />
        <View ref={awaitingOutcomeRef} style={styles.tight}>
          <AwaitingOutcomeSection
            data={awaitingOutcomeData}
            loading={awaitingOutcomeLoading}
            onRefresh={onRefreshAwaitingOutcome}
          />
          <PaymentsToConfirmSection refreshKey={paymentsRefreshKey} />
        </View>
      </View>

      <DateRangeSheet
        visible={rangeVisible}
        period={period}
        onClose={() => setRangeVisible(false)}
        onApply={(range) => {
          setRangeVisible(false);
          setPeriod(buildPeriod("custom", range));
        }}
      />
    </View>
  );
}
