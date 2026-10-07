import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import dayjs from "dayjs";
import { Appointment } from "@/src/components/appointmentDetail";
import { useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import {
  appointmentsEndpoints,
  staffEndpoints,
} from "@/src/services/endpoints";
import StackHeader from "@/src/components/StackHeader";
import { Skeleton } from "@/src/components/skeletons";
import EmptyState from "@/src/components/emptyState";
import DatePickerModal from "@/src/components/datePickerModal";
import type { OutcomeSummary } from "@/src/types/cancellationPolicy";

/** List rows may carry the same payment fields as the booking details API. */
type AppointmentRow = Appointment & {
  paymentMethod?: string;
  owesPayment?: boolean;
  outcomeSummary?: OutcomeSummary | null;
};

type StatusFilter =
  | "upcoming"
  | "needsAttention"
  | "completed"
  | "cancelled"
  | "noShow"
  | "all";

type DatePreset = "any" | "today" | "week" | "month" | "day";

type StaffOption = { id: number; name: string; isOwner: boolean };

const STATUS_PARAM: Record<StatusFilter, string | undefined> = {
  upcoming: "scheduled",
  needsAttention: "awaiting_outcome",
  completed: "completed",
  cancelled: "cancelled",
  noShow: "no_show",
  all: undefined,
};

const normalizeStatus = (status: string): Exclude<StatusFilter, "all"> | null => {
  switch (status) {
    case "scheduled":
      return "upcoming";
    case "awaiting_outcome":
      return "needsAttention";
    case "completed":
    case "complete":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "no_show":
      return "noShow";
    default:
      return null;
  }
};

type PaymentTone = "paid" | "due" | "failed" | "neutral";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    filtersWrap: {
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(6),
      gap: moderateHeightScale(10),
    },
    tabsRow: {
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateWidthScale(8),
    },
    tab: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tabActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    tabText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    tabTextActive: {
      color: theme.white,
    },
    dropdownRow: {
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateWidthScale(8),
    },
    dropdown: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(9),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    dropdownActive: {
      borderColor: theme.darkGreen,
    },
    dropdownText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(10),
    },
    emptyListContent: {
      flexGrow: 1,
    },
    card: {
      flexDirection: "row",
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: moderateWidthScale(6),
        },
        android: {
          elevation: 3,
          shadowColor: theme.darkGreen,
        },
      }),
    },
    cardAccent: {
      width: moderateWidthScale(4),
    },
    cardContent: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(8),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      lineHeight: fontSize.size18,
    },
    priceText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      alignSelf: "flex-start",
    },
    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(4),
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
    },
    badgeLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
    },
    badgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(4),
    },
    metaText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "capitalize",
    },
    bookingId: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(6),
    },
    workHistoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
    },
    line: {
      height: 1,
      backgroundColor: theme.lightGreen1,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(20),
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(20),
      borderTopRightRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      maxHeight: "70%",
    },
    handle: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.borderNormal,
      marginBottom: moderateHeightScale(14),
    },
    sheetTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: moderateWidthScale(10),
    },
    sheetRowText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    sheetRowSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
    },
  });

interface AppointmentsListProps {
  headerTitle: string;
  /** Lock the list to one barber (My Barber Profile). */
  staffId?: number | null;
  /** Show the barber picker (Business Management). */
  showBarberFilter?: boolean;
}

