import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/src/hooks/hooks";
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
import type { StaffData } from "../components/StaffOnDuty";
import PeriodTabs from "./PeriodTabs";
import DateRangeSheet from "./DateRangeSheet";
import {
  AppointmentCountTiles,
  RevenueBreakdownTiles,
  RevenueRatingCards,
} from "./HomeStatCards";
import BookingProfileCard from "./BookingProfileCard";
import { PeriodAppointmentsCard } from "./AppointmentRows";
import StaffOverview, { type StaffPeriodStats } from "./StaffOverview";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  SectionHeader,
  sortAppointmentsByTime,
  type HomeAppointment,
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
  first: {
    paddingTop: moderateHeightScale(4),
  },
  tight: {
    marginTop: moderateHeightScale(14),
  },
});

function isOwnerMember(staff: StaffData) {
  return staff.is_owner === true || staff.is_business_owner === true;
}

type Props = {
  refreshKey: number;
  awaitingOutcomeData: AwaitingOutcomeAppointment[] | null;
  awaitingOutcomeLoading: boolean;
  onRefreshAwaitingOutcome: () => void;
  paymentsRefreshKey: number;
  onError: (message?: string) => void;
};

export default function BusinessHomeContent({
  refreshKey,
  awaitingOutcomeData,
  awaitingOutcomeLoading,
  onRefreshAwaitingOutcome,
  paymentsRefreshKey,
  onError,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  // Solo = the owner is the only provider: every staff section is hidden
  const isSolo = businessStatus?.subscription_is_single === true;
  const isPro = !isSolo;

  const [period, setPeriod] = useState<DashboardPeriod>(() => buildPeriod("today"));
  const [rangeVisible, setRangeVisible] = useState(false);

  const data = usePeriodDashboardData(period, {
    refreshKey,
    isPro,
    stats: true,
    staffEarnings: true,
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

  const ownerStaff = useMemo(
    () => data.staffList?.find(isOwnerMember) ?? null,
    [data.staffList],
  );
  const employees = useMemo(
    () => (data.staffList ? data.staffList.filter((s) => !isOwnerMember(s)) : null),
    [data.staffList],
  );

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

  const statsFor = useCallback(
    (member: StaffData): StaffPeriodStats => {
      const name = member.name?.trim().toLowerCase();
      const matches = (appt: HomeAppointment) =>
        appt.staffId != null
          ? appt.staffId === member.id
          : !!name && appt.staffName?.trim().toLowerCase() === name;
      const appointments = (data.appointments ?? []).filter(
        (a) => a.status !== "cancelled" && a.status !== "canceled" && matches(a),
      ).length;
      const row = data.staffEarnings?.find((r) => r.staffId === member.id);
      return {
        appointments,
        revenue: data.staffEarnings == null ? null : (row?.grossEarnings ?? 0),
      };
    },
    [data.appointments, data.staffEarnings],
  );

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
      <View style={[styles.gutter, styles.first]}>
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
          onRatingPress={() => router.push("/(main)/userReviews")}
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
          onPressSource={(source) => openTransactions(source)}
        />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <BookingProfileCard
          ownerStaff={ownerStaff}
          isSolo={isSolo}
          onOwnerChanged={() => void data.reloadStaffList()}
        />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader
          title={appointmentsTitle}
          actionLabel={t("seeAll")}
          onAction={() =>
            router.push("/(main)/dashboard/(account)/allAppointments" as any)
          }
        />
        <PeriodAppointmentsCard
          appointments={homeAppointments}
          showStaff={isPro}
          showDate={!isSingleDayPeriod(period)}
          emptyText={t("bhNoAppointments")}
        />
        <View style={styles.tight}>
          <AwaitingOutcomeSection
            data={awaitingOutcomeData}
            loading={awaitingOutcomeLoading}
            onRefresh={onRefreshAwaitingOutcome}
          />
          <PaymentsToConfirmSection refreshKey={paymentsRefreshKey} />
        </View>
      </View>

      {isPro ? (
        <View style={styles.section}>
          <StaffOverview
            staff={employees}
            statsFor={statsFor}
            onStaffChanged={() => void data.reloadStaffList()}
          />
        </View>
      ) : null}

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
