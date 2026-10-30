import { useCallback, useEffect, useRef, useState } from "react";
import { ApiService, isRequestCanceled } from "@/src/services/api";
import {
  appointmentsEndpoints,
  dashboardEndpoints,
  staffEndpoints,
} from "@/src/services/endpoints";
import {
  HOME_TRANSACTIONS_PREVIEW,
  fetchEarningsForPeriod,
  fetchPeriodTransactions,
  fetchStaffEarningsForPeriod,
} from "@/src/services/businessEarningsService";
import Logger from "@/src/services/logger";
import type {
  EarningsReport,
  EarningsTransaction,
  StaffEarningsRow,
} from "@/src/types/businessEarnings";
import {
  isSingleDayPeriod,
  periodApiQuery,
  periodAppointmentsQuery,
  setBusinessTimezone,
  type DashboardPeriod,
} from "@/src/utils/dashboardPeriod";
import type { StaffData } from "../components/StaffOnDuty";
import type { DashboardAppointmentCounts } from "./HomeStatCards";
import type { HomeAppointment } from "./shared";

/** Enough for one day / week; per-staff counts for a busy month may undercount. */
const PERIOD_APPOINTMENTS_PER_PAGE = 100;

export interface DashboardStatsResponse {
  appointments?: DashboardAppointmentCounts;
  rating?: { overall_rating?: number | null };
}

type Options = {
  /** Bumped by focus / pull-to-refresh; 0 = wait (status not loaded yet) */
  refreshKey: number;
  isPro: boolean;
  /** Default true */
  appointments?: boolean;
  stats?: boolean;
  staffEarnings?: boolean;
  transactionsPreview?: boolean;
  /** Called when the server's business timezone differs from the device's */
  onTimezoneChanged?: () => void;
  onError?: (message?: string) => void;
};

export function usePeriodDashboardData(period: DashboardPeriod, options: Options) {
  const {
    refreshKey,
    isPro,
    appointments: wantAppointments = true,
    stats: wantStats = false,
    staffEarnings: wantStaffEarnings = false,
    transactionsPreview: wantTransactions = false,
  } = options;

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [report, setReport] = useState<EarningsReport | null>(null);
  const [appointments, setAppointments] = useState<HomeAppointment[] | null>(null);
  const [staffList, setStaffList] = useState<StaffData[] | null>(null);
  const [staffEarnings, setStaffEarnings] = useState<StaffEarningsRow[] | null>(null);
  const [transactions, setTransactions] = useState<EarningsTransaction[] | null>(null);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  // Only the newest request may write state (fast tab switching)
  const requestId = useRef(0);
  const lastPeriodSig = useRef<string | null>(null);
  const callbacks = useRef(options);
  callbacks.current = options;

  const loadStaffList = useCallback(async () => {
    if (!isPro) {
      setStaffList([]);
      return;
    }
    try {
      const response = await ApiService.get<{ success: boolean; data: StaffData[] }>(
        staffEndpoints.list(),
      );
      if (response.success && Array.isArray(response.data)) {
        setStaffList(response.data);
      }
    } catch (error) {
      if (!isRequestCanceled(error)) {
        Logger.error("Business home staff list failed:", error);
        setStaffList((prev) => prev ?? []);
      }
    }
  }, [isPro]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    const sig = `${period.key}|${period.from}|${period.to}`;
    if (lastPeriodSig.current !== sig) {
      // New period: show skeletons instead of the previous period's numbers
      lastPeriodSig.current = sig;
      setStats(null);
      setReport(null);
      setAppointments(null);
      setStaffEarnings(null);
      setTransactions(null);
    }
    setFailed(false);

    const query = periodApiQuery(period);
    const tasks: Promise<unknown>[] = [];

    tasks.push(
      fetchEarningsForPeriod(query).then((data) => {
        if (!isCurrent()) return;
        setReport(data);
        if (setBusinessTimezone(data.period?.timezone)) {
          callbacks.current.onTimezoneChanged?.();
        }
      }),
    );

    if (wantStats) {
      tasks.push(
        ApiService.get<{ success: boolean; data: DashboardStatsResponse }>(
          dashboardEndpoints.stats(query),
        ).then((response) => {
          if (isCurrent() && response.success && response.data) {
            setStats(response.data);
          }
        }),
      );
    }

    if (wantAppointments) {
      tasks.push(
        ApiService.get<{
          success: boolean;
          data: { data: HomeAppointment[]; meta?: { total?: number } };
        }>(
          appointmentsEndpoints.list({
            ...periodAppointmentsQuery(period),
            sort: isSingleDayPeriod(period) ? "appointment_time" : "appointment_date",
            direction: "asc",
            per_page: PERIOD_APPOINTMENTS_PER_PAGE,
          }),
        ).then((response) => {
          if (!isCurrent()) return;
          setAppointments(
            Array.isArray(response?.data?.data) ? response.data.data : [],
          );
        }),
      );
    }

    if (isPro && wantStaffEarnings) {
      tasks.push(
        fetchStaffEarningsForPeriod(query).then((data) => {
          if (isCurrent()) setStaffEarnings(data.staff ?? []);
        }),
      );
    }

    if (wantTransactions) {
      tasks.push(
        fetchPeriodTransactions(query, {
          page: 1,
          perPage: HOME_TRANSACTIONS_PREVIEW,
        }).then(({ transactions: rows, meta }) => {
          if (!isCurrent()) return;
          setTransactions(rows);
          setTransactionsTotal(meta.total ?? rows.length);
        }),
      );
    }

    tasks.push(loadStaffList());

    const results = await Promise.allSettled(tasks);
    if (!isCurrent()) return;
    const rejected = results.filter(
      (r): r is PromiseRejectedResult =>
        r.status === "rejected" && !isRequestCanceled(r.reason),
    );
    if (rejected.length > 0) {
      Logger.error("Business period data failed:", rejected.map((r) => r.reason));
      setFailed(true);
      // Sections that failed stop showing skeletons
      // (Report and staff earnings stay null: their numbers show as a dash)
      setStats((prev) => prev ?? {});
      setAppointments((prev) => prev ?? []);
      setTransactions((prev) => prev ?? []);
      callbacks.current.onError?.(rejected[0].reason?.message);
    }
  }, [
    period,
    isPro,
    wantAppointments,
    wantStats,
    wantStaffEarnings,
    wantTransactions,
    loadStaffList,
  ]);

  useEffect(() => {
    if (refreshKey === 0) return;
    void load();
  }, [load, refreshKey]);

  return {
    stats,
    report,
    appointments,
    staffList,
    staffEarnings,
    transactions,
    transactionsTotal,
    failed,
    reload: load,
    reloadStaffList: loadStaffList,
  };
}
