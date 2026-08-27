import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Image,
  GestureResponderEvent,
  DimensionValue,
} from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
  iconScale,
} from "@/src/theme/dimensions";
import DashboardHeader from "@/src/components/DashboardHeader";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import TimePickerModal from "@/src/components/timePickerModal";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/ar";
import "dayjs/locale/fr";
import "dayjs/locale/es";
import "dayjs/locale/de";
import "dayjs/locale/ja";

import { ApiService } from "@/src/services/api";
import {
  formatLeaveDateDisplay,
  formatLeaveTimeDisplay,
  leaveCoversDay,
  timeToMinutes,
  toApiTime,
} from "@/src/utils/leaveDateTime";
import {
  appointmentsEndpoints,
  staffEndpoints,
} from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter, useFocusEffect } from "expo-router";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "subscription" | "service";
  status: string;
  user: string;
  userEmail: string;
  userProfilePic?: string | null;
  userImage?: string | null;
  userAvatar?: string | null;
  subscription: string | null;
  subscriptionServices:
    | Array<{
        id: number;
        name: string;
        description: string;
        price: string;
        duration: {
          hours: number;
          minutes: number;
        };
      }>
    | {};
  subscriptionVisits: {
    used: number;
    total: number;
  } | null;
  services:
    | Array<{
        id: number;
        name: string;
        description: string;
        price: string;
        duration: {
          hours: number;
          minutes: number;
        };
      }>
    | {};
  totalPrice: number | {};
  paidAmount: string;
  staffName: string;
  staffEmail: string;
  notes: string | null;
  businessTitle: string;
  businessAddress: string;
  businessLogoUrl: string | null;
  createdAt: string;
}

interface CalendarAppointment {
  id: string;
  title: string;
  scheduled_at: string;
  date: string;
  start_minutes: number;
  duration_minutes: number;
  duration: string;
  price: number;
  status_label: string;
  client_name: string;
  avatar_url: string;
  originalAppointment: Appointment;
}

interface StaffLeave {
  id: number;
  staff_id: number;
  staff_name: string;
  type: "leave" | "break";
  start_date: string;
  start_time: string | null;
  end_date: string;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

interface PositionedAppointment {
  appointment: CalendarAppointment;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

interface BreakBlock {
  leave: StaffLeave;
  startMinutes: number;
  endMinutes: number;
}

type ViewMode = "day" | "week" | "month";

const SLOT_INTERVAL_MINUTES = 30;
const HOUR_HEIGHT = heightScale(148);
const MIN_BLOCK_HEIGHT_COMPACT = heightScale(80);
const MIN_BLOCK_HEIGHT_DETAILED = heightScale(62);
const TIME_GUTTER_WIDTH = widthScale(38);
const BLOCK_LINE_HEIGHT = moderateHeightScale(16);
const BLOCK_AVATAR_SIZE = widthScale(18);
const GRID_START_HOUR = 0;
const GRID_END_HOUR = 24;
const MONTH_CELL_HEIGHT = heightScale(54);
const DAY_CIRCLE_SIZE = widthScale(36);

const getWeekDays = (date: dayjs.Dayjs) => {
  const startOfWeek = date.startOf("week");
  return Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));
};

const formatHourLabel = (hour: number) => {
  const normalized = hour % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  const displayHour = normalized % 12 || 12;
  return `${displayHour} ${suffix}`;
};

const formatMinutesLabel = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
};