export default function AppointmentsList({
  headerTitle,
  staffId,
  showBarberFilter = false,
}: AppointmentsListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("upcoming");
  const [datePreset, setDatePreset] = useState<DatePreset>("any");
  const [pickedDay, setPickedDay] = useState<dayjs.Dayjs | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [staffSheetVisible, setStaffSheetVisible] = useState(false);

  const [data, setData] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const requestIdRef = useRef(0);

  const effectiveStaffId = staffId ?? selectedStaffId;

  const dateRange = useMemo((): { from: string; to: string } | null => {
    const today = dayjs();
    switch (datePreset) {
      case "today":
        return { from: today.format("YYYY-MM-DD"), to: today.format("YYYY-MM-DD") };
      case "week":
        return {
          from: today.startOf("week").format("YYYY-MM-DD"),
          to: today.endOf("week").format("YYYY-MM-DD"),
        };
      case "month":
        return {
          from: today.startOf("month").format("YYYY-MM-DD"),
          to: today.endOf("month").format("YYYY-MM-DD"),
        };
      case "day":
        return pickedDay
          ? { from: pickedDay.format("YYYY-MM-DD"), to: pickedDay.format("YYYY-MM-DD") }
          : null;
      default:
        return null;
    }
  }, [datePreset, pickedDay]);

  useEffect(() => {
    if (!showBarberFilter || staffId) return;
    (async () => {
      try {
        const response = await ApiService.get<{
          success: boolean;
          data: Array<{ id: number; name: string; is_owner?: boolean }>;
        }>(staffEndpoints.list());
        if (response.success && Array.isArray(response.data)) {
          setStaffOptions(
            response.data.map((s) => ({
              id: s.id,
              name: s.name,
              isOwner: s.is_owner === true,
            })),
          );
        }
      } catch (error: any) {
        Logger.error("Failed to fetch staff for appointments filter:", error);
      }
    })();
  }, [showBarberFilter, staffId]);

  const formatDateTime = (date: string, time: string) => {
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm A");
    return `${date} - ${formattedTime}`;
  };

  const formatPrice = (item: AppointmentRow) => {
    const raw = item.paidAmount ?? item.totalPrice;
    const amount =
      typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : NaN;
    return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "--";
  };

  const getServiceTitles = (appointment: Appointment) => {
    if (
      appointment.appointmentType === "subscription" &&
      Array.isArray(appointment.subscriptionServices) &&
      appointment.subscriptionServices.length > 0
    ) {
      return appointment.subscriptionServices.map((s) => s.name).join(", ");
    } else if (
      appointment.appointmentType === "service" &&
      Array.isArray(appointment.services) &&
      appointment.services.length > 0
    ) {
      return appointment.services.map((s) => s.name).join(", ");
    }
    return "Service";
  };

  const statusLabel = (status: string) => {
    switch (normalizeStatus(status)) {
      case "upcoming":
        return t("apptFilterUpcoming");
      case "needsAttention":
        return t("apptFilterNeedsAttention");
      case "completed":
        return t("apptFilterCompleted");
      case "cancelled":
        return t("apptFilterCanceled");
      case "noShow":
        return t("apptFilterNoShow");
      default:
        return status;
    }
  };

  const statusColors = (status: string) => {
    switch (normalizeStatus(status)) {
      case "completed":
        return { accent: theme.buttonBack, bg: theme.lightGreen1, text: theme.darkGreen };
      case "cancelled":
      case "noShow":
        return { accent: theme.red, bg: theme.lightRed, text: theme.red };
      default:
        return { accent: theme.orangeBrown, bg: theme.orangeBrown30, text: theme.orangeBrownText };
    }
  };

  // Same rules as the booking details screen, so the card and details agree.
  const paymentInfo = (item: AppointmentRow): { label: string; tone: PaymentTone } => {
    const summaryStatus = item.outcomeSummary?.paymentStatus;
    if (summaryStatus) {
      switch (summaryStatus) {
        case "paid":
          return { label: t("outcomePaymentPaid"), tone: "paid" };
        case "membership":
          return { label: t("outcomePaymentMembership"), tone: "paid" };
        case "payment_due":
          return { label: t("outcomePaymentDue"), tone: "due" };
        case "partially_refunded":
          return { label: t("outcomePaymentPartiallyRefunded"), tone: "neutral" };
        case "refunded":
          return { label: t("outcomePaymentRefunded"), tone: "neutral" };
        case "fee_charged":
          return {
            label:
              item.outcomeSummary?.outcome === "cancelled"
                ? t("outcomePaymentCancellationFeeCharged")
                : t("outcomePaymentFeeCharged"),
            tone: "neutral",
          };
        case "charge_failed":
          return { label: t("outcomePaymentChargeFailed"), tone: "failed" };
        case "no_charge":
          return { label: t("outcomePaymentNoCharge"), tone: "neutral" };
      }
    }
    if (item.appointmentType === "subscription") {
      return { label: t("outcomePaymentMembership"), tone: "paid" };
    }
    const owesPayment =
      item.owesPayment ??
      !(item.paymentMethod === "pay_now" && item.paidAmount != null);
    if (!owesPayment && item.paidAmount != null) {
      return { label: t("paidLabel"), tone: "paid" };
    }
    if (normalizeStatus(item.status) === "completed") {
      return { label: t("outcomePaymentDue"), tone: "due" };
    }
    return { label: t("payLaterLabel"), tone: "neutral" };
  };

  const paymentColors = (tone: PaymentTone) => {
    switch (tone) {
      case "paid":
        return { bg: theme.apptMintBg, text: theme.apptMintAccent };
      case "due":
        return { bg: theme.orangeBrown30, text: theme.selectCard };
      case "failed":
        return { bg: theme.lightRed, text: theme.red };
      default:
        return { bg: theme.lightGreen1, text: theme.darkGreen };
    }
  };

  const fetchAppointments = useCallback(
    async (page: number, append: boolean = false) => {
      const requestId = ++requestIdRef.current;
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const params: Parameters<typeof appointmentsEndpoints.list>[0] = {
          per_page: 16,
          // Upcoming reads best soonest-first; everything else newest-first.
          direction: statusFilter === "upcoming" ? "asc" : "desc",
          page,
        };
        const status = STATUS_PARAM[statusFilter];
        if (status) params.status = status;
        if (effectiveStaffId) params.staff_id = effectiveStaffId;
        if (dateRange) {
          params.appointment_from_date = dateRange.from;
          params.appointment_to_date = dateRange.to;
        }

        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: {
            data: AppointmentRow[];
            meta: {
              current_page: number;
              per_page: number;
              total: number;
              last_page: number;
            };
          };
        }>(appointmentsEndpoints.list(params));

        if (requestId !== requestIdRef.current) return;

        if (response.success && response.data) {
          const rows =
            statusFilter === "all"
              ? response.data.data
              : response.data.data.filter(
                  (row) => normalizeStatus(row.status) === statusFilter,
                );
          if (append) {
            setData((prev) => [...prev, ...rows]);
          } else {
            setData(rows);
          }
          setCurrentPage(response.data.meta.current_page);
          setHasMore(
            response.data.meta.current_page < response.data.meta.last_page,
          );
          if (page === 1) setInitialLoadComplete(true);
        }
      } catch (error: any) {
        Logger.error("Failed to fetch appointments:", error);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [statusFilter, effectiveStaffId, dateRange],
  );

  useEffect(() => {
    setData([]);
    setHasMore(true);
    setInitialLoadComplete(false);
    fetchAppointments(1);
  }, [fetchAppointments]);

  const handleLoadMore = useCallback(() => {
    if (initialLoadComplete && !loading && !loadingMore && hasMore) {
      fetchAppointments(currentPage + 1, true);
    }
  }, [initialLoadComplete, loading, currentPage, hasMore, loadingMore, fetchAppointments]);

  const renderItem = useCallback(
    ({ item }: { item: AppointmentRow }) => {
      const sc = statusColors(item.status);
      const payment = paymentInfo(item);
      const pc = paymentColors(payment.tone);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            router.push({
              pathname: "/(main)/bookingDetailsById",
              params: { bookingId: String(item.id) },
            });
          }}
        >
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: sc.accent }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.serviceName} numberOfLines={2}>
                  {getServiceTitles(item)}
                </Text>
                <Text style={styles.priceText}>{formatPrice(item)}</Text>
              </View>
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeLabel, { color: sc.text }]}>
                    {t("status")}:
                  </Text>
                  <Text style={[styles.badgeText, { color: sc.text }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: pc.bg }]}>
                  <Text style={[styles.badgeLabel, { color: pc.text }]}>
                    {t("payment")}:
                  </Text>
                  <Text style={[styles.badgeText, { color: pc.text }]}>
                    {payment.label}
                  </Text>
                </View>
              </View>
              {!!item.user && (
                <View style={styles.metaRow}>
                  <MaterialIcons name="person-outline" size={moderateWidthScale(14)} color={theme.lightGreen} />
                  <Text style={styles.metaText}>{item.user}</Text>
                </View>
              )}
              {!!item.staffName && (
                <View style={styles.metaRow}>
                  <MaterialIcons name="content-cut" size={moderateWidthScale(14)} color={theme.lightGreen} />
                  <Text style={styles.metaText}>{item.staffName}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <MaterialIcons name="schedule" size={moderateWidthScale(14)} color={theme.lightGreen} />
                <Text style={styles.metaText}>
                  {formatDateTime(item.appointmentDate, item.appointmentTime)}
                </Text>
              </View>
              {!!item.id && (
                <Text style={styles.bookingId}>{`#FP${item.id}`}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router, styles, t, theme],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [loadingMore, styles.footerLoader, theme.primary]);

  const hasExtraFilters = datePreset !== "any" || selectedStaffId != null;

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.contentContainer}>
          <Skeleton screenType="WorkHistoryList" styles={styles} />
        </View>
      );
    }
    return (
      <EmptyState
        icon="event-note"
        title={t("apptListEmptyTitle")}
        subtitle={
          hasExtraFilters
            ? t("apptListEmptyFilteredSubtitle")
            : t("apptListEmptySubtitle")
        }
      />
    );
  }, [loading, styles, t, hasExtraFilters]);

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "upcoming", label: t("apptFilterUpcoming") },
    { key: "needsAttention", label: t("apptFilterNeedsAttention") },
    { key: "completed", label: t("apptFilterCompleted") },
    { key: "cancelled", label: t("apptFilterCanceled") },
    { key: "noShow", label: t("apptFilterNoShow") },
    { key: "all", label: t("all") },
  ];

  const datePresets: { key: Exclude<DatePreset, "day">; label: string }[] = [
    { key: "any", label: t("apptDateAny") },
    { key: "today", label: t("apptDateToday") },
    { key: "week", label: t("apptDateThisWeek") },
    { key: "month", label: t("apptDateThisMonth") },
  ];

  const dateLabel =
    datePreset === "day" && pickedDay
      ? pickedDay.format("MMM D, YYYY")
      : datePresets.find((p) => p.key === datePreset)?.label ?? t("apptDateAny");

  const selectedStaffName =
    selectedStaffId == null
      ? t("apptAllBarbers")
      : staffOptions.find((s) => s.id === selectedStaffId)?.name ?? t("apptAllBarbers");

  const showStaffDropdown = showBarberFilter && !staffId && staffOptions.length > 0;

  return (
    <View style={styles.container}>
      <StackHeader title={headerTitle} />
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setStatusFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={[styles.dropdown, datePreset !== "any" && styles.dropdownActive]}
            onPress={() => setDateSheetVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="calendar-today" size={iconScale(16)} color={theme.darkGreen} />
            <Text style={styles.dropdownText} numberOfLines={1}>
              {dateLabel}
            </Text>
            <Ionicons name="chevron-down" size={iconScale(16)} color={theme.darkGreen} />
          </TouchableOpacity>
          {showStaffDropdown && (
            <TouchableOpacity
              style={[styles.dropdown, selectedStaffId != null && styles.dropdownActive]}
              onPress={() => setStaffSheetVisible(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="content-cut" size={iconScale(16)} color={theme.darkGreen} />
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedStaffName}
              </Text>
              <Ionicons name="chevron-down" size={iconScale(16)} color={theme.darkGreen} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.contentContainer,
          data.length === 0 && styles.emptyListContent,
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={dateSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDateSheetVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDateSheetVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{t("apptFilterByDate")}</Text>
            {datePresets.map((preset) => (
              <TouchableOpacity
                key={preset.key}
                style={styles.sheetRow}
                onPress={() => {
                  setDatePreset(preset.key);
                  setPickedDay(null);
                  setDateSheetVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.sheetRowText}>{preset.label}</Text>
                {datePreset === preset.key && (
                  <Ionicons name="checkmark" size={iconScale(20)} color={theme.darkGreen} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setDateSheetVisible(false);
                setDayPickerVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetRowText}>
                {datePreset === "day" && pickedDay
                  ? pickedDay.format("MMM D, YYYY")
                  : t("apptDatePickDay")}
              </Text>
              {datePreset === "day" ? (
                <Ionicons name="checkmark" size={iconScale(20)} color={theme.darkGreen} />
              ) : (
                <Ionicons name="chevron-forward" size={iconScale(18)} color={theme.darkGreen} />
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={dayPickerVisible}
        onClose={() => setDayPickerVisible(false)}
        selectedDate={pickedDay}
        onDateSelect={(date) => {
          setPickedDay(date);
          setDatePreset("day");
        }}
      />

      <Modal
        visible={staffSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStaffSheetVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setStaffSheetVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{t("apptFilterByBarber")}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[{ id: null as number | null, name: t("apptAllBarbers"), isOwner: false }, ...staffOptions].map(
                (option) => (
                  <TouchableOpacity
                    key={option.id ?? "all"}
                    style={styles.sheetRow}
                    onPress={() => {
                      setSelectedStaffId(option.id);
                      setStaffSheetVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetRowText}>{option.name}</Text>
                      {option.isOwner && (
                        <Text style={styles.sheetRowSub}>{t("owner")}</Text>
                      )}
                    </View>
                    {selectedStaffId === option.id && (
                      <Ionicons name="checkmark" size={iconScale(20)} color={theme.darkGreen} />
                    )}
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