const formatShortTimeLabel = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour % 12 || 12}:${minute.toString().padStart(2, "0")}`;
};

const resolveCustomerAvatar = (appointment: Appointment) => {
  const fallback = process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  const raw =
    appointment.userProfilePic ??
    appointment.userImage ??
    appointment.userAvatar ??
    null;

  if (typeof raw !== "string" || raw.trim() === "") return fallback;

  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return path ? `${base}/${path}` : fallback;
};

// Splits overlapping appointments of one day into side-by-side lanes
const layoutDayAppointments = (
  dayAppointments: CalendarAppointment[],
  startHour: number,
  minBlockHeight: number,
): PositionedAppointment[] => {
  const sorted = [...dayAppointments].sort(
    (a, b) =>
      a.start_minutes - b.start_minutes ||
      a.duration_minutes - b.duration_minutes,
  );

  const positioned: PositionedAppointment[] = [];
  let cluster: CalendarAppointment[] = [];
  let clusterEnd = -1;

  const blockMinutes = (appointment: CalendarAppointment) =>
    Math.max(appointment.duration_minutes, SLOT_INTERVAL_MINUTES);

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();

    cluster.forEach((appointment) => {
      const end = appointment.start_minutes + blockMinutes(appointment);
      let lane = laneEnds.findIndex(
        (laneEnd) => laneEnd <= appointment.start_minutes,
      );
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = end;
      laneOf.set(appointment.id, lane);
    });

    cluster.forEach((appointment) => {
      const offsetMinutes = appointment.start_minutes - startHour * 60;
      positioned.push({
        appointment,
        top: (offsetMinutes / 60) * HOUR_HEIGHT,
        height: Math.max(
          (blockMinutes(appointment) / 60) * HOUR_HEIGHT,
          minBlockHeight,
        ),
        lane: laneOf.get(appointment.id) ?? 0,
        laneCount: laneEnds.length,
      });
    });

    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((appointment) => {
    if (cluster.length > 0 && appointment.start_minutes >= clusterEnd) {
      flushCluster();
    }
    cluster.push(appointment);
    clusterEnd = Math.max(
      clusterEnd,
      appointment.start_minutes + blockMinutes(appointment),
    );
  });
  flushCluster();

  return positioned;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(10),
      gap: moderateWidthScale(8),
    },
    segmentGroup: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      padding: moderateWidthScale(3),
    },
    segment: {
      flexShrink: 1,
      paddingHorizontal: moderateWidthScale(11),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(16),
    },
    segmentActive: {
      backgroundColor: theme.darkGreen,
    },
    segmentText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    segmentTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    toolbarRight: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 0,
      gap: moderateWidthScale(6),
    },
    todayButton: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.orangeBrown30,
    },
    todayButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    arrowButton: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    rangeRow: {
      alignItems: "center",
      paddingBottom: moderateHeightScale(10),
    },
    rangeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    daysStrip: {
      flexDirection: "row",
      paddingTop: moderateHeightScale(6),
      paddingBottom: moderateHeightScale(8),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    daysStripGutter: {
      width: TIME_GUTTER_WIDTH,
    },
    dayCell: {
      alignItems: "center",
    },
    dayName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(5),
    },
    dayNumberContainer: {
      width: DAY_CIRCLE_SIZE,
      height: DAY_CIRCLE_SIZE,
      borderRadius: DAY_CIRCLE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    dayNumberSelected: {
      backgroundColor: theme.darkGreen,
    },
    dayNumberToday: {
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
    },
    dayNumber: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      includeFontPadding: false,
    },
    dayDot: {
      width: widthScale(5),
      height: widthScale(5),
      borderRadius: widthScale(3),
      backgroundColor: theme.buttonBack,
      marginTop: moderateHeightScale(3),
    },
    dayDotPlaceholder: {
      width: widthScale(5),
      height: widthScale(5),
      marginTop: moderateHeightScale(3),
    },
    agendaContainer: {
      flex: 1,
      position: "relative",
    },
    agendaHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.lightGreen05,
    },
    todayLabel: {
      flex: 1,
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(14),
      justifyContent: "center",
    },
    todayLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    todayText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    leaveBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.primary,
      marginLeft: moderateWidthScale(8),
    },
    leaveBoxText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.primary,
    },
    manageAvailabilityText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.primary,
      marginLeft: moderateWidthScale(8),
    },
    gridRow: {
      flexDirection: "row",
    },
    timeGutter: {
      width: TIME_GUTTER_WIDTH,
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
    },
    hourLabel: {
      position: "absolute",
      right: moderateWidthScale(4),
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
    },
    columnsArea: {
      flex: 1,
    },
    hourLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: theme.borderLight,
    },
    halfHourLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: theme.lightGreen05,
    },
    columnsRow: {
      flexDirection: "row",
    },
    dayColumn: {
      position: "relative",
      borderLeftWidth: 1,
      borderLeftColor: theme.borderLight,
    },
    dayColumnSelected: {
      backgroundColor: theme.lightGreen05,
    },
    blockWrapper: {
      position: "absolute",
      zIndex: 2,
      paddingHorizontal: moderateWidthScale(1),
      paddingBottom: moderateHeightScale(2),
    },
    block: {
      flex: 1,
      borderRadius: moderateWidthScale(8),
      borderLeftWidth: 3,
      paddingHorizontal: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(5),
      justifyContent: "space-between",
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    blockTime: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontBold,
      lineHeight: BLOCK_LINE_HEIGHT,
    },
    blockClient: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: BLOCK_LINE_HEIGHT,
      textTransform:"capitalize"
    },
    blockService: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreenLight,
      lineHeight: BLOCK_LINE_HEIGHT,
      textTransform:"capitalize"
    },
    blockAvatar: {
      alignSelf: "flex-start",
      width: BLOCK_AVATAR_SIZE,
      height: BLOCK_AVATAR_SIZE,
      borderRadius: BLOCK_AVATAR_SIZE / 2,
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.white80,
    },
    blockDetailed: {
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(10),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    detailAvatar: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.emptyProfileImage,
    },
    detailInfo: {
      flex: 1,
    },
    detailTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    detailMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    statusBadge: {
      backgroundColor: theme.appointmentStatus,
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
    },
    statusBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.appointmentStatusText,
    },
    breakBlock: {
      position: "absolute",
      zIndex: 2,
      left: moderateWidthScale(1),
      right: moderateWidthScale(1),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.lightRed,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      paddingHorizontal: moderateWidthScale(1),
    },
    leaveLabelText: {
      fontSize: fontSize.size8,
      fontFamily: fonts.fontBold,
      color: theme.red,
      textAlign: "center",
      includeFontPadding: false,
      // fontScale floors at 12pt; shrink so label fits narrow week columns
      transform: [{ scale: 0.7 }],
    },
    closedTint: {
      position: "absolute",
      zIndex: 2,
      top: moderateHeightScale(1),
      left: moderateWidthScale(1),
      right: moderateWidthScale(1),
      bottom: moderateHeightScale(1),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.lightRed,
      overflow: "hidden",
    },
    closedChip: {
      position: "absolute",
      zIndex: 3,
      top: moderateHeightScale(6),
      left: moderateWidthScale(1),
      right: moderateWidthScale(1),
      alignItems: "center",
    },
    nowLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1.5,
      backgroundColor: theme.buttonBack,
      zIndex: 5,
    },
    nowDot: {
      position: "absolute",
      left: -widthScale(3),
      top: -widthScale(3),
      width: widthScale(7),
      height: widthScale(7),
      borderRadius: widthScale(4),
      backgroundColor: theme.buttonBack,
    },
    nowPill: {
      position: "absolute",
      right: moderateWidthScale(2),
      paddingHorizontal: moderateWidthScale(5),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.buttonBack,
      zIndex: 6,
    },
    nowPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    monthWeekdaysRow: {
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(8),
      paddingBottom: moderateHeightScale(6),
    },
    monthWeekdayText: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    monthRow: {
      flexDirection: "row",
      paddingHorizontal: moderateWidthScale(8),
    },
    monthCell: {
      flex: 1,
      height: MONTH_CELL_HEIGHT,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: moderateHeightScale(4),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    monthCellSelected: {
      backgroundColor: theme.lightGreen07,
    },
    monthCellNumber: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    monthCellNumberMuted: {
      color: theme.lightGreen4,
    },
    monthCellNumberToday: {
      color: theme.selectCard,
      fontFamily: fonts.fontBold,
    },
    monthDotsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(2),
      marginTop: moderateHeightScale(4),
    },
    monthDot: {
      width: widthScale(5),
      height: widthScale(5),
      borderRadius: widthScale(3),
      backgroundColor: theme.buttonBack,
    },
    monthLeaveDot: {
      width: widthScale(5),
      height: widthScale(5),
      borderRadius: widthScale(3),
      backgroundColor: theme.red,
    },
    monthCountText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    monthListHeader: {
      paddingHorizontal: moderateWidthScale(14),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(6),
    },
    monthListHeaderText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    listCard: {
      marginHorizontal: moderateWidthScale(14),
      marginBottom: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      borderLeftWidth: 3,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    emptyState: {
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    applyBoxOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(12),
      alignItems: "flex-start",
      justifyContent: "flex-start",
      zIndex: 10,
    },
    applyBoxDropdown: {
      maxWidth: widthScale(210),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
      borderWidth: 1,
      borderColor: theme.borderLine,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 6,
    },
    applyBoxHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(2),
    },
    applyBoxCloseBtn: {
      padding: moderateWidthScale(2),
      marginTop: moderateHeightScale(-2),
      marginRight: moderateWidthScale(-2),
    },
    applyBoxDateText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    applyBoxHint: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    applyBoxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    applyBoxRadioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    applyBoxRadioOuter: {
      width: widthScale(14),
      height: widthScale(14),
      borderRadius: widthScale(7),
      borderWidth: 1.5,
      borderColor: theme.borderLine,
      alignItems: "center",
      justifyContent: "center",
    },
    applyBoxRadioOuterSelected: {
      borderColor: theme.primary,
    },
    applyBoxRadioInner: {
      width: widthScale(6),
      height: widthScale(6),
      borderRadius: widthScale(3),
      backgroundColor: theme.primary,
    },
    applyBoxOptionText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    applyBoxSlotRow: {
      flexDirection: "row",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(4),
    },
    applyBoxSlotLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    applyBoxTimeTouch: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(4),
    },
    applyBoxTimeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    applyBoxButtonWrap: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    applyBoxButton: {
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.primary,
      alignItems: "center",
    },
    applyBoxButtonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    leaveDetailBoxOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(12),
      alignItems: "flex-start",
      justifyContent: "flex-start",
      zIndex: 10,
    },
    leaveDetailBoxDropdown: {
      maxWidth: widthScale(210),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
      borderWidth: 1,
      borderColor: theme.borderLine,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 6,
    },
    leaveDetailBoxHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(2),
    },
    leaveDetailBoxDateText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    leaveDetailBoxCloseBtn: {
      padding: moderateWidthScale(2),
      marginTop: moderateHeightScale(-2),
      marginRight: moderateWidthScale(-2),
    },
    leaveDetailBoxTimeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    leaveDetailBoxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(2),
    },
    leaveDetailBoxLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      width: moderateWidthScale(60),
    },
    leaveDetailBoxValue: {
      flex: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    leaveDetailBoxTypeWrap: {
      marginBottom: moderateHeightScale(4),
    },
    leaveDetailBoxTypeBadge: {
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.lightRed,
      alignSelf: "flex-start",
    },
    leaveDetailBoxTypeBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    leaveDetailBoxCancelWrap: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    leaveDetailBoxCancelBtn: {
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.primary,
      alignItems: "center",
    },
    leaveDetailBoxCancelBtnText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
  });

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const userRole = useAppSelector((state: any) => state.user.userRole);

  useEffect(() => {
    dayjs.locale(i18n.language || "en");
  }, [i18n.language]);

  const today = dayjs();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [week, setWeek] = useState(getWeekDays(today));
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(
    today.hour() * 60 + today.minute(),
  );
  const [applyBoxVisible, setApplyBoxVisible] = useState(false);
  const [applyBoxDate, setApplyBoxDate] = useState(today);
  const [applyBoxType, setApplyBoxType] = useState<"leave" | "break">("leave");
  const [applyBoxSlotHour, setApplyBoxSlotHour] = useState(9);
  const [applyBoxBreakStartMinutes, setApplyBoxBreakStartMinutes] = useState(0);
  const [applyBoxBreakEndHour, setApplyBoxBreakEndHour] = useState(10);
  const [applyBoxBreakEndMinutes, setApplyBoxBreakEndMinutes] = useState(0);
  const [applyBoxTimePickerVisible, setApplyBoxTimePickerVisible] =
    useState(false);
  const [applyBoxTimePickerTarget, setApplyBoxTimePickerTarget] = useState<
    "start" | "end" | null
  >(null);
  const [applyBoxLoading, setApplyBoxLoading] = useState(false);
  const [leaveDetailBoxVisible, setLeaveDetailBoxVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<StaffLeave | null>(null);
  const [leaveDetailCancelling, setLeaveDetailCancelling] = useState(false);

  const canManageLeaves = userRole === "staff" || userRole === "business";
  const currentDate = selectedDate.format("YYYY-MM-DD");
  const isPastDate = selectedDate.isBefore(today, "day");

  const blockPalette = useMemo(
    () => [
      { bg: theme.apptMintBg, accent: theme.apptMintAccent },
      { bg: theme.apptPeachBg, accent: theme.apptPeachAccent },
      { bg: theme.apptBlueBg, accent: theme.apptBlueAccent },
      { bg: theme.apptPinkBg, accent: theme.apptPinkAccent },
      { bg: theme.apptLavenderBg, accent: theme.apptLavenderAccent },
      { bg: theme.apptGoldBg, accent: theme.apptGoldAccent },
    ],
    [theme],
  );

  const getPalette = useCallback(
    (id: string) => {
      const numeric = Number(id.replace(/\D/g, "")) || id.length;
      return blockPalette[numeric % blockPalette.length];
    },
    [blockPalette],
  );

  const fetchRange = useMemo(() => {
    if (viewMode === "month") {
      return {
        from: selectedDate.startOf("month").startOf("week"),
        to: selectedDate.endOf("month").endOf("week"),
      };
    }
    return { from: week[0], to: week[6] };
  }, [viewMode, selectedDate, week]);

  // Leaves use calendar-month bounds in month view (not pad weeks).
  const leavesFetchRange = useMemo(() => {
    if (viewMode === "day") {
      const day = selectedDate;
      return { from: day, to: day };
    }
    if (viewMode === "month") {
      return {
        from: selectedDate.startOf("month"),
        to: selectedDate.endOf("month"),
      };
    }
    return { from: week[0], to: week[6] };
  }, [viewMode, selectedDate, week]);

  const fetchFrom = fetchRange.from.format("YYYY-MM-DD");
  const fetchTo = fetchRange.to.format("YYYY-MM-DD");
  const leavesFetchFrom = leavesFetchRange.from.format("YYYY-MM-DD");
  const leavesFetchTo = leavesFetchRange.to.format("YYYY-MM-DD");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = dayjs();
      setNowMinutes(now.hour() * 60 + now.minute());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch appointments whenever the visible range changes
  useEffect(() => {
    if (userRole === "business" || userRole === "staff") {
      fetchAppointments(fetchFrom, fetchTo);
    }
  }, [fetchFrom, fetchTo, userRole]);

  const fetchLeaves = useCallback(async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: StaffLeave[];
      }>(
        staffEndpoints.leavesList({
          start_date: leavesFetchFrom,
          end_date: leavesFetchTo,
        }),
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        setLeaves(response.data);
      } else {
        setLeaves([]);
      }
    } catch {
      setLeaves([]);
    }
  }, [leavesFetchFrom, leavesFetchTo]);

  // Refetch leaves when range changes or screen focuses
  useEffect(() => {
    if (canManageLeaves) {
      fetchLeaves();
    }
  }, [canManageLeaves, fetchLeaves]);

  useFocusEffect(
    useCallback(() => {
      if (canManageLeaves) {
        fetchLeaves();
      }
    }, [canManageLeaves, fetchLeaves]),
  );

  const leaveForSelectedDate = useMemo(() => {
    const dateStr = selectedDate.format("YYYY-MM-DD");
    return leaves.find((l) => leaveCoversDay(l, dateStr));
  }, [leaves, selectedDate]);

  const getBreakBlocksForDay = useCallback(
    (day: dayjs.Dayjs): BreakBlock[] => {
      const dateStr = day.format("YYYY-MM-DD");
      return leaves
        .filter((l) => l.type === "break" && leaveCoversDay(l, dateStr))
        .map((l) => {
          const startMinutes =
            dateStr === l.start_date ? timeToMinutes(l.start_time, 0) : 0;
          const endMinutes =
            dateStr === l.end_date
              ? timeToMinutes(l.end_time, 24 * 60)
              : 24 * 60;
          return {
            leave: l,
            startMinutes,
            endMinutes,
          };
        })
        .filter((block) => block.endMinutes > block.startMinutes);
    },
    [leaves],
  );

  const getLeaveForDay = useCallback(
    (day: dayjs.Dayjs) => {
      const dateStr = day.format("YYYY-MM-DD");
      return leaves.find(
        (l) => l.type === "leave" && leaveCoversDay(l, dateStr),
      );
    },
    [leaves],
  );

  /** Dates in the current leaves response that have a close (leave) or break. */
  const leaveDotDates = useMemo(() => {
    const dates = new Set<string>();
    leaves.forEach((leave) => {
      let cursor = dayjs(leave.start_date);
      const end = dayjs(leave.end_date);
      if (!cursor.isValid() || !end.isValid()) return;
      while (cursor.isBefore(end, "day") || cursor.isSame(end, "day")) {
        dates.add(cursor.format("YYYY-MM-DD"));
        cursor = cursor.add(1, "day");
      }
    });
    return dates;
  }, [leaves]);

  const fetchAppointments = async (fromDate: string, toDate: string) => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          data: Appointment[];
          meta: {
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
          };
        };
      }>(
        appointmentsEndpoints.list({
          appointment_from_date: fromDate,
          appointment_to_date: toDate,
          per_page: 100,
          direction: "desc",
        }),
      );

      if (response.success && response.data) {
        const transformedAppointments = transformAppointments(
          response.data.data,
        );
        setAppointments(transformedAppointments);
      }
    } catch (error: any) {
      showBanner(
        t("apiFailed"),
        error?.message || t("failedToFetchAppointments"),
        "error",
        2500,
      );
    } finally {
      setLoading(false);
    }
  };

  const transformAppointments = (
    apiAppointments: Appointment[],
  ): CalendarAppointment[] => {
    return apiAppointments.map((appointment) => {
      // Get service titles (subscription base or service base)
      const getServiceTitles = () => {
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

      // Calculate total duration
      const calculateTotalDuration = (
        services: Array<{ duration: { hours: number; minutes: number } }> | {},
      ) => {
        if (!services || !Array.isArray(services) || services.length === 0)
          return 0;
        const totalMinutes = services.reduce((total, service) => {
          return total + service.duration.hours * 60 + service.duration.minutes;
        }, 0);
        return totalMinutes;
      };

      const services =
        appointment.appointmentType === "subscription"
          ? appointment.subscriptionServices
          : appointment.services;

      const totalMinutes = calculateTotalDuration(
        Array.isArray(services) ? services : [],
      );
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      let durationText = "";
      if (hours > 0 && minutes > 0) {
        durationText = `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
      } else if (hours > 0) {
        durationText = `${hours} hour${hours > 1 ? "s" : ""}`;
      } else {
        durationText = `${minutes} min`;
      }

      // Parse date and time
      // Date format is "MM/DD/YYYY"
      const dateParts = appointment.appointmentDate.split("/");
      const month = dateParts[0].padStart(2, "0");
      const day = dateParts[1].padStart(2, "0");
      const year = dateParts[2];
      const [hour, minute] = appointment.appointmentTime.split(":");

      const dateKey = `${year}-${month}-${day}`;
      const startMinutes =
        parseInt(hour, 10) * 60 + parseInt(minute || "0", 10);

      const scheduledAt = dayjs(
        `${dateKey} ${hour}:${minute}`,
        "YYYY-MM-DD HH:mm",
      ).toISOString();

      // Format status - show "On-going apt." for scheduled
      const statusLabel =
        appointment.status === "scheduled"
          ? "On-going apt."
          : appointment.status;

      // Format client name (truncate if needed)
      const clientName =
        appointment.user.length > 12
          ? `${appointment.user.substring(0, 10)}...`
          : appointment.user;

      return {
        id: appointment.id.toString(),
        title: getServiceTitles(),
        scheduled_at: scheduledAt,
        date: dateKey,
        start_minutes: startMinutes,
        duration_minutes: totalMinutes,
        duration: durationText,
        price: parseFloat(appointment.paidAmount),
        status_label: statusLabel,
        client_name: clientName,
        avatar_url: resolveCustomerAvatar(appointment),
        originalAppointment: appointment,
      };
    });
  };

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    appointments.forEach((appointment) => {
      if (!map[appointment.date]) map[appointment.date] = [];
      map[appointment.date].push(appointment);
    });
    return map;
  }, [appointments]);

  const gridDays = useMemo(
    () => (viewMode === "week" ? week : [selectedDate]),
    [viewMode, week, selectedDate],
  );

  // Full day grid, one row per hour (12 AM – 12 AM)
  const hours = useMemo(
    () =>
      Array.from(
        { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
        (_, index) => GRID_START_HOUR + index,
      ),
    [],
  );

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;

  const layoutByDate = useMemo(() => {
    const map: Record<string, PositionedAppointment[]> = {};
    gridDays.forEach((day) => {
      const key = day.format("YYYY-MM-DD");
      map[key] = layoutDayAppointments(
        appointmentsByDate[key] ?? [],
        GRID_START_HOUR,
        viewMode === "day"
          ? MIN_BLOCK_HEIGHT_DETAILED
          : MIN_BLOCK_HEIGHT_COMPACT,
      );
    });
    return map;
  }, [gridDays, appointmentsByDate, viewMode]);

  const isTodayVisible = useMemo(
    () => gridDays.some((day) => day.isSame(today, "day")),
    [gridDays],
  );

  const nowTop = ((nowMinutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showNowLine = isTodayVisible && viewMode !== "month";

  const monthWeeks = useMemo(() => {
    const start = selectedDate.startOf("month").startOf("week");
    const end = selectedDate.endOf("month").endOf("week");
    const rows: dayjs.Dayjs[][] = [];
    let cursor = start;
    while (cursor.isBefore(end, "day") || cursor.isSame(end, "day")) {
      rows.push(Array.from({ length: 7 }, (_, i) => cursor.add(i, "day")));
      cursor = cursor.add(7, "day");
    }
    return rows;
  }, [selectedDate]);

  const selectedDayAppointments = useMemo(
    () =>
      [...(appointmentsByDate[currentDate] ?? [])].sort(
        (a, b) => a.start_minutes - b.start_minutes,
      ),
    [appointmentsByDate, currentDate],
  );

  // Bring the grid to the current time (or first appointment) of the visible day
  useEffect(() => {
    if (viewMode === "month") return;
    const firstAppointment = selectedDayAppointments[0];
    const anchorMinutes = isTodayVisible
      ? nowMinutes
      : (firstAppointment?.start_minutes ?? 9 * 60);
    const offset =
      ((anchorMinutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT - HOUR_HEIGHT;
    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, offset),
        animated: false,
      });
    }, 80);
    return () => clearTimeout(timeout);
  }, [viewMode, currentDate, selectedDayAppointments.length]);

  const closeOverlays = () => {
    setApplyBoxVisible(false);
    setLeaveDetailBoxVisible(false);
  };

  const goToDate = (date: dayjs.Dayjs) => {
    setSelectedDate(date);
    setWeek(getWeekDays(date));
  };

  const handlePrev = () => {
    closeOverlays();
    if (viewMode === "day") {
      goToDate(selectedDate.subtract(1, "day"));
    } else if (viewMode === "week") {
      goToDate(selectedDate.subtract(7, "day"));
    } else {
      goToDate(selectedDate.subtract(1, "month").startOf("month"));
    }
  };

  const handleNext = () => {
    closeOverlays();
    if (viewMode === "day") {
      goToDate(selectedDate.add(1, "day"));
    } else if (viewMode === "week") {
      goToDate(selectedDate.add(7, "day"));
    } else {
      goToDate(selectedDate.add(1, "month").startOf("month"));
    }
  };

  const handleToday = () => {
    closeOverlays();
    goToDate(dayjs());
  };

  const rangeLabel = useMemo(() => {
    if (viewMode === "day") return selectedDate.format("dddd, MMM D, YYYY");
    if (viewMode === "month") return selectedDate.format("MMMM YYYY");
    return `${week[0].format("MMM D")} - ${week[6].format("MMM D, YYYY")}`;
  }, [viewMode, selectedDate, week]);

  const formatDate = (date: dayjs.Dayjs) => {
    if (date.isSame(today, "day")) {
      return t("today");
    } else if (date.isSame(today.add(1, "day"), "day")) {
      return t("tomorrow");
    } else if (date.isSame(today.subtract(1, "day"), "day")) {
      return t("yesterday");
    }
    return date.format("MMM D, YYYY");
  };

  const openLeaveDetailBox = (leave: StaffLeave) => {
    setApplyBoxVisible(false);
    setSelectedLeave(leave);
    setLeaveDetailBoxVisible(true);
  };

  const formatLeaveDetailDateOnly = (dateStr: string) =>
    formatLeaveDateDisplay(dateStr, true);

  const formatLeaveDetailTimeOnly = (timeStr: string | null) =>
    formatLeaveTimeDisplay(timeStr);

  const handleCancelLeaveFromBox = async () => {
    if (selectedLeave == null) return;
    setLeaveDetailCancelling(true);
    try {
      await ApiService.delete<{ success: boolean; message: string }>(
        staffEndpoints.leaveCancel(selectedLeave.id),
      );
      showBanner(
        t("success") || "Success",
        t("leaveCancelledSuccessfully"),
        "success",
        2500,
      );
      setLeaveDetailBoxVisible(false);
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error: any) {
      showBanner(
        t("apiFailed") || "Error",
        error?.message ?? "Failed to cancel leave",
        "error",
        2500,
      );
    } finally {
      setLeaveDetailCancelling(false);
    }
  };

  const openApplyBox = (
    type: "leave" | "break" = "leave",
    startMinutes?: number,
    date?: dayjs.Dayjs,
  ) => {
    setLeaveDetailBoxVisible(false);
    const targetDate = date ?? selectedDate;
    setApplyBoxDate(targetDate);
    if (!targetDate.isSame(selectedDate, "day")) {
      setSelectedDate(targetDate);
    }
    setApplyBoxType(type);
    const start = startMinutes ?? 9 * 60;
    const end = Math.min(start + SLOT_INTERVAL_MINUTES, 24 * 60);
    setApplyBoxSlotHour(Math.floor(start / 60));
    setApplyBoxBreakStartMinutes(start % 60);
    if (end >= 24 * 60) {
      setApplyBoxBreakEndHour(23);
      setApplyBoxBreakEndMinutes(59);
    } else {
      setApplyBoxBreakEndHour(Math.floor(end / 60));
      setApplyBoxBreakEndMinutes(end % 60);
    }
    setApplyBoxVisible(true);
  };

  const formatApplyBoxTime = (hours: number, minutes: number) => {
    const period = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const handleApplyBoxTimeSelect = (hours: number, minutes: number) => {
    if (applyBoxTimePickerTarget === "start") {
      setApplyBoxSlotHour(hours);
      setApplyBoxBreakStartMinutes(minutes);
    } else if (applyBoxTimePickerTarget === "end") {
      setApplyBoxBreakEndHour(hours);
      setApplyBoxBreakEndMinutes(minutes);
    }
    setApplyBoxTimePickerVisible(false);
    setApplyBoxTimePickerTarget(null);
  };

  const applyLeaveBreakFromBox = async () => {
    setApplyBoxLoading(true);
    try {
      const date = applyBoxDate;
      const dateStr = date.format("YYYY-MM-DD");
      if (applyBoxType === "leave") {
        const body = {
          start_date: dateStr,
          end_date: dateStr,
          start_time: null,
          end_time: null,
          type: "leave" as const,
        };
        const response = await ApiService.post<{
          success: boolean;
          message?: string;
        }>(staffEndpoints.leaves, body);
        if (response.success) {
          showBanner(
            t("success") || "Success",
            response.message || "Leave applied.",
            "success",
            2500,
          );
          setApplyBoxVisible(false);
          fetchLeaves();
        } else {
          showBanner(
            t("apiFailed") || "Error",
            (response as { message?: string }).message ||
              "Failed to apply leave.",
            "error",
            2500,
          );
        }
      } else {
        const startMinutes =
          applyBoxSlotHour * 60 + applyBoxBreakStartMinutes;
        const endMinutes = applyBoxBreakEndHour * 60 + applyBoxBreakEndMinutes;

        if (endMinutes <= startMinutes) {
          showBanner(
            t("apiFailed") || "Error",
            t("endTimeMustBeGreater"),
            "error",
            2500,
          );
          return;
        }

        const body = {
          start_date: dateStr,
          end_date: dateStr,
          start_time: toApiTime(applyBoxSlotHour, applyBoxBreakStartMinutes),
          end_time: toApiTime(applyBoxBreakEndHour, applyBoxBreakEndMinutes),
          type: "break" as const,
        };
        const response = await ApiService.post<{
          success: boolean;
          message?: string;
        }>(staffEndpoints.leaves, body);
        if (response.success) {
          showBanner(
            t("success") || "Success",
            response.message || t("breakApplied"),
            "success",
            2500,
          );
          setApplyBoxVisible(false);
          fetchLeaves();
        } else {
          showBanner(
            t("apiFailed") || "Error",
            (response as { message?: string }).message ||
              "Failed to apply break.",
            "error",
            2500,
          );
        }
      }
    } catch (error: unknown) {
      showBanner(
        t("apiFailed") || "Error",
        (error as { message?: string })?.message || "Something went wrong.",
        "error",
        2500,
      );
    } finally {
      setApplyBoxLoading(false);
    }
  };

  const openAppointment = (appointment: CalendarAppointment) => {
    router.push({
      pathname: "/(main)/bookingDetailsById",
      params: {
        bookingId: appointment.id,
      },
    });
  };

  const handleColumnPress = (
    day: dayjs.Dayjs,
    event: GestureResponderEvent,
  ) => {
    if (!canManageLeaves) return;

    if (applyBoxVisible || leaveDetailBoxVisible) {
      closeOverlays();
      return;
    }

    // Closed day: tap anywhere on the shaded column opens cancel/detail box.
    const closedLeave = getLeaveForDay(day);
    if (closedLeave) {
      if (!day.isSame(selectedDate, "day")) {
        setSelectedDate(day);
      }
      openLeaveDetailBox(closedLeave);
      return;
    }

    if (day.isBefore(today, "day")) return;

    // Snap click Y to the nearest 30-minute slot in that day column.
    const rawMinutes =
      GRID_START_HOUR * 60 +
      Math.max(0, (event.nativeEvent.locationY / HOUR_HEIGHT) * 60);
    const maxStart = 24 * 60 - SLOT_INTERVAL_MINUTES;
    const snapped = Math.min(
      maxStart,
      Math.floor(rawMinutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES,
    );

    openApplyBox("break", snapped, day);
  };

  const laneStyle = (lane: number, laneCount: number) => ({
    left: `${(lane * 100) / laneCount}%` as DimensionValue,
    width: `${100 / laneCount}%` as DimensionValue,
  });

  const renderCompactBlock = (positioned: PositionedAppointment) => {
    const { appointment, top, height, lane, laneCount } = positioned;
    const palette = getPalette(appointment.id);
    // Time + client + avatar + padding are always shown, the rest of the box is
    // filled with as many service lines as fit.
    const reservedHeight =
      BLOCK_LINE_HEIGHT * 2 + BLOCK_AVATAR_SIZE + moderateHeightScale(12);
    const serviceLines = Math.max(
      1,
      Math.min(4, Math.floor((height - reservedHeight) / BLOCK_LINE_HEIGHT)),
    );
    return (
      <View
        key={appointment.id}
        style={[
          styles.blockWrapper,
          { top, height },
          laneStyle(lane, laneCount),
        ]}
      >
        <TouchableOpacity
          style={[
            styles.block,
            { backgroundColor: palette.bg, borderLeftColor: palette.accent },
          ]}
          activeOpacity={0.8}
          onPress={() => openAppointment(appointment)}
        >
          <Text
            numberOfLines={1}
            style={[styles.blockTime, { color: palette.accent }]}
          >
            {formatShortTimeLabel(appointment.start_minutes)}
          </Text>
          <Text numberOfLines={1} style={styles.blockClient}>
            {appointment.client_name}
          </Text>
          <Text numberOfLines={serviceLines} style={styles.blockService}>
            {appointment.title}
          </Text>
          <Image
            source={{ uri: appointment.avatar_url }}
            style={styles.blockAvatar}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderDetailCardContent = (appointment: CalendarAppointment) => (
    <View style={styles.detailRow}>
      <Image
        source={{ uri: appointment.avatar_url }}
        style={styles.detailAvatar}
        resizeMode="cover"
      />
      <View style={styles.detailInfo}>
        <Text numberOfLines={1} style={styles.detailTitle}>
          {appointment.title}
        </Text>
        <Text numberOfLines={1} style={styles.detailMeta}>
          {formatMinutesLabel(appointment.start_minutes)} •{" "}
          {appointment.duration} • {appointment.client_name}
        </Text>
      </View>
      <View style={styles.statusBadge}>
        <Text numberOfLines={1} style={styles.statusBadgeText}>
          {appointment.status_label}
        </Text>
      </View>
    </View>
  );

  const renderDetailBlock = (positioned: PositionedAppointment) => {
    const { appointment, top, height, lane, laneCount } = positioned;
    const palette = getPalette(appointment.id);
    return (
      <View
        key={appointment.id}
        style={[
          styles.blockWrapper,
          { top, height },
          laneStyle(lane, laneCount),
        ]}
      >
        <TouchableOpacity
          style={[
            styles.block,
            styles.blockDetailed,
            { backgroundColor: palette.bg, borderLeftColor: palette.accent },
          ]}
          activeOpacity={0.8}
          onPress={() => openAppointment(appointment)}
        >
          {renderDetailCardContent(appointment)}
        </TouchableOpacity>
      </View>
    );
  };

  const renderListCard = (appointment: CalendarAppointment) => {
    const palette = getPalette(appointment.id);
    return (
      <TouchableOpacity
        key={appointment.id}
        style={[
          styles.listCard,
          { backgroundColor: palette.bg, borderLeftColor: palette.accent },
        ]}
        activeOpacity={0.8}
        onPress={() => openAppointment(appointment)}
      >
        {renderDetailCardContent(appointment)}
      </TouchableOpacity>
    );
  };

  const renderDayColumn = (day: dayjs.Dayjs, columnWidth?: number) => {
    const dateStr = day.format("YYYY-MM-DD");
    const positionedList = layoutByDate[dateStr] ?? [];
    const isSelectedDay = day.isSame(selectedDate, "day");
    const dayLeave = getLeaveForDay(day);
    const dayBreaks = getBreakBlocksForDay(day);
    const showClosedOverlay = !!dayLeave;

    return (
      <View
        key={dateStr}
        style={[
          styles.dayColumn,
          columnWidth ? { width: columnWidth } : { flex: 1 },
          { height: gridHeight },
          viewMode === "week" && isSelectedDay && styles.dayColumnSelected,
        ]}
      >
        {/* Empty-slot tap target: appointments/breaks sit above and keep their own presses. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(event) => handleColumnPress(day, event)}
        />

        {dayBreaks.map((block) => {
          const top =
            ((block.startMinutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const height = Math.max(
            ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT,
            heightScale(20),
          );
          return (
            <TouchableOpacity
              key={`break-${dateStr}-${block.leave.id}`}
              style={[styles.breakBlock, { top, height }]}
              activeOpacity={0.8}
              onPress={() => openLeaveDetailBox(block.leave)}
            >
              <Text style={styles.leaveLabelText} numberOfLines={1}>
                {t("breakUpper")}
              </Text>
            </TouchableOpacity>
          );
        })}

        {positionedList.map((positioned) =>
          viewMode === "day"
            ? renderDetailBlock(positioned)
            : renderCompactBlock(positioned),
        )}

        {showClosedOverlay && dayLeave ? (
          <>
            <Pressable
              style={styles.closedTint}
              onPress={() => openLeaveDetailBox(dayLeave)}
            />
            <TouchableOpacity
              style={styles.closedChip}
              activeOpacity={0.8}
              onPress={() => openLeaveDetailBox(dayLeave)}
            >
              <Text numberOfLines={1} style={styles.leaveLabelText}>
                {t("closeUpper")}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  };

  const renderDayCell = (day: dayjs.Dayjs, fixedWidth?: number) => {
    const dateStr = day.format("YYYY-MM-DD");
    const hasAppointments = (appointmentsByDate[dateStr] ?? []).length > 0;
    const isSelected = day.isSame(selectedDate, "day");
    const isToday = day.isSame(today, "day");
    return (
      <TouchableOpacity
        key={dateStr}
        style={[styles.dayCell, fixedWidth ? { width: fixedWidth } : { flex: 1 }]}
        activeOpacity={0.7}
        onPress={() => {
          closeOverlays();
          setSelectedDate(day);
        }}
      >
        <Text style={styles.dayName}>{day.format("ddd")}</Text>
        <View
          style={[
            styles.dayNumberContainer,
            isSelected && styles.dayNumberSelected,
            isToday && styles.dayNumberToday,
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              {
                color: isSelected
                  ? theme.white
                  : isToday
                    ? theme.selectCard
                    : theme.darkGreen,
                fontFamily:
                  isSelected || isToday ? fonts.fontBold : fonts.fontMedium,
              },
            ]}
          >
            {day.format("D")}
          </Text>
        </View>
        {hasAppointments ? (
          <View style={styles.dayDot} />
        ) : (
          <View style={styles.dayDotPlaceholder} />
        )}
      </TouchableOpacity>
    );
  };

  const renderTimeGrid = (columnWidth?: number) => (
    <ScrollView
      ref={scrollViewRef}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: moderateHeightScale(12),
        paddingBottom: moderateHeightScale(28),
      }}
    >
      <View style={[styles.gridRow, { height: gridHeight }]}>
        <View style={[styles.timeGutter, { height: gridHeight }]}>
          {hours.map((hour, index) => (
            <Text
              key={hour}
              style={[
                styles.hourLabel,
                { top: index * HOUR_HEIGHT - moderateHeightScale(6) },
              ]}
            >
              {formatHourLabel(hour)}
            </Text>
          ))}
          {showNowLine && (
            <View
              style={[
                styles.nowPill,
                { top: nowTop - moderateHeightScale(8) },
              ]}
            >
              <Text style={styles.nowPillText}>
                {formatShortTimeLabel(nowMinutes)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.columnsArea, { height: gridHeight }]}>
          {hours.map((hour, index) => (
            <React.Fragment key={`line-${hour}`}>
              <View
                pointerEvents="none"
                style={[styles.hourLine, { top: index * HOUR_HEIGHT }]}
              />
              {index < hours.length - 1 && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.halfHourLine,
                    { top: index * HOUR_HEIGHT + HOUR_HEIGHT / 2 },
                  ]}
                />
              )}
            </React.Fragment>
          ))}

          <View style={[styles.columnsRow, { height: gridHeight }]}>
            {gridDays.map((day) => renderDayColumn(day, columnWidth))}
          </View>

          {showNowLine && (
            <View
              pointerEvents="none"
              style={[styles.nowLine, { top: nowTop }]}
            >
              <View style={styles.nowDot} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // Header keeps the same gutter offset as the grid so each day sits right on
  // top of its own column.
  const renderWeekView = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.daysStrip}>
        <View style={styles.daysStripGutter} />
        {week.map((day) => renderDayCell(day))}
      </View>
      {renderTimeGrid()}
    </View>
  );

  const renderDayView = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.daysStrip}>
        {week.map((day) => renderDayCell(day))}
      </View>
      {renderTimeGrid()}
    </View>
  );

  const renderMonthView = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: moderateHeightScale(28) }}
    >
      <View style={styles.monthWeekdaysRow}>
        {monthWeeks[0]?.map((day) => (
          <Text key={`wd-${day.format("dd")}`} style={styles.monthWeekdayText}>
            {day.format("dd")}
          </Text>
        ))}
      </View>

      {monthWeeks.map((weekRow) => (
        <View key={`row-${weekRow[0].format("YYYY-MM-DD")}`} style={styles.monthRow}>
          {weekRow.map((day) => {
            const dateStr = day.format("YYYY-MM-DD");
            const count = (appointmentsByDate[dateStr] ?? []).length;
            const hasLeaveOrClose = leaveDotDates.has(dateStr);
            const isCurrentMonth = day.isSame(selectedDate, "month");
            const isSelectedDay = day.isSame(selectedDate, "day");
            const isToday = day.isSame(today, "day");
            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.monthCell,
                  isSelectedDay && styles.monthCellSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  closeOverlays();
                  setSelectedDate(day);
                  setWeek(getWeekDays(day));
                }}
              >
                <Text
                  style={[
                    styles.monthCellNumber,
                    !isCurrentMonth && styles.monthCellNumberMuted,
                    isToday && styles.monthCellNumberToday,
                  ]}
                >
                  {day.format("D")}
                </Text>
                {(count > 0 || hasLeaveOrClose) && (
                  <View style={styles.monthDotsRow}>
                    {hasLeaveOrClose && (
                      <View style={styles.monthLeaveDot} />
                    )}
                    {count > 0 &&
                      Array.from({ length: Math.min(count, 3) }).map(
                        (_, dotIndex) => (
                          <View
                            key={`dot-${dateStr}-${dotIndex}`}
                            style={styles.monthDot}
                          />
                        ),
                      )}
                  </View>
                )}
                {count > 3 && (
                  <Text style={styles.monthCountText}>+{count - 3}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.monthListHeader}>
        <Text style={styles.monthListHeaderText}>
          {selectedDate.format("dddd, MMM D, YYYY")}
        </Text>
      </View>

      {selectedDayAppointments.length > 0 ? (
        selectedDayAppointments.map((appointment) => renderListCard(appointment))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {t("noAppointmentsToDisplay")}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <DashboardHeader />
      <View style={styles.content}>
        {/* Toolbar: view switcher + today + navigation */}
        <View style={styles.toolbar}>
          <View style={styles.segmentGroup}>
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.segment,
                  viewMode === mode && styles.segmentActive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  closeOverlays();
                  setViewMode(mode);
                }}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.segmentText,
                    viewMode === mode && styles.segmentTextActive,
                  ]}
                >
                  {t(mode)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toolbarRight}>
            <TouchableOpacity
              style={styles.todayButton}
              activeOpacity={0.8}
              onPress={handleToday}
            >
              <Text style={styles.todayButtonText}>{t("today")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowButton}
              activeOpacity={0.8}
              onPress={handlePrev}
            >
              <MaterialIcons
                name="keyboard-arrow-left"
                size={iconScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowButton}
              activeOpacity={0.8}
              onPress={handleNext}
            >
              <MaterialIcons
                name="keyboard-arrow-right"
                size={iconScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === "month" && (
          <View style={styles.rangeRow}>
            <Text style={styles.rangeText}>{rangeLabel}</Text>
          </View>
        )}

        {/* Agenda */}
        <View style={styles.agendaContainer}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.agendaHeader}
              activeOpacity={1}
              onPress={() => {
                if (leaveDetailBoxVisible) {
                  setLeaveDetailBoxVisible(false);
                  return;
                }
                if (applyBoxVisible) {
                  setApplyBoxVisible(false);
                  return;
                }
                if (leaveForSelectedDate) {
                  openLeaveDetailBox(leaveForSelectedDate);
                }
              }}
            >
              <View style={styles.todayLabel}>
                <View style={styles.todayLabelRow}>
                  <Text style={styles.todayText}>
                    {formatDate(selectedDate)}
                  </Text>
                  {loading && (
                    <ActivityIndicator size="small" color={theme.primary} />
                  )}
                  {canManageLeaves && leaveForSelectedDate && (
                    <TouchableOpacity
                      onPress={() => openLeaveDetailBox(leaveForSelectedDate)}
                      style={styles.leaveBox}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="event"
                        size={iconScale(16)}
                        color={theme.primary}
                      />
                      <Text style={styles.leaveBoxText}>
                        {leaveForSelectedDate.type === "leave"
                          ? t("closeUpper")
                          : t("breakUpper")}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canManageLeaves && !leaveForSelectedDate && !isPastDate && (
                    <TouchableOpacity
                      onPress={() => openApplyBox("leave", undefined, selectedDate)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manageAvailabilityText}>
                        {t("manageAvailability")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {applyBoxVisible && (
              <Pressable
                style={styles.applyBoxOverlay}
                onPress={() => setApplyBoxVisible(false)}
              >
                <Pressable
                  style={styles.applyBoxDropdown}
                  onPress={(event) => event.stopPropagation()}
                >
                  <View style={styles.applyBoxHeaderRow}>
                    <Text style={styles.applyBoxDateText}>
                      {applyBoxDate.format("DD/MM/YYYY")}
                    </Text>
                    <TouchableOpacity
                      style={styles.applyBoxCloseBtn}
                      onPress={() => setApplyBoxVisible(false)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={iconScale(16)}
                        color={theme.text}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.applyBoxHint}>
                    {t("takeBreakOrCloseDay")}
                  </Text>
                  <View style={styles.applyBoxRow}>
                    <TouchableOpacity
                      style={styles.applyBoxRadioRow}
                      onPress={() => setApplyBoxType("leave")}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.applyBoxRadioOuter,
                          applyBoxType === "leave" &&
                            styles.applyBoxRadioOuterSelected,
                        ]}
                      >
                        {applyBoxType === "leave" && (
                          <View style={styles.applyBoxRadioInner} />
                        )}
                      </View>
                      <Text style={styles.applyBoxOptionText}>{t("close")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.applyBoxRadioRow}
                      onPress={() => setApplyBoxType("break")}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.applyBoxRadioOuter,
                          applyBoxType === "break" &&
                            styles.applyBoxRadioOuterSelected,
                        ]}
                      >
                        {applyBoxType === "break" && (
                          <View style={styles.applyBoxRadioInner} />
                        )}
                      </View>
                      <Text style={styles.applyBoxOptionText}>{t("break")}</Text>
                    </TouchableOpacity>
                  </View>
                  {applyBoxType === "break" && (
                    <View style={{ marginBottom: moderateHeightScale(4) }}>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: moderateWidthScale(6),
                          marginBottom: moderateHeightScale(2),
                        }}
                      >
                        <Text style={[styles.applyBoxSlotLabel, { flex: 1 }]}>
                          {t("start")}
                        </Text>
                        <Text style={[styles.applyBoxSlotLabel, { flex: 1 }]}>
                          {t("end")}
                        </Text>
                      </View>
                      <View style={styles.applyBoxSlotRow}>
                        <TouchableOpacity
                          style={styles.applyBoxTimeTouch}
                          onPress={() => {
                            setApplyBoxTimePickerTarget("start");
                            setApplyBoxTimePickerVisible(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.applyBoxTimeText}>
                            {formatApplyBoxTime(
                              applyBoxSlotHour,
                              applyBoxBreakStartMinutes,
                            )}
                          </Text>
                          <Feather
                            name="clock"
                            size={iconScale(12)}
                            color={theme.lightGreen}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.applyBoxTimeTouch}
                          onPress={() => {
                            setApplyBoxTimePickerTarget("end");
                            setApplyBoxTimePickerVisible(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.applyBoxTimeText}>
                            {formatApplyBoxTime(
                              applyBoxBreakEndHour,
                              applyBoxBreakEndMinutes,
                            )}
                          </Text>
                          <Feather
                            name="clock"
                            size={iconScale(12)}
                            color={theme.lightGreen}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <View style={styles.applyBoxButtonWrap}>
                    <TouchableOpacity
                      style={styles.applyBoxButton}
                      onPress={applyLeaveBreakFromBox}
                      disabled={applyBoxLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.applyBoxButtonText}>
                        {applyBoxLoading ? "..." : t("apply")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            )}

            {leaveDetailBoxVisible && selectedLeave && (
              <Pressable
                style={styles.leaveDetailBoxOverlay}
                onPress={() => setLeaveDetailBoxVisible(false)}
              >
                <Pressable
                  style={styles.leaveDetailBoxDropdown}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.leaveDetailBoxHeaderRow}>
                    <Text style={styles.leaveDetailBoxDateText}>
                      {formatLeaveDetailDateOnly(
                        selectedLeave.start_date || "",
                      )}
                    </Text>
                    <TouchableOpacity
                      style={styles.leaveDetailBoxCloseBtn}
                      onPress={() => setLeaveDetailBoxVisible(false)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={iconScale(16)}
                        color={theme.text}
                      />
                    </TouchableOpacity>
                  </View>
                  {selectedLeave.type === "break" && (
                    <Text style={styles.leaveDetailBoxTimeText}>
                      {formatLeaveDetailTimeOnly(selectedLeave.start_time)} –{" "}
                      {formatLeaveDetailTimeOnly(selectedLeave.end_time)}
                    </Text>
                  )}
                  {selectedLeave.reason ? (
                    <View style={styles.leaveDetailBoxRow}>
                      <Text style={styles.leaveDetailBoxLabel}>
                        {t("reason")}
                      </Text>
                      <Text style={styles.leaveDetailBoxValue}>
                        {selectedLeave.reason}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.leaveDetailBoxTypeWrap}>
                    <View style={styles.leaveDetailBoxTypeBadge}>
                      <Text style={styles.leaveDetailBoxTypeBadgeText}>
                        {selectedLeave.type === "break"
                          ? t("breakUpper")
                          : t("closeUpper")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.leaveDetailBoxCancelWrap}>
                    <TouchableOpacity
                      style={styles.leaveDetailBoxCancelBtn}
                      onPress={handleCancelLeaveFromBox}
                      disabled={leaveDetailCancelling}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.leaveDetailBoxCancelBtnText}>
                        {leaveDetailCancelling
                          ? "..."
                          : selectedLeave.type === "break"
                            ? t("cancelBreak")
                            : t("cancelClosedDay")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            )}

            {viewMode === "month"
              ? renderMonthView()
              : viewMode === "week"
                ? renderWeekView()
                : renderDayView()}
          </View>
        </View>
      </View>

      <TimePickerModal
        visible={applyBoxTimePickerVisible}
        currentHours={
          applyBoxTimePickerTarget === "start"
            ? applyBoxSlotHour
            : applyBoxBreakEndHour
        }
        currentMinutes={
          applyBoxTimePickerTarget === "start"
            ? applyBoxBreakStartMinutes
            : applyBoxBreakEndMinutes
        }
        onSelect={handleApplyBoxTimeSelect}
        onClose={() => {
          setApplyBoxTimePickerVisible(false);
          setApplyBoxTimePickerTarget(null);
        }}
      />
    </View>
  );
}
