import { useOwnBusinessGuard } from "@/src/hooks/useOwnBusinessGuard";
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Pressable,
  Linking,
  Modal,
  Platform,
  BackHandler,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import {
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
  useNavigation,
} from "expo-router";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import {
  formatCustomerScheduleDate,
  getCustomerScheduleDateLabel,
  getCustomerSubscriptionDateDisplay,
  getCustomerSubscriptionDisplayPrice,
  getCustomerSubscriptionPill,
} from "@/src/utils/customerSubscriptionLifecycle";
import {
  setSelectedServices,
  setSelectedStaff,
  setSelectedDate,
  setSelectedTimeSlot,
  setAssignedStaffId,
  setSelectedPaymentMethod,
  setSelectedNote,
  resetBusiness,
  setBusinessData as setBusinessDataAction,
  type StaffMember,
  type BusinessHours,
} from "@/src/state/slices/bsnsSlice";
import {
  setBookingTryOnImageUrls,
  clearBookingTryOnImageUrls,
  setBookingTryOnPreselectedUrls,
} from "@/src/state/slices/generalSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { reportReelEvent } from "@/src/services/reelsService";
import {
  businessEndpoints,
  appointmentsEndpoints,
  type AvailableSlot,
  resolveAppointmentStaffId,
} from "@/src/services/endpoints";
import { assignAnyoneStaff } from "@/src/services/anyoneStaffService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  SearchIcon,
  MorningIcon,
  EveningIcon,
  NightIcon,
} from "@/assets/icons";
import FloatingInput from "@/src/components/floatingInput";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import AddServiceBottomSheet from "@/src/components/AddServiceBottomSheet";
import OutcomeConfirmSheet from "@/src/components/OutcomeConfirmSheet";
import ImagePickerModal from "@/src/components/imagePickerModal";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter, {
  flowFooterBottomPad,
} from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { IMAGES } from "@/src/constant/images";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import {
  getDefaultAvatarImage,
} from "@/src/services/remoteConfigService";

/*
 * Step-by-step booking (2026-10-16), same look as the reel / product flows.
 *   Book Now:          Services → Staff → Date & time → Payment → Photos & note → Checkout
 *   Subscription:      Plan services → Staff → Date & time → Photos & note → Checkout
 *   Reschedule:        Staff → Date & time → Confirm
 * Solo plans skip the Staff step. Data, APIs and checkout params are the same
 * as the old single-page screen, which is kept in
 * src/components/booking/BookingNowClassic.tsx (see its header to switch back).
 */

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const STAFF_CARD_WIDTH = widthScale(140);
const STAFF_CARD_HEIGHT = heightScale(168);
const STAFF_CARD_RATIO = STAFF_CARD_HEIGHT / STAFF_CARD_WIDTH;
const PAGE_PAD = moderateWidthScale(20);
const GRID_GAP = moderateWidthScale(12);
const SLOT_GAP = moderateWidthScale(8);
const SLOT_COLUMNS = 4;
const DATE_CHIP_W = widthScale(54);
const DATE_CHIP_GAP = moderateWidthScale(8);
const NEXT_DAY_LOOKAHEAD = 60;
const PHOTO_GAP = moderateWidthScale(10);

type StaffCarouselItem = {
  id: string;
  name: string;
  experience: string | number | null;
  image: string | null;
  active: boolean | null | undefined;
  is_owner: boolean;
};

type StepKey =
  | "services"
  | "planServices"
  | "staff"
  | "time"
  | "payment"
  | "extras"
  | "confirm";

const STEP_LABEL_KEYS: Record<StepKey, string> = {
  services: "bkFlowStepServices",
  planServices: "bkFlowStepPlanServices",
  staff: "bkFlowStepStaff",
  time: "bkFlowStepTime",
  payment: "bkFlowStepPayment",
  extras: "bkFlowStepExtras",
  confirm: "bkFlowStepConfirm",
};

const PERIOD_LABEL_KEYS: Record<TimeSlotCategory, string> = {
  morning: "bkFlowMorning",
  afternoon: "bkFlowAfternoon",
  evening: "bkFlowEvening",
  night: "bkFlowNight",
};

const getWeekDays = (date: dayjs.Dayjs) => {
  const startOfWeek = date.startOf("week");
  return Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));
};

const isValidTimeSlot = (slot: unknown): slot is string =>
  typeof slot === "string" && /^\d{1,2}:\d{2}/.test(slot);

const convertTo12Hour = (time24: string): string => {
  if (!isValidTimeSlot(time24)) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const hour12 =
    hours === 0 ? 12 : hours > 12 ? hours - 12 : hours === 12 ? 12 : hours;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

type TimeSlotCategory = "morning" | "afternoon" | "evening" | "night";

const TIME_SLOT_CATEGORIES: TimeSlotCategory[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];

const SLOT_MINUTE_OPTIONS = [5, 15, 30, 45] as const;
type SlotMinutes = (typeof SLOT_MINUTE_OPTIONS)[number];
const DEFAULT_SLOT_MINUTES: SlotMinutes = 30;

const getSlotHour = (slot: string): number => {
  if (!isValidTimeSlot(slot)) return 0;
  return Number(slot.split(":")[0] ?? 0);
};

const sortTimeSlots = (slots: string[]): string[] =>
  [...slots].filter(isValidTimeSlot).sort((a, b) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

/** Normalize available-slots API payloads (string | start | start_time). */
const normalizeAvailableSlots = (raw: unknown): AvailableSlot[] => {
  if (!Array.isArray(raw)) return [];
  const slots: AvailableSlot[] = [];
  for (const item of raw) {
    if (typeof item === "string" && isValidTimeSlot(item)) {
      slots.push({ start: item, end: item });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const startRaw = row.start ?? row.start_time;
    const endRaw = row.end ?? row.end_time ?? startRaw;
    if (!isValidTimeSlot(startRaw)) continue;
    const availableStaff = Array.isArray(row.available_staff)
      ? (row.available_staff as AvailableSlot["available_staff"])
      : Array.isArray(row.availableStaff)
        ? (row.availableStaff as AvailableSlot["available_staff"])
        : undefined;
    slots.push({
      start: startRaw,
      end: isValidTimeSlot(endRaw) ? endRaw : startRaw,
      available_staff: availableStaff,
    });
  }
  return slots;
};

const resolveRouteParam = (
  value: string | string[] | undefined | null,
): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const resolveBusinessIdParam = (
  ...candidates: Array<string | number | null | undefined>
): string => {
  for (const candidate of candidates) {
    if (candidate == null || candidate === "") continue;
    const raw = String(candidate).trim();
    if (!raw || raw === "null" || raw === "undefined" || raw === "NaN") {
      continue;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    return String(Math.trunc(numeric));
  }
  return "";
};

/** Canonical section for a slot hour (null = before morning, e.g. 12 AM – 4:59 AM). */
const getSlotCategoryFromHour = (
  hours: number,
): TimeSlotCategory | null => {
  if (hours >= 5 && hours < 12) return "morning";
  if (hours >= 12 && hours < 17) return "afternoon";
  if (hours >= 17 && hours < 20) return "evening";
  if (hours >= 20) return "night";
  return null;
};

/** Tab highlight while scrolling — early-day slots map to Morning. */
const getSlotCategory = (slot: string): TimeSlotCategory => {
  const category = getSlotCategoryFromHour(getSlotHour(slot));
  return category ?? "morning";
};

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  label?: string | null;
}

interface SubscriptionPlanService {
  id: number;
  name: string;
  price: string;
  description: string | null;
  durationHours: number;
  durationMinutes: number;
  quantity?: number;
}

interface SubscriptionData {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlan: string;
  subscriptionPlanPrice: string;
  totalPrice?: number;
  subscriptionPlanServices?: SubscriptionPlanService[];
  subscriptionPlanType: string;
  subscriptionPlanDescription: string;
  userId: number;
  user: string;
  businessId: number;
  business: string;
  subscriber: string;
  status: string;
  stripeStatus?: string | null;
  hasAccess?: boolean;
  hasEnded?: boolean;
  endsAt?: string | null;
  paymentDate: string | null;
  nextPaymentDate: string | null;
  remainingDays: number | null;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string;
  cardLastFour: string | null;
  createdAt: string;
  deleted_at: string | null;
  appointments: any[];
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingHorizontal: PAGE_PAD,
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(32),
    },
    stepBody: {
      gap: moderateHeightScale(20),
    },
    section: {
      gap: moderateHeightScale(12),
    },
    list: {
      gap: moderateHeightScale(12),
    },
    // ── Services
    serviceCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    serviceInfo: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(4),
    },
    serviceName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size24,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    metaText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    serviceDesc: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(4),
    },
    price: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    priceOriginal: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
      fontVariant: ["tabular-nums"],
    },
    roundAction: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    addServiceBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: heightScale(60),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.selectCard,
      backgroundColor: theme.upcomingCard,
    },
    addServiceText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    addServiceIcon: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: moderateWidthScale(8),
      borderWidth: 1.5,
      borderColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Subscription plan
    planCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(10),
    },
    planHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    planTitleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    planTitle: {
      flexShrink: 1,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    statusPill: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.upcomingCard,
      borderWidth: 1,
      borderColor: theme.upcomingBorder,
    },
    statusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 0.5,
    },
    planMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    planBusiness: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    planPrice: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    planPriceUnit: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    planDates: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    planDate: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    planDateLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    planDateValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // ── Selectable cards (plan services, payment)
    choiceCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(16),
      minHeight: heightScale(76),
      borderWidth: 2,
      borderColor: theme.borderLight,
    },
    choiceCardSelected: {
      borderColor: theme.selectCard,
    },
    choiceCardDisabled: {
      opacity: 0.5,
    },
    choiceText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(3),
    },
    choiceTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    choiceSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    checkBox: {
      width: widthScale(28),
      height: widthScale(28),
      borderRadius: moderateWidthScale(8),
      borderWidth: 2,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    checkBoxSelected: {
      backgroundColor: theme.selectCard,
      borderColor: theme.selectCard,
    },
    leftChip: {
      alignSelf: "flex-start",
      marginTop: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    leftChipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    choicePrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    payIcon: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: widthScale(24),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    payIconSelected: {
      backgroundColor: theme.upcomingCard,
    },
    radio: {
      width: widthScale(26),
      height: widthScale(26),
      borderRadius: widthScale(13),
      borderWidth: 2,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.selectCard,
    },
    radioInner: {
      width: widthScale(12),
      height: widthScale(12),
      borderRadius: widthScale(6),
      backgroundColor: theme.selectCard,
    },
    // ── Staff
    staffSearchInput: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
    },
    staffGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GRID_GAP,
    },
    staffCardShell: {
      borderRadius: moderateWidthScale(16),
      backgroundColor:
        Platform.OS === "android" ? theme.lightGreen05 : theme.lightGreen1,
      paddingBottom:
        Platform.OS === "android"
          ? moderateHeightScale(2)
          : moderateHeightScale(3),
    },
    staffCard: {
      backgroundColor: theme.emptyProfileImage,
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      borderWidth: 2,
      borderColor: theme.borderLight,
      position: "relative",
    },
    staffCardShadow: {
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: moderateHeightScale(2) },
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(3),
        },
        android: {
          elevation: 1,
          shadowColor: theme.lightGreen2,
        },
        default: {},
      }),
    },
    staffCardSelected: {
      borderColor: theme.selectCard,
    },
    staffCardSelectedShadow: {
      ...Platform.select({
        ios: {
          shadowColor: theme.orangeBrown,
          shadowOffset: { width: 0, height: moderateHeightScale(4) },
          shadowOpacity: 0.28,
          shadowRadius: moderateWidthScale(8),
        },
        android: {
          elevation: 4,
          shadowColor: theme.orangeBrown,
        },
        default: {},
      }),
    },
    staffImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
      backgroundColor: theme.emptyProfileImage,
    },
    staffRadio: {
      position: "absolute",
      top: moderateHeightScale(10),
      right: moderateWidthScale(10),
      width: widthScale(26),
      height: widthScale(26),
      borderRadius: widthScale(13),
      borderWidth: 2,
      borderColor: theme.white,
      backgroundColor: theme.lightGreen22,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    staffRadioSelected: {
      borderColor: theme.selectCard,
      backgroundColor: theme.white,
    },
    staffRadioInner: {
      width: widthScale(12),
      height: widthScale(12),
      borderRadius: widthScale(6),
      backgroundColor: theme.selectCard,
    },
    staffInfoStrip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(56),
      paddingBottom: moderateHeightScale(12),
      justifyContent: "flex-end",
      gap: moderateHeightScale(2),
    },
    staffNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      width: "100%",
    },
    staffName: {
      flexShrink: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textShadowColor: theme.black,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    staffNameCap: {
      textTransform: "capitalize",
    },
    staffAnyoneInfoButton: {
      width: widthScale(28),
      height: widthScale(28),
      alignItems: "center",
      justifyContent: "center",
    },
    staffExperience: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      width: "100%",
      textShadowColor: theme.black,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    anyoneHintOverlay: {
      flex: 1,
      backgroundColor: theme.lightGreen22,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(28),
    },
    anyoneHintBubble: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(18),
      paddingRight: moderateWidthScale(48),
      borderWidth: 1,
      borderColor: theme.borderLight,
      maxWidth: widthScale(320),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 8,
    },
    anyoneHintText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    anyoneHintClose: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: widthScale(44),
      height: widthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Date & time
    flexShrink: {
      flexShrink: 1,
    },
    dateStrip: {
      marginHorizontal: -PAGE_PAD,
    },
    dateStripContent: {
      paddingHorizontal: PAGE_PAD,
      gap: DATE_CHIP_GAP,
      paddingVertical: moderateHeightScale(2),
    },
    dateChip: {
      width: DATE_CHIP_W,
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      alignItems: "center",
      gap: moderateHeightScale(2),
    },
    dateChipSelected: {
      backgroundColor: theme.orangeBrown30,
      borderColor: theme.selectCard,
    },
    dateChipDisabled: {
      opacity: 0.35,
      backgroundColor: "transparent",
    },
    dateChipDay: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    dateChipDayOn: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dateChipNum: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    timezone: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    timeHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    timeHeaderTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    intervalLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      minHeight: heightScale(32),
    },
    intervalLinkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    periodIcon: {
      height: moderateHeightScale(18),
      justifyContent: "center",
    },
    periodTabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
    },
    periodTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(5),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(2),
    },
    periodTabDisabled: {
      opacity: 0.4,
    },
    periodText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    periodTextSelected: {
      color: theme.darkGreen,
    },
    periodUnderline: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -1,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.orangeBrown,
    },
    slotsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SLOT_GAP,
    },
    slotBtn: {
      height: heightScale(44),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    slotBtnSelected: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    slotText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    slotTextSelected: {
      color: theme.white,
    },
    slotSkeleton: {
      height: heightScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    inlineBtn: {
      alignSelf: "flex-start",
    },
    centerBtn: {
      alignSelf: "center",
    },
    emptySlots: {
      alignItems: "center",
      gap: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.borderNormal,
    },
    emptySlotsText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    monthNavBtn: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    monthNavBtnOff: {
      opacity: 0.35,
    },
    monthNavText: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    menu: {
      position: "absolute",
      minWidth: widthScale(170),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 8,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
    },
    menuItemBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    menuItemOn: {
      backgroundColor: theme.upcomingCard,
    },
    menuText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    menuTextOn: {
      fontFamily: fonts.fontBold,
    },
    // ── Photos & note
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: PHOTO_GAP,
    },
    photoBox: {
      borderRadius: moderateWidthScale(14),
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
    },
    photoThumb: {
      width: "100%",
      height: "100%",
    },
    photoRemove: {
      position: "absolute",
      top: moderateWidthScale(6),
      right: moderateWidthScale(6),
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    photoAdd: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: theme.lightGreen2,
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    photoAddText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    noteWrap: {
      position: "relative",
    },
    noteInput: {
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(14),
      paddingRight: moderateWidthScale(52),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: heightScale(120),
      textAlignVertical: "top",
    },
    noteClear: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: widthScale(44),
      height: widthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    privacy: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    privacyLink: {
      color: theme.primary,
      fontFamily: fonts.fontMedium,
    },
    // ── Confirm (reschedule)
    reviewCard: {
      overflow: "hidden",
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
    },
    reviewRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    reviewIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    reviewText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    reviewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    reviewValue: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewEdit: {
      minHeight: heightScale(36),
      minWidth: widthScale(56),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    reviewEditText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // ── Footer total
    totalBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: PAGE_PAD,
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
  });

type StaffCardProps = {
  staff: StaffCarouselItem;
  isSelected: boolean;
  width: number;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  ownerLabel: string;
  anyoneLabel: string;
  anyoneSubLabel: string;
  anyoneInfoLabel: string;
  onSelect: (id: string) => void;
  onAnyoneInfoPress: () => void;
};

function StaffCard({
  staff,
  isSelected,
  width,
  styles,
  theme,
  ownerLabel,
  anyoneLabel,
  anyoneSubLabel,
  anyoneInfoLabel,
  onSelect,
  onAnyoneInfoPress,
}: StaffCardProps) {
  const isAnyone = staff.id === "anyone";
  const imageUri = staff.image || getDefaultAvatarImage();
  const selectProgress = useSharedValue(isSelected ? 1 : 0);
  const pressScale = useSharedValue(1);
  const height = Math.round(width * STAFF_CARD_RATIO);

  useEffect(() => {
    selectProgress.value = withSpring(isSelected ? 1 : 0, {
      damping: 16,
      stiffness: 220,
      mass: 0.7,
    });
  }, [isSelected, selectProgress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const radioInnerStyle = useAnimatedStyle(() => ({
    opacity: selectProgress.value,
    transform: [
      {
        scale: interpolate(selectProgress.value, [0, 1], [0.4, 1]),
      },
    ],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.97, {
      damping: 18,
      stiffness: 320,
    });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, {
      damping: 14,
      stiffness: 260,
    });
  };

  const name = isAnyone
    ? anyoneLabel
    : staff.is_owner
      ? `${staff.name} · ${ownerLabel}`
      : staff.name;
  const subLine = isAnyone
    ? anyoneSubLabel
    : staff.experience
      ? String(staff.experience)
      : null;

  return (
    <Animated.View style={[{ width }, pressStyle]}>
      <View
        style={[
          styles.staffCardShell,
          isSelected ? styles.staffCardSelectedShadow : styles.staffCardShadow,
        ]}
      >
        <Pressable
          style={[
            styles.staffCard,
            { width, height },
            isSelected && styles.staffCardSelected,
          ]}
          onPress={() => onSelect(staff.id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="radio"
          accessibilityLabel={subLine ? `${name}, ${subLine}` : name}
          accessibilityState={{ selected: isSelected, checked: isSelected }}
        >
          <Image
            source={isAnyone ? IMAGES.anyoneStaff : { uri: imageUri }}
            style={styles.staffImage}
            resizeMode="cover"
          />

          <View
            style={[
              styles.staffRadio,
              isSelected && styles.staffRadioSelected,
            ]}
          >
            <Animated.View style={[styles.staffRadioInner, radioInnerStyle]} />
          </View>

          <LinearGradient
            colors={[
              "transparent",
              theme.lightGreen5,
              theme.lightGreen,
              theme.black,
            ]}
            locations={[0, 0.35, 0.7, 1]}
            style={styles.staffInfoStrip}
            pointerEvents="box-none"
          >
            <View style={styles.staffNameRow}>
              <Text
                style={[styles.staffName, !isAnyone && styles.staffNameCap]}
                numberOfLines={1}
              >
                {name}
              </Text>
              {isAnyone ? (
                <TouchableOpacity
                  style={styles.staffAnyoneInfoButton}
                  hitSlop={8}
                  onPress={onAnyoneInfoPress}
                  accessibilityRole="button"
                  accessibilityLabel={anyoneInfoLabel}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={moderateWidthScale(18)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            {subLine ? (
              <Text style={styles.staffExperience} numberOfLines={1}>
                {subLine}
              </Text>
            ) : null}
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function BookingNow() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{
    business_id?: string;
    service_id?: string;
    subscription_id?: string;
    service_ids?: string;
    item?: string;
    is_reschedule?: string;
    booking_id?: string;
    appointment_type?: string;
    notes?: string;
    appointment_date?: string;
    appointment_time?: string;
    staff_id?: string;
    reel_id?: string;
    saved_look_id?: string;
    /** "1" when the customer already agreed to the late reschedule fee. */
    late_fee_accepted?: string;
  }>();

  // Customer mode can't book the user's own business — leave before any call
  useOwnBusinessGuard(params.business_id);

  const attributionReelId = params.reel_id ? Number(params.reel_id) : null;
  const attributionSavedLookId = params.saved_look_id
    ? Number(params.saved_look_id)
    : null;
  const bookingStartedSentRef = useRef(false);

  useEffect(() => {
    if (!attributionReelId || bookingStartedSentRef.current) return;
    bookingStartedSentRef.current = true;
    reportReelEvent(attributionReelId, "booking_started");
  }, [attributionReelId]);

  const isReschedule = params.is_reschedule === "1";
  const isSubscriptionBooking = Boolean(params.subscription_id && params.item);
  const subscriptionData: SubscriptionData | null = useMemo(() => {
    if (params.item) {
      try {
        return JSON.parse(params.item);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [params.item]);
  const [selectedSubscriptionServiceIds, setSelectedSubscriptionServiceIds] =
    useState<number[]>([]);

  useEffect(() => {
    if (!isSubscriptionBooking || !subscriptionData?.subscriptionPlanServices) {
      setSelectedSubscriptionServiceIds([]);
      return;
    }

    setSelectedSubscriptionServiceIds([]);
  }, [isSubscriptionBooking, subscriptionData]);

  const toggleSubscriptionServiceSelection = useCallback(
    (serviceId: number) => {
      setSelectedSubscriptionServiceIds((prev) =>
        prev.includes(serviceId)
          ? prev.filter((id) => id !== serviceId)
          : [...prev, serviceId],
      );
    },
    [],
  );

  const formatServiceDuration = useCallback(
    (hours: number, minutes: number): string => {
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return "";
    },
    [],
  );

  // Get data from Redux
  const businessData = useAppSelector((state) => state.bsns);
  const {
    allServices,
    staffMembers,
    selectedServices: reduxSelectedServices,
    selectedStaff: reduxSelectedStaff,
    businessId: reduxBusinessId,
    businessHours,
    selectedPaymentMethod: reduxPaymentMethod,
    subscriptionPlanType,
  } = businessData || {
    selectedService: null,
    allServices: [],
    staffMembers: [],
    selectedServices: [],
    selectedStaff: "anyone",
    businessId: "",
    businessHours: null,
    selectedPaymentMethod: "payNow",
    subscriptionPlanType: null,
  };

  const isSoloPlan =
    typeof subscriptionPlanType === "string" &&
    subscriptionPlanType.toLowerCase() === "solo";

  // Use Redux directly - no local state needed
  const selectedServices = useMemo(() => {
    if (reduxSelectedServices.length > 0) {
      return reduxSelectedServices;
    } else {
      return [];
    }
  }, [reduxSelectedServices]);

  const selectedStaff = reduxSelectedStaff || "anyone";
  const [addServiceModalVisible, setAddServiceModalVisible] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [showAnyoneHint, setShowAnyoneHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffMember, setSelectedStaffMember] =
    useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDateState] = useState(() => dayjs());
  const [, setWeek] = useState(() => getWeekDays(dayjs()));
  const [selectedTimeSlot, setSelectedTimeSlotState] = useState<string | null>(
    null,
  );
  const [slotMinutes, setSlotMinutes] =
    useState<SlotMinutes>(DEFAULT_SLOT_MINUTES);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [apiSlots, setApiSlots] = useState<AvailableSlot[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tryOnImageUrls, setTryOnImageUrls] = useState<string[]>([]);
  const [galleryImageUris, setGalleryImageUris] = useState<string[]>([]);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  // Backend refused the reschedule until the late fee is accepted.
  const [rescheduleFeeMessage, setRescheduleFeeMessage] = useState<
    string | null
  >(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const hasInitializedReschedulePreset = useRef(false);

  // Pre-fill note when in reschedule mode and notes param is passed
  useEffect(() => {
    if (
      isReschedule &&
      params.notes != null &&
      String(params.notes).trim() !== ""
    ) {
      setNote(String(params.notes).trim());
    }
  }, [isReschedule, params.notes]);

  const bookingTryOnFromRedux = useAppSelector(
    (state) => state.general.bookingTryOnImageUrls,
  );
  // When returning from AI Results: replace try-on list with Redux (one-way), then clear Redux
  useFocusEffect(
    useCallback(() => {
      if (bookingTryOnFromRedux?.length) {
        setTryOnImageUrls(
          bookingTryOnFromRedux.filter((u) => /^https?:\/\//i.test(u)),
        );
        dispatch(clearBookingTryOnImageUrls());
      }
    }, [bookingTryOnFromRedux, dispatch]),
  );

  // When reschedule mode and params have date/time/staff, pre-select them once data is loaded
  useEffect(() => {
    if (
      !isReschedule ||
      hasInitializedReschedulePreset.current ||
      !params.appointment_date ||
      !params.appointment_time ||
      loading
    ) {
      return;
    }
    hasInitializedReschedulePreset.current = true;

    const dateStr = params.appointment_date.trim();
    const timeStr = params.appointment_time.trim();
    const staffIdParam = params.staff_id?.trim();

    // Parse date: support MM/DD/YYYY or YYYY-MM-DD
    let parsedDate = dayjs();
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/").map(Number);
      if (parts.length >= 3) {
        const [m, d, y] = parts;
        if (y && m && d) parsedDate = dayjs(new Date(y, m - 1, d));
      }
    } else {
      const d = dayjs(dateStr);
      if (d.isValid()) parsedDate = d;
    }

    setSelectedDateState(parsedDate);
    dispatch(setSelectedDate(parsedDate.format("YYYY-MM-DD")));
    setWeek(getWeekDays(parsedDate));

    if (timeStr) {
      setSelectedTimeSlotState(timeStr);
      dispatch(setSelectedTimeSlot(timeStr));
    }

    const staffId =
      staffIdParam && staffIdParam !== "anyone" ? staffIdParam : "anyone";
    dispatch(setSelectedStaff(staffId));
  }, [
    isReschedule,
    params.appointment_date,
    params.appointment_time,
    params.staff_id,
    loading,
    dispatch,
  ]);

  // Always fetch business data - API call happens in both cases
  const fetchBusinessDetails = useCallback(async () => {
    // Get business_id from params or from Redux (when coming from businessDetail)
    const businessId = resolveBusinessIdParam(
      resolveRouteParam(params.business_id),
      reduxBusinessId,
    );
    if (!businessId) {
      setError("Business ID is missing. Please go back and try again.");
      showBanner(
        t("error"),
        "Business ID is missing. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }

    // Check if Redux already has data - if yes, don't show loader
    const hasReduxData =
      reduxBusinessId === businessId && allServices.length > 0;

    try {
      // Only show loading indicator if Redux doesn't have data
      if (!hasReduxData) {
        setLoading(true);
      }
      setError(null);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: any;
          subscription_plan_type?: "Solo" | "Business" | null;
          subscription_status?: "active" | "inactive";
        };
      }>(businessEndpoints.businessDetails(businessId));

      if (response.success && response.data?.business) {
        const businessData = response.data.business;
        const planTypeRaw = response.data.subscription_plan_type ?? null;
        const subscriptionPlanTypeFromApi: "Solo" | "Business" | null =
          planTypeRaw === "Solo" || planTypeRaw === "Business"
            ? planTypeRaw
            : null;
        const subscriptionStatusFromApi: "active" | "inactive" =
          response.data.subscription_status === "active"
            ? "active"
            : "inactive";

        // Parse business hours from API format to Redux format
        const parseTimeToHoursMinutes = (
          timeString: string | null | undefined,
        ): { hours: number; minutes: number } => {
          if (!timeString || typeof timeString !== "string") {
            return { hours: 0, minutes: 0 };
          }
          const [hours, minutes] = timeString.split(":").map(Number);
          return { hours: hours || 0, minutes: minutes || 0 };
        };

        const getDayDisplayFormat = (day: string): string => {
          if (!day) return day;
          const dayLower = day.toLowerCase();
          const dayMap: { [key: string]: string } = {
            monday: "Monday",
            tuesday: "Tuesday",
            wednesday: "Wednesday",
            thursday: "Thursday",
            friday: "Friday",
            saturday: "Saturday",
            sunday: "Sunday",
          };
          return dayMap[dayLower] || day;
        };

        const parseBusinessHours = (hoursArray: any[] | null | undefined) => {
          if (
            !hoursArray ||
            !Array.isArray(hoursArray) ||
            hoursArray.length === 0
          ) {
            return null;
          }

          const businessHours: { [key: string]: any } = {};

          // Initialize all days with default closed state
          const DAYS = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];
          DAYS.forEach((day) => {
            businessHours[day] = {
              isOpen: false,
              fromHours: 0,
              fromMinutes: 0,
              tillHours: 0,
              tillMinutes: 0,
              breaks: [],
            };
          });

          // Parse API hours
          hoursArray.forEach((dayData: any) => {
            const dayName = getDayDisplayFormat(dayData.day);
            if (!DAYS.includes(dayName)) return;

            let fromHours = 0;
            let fromMinutes = 0;
            let tillHours = 0;
            let tillMinutes = 0;

            if (dayData.opening_time) {
              const parsed = parseTimeToHoursMinutes(dayData.opening_time);
              fromHours = parsed.hours;
              fromMinutes = parsed.minutes;
            }

            if (dayData.closing_time) {
              const parsed = parseTimeToHoursMinutes(dayData.closing_time);
              tillHours = parsed.hours;
              tillMinutes = parsed.minutes;
            }

            const breaks = (dayData.break_hours || []).map((breakTime: any) => {
              const { hours: breakFromHours, minutes: breakFromMinutes } =
                parseTimeToHoursMinutes(breakTime.start || "00:00");
              const { hours: breakTillHours, minutes: breakTillMinutes } =
                parseTimeToHoursMinutes(breakTime.end || "00:00");
              return {
                fromHours: breakFromHours,
                fromMinutes: breakFromMinutes,
                tillHours: breakTillHours,
                tillMinutes: breakTillMinutes,
              };
            });

            businessHours[dayName] = {
              isOpen: !dayData.closed,
              fromHours,
              fromMinutes,
              tillHours,
              tillMinutes,
              breaks,
            };
          });

          return businessHours;
        };

        // Get individual services
        const individualServices = businessData.services || [];

        // Map all services - convert API format to Redux format
        const allServicesData = individualServices.map((s: any) => {
          // Convert price from string to number
          const price = parseFloat(s.price) || 0;
          // Calculate originalPrice (10% more) or use same as price if not available
          const originalPrice = s.originalPrice
            ? parseFloat(s.originalPrice)
            : parseFloat((price * 1.1).toFixed(2));

          // Format duration from hours and minutes
          const durationHours = s.duration_hours || 0;
          const durationMinutes = s.duration_minutes || 0;
          let durationText = "";
          if (durationHours > 0 && durationMinutes > 0) {
            durationText = `${durationHours} hr ${durationMinutes} min`;
          } else if (durationHours > 0) {
            durationText = `${durationHours} hr`;
          } else if (durationMinutes > 0) {
            durationText = `${durationMinutes} min`;
          } else {
            durationText = "N/A";
          }

          return {
            id: s.id,
            name: s.name,
            description: s.description || "",
            price: price,
            originalPrice: originalPrice,
            duration: durationText,
            label: s.label || null,
          };
        });

        // Map staff members with working_hours
        const staffMembersData = (businessData?.staff || [])
          .filter((staff: any) => staff.invitation_status === "accepted")
          .map((staff: any) => {
            // Construct image URL from API response
            let image = getDefaultAvatarImage();
            if (staff.avatar) {
              const isAbsoluteUrl =
                typeof staff.avatar === "string" &&
                (staff.avatar.startsWith("http://") ||
                  staff.avatar.startsWith("https://"));

              if (isAbsoluteUrl) {
                image = staff.avatar;
              } else {
                image = `${process.env.EXPO_PUBLIC_API_BASE_URL}${staff.avatar}`;
              }
            }

            // Parse working_hours if available (even if empty array)
            const staffWorkingHours = parseBusinessHours(staff.working_hours);

            return {
              id: staff.id || staff.user_id || 0,
              name: staff.name || "Staff Member",
              experience: staff?.description ?? null,
              image: image,
              working_hours: staffWorkingHours,
              active: staff.active,
              is_owner: staff.is_owner === true,
            };
          });

        const businessHoursData = parseBusinessHours(businessData?.hours);

        // Find the service(s) to select - skip when coming from subscription booking
        let serviceIdsToSelect: number[] = [];
        if (!params.subscription_id) {
          if (params.service_ids) {
            try {
              serviceIdsToSelect = JSON.parse(params.service_ids) as number[];
            } catch (_) {
              serviceIdsToSelect = params.service_ids
                .split(",")
                .map((id) => parseInt(id.trim(), 10))
                .filter((n) => !Number.isNaN(n));
            }
          } else if (params.service_id) {
            serviceIdsToSelect = [parseInt(params.service_id, 10)];
          }
        }

        let serviceToSelect = null;
        let servicesToSelect: Service[] = [];
        if (!params.subscription_id && allServicesData.length > 0) {
          if (serviceIdsToSelect.length > 0) {
            servicesToSelect = serviceIdsToSelect
              .map((id) => allServicesData.find((s: Service) => s.id === id))
              .filter(Boolean) as Service[];
            serviceToSelect = servicesToSelect[0] || allServicesData[0];
          } else if (hasReduxData && reduxSelectedServices.length > 0) {
            const selectedServiceId = reduxSelectedServices[0].id;
            serviceToSelect =
              allServicesData.find(
                (s: Service) => s.id === selectedServiceId,
              ) || allServicesData[0];
          } else if (allServicesData.length > 0) {
            serviceToSelect = allServicesData[0];
          }
        }

        const businessPayload = {
          selectedService: serviceToSelect,
          allServices: allServicesData,
          staffMembers: staffMembersData,
          businessId: businessId,
          businessHours: businessHoursData,
          subscriptionPlanType: subscriptionPlanTypeFromApi,
          subscriptionStatus: subscriptionStatusFromApi,
        };

        dispatch(setBusinessDataAction(businessPayload));

        // Solo plans have no staff picker — keep selection as "anyone"
        if (subscriptionPlanTypeFromApi === "Solo") {
          dispatch(setSelectedStaff("anyone"));
        }

        // Set selected service in selectedServices - skip for subscription booking
        if (params.subscription_id) {
          dispatch(setSelectedServices([]));
        } else if (servicesToSelect.length > 0) {
          dispatch(setSelectedServices(servicesToSelect));
        } else if (serviceToSelect) {
          if (hasReduxData && reduxSelectedServices.length > 0) {
            const existingService = allServicesData.find(
              (s: Service) => s.id === reduxSelectedServices[0].id,
            );
            if (existingService) {
              dispatch(setSelectedServices([existingService]));
            } else {
              dispatch(setSelectedServices([serviceToSelect]));
            }
          } else {
            dispatch(setSelectedServices([serviceToSelect]));
          }
        }
      } else {
        setError("Failed to load business details");
        showBanner(t("error"), t("failedToLoadBusinessDetails"), "error", 4000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load business details");
      showBanner(
        "Error",
        err.message || "Failed to load business details. Please try again.",
        "error",
        4000,
      );
    } finally {
      // Only set loading to false if we were showing loader
      if (!hasReduxData) {
        setLoading(false);
      }
    }
  }, [
    params.business_id,
    params.service_id,
    params.service_ids,
    params.subscription_id,
    reduxBusinessId,
    allServices.length,
    reduxSelectedServices,
    dispatch,
    showBanner,
  ]);

  // Fetch data on mount - check both params and Redux for business_id
  useEffect(() => {
    // Call API when we have business_id from params (including subscription) or from Redux
    if (
      resolveBusinessIdParam(
        resolveRouteParam(params.business_id),
        reduxBusinessId,
      )
    ) {
      fetchBusinessDetails();
    } else {
      setError("Business ID is missing. Please go back and try again.");
    }

    return () => {
      dispatch(resetBusiness());
    };
  }, []);

  // Update selected staff member when staff ID changes
  useEffect(() => {
    if (selectedStaff === "anyone") {
      setSelectedStaffMember(null);
    } else {
      const foundStaff = staffMembers.find(
        (s) => s.id.toString() === selectedStaff,
      );
      if (foundStaff) {
        setSelectedStaffMember(foundStaff);
      } else {
        setSelectedStaffMember(null);
      }
    }
    setSelectedTimeSlotState(null);
    dispatch(setSelectedTimeSlot(null));
    dispatch(setAssignedStaffId(null));
  }, [selectedStaff, staffMembers, dispatch]);

  const getDayNameFromDate = (date: dayjs.Dayjs): string => {
    const dayNamesFull = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return dayNamesFull[date.day()];
  };

  // Clear selected time slot when date changes (new date has different slots)
  useEffect(() => {
    setSelectedTimeSlotState(null);
    dispatch(setSelectedTimeSlot(null));
    dispatch(setAssignedStaffId(null));
  }, [selectedDate, dispatch]);

  const fetchAvailableSlots = useCallback(() => {
    const businessId = resolveBusinessIdParam(
      reduxBusinessId,
      resolveRouteParam(params.business_id),
    );
    if (!businessId || !selectedDate) {
      setApiSlots([]);
      setSlotsError(null);
      return;
    }
    const dateStr = selectedDate.format("YYYY-MM-DD");
    const staffId =
      selectedStaff !== "anyone" ? parseInt(selectedStaff, 10) : undefined;
    const excludeAppointmentId =
      isReschedule && params.booking_id
        ? parseInt(String(params.booking_id), 10)
        : undefined;
    if (excludeAppointmentId && isNaN(excludeAppointmentId)) {
      setApiSlots([]);
      setSlotsError(null);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(null);
    ApiService.get<{
      success?: boolean;
      message?: string;
      data?: AvailableSlot[] | { slots?: AvailableSlot[] } | unknown;
    }>(
      appointmentsEndpoints.availableSlots({
        business_id: parseInt(businessId, 10),
        date: dateStr,
        staff_id: staffId,
        slot_minutes: slotMinutes,
        // ...(excludeAppointmentId != null && !isNaN(excludeAppointmentId)
        //   ? { exclude_appointment_id: excludeAppointmentId }
        //   : {}),
      }),
    )
      .then((res) => {
        Logger.log("-------->res", res);

        if (res?.success === false) {
          setApiSlots([]);
          setSlotsError(res.message || "Failed to load available slots.");
          return;
        }
        const rawList = Array.isArray(res?.data)
          ? res.data
          : Array.isArray((res?.data as { slots?: unknown })?.slots)
            ? (res.data as { slots: unknown[] }).slots
            : [];
        setApiSlots(normalizeAvailableSlots(rawList));
      })
      .catch((err: any) => {
        setApiSlots([]);
        setSlotsError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load available slots. Please try again.",
        );
      })
      .finally(() => {
        setSlotsLoading(false);
      });
  }, [
    selectedDate,
    reduxBusinessId,
    params.business_id,
    params.booking_id,
    selectedStaff,
    isReschedule,
    slotMinutes,
  ]);

  // Fetch available slots from API when date or staff changes
  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const availableTimeSlots = useMemo(
    () =>
      apiSlots
        .map((s) => s.start)
        .filter((start): start is string => isValidTimeSlot(start)),
    [apiSlots],
  );

  const sortedTimeSlots = useMemo(
    () => sortTimeSlots(availableTimeSlots),
    [availableTimeSlots],
  );

  const isSlotDisabled = (slot: string): boolean => {
    if (!isValidTimeSlot(slot)) return true;
    const today = dayjs().startOf("day");
    const selectedDay = selectedDate.startOf("day");
    if (!selectedDay.isSame(today, "day")) return false;
    const now = dayjs();
    const [hours, minutes] = slot.split(":").map(Number);
    const slotTime = dayjs()
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);
    return slotTime.isBefore(now);
  };

  const handleSlotSelect = (slot: string) => {
    if (isSlotDisabled(slot)) return;
    setSelectedTimeSlotState(slot);
    dispatch(setSelectedTimeSlot(slot));
    // Anyone assignment happens via backend round-robin API at checkout/reschedule
    dispatch(setAssignedStaffId(null));
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    if (isDateDisabled(date)) return;
    setSelectedDateState(date);
    dispatch(setSelectedDate(date.format("YYYY-MM-DD")));
    setWeek(getWeekDays(date));
  };

  const isDateDisabled = (date: dayjs.Dayjs): boolean => {
    const today = dayjs().startOf("day");
    const selectedDay = date.startOf("day");
    if (selectedDay.isBefore(today)) return true;
    const dayName = getDayNameFromDate(date);
    if (selectedStaff !== "anyone" && selectedStaffMember?.working_hours) {
      const staffDayHours = selectedStaffMember.working_hours[dayName];
      if (staffDayHours && !staffDayHours.isOpen) return true;
    }
    if (businessHours) {
      const dayHours = businessHours[dayName];
      if (dayHours && !dayHours.isOpen) return true;
    }
    return false;
  };

  useEffect(() => {
    if (!businessHours) return;
    // In reschedule mode, keep the date from params; do not reset to today
    if (params.is_reschedule === "1" && params.appointment_date) return;
    const today = dayjs().startOf("day");
    const currentSelected = selectedDate.startOf("day");
    if (currentSelected.isSame(today, "day") && !isDateDisabled(today)) return;
    if (!isDateDisabled(today)) {
      setSelectedDateState(today);
      dispatch(setSelectedDate(today.format("YYYY-MM-DD")));
      setWeek(getWeekDays(today));
      return;
    }
    for (let i = 0; i < 30; i++) {
      const checkDate = today.add(i, "day");
      if (!isDateDisabled(checkDate)) {
        setSelectedDateState(checkDate);
        dispatch(setSelectedDate(checkDate.format("YYYY-MM-DD")));
        setWeek(getWeekDays(checkDate));
        return;
      }
    }
    // Only run when business hours first load - do NOT reset date when staff changes
  }, [businessHours]);

  const getTimezoneText = () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offset / 60));
      const offsetMinutes = Math.abs(offset % 60);
      const sign = offset <= 0 ? "+" : "-";
      const gmtOffset = `GMT${sign}${offsetHours}${
        offsetMinutes > 0 ? `:${offsetMinutes.toString().padStart(2, "0")}` : ""
      }`;
      return t("bkFlowTimezone", { zone: `${timezone} (${gmtOffset})` });
    } catch {
      return "In your time zone, South Africa (GMT +1:00)";
    }
  };

  const staffList = useMemo(() => {
    const query = staffSearchQuery.trim().toLowerCase();
    const anyoneItem = {
      id: "anyone",
      name: "Anyone",
      experience: "Any available staff" as string | number | null,
      image: null,
      active: null as boolean | null,
      is_owner: false,
    };
    const filteredStaff = staffMembers
      .filter((staff) => {
        if (!query) return true;
        return staff.name.toLowerCase().includes(query);
      })
      .map((staff) => ({
        id: staff.id.toString(),
        name: staff.name,
        experience: staff.experience ?? null,
        image: staff.image,
        active: staff.active,
        is_owner: staff.is_owner === true,
      }));

    const showAnyone =
      !query ||
      "anyone".includes(query) ||
      "anyone who's available".includes(query) ||
      "any available staff".includes(query);

    return showAnyone ? [anyoneItem, ...filteredStaff] : filteredStaff;
  }, [staffMembers, staffSearchQuery]);

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  );
  const taxRate = 0.0;
  const tax = totalPrice * taxRate;
  const estimatedTotal = totalPrice + tax;

  const handleDeleteService = (serviceId: number) => {
    const updatedServices = selectedServices.filter(
      (service) => service.id !== serviceId,
    );
    dispatch(setSelectedServices(updatedServices));
  };

  const handleAddService = () => {
    setAddServiceModalVisible(true);
  };

  const handleCloseModal = useCallback(() => {
    setAddServiceModalVisible(false);
  }, []);

  const handleUpdateSelectedServices = useCallback(
    (services: Service[]) => {
      dispatch(setSelectedServices(services));
    },
    [dispatch],
  );

  // Memoize selectedServiceIds to prevent infinite loops
  const selectedServiceIds = useMemo(
    () => selectedServices.map((s) => s.id),
    [selectedServices],
  );

  // ── Step flow ───────────────────────────────────────────────────────

  const steps = useMemo<StepKey[]>(() => {
    const staffStep: StepKey[] = isSoloPlan ? [] : ["staff"];
    if (isReschedule) return [...staffStep, "time", "confirm"];
    if (isSubscriptionBooking) {
      return ["planServices", ...staffStep, "time", "extras"];
    }
    return ["services", ...staffStep, "time", "payment", "extras"];
  }, [isReschedule, isSubscriptionBooking, isSoloPlan]);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const stepKey = steps[safeIndex];
  const isLastStep = safeIndex === steps.length - 1;
  const busy = continueLoading || rescheduleLoading;

  const goTo = useCallback((index: number, dir: 1 | -1) => {
    Keyboard.dismiss();
    setDirection(dir);
    setStepIndex(index);
  }, []);

  const goToStep = useCallback(
    (key: StepKey) => {
      const index = steps.indexOf(key);
      if (index >= 0) goTo(index, index > safeIndex ? 1 : -1);
    },
    [goTo, safeIndex, steps],
  );

  const allowLeaveRef = useRef(false);

  const leave = useCallback(() => {
    allowLeaveRef.current = true;
    router.back();
  }, [router]);

  /** One step back; false when the first step is showing. */
  const stepBack = useCallback((): boolean => {
    if (busy) return true;
    if (safeIndex === 0) return false;
    goTo(safeIndex - 1, -1);
    return true;
  }, [busy, goTo, safeIndex]);

  const onHeaderBack = useCallback(() => {
    if (!stepBack()) leave();
  }, [leave, stepBack]);

  // Swipe-back / Android back go one step back before leaving the screen.
  const stepBackRef = useRef(stepBack);
  stepBackRef.current = stepBack;
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      const type = event?.data?.action?.type;
      if (type !== "GO_BACK" && type !== "POP") return;
      event.preventDefault();
      if (stepBackRef.current()) return;
      allowLeaveRef.current = true;
      navigation.dispatch(event.data.action);
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onHeaderBack();
        return true;
      });
      return () => sub.remove();
    }, [onHeaderBack]),
  );

  // Only times still open, grouped by part of the day (past ones hidden).
  const openSlotGroups = useMemo(
    () =>
      TIME_SLOT_CATEGORIES.map((category) => ({
        category,
        slots: sortedTimeSlots.filter(
          (slot) => getSlotCategory(slot) === category && !isSlotDisabled(slot),
        ),
      })).filter((group) => group.slots.length > 0),
    // isSlotDisabled only depends on the selected date
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedTimeSlots, selectedDate],
  );

  // Scrollable day strip: today up to ~2 months ahead (and the picked day).
  // Month shown in the day strip (‹ › arrows); follows the picked day.
  const [visibleMonth, setVisibleMonth] = useState(() =>
    selectedDate.startOf("month"),
  );
  useEffect(() => {
    setVisibleMonth(selectedDate.startOf("month"));
  }, [selectedDate]);

  const isCurrentMonth = visibleMonth.isSame(dayjs(), "month");

  const stripDays = useMemo(() => {
    const today = dayjs().startOf("day");
    const start = isCurrentMonth ? today : visibleMonth.startOf("month");
    const end = visibleMonth.endOf("month");
    const days: dayjs.Dayjs[] = [];
    for (let d = start; !d.isAfter(end, "day"); d = d.add(1, "day")) {
      days.push(d);
    }
    return days;
  }, [visibleMonth, isCurrentMonth]);

  /** Show another month and pick its first open day (or just show it). */
  const changeMonth = (delta: 1 | -1) => {
    const month = visibleMonth.add(delta, "month").startOf("month");
    if (month.isBefore(dayjs(), "month")) return;
    const today = dayjs().startOf("day");
    let day = month.isSame(today, "month") ? today : month;
    while (day.isSame(month, "month")) {
      if (!isDateDisabled(day)) {
        handleDateSelect(day);
        return;
      }
      day = day.add(1, "day");
    }
    setVisibleMonth(month);
  };

  const nextOpenDay = useMemo(() => {
    for (let i = 1; i <= NEXT_DAY_LOOKAHEAD; i++) {
      const day = selectedDate.add(i, "day");
      if (!isDateDisabled(day)) return day;
    }
    return null;
    // isDateDisabled reads staff / business hours
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedStaffMember, businessHours]);

  const dateStripRef = useRef<ScrollView>(null);
  // "30 min slots ⌄" dropdown, placed under the link it opens from.
  const intervalLinkRef = useRef<View>(null);
  const [intervalMenu, setIntervalMenu] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const openIntervalMenu = () => {
    // measure (page coords), not measureInWindow: the latter is off by the
    // status bar on edge-to-edge Android.
    intervalLinkRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      setIntervalMenu({
        top: pageY + h + moderateHeightScale(4),
        right: Math.max(PAGE_PAD, windowWidth - (pageX + w)),
      });
    });
  };

  // Morning / Afternoon / Evening / Night tab; falls back to the picked
  // time's period, then to the first period that has open times.
  const [activePeriod, setActivePeriod] = useState<TimeSlotCategory | null>(
    null,
  );
  const activeSlotGroup =
    openSlotGroups.find((g) => g.category === activePeriod) ??
    (selectedTimeSlot
      ? openSlotGroups.find(
          (g) => g.category === getSlotCategory(selectedTimeSlot),
        )
      : undefined) ??
    openSlotGroups[0];

  // Keep the picked day in view in the strip.
  useEffect(() => {
    if (stepKey !== "time") return;
    const index = stripDays.findIndex((d) => d.isSame(selectedDate, "day"));
    if (index < 0) {
      dateStripRef.current?.scrollTo({ x: 0, animated: false });
      return;
    }
    const timer = setTimeout(() => {
      dateStripRef.current?.scrollTo({
        x: Math.max(0, index * (DATE_CHIP_W + DATE_CHIP_GAP) - DATE_CHIP_W),
        animated: true,
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [stepKey, selectedDate, stripDays]);


  const contentWidth = windowWidth - PAGE_PAD * 2;
  const staffCardWidth = Math.floor((contentWidth - GRID_GAP) / 2);
  const slotWidth = Math.floor(
    (contentWidth - SLOT_GAP * (SLOT_COLUMNS - 1)) / SLOT_COLUMNS,
  );
  const photoSize = Math.floor((contentWidth - PHOTO_GAP * 2) / 3);

  const showTotalBar = !isSubscriptionBooking && !isReschedule;

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <FlowHeader
          title={isReschedule ? t("bkFlowRescheduleTitle") : t("bkFlowTitle")}
          onBack={leave}
          backIcon="close"
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  const submitReschedule = async (lateFeeAccepted: boolean) => {
    const bookingId = params.booking_id;
    const businessId = params.business_id;
    if (!bookingId || !businessId) {
      showBanner(
        t("error"),
        "Booking or business missing.",
        "error",
        4000,
      );
      return;
    }
    if (!selectedTimeSlot) {
      showBanner(
        "Select time",
        "Please select a date and time slot.",
        "warning",
        4000,
      );
      return;
    }
    const appointmentDate = selectedDate.format("YYYY-MM-DD");
    const appointmentTime = selectedTimeSlot;
    const appointmentType =
      params.appointment_type === "subscription"
        ? "subscription"
        : "service";

    let serviceIds: number[] = [];
    if (appointmentType === "service" && params.service_ids) {
      try {
        serviceIds = JSON.parse(params.service_ids) as number[];
      } catch (_) {
        serviceIds = params.service_ids
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((n) => !Number.isNaN(n));
      }
    }
    if (serviceIds.length === 0 && selectedServices.length > 0) {
      serviceIds = selectedServices.map((s) => s.id);
    }

    setRescheduleLoading(true);
    try {
      let resolvedStaffId = resolveAppointmentStaffId({
        selectedStaff,
        assignedStaffId: businessData?.assignedStaffId ?? null,
      });

      if (selectedStaff === "anyone" && !isSoloPlan) {
        if (serviceIds.length === 0) {
          showBanner(
            t("error"),
            "Services are required to assign staff.",
            "error",
            4000,
          );
          return;
        }
        const assigned = await assignAnyoneStaff({
          business_id: parseInt(businessId, 10),
          service_ids: serviceIds,
          date: appointmentDate,
          start_time: appointmentTime,
        });
        resolvedStaffId = assigned.staff_id;
        dispatch(setAssignedStaffId(assigned.staff_id));
      }

      const body: {
        business_id: number;
        appointment_type: string;
        staff_id?: number;
        appointment_date: string;
        appointment_time: string;
        notes?: string;
        service_ids?: number[];
        subscription_id?: number;
        late_fee_accepted?: boolean;
      } = {
        business_id: parseInt(businessId, 10),
        appointment_type: appointmentType,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes: note.trim() || undefined,
      };
      if (resolvedStaffId != null) {
        body.staff_id = resolvedStaffId;
      }
      if (appointmentType === "service" && serviceIds.length > 0) {
        body.service_ids = serviceIds;
      }
      if (
        appointmentType === "subscription" &&
        params.subscription_id != null &&
        params.subscription_id !== ""
      ) {
        body.subscription_id = parseInt(params.subscription_id, 10);
      }

      if (lateFeeAccepted) {
        body.late_fee_accepted = true;
      }

      const response = await ApiService.put<{
        success: boolean;
        message: string;
        data?: {
          id: number;
          appointmentDate: string;
          appointmentTime: string;
          status: string;
        };
      }>(appointmentsEndpoints.reschedule(bookingId), body);
      if (response.success) {
        showBanner(
          t("success"),
          response.message || "Appointment rescheduled successfully.",
          "success",
          3000,
        );
        leave();
      } else {
        showBanner(
          t("error"),
          response.message || "Failed to reschedule.",
          "error",
          4000,
        );
      }
    } catch (err: any) {
      // Late reschedule fee not confirmed yet (e.g. the free window passed
      // while the customer was picking a slot). Nothing changed; ask and resend.
      if (err?.status === 422 && err?.data?.errors?.late_fee_accepted) {
        setRescheduleFeeMessage(err?.data?.message || err?.message || "");
        return;
      }
      showBanner(
        t("error"),
        err?.message ||
          err?.data?.message ||
          "Failed to reschedule. Please try again.",
        "error",
        4000,
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleConfirmRescheduleFee = () => {
    setRescheduleFeeMessage(null);
    submitReschedule(true);
  };

  const handleContinue = async () => {
    const businessIdForCheckout = resolveBusinessIdParam(
      resolveRouteParam(params.business_id),
      reduxBusinessId,
    );
    if (!businessIdForCheckout) {
      showBanner(
        t("error"),
        "Business ID is missing. Please go back and try again.",
        "error",
        4000,
      );
      return;
    }
    if (isSubscriptionBooking) {
      if (selectedSubscriptionServiceIds.length === 0) {
        showBanner(
          "No Service Selected",
          "Please select at least one plan service before checkout.",
          "warning",
          4000,
        );
        goToStep("planServices");
        return;
      }
      if (!selectedTimeSlot) {
        showBanner(
          "Select time",
          "Please select a date and time slot before checkout.",
          "warning",
          4000,
        );
        goToStep("time");
        return;
      }

      if (selectedStaff === "anyone" && !isSoloPlan) {
        setContinueLoading(true);
        try {
          const assigned = await assignAnyoneStaff({
            business_id: parseInt(businessIdForCheckout, 10),
            service_ids: selectedSubscriptionServiceIds,
            date: selectedDate.format("YYYY-MM-DD"),
            start_time: selectedTimeSlot,
          });
          dispatch(setAssignedStaffId(assigned.staff_id));
        } catch (err: any) {
          showBanner(
            t("error"),
            err?.message ||
              err?.data?.message ||
              "No staff available for this time slot.",
            "error",
            4000,
          );
          return;
        } finally {
          setContinueLoading(false);
        }
      } else {
        dispatch(setAssignedStaffId(null));
      }

      dispatch(setSelectedDate(selectedDate.format("YYYY-MM-DD")));
      dispatch(setSelectedTimeSlot(selectedTimeSlot));
      dispatch(setSelectedNote(note));
      dispatch(setBookingTryOnImageUrls(tryOnImageUrls));
      router.push({
        pathname: "/(main)/bookingNow/checkout",
        params: {
          subscription_id: params.subscription_id || "",
          business_id: businessIdForCheckout,
          item: params.item || "",
          try_on_image_urls:
            tryOnImageUrls.length > 0
              ? JSON.stringify(tryOnImageUrls)
              : "",
          gallery_image_uris:
            galleryImageUris.length > 0
              ? JSON.stringify(galleryImageUris)
              : "",
          selected_subscription_service_ids: JSON.stringify(
            selectedSubscriptionServiceIds,
          ),
          subscription_plan_type: subscriptionPlanType ?? "",
          ...(attributionReelId
            ? { reel_id: String(attributionReelId) }
            : {}),
          ...(attributionSavedLookId
            ? { saved_look_id: String(attributionSavedLookId) }
            : {}),
        },
      });
      return;
    }
    if (selectedServices.length === 0) {
      showBanner(
        t("noServiceSelected"),
        t("pleaseSelectAtLeastOneService"),
        "warning",
        4000,
      );
      goToStep("services");
      return;
    }
    if (!selectedTimeSlot) {
      showBanner(
        "Select time",
        "Please select a date and time slot before checkout.",
        "warning",
        4000,
      );
      goToStep("time");
      return;
    }

    if (selectedStaff === "anyone" && !isSoloPlan) {
      setContinueLoading(true);
      try {
        const assigned = await assignAnyoneStaff({
          business_id: parseInt(businessIdForCheckout, 10),
          service_ids: selectedServices.map((s) => s.id),
          date: selectedDate.format("YYYY-MM-DD"),
          start_time: selectedTimeSlot,
        });
        dispatch(setAssignedStaffId(assigned.staff_id));
      } catch (err: any) {
        showBanner(
          t("error"),
          err?.message ||
            err?.data?.message ||
            "No staff available for this time slot.",
          "error",
          4000,
        );
        return;
      } finally {
        setContinueLoading(false);
      }
    } else {
      dispatch(setAssignedStaffId(null));
    }

    dispatch(setSelectedDate(selectedDate.format("YYYY-MM-DD")));
    dispatch(setSelectedTimeSlot(selectedTimeSlot));
    dispatch(setSelectedNote(note));
    dispatch(setBookingTryOnImageUrls(tryOnImageUrls));
    router.push({
      pathname: "/(main)/bookingNow/checkout",
      params: {
        try_on_image_urls:
          tryOnImageUrls.length > 0
            ? JSON.stringify(tryOnImageUrls)
            : "",
        gallery_image_uris:
          galleryImageUris.length > 0
            ? JSON.stringify(galleryImageUris)
            : "",
        subscription_plan_type: subscriptionPlanType ?? "",
        ...(attributionReelId
          ? { reel_id: String(attributionReelId) }
          : {}),
        ...(attributionSavedLookId
          ? { saved_look_id: String(attributionSavedLookId) }
          : {}),
      },
    });
  };

  // ── Step screens ────────────────────────────────────────────────────

  const formatMoney = (value: number) => `$${value.toFixed(2)} USD`;

  const openPrivacy = () => {
    const url = process.env.EXPO_PUBLIC_PRIVACY_URL;
    if (url) Linking.openURL(url);
  };

  const renderServices = () => (
    <>
      <FlowTitle
        title={t("bkFlowServicesTitle")}
        subtitle={t("bkFlowServicesSubtitle")}
      />
      <View style={styles.list}>
        {selectedServices.length === 0 ? (
          <InfoNote text={t("bkFlowServicesEmpty")} />
        ) : (
          selectedServices.map((service) => (
            <FlowCard key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.duration && service.duration !== "N/A" ? (
                  <View style={styles.metaRow}>
                    <Feather
                      name="clock"
                      size={moderateWidthScale(14)}
                      color={theme.lightGreen}
                    />
                    <Text style={styles.metaText}>{service.duration}</Text>
                  </View>
                ) : null}
                {service.description ? (
                  <Text style={styles.serviceDesc} numberOfLines={3}>
                    {service.description}
                  </Text>
                ) : null}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{formatMoney(service.price)}</Text>
                  {service.originalPrice > service.price ? (
                    <Text style={styles.priceOriginal}>
                      ${service.originalPrice.toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={styles.roundAction}
                onPress={() => handleDeleteService(service.id)}
                activeOpacity={0.7}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t("bkFlowRemoveService", {
                  name: service.name,
                })}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={moderateWidthScale(22)}
                  color={theme.red}
                />
              </TouchableOpacity>
            </FlowCard>
          ))
        )}

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleAddService}
          style={styles.addServiceBtn}
          accessibilityRole="button"
        >
          <Text style={styles.addServiceText}>{t("addAnotherService")}</Text>
          <View style={styles.addServiceIcon}>
            <Feather
              name="plus"
              size={moderateWidthScale(18)}
              color={theme.selectCard}
            />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPlanCard = () => {
    if (!subscriptionData) return null;
    const pill = getCustomerSubscriptionPill(subscriptionData);
    const dateDisplay = getCustomerSubscriptionDateDisplay(subscriptionData);
    const scheduleDate = formatCustomerScheduleDate(
      dateDisplay.kind,
      dateDisplay.date,
    );
    const displayPrice = getCustomerSubscriptionDisplayPrice(subscriptionData);
    return (
      <FlowCard style={styles.planCard}>
        <View style={styles.planHeaderRow}>
          <View style={styles.planTitleRow}>
            <Feather
              name="star"
              size={moderateWidthScale(18)}
              color={theme.selectCard}
            />
            <Text style={styles.planTitle} numberOfLines={2}>
              {subscriptionData.subscriptionPlan}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{pill.label.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.planMetaRow}>
          <View style={styles.planBusiness}>
            <Feather
              name="user"
              size={moderateWidthScale(15)}
              color={theme.lightGreen}
            />
            <Text style={styles.metaText} numberOfLines={1}>
              {subscriptionData.business}
            </Text>
          </View>
          <Text style={styles.planPrice}>
            ${displayPrice}
            <Text style={styles.planPriceUnit}>{t("bkFlowPerMonth")}</Text>
          </Text>
        </View>
        {subscriptionData.subscriptionPlanDescription ? (
          <Text style={styles.serviceDesc}>
            {subscriptionData.subscriptionPlanDescription}
          </Text>
        ) : null}
        {subscriptionData.paymentDate || scheduleDate ? (
          <View style={styles.planDates}>
            {subscriptionData.paymentDate ? (
              <View style={styles.planDate}>
                <Feather
                  name="credit-card"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <View>
                  <Text style={styles.planDateLabel}>
                    {t("bkFlowPlanPayment")}
                  </Text>
                  <Text style={styles.planDateValue}>
                    {subscriptionData.paymentDate}
                  </Text>
                </View>
              </View>
            ) : null}
            {scheduleDate ? (
              <View style={styles.planDate}>
                <Feather
                  name="calendar"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <View>
                  <Text style={styles.planDateLabel}>
                    {getCustomerScheduleDateLabel(dateDisplay.kind)}
                  </Text>
                  <Text style={styles.planDateValue}>{scheduleDate}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </FlowCard>
    );
  };

  const renderPlanServices = () => {
    const planServices = subscriptionData?.subscriptionPlanServices ?? [];
    return (
      <>
        <FlowTitle
          title={t("bkFlowPlanTitle")}
          subtitle={t("bkFlowPlanSubtitle")}
        />
        {renderPlanCard()}
        <View style={styles.section}>
          <SectionLabel label={t("bkFlowPlanServicesLabel")} />
          {planServices.length === 0 ? (
            <InfoNote text={t("bkFlowPlanNoServices")} />
          ) : (
            planServices.map((svc) => {
              const remaining = svc.quantity ?? 1;
              const isServiceDisabled = remaining <= 0;
              const isSelected = selectedSubscriptionServiceIds.includes(
                svc.id,
              );
              const duration = formatServiceDuration(
                svc.durationHours,
                svc.durationMinutes,
              );
              return (
                <TouchableOpacity
                  key={svc.id}
                  activeOpacity={0.8}
                  disabled={isServiceDisabled}
                  onPress={() => toggleSubscriptionServiceSelection(svc.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isSelected,
                    disabled: isServiceDisabled,
                  }}
                >
                  <FlowCard
                    style={[
                      styles.choiceCard,
                      isSelected && styles.choiceCardSelected,
                      isServiceDisabled && styles.choiceCardDisabled,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkBox,
                        isSelected && styles.checkBoxSelected,
                      ]}
                    >
                      {isSelected ? (
                        <MaterialIcons
                          name="check"
                          size={moderateWidthScale(20)}
                          color={theme.white}
                        />
                      ) : null}
                    </View>
                    <View style={styles.choiceText}>
                      <Text style={styles.choiceTitle}>{svc.name}</Text>
                      {duration ? (
                        <Text style={styles.choiceSub}>{duration}</Text>
                      ) : null}
                      {svc.description ? (
                        <Text style={styles.choiceSub} numberOfLines={2}>
                          {svc.description}
                        </Text>
                      ) : null}
                      <View style={styles.leftChip}>
                        <Text style={styles.leftChipText}>
                          {isServiceDisabled
                            ? t("bkFlowPlanNoneLeft")
                            : t("bkFlowPlanLeft", { count: remaining })}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.choicePrice}>${svc.price}</Text>
                  </FlowCard>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </>
    );
  };

  const renderStaff = () => (
    <>
      <FlowTitle
        title={t("bkFlowStaffTitle")}
        subtitle={t("bkFlowStaffSubtitle")}
      />
      {staffMembers.length > 3 ? (
        <FloatingInput
          label={t("bkFlowStaffSearch")}
          value={staffSearchQuery}
          onChangeText={setStaffSearchQuery}
          placeholder={t("bkFlowStaffSearchPlaceholder")}
          placeholderTextColor={theme.lightGreen2}
          containerStyle={styles.staffSearchInput}
          returnKeyType="search"
          showClearButton
          onClear={() => setStaffSearchQuery("")}
          renderLeftAccessory={() => (
            <SearchIcon
              width={widthScale(18)}
              height={heightScale(18)}
              color={theme.darkGreen}
            />
          )}
        />
      ) : null}
      {staffList.length === 0 ? (
        <InfoNote text={t("bkFlowStaffEmpty")} />
      ) : (
        <View style={styles.staffGrid} accessibilityRole="radiogroup">
          {staffList.map((staff) => (
            <StaffCard
              key={staff.id}
              staff={staff}
              width={staffCardWidth}
              isSelected={selectedStaff === staff.id}
              styles={styles}
              theme={theme}
              ownerLabel={t("owner")}
              anyoneLabel={t("bkFlowAnyone")}
              anyoneSubLabel={t("bkFlowAnyoneSub")}
              anyoneInfoLabel={t("bkFlowAnyoneInfo")}
              onSelect={(id) => dispatch(setSelectedStaff(id))}
              onAnyoneInfoPress={() => setShowAnyoneHint(true)}
            />
          ))}
        </View>
      )}
    </>
  );

  const renderPeriodIcon = (category: TimeSlotCategory) => {
    switch (category) {
      case "morning":
        return (
          <MorningIcon
            width={moderateWidthScale(20)}
            height={moderateHeightScale(14)}
          />
        );
      case "afternoon":
        return (
          <MaterialIcons
            name="wb-sunny"
            size={moderateWidthScale(18)}
            color={theme.darkGreen}
          />
        );
      case "evening":
        return (
          <EveningIcon
            width={moderateWidthScale(20)}
            height={moderateHeightScale(11)}
          />
        );
      case "night":
        return (
          <NightIcon
            width={moderateWidthScale(16)}
            height={moderateHeightScale(16)}
          />
        );
    }
  };

  const renderDateStrip = () => (
    <ScrollView
      ref={dateStripRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.dateStrip}
      contentContainerStyle={styles.dateStripContent}
    >
      {stripDays.map((day) => {
        const isSelected = day.isSame(selectedDate, "day");
        const isDisabled = isDateDisabled(day);
        const isToday = day.isSame(dayjs(), "day");
        return (
          <TouchableOpacity
            key={day.format("YYYY-MM-DD")}
            onPress={() => handleDateSelect(day)}
            disabled={isDisabled}
            activeOpacity={0.75}
            style={[
              styles.dateChip,
              isSelected && styles.dateChipSelected,
              isDisabled && styles.dateChipDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isDisabled
                ? `${day.format("dddd, MMMM D")}, ${t("bkFlowClosed")}`
                : day.format("dddd, MMMM D")
            }
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
          >
            <Text
              style={[styles.dateChipDay, isSelected && styles.dateChipDayOn]}
              numberOfLines={1}
            >
              {isToday ? t("bkFlowToday") : day.format("ddd")}
            </Text>
            <Text style={styles.dateChipNum}>{day.format("D")}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderPeriodTabs = () => (
    <View style={styles.periodTabs} accessibilityRole="tablist">
      {TIME_SLOT_CATEGORIES.map((category) => {
        const hasSlots = openSlotGroups.some((g) => g.category === category);
        const isSelected = activeSlotGroup?.category === category;
        return (
          <TouchableOpacity
            key={category}
            activeOpacity={0.7}
            style={[styles.periodTab, !hasSlots && styles.periodTabDisabled]}
            disabled={!hasSlots}
            onPress={() => setActivePeriod(category)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled: !hasSlots }}
          >
            <View style={styles.periodIcon}>{renderPeriodIcon(category)}</View>
            <Text
              style={[styles.periodText, isSelected && styles.periodTextSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t(PERIOD_LABEL_KEYS[category])}
            </Text>
            {isSelected ? <View style={styles.periodUnderline} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSlots = () => {
    if (slotsLoading) {
      return (
        <View style={styles.slotsGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <View
              key={`skeleton-${i}`}
              style={[styles.slotSkeleton, { width: slotWidth }]}
            />
          ))}
        </View>
      );
    }
    if (slotsError) {
      return (
        <View style={styles.section}>
          <InfoNote
            tone="error"
            icon="error-outline"
            title={t("bkFlowSlotsError")}
            text={slotsError}
          />
          <FlowButton
            variant="outline"
            compact
            icon="refresh"
            label={t("retry")}
            onPress={fetchAvailableSlots}
            style={styles.inlineBtn}
          />
        </View>
      );
    }
    if (openSlotGroups.length === 0) {
      return (
        <View style={styles.emptySlots}>
          <MaterialIcons
            name="event-busy"
            size={moderateWidthScale(36)}
            color={theme.lightGreen5}
          />
          <Text style={styles.emptySlotsText}>{t("bkFlowNoSlots")}</Text>
          {nextOpenDay ? (
            <FlowButton
              variant="outline"
              compact
              trailingIcon="chevron-right"
              label={t("bkFlowNextDay")}
              onPress={() => handleDateSelect(nextOpenDay)}
              style={styles.centerBtn}
            />
          ) : null}
        </View>
      );
    }
    return (
      <View style={styles.slotsGrid}>
        {(activeSlotGroup?.slots ?? []).map((slot) => {
          const isSelected = selectedTimeSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              activeOpacity={0.75}
              style={[
                styles.slotBtn,
                { width: slotWidth },
                isSelected && styles.slotBtnSelected,
              ]}
              onPress={() => handleSlotSelect(slot)}
              accessibilityRole="radio"
              accessibilityState={{
                selected: isSelected,
                checked: isSelected,
              }}
            >
              <Text
                style={[styles.slotText, isSelected && styles.slotTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {convertTo12Hour(slot)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTime = () => (
    <>
      <FlowTitle
        title={t("bkFlowTimeTitle")}
        subtitle={isReschedule ? t("bkFlowRescheduleSubtitle") : null}
      />

      <View style={styles.section}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            disabled={isCurrentMonth}
            style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnOff]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("bkFlowPrevMonth")}
            accessibilityState={{ disabled: isCurrentMonth }}
          >
            <Feather
              name="chevron-left"
              size={moderateWidthScale(20)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
          <Text style={styles.monthNavText} accessibilityRole="header">
            {visibleMonth.format("MMMM YYYY")}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.monthNavBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("bkFlowNextMonth")}
          >
            <Feather
              name="chevron-right"
              size={moderateWidthScale(20)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </View>
        {renderDateStrip()}
        <Text style={styles.timezone}>{getTimezoneText()}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.timeHeaderRow}>
          <Text style={[styles.timeHeaderTitle, styles.flexShrink]}>
            {t("bkFlowAvailableTimes")}
          </Text>
          <TouchableOpacity
            ref={intervalLinkRef}
            style={styles.intervalLink}
            onPress={openIntervalMenu}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t("bkFlowSlotLength", { count: slotMinutes })}
            accessibilityState={{ expanded: intervalMenu != null }}
          >
            <Text style={styles.intervalLinkText}>
              {t("bkFlowSlotLength", { count: slotMinutes })}
            </Text>
            <MaterialIcons
              name={intervalMenu ? "expand-less" : "expand-more"}
              size={moderateWidthScale(18)}
              color={theme.orangeBrownText}
            />
          </TouchableOpacity>
        </View>

        {!slotsLoading && !slotsError && openSlotGroups.length > 0
          ? renderPeriodTabs()
          : null}
        {renderSlots()}
      </View>
    </>
  );

  const renderPayment = () => {
    const options = [
      {
        key: "payNow" as const,
        icon: "credit-card" as const,
        title: t("bkFlowPayNow"),
        sub: t("bkFlowPayNowSub"),
      },
      {
        key: "payLater" as const,
        icon: "storefront" as const,
        title: t("bkFlowPayLater"),
        sub: t("bkFlowPayLaterSub"),
      },
    ];
    return (
      <>
        <FlowTitle title={t("bkFlowPaymentTitle")} />
        <View style={styles.list} accessibilityRole="radiogroup">
          {options.map((option) => {
            const isSelected = reduxPaymentMethod === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.8}
                onPress={() => dispatch(setSelectedPaymentMethod(option.key))}
                accessibilityRole="radio"
                accessibilityLabel={`${option.title}, ${option.sub}`}
                accessibilityState={{ selected: isSelected, checked: isSelected }}
              >
                <FlowCard
                  style={[
                    styles.choiceCard,
                    isSelected && styles.choiceCardSelected,
                  ]}
                >
                  <View
                    style={[styles.payIcon, isSelected && styles.payIconSelected]}
                  >
                    <MaterialIcons
                      name={option.icon}
                      size={moderateWidthScale(24)}
                      color={isSelected ? theme.selectCard : theme.darkGreen}
                    />
                  </View>
                  <View style={styles.choiceText}>
                    <Text style={styles.choiceTitle}>{option.title}</Text>
                    <Text style={styles.choiceSub}>{option.sub}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                </FlowCard>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  };

  const renderPhotoTile = (
    uri: string,
    key: string,
    onRemove: () => void,
  ) => (
    <View
      key={key}
      style={[styles.photoBox, { width: photoSize, height: photoSize }]}
    >
      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
      <TouchableOpacity
        style={styles.photoRemove}
        onPress={onRemove}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("remove")}
      >
        <Feather name="x" size={moderateWidthScale(16)} color={theme.white} />
      </TouchableOpacity>
    </View>
  );

  const renderNoteField = () => (
    <View style={styles.section}>
      <SectionLabel label={t("bkFlowNote")} meta={t("optional")} />
      <View style={styles.noteWrap}>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t("bkFlowNotePlaceholder")}
          placeholderTextColor={theme.lightGreen2}
          multiline
          numberOfLines={4}
          accessibilityLabel={t("bkFlowNote")}
        />
        {note.length > 0 ? (
          <TouchableOpacity
            onPress={() => setNote("")}
            style={styles.noteClear}
            accessibilityRole="button"
            accessibilityLabel={t("bkFlowClearNote")}
          >
            <Feather
              name="x"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderPrivacy = () => (
    <Text style={styles.privacy}>
      {t("bkFlowPrivacyBefore")}
      <Text style={styles.privacyLink} onPress={openPrivacy}>
        {t("privacyPolicy")}
      </Text>
      {t("bkFlowPrivacyAfter")}
    </Text>
  );

  const renderExtras = () => (
    <>
      <FlowTitle
        title={t("bkFlowExtrasTitle")}
        subtitle={t("bkFlowExtrasSubtitle")}
      />
      <View style={styles.section}>
        <SectionLabel label={t("bkFlowPhotos")} meta={t("optional")} />
        <View style={styles.photoGrid}>
          {tryOnImageUrls.map((uri, index) =>
            renderPhotoTile(uri, `tryon-${uri}-${index}`, () =>
              setTryOnImageUrls((prev) => prev.filter((_, i) => i !== index)),
            ),
          )}
          {galleryImageUris.map((uri, index) =>
            renderPhotoTile(uri, `gallery-${uri}-${index}`, () =>
              setGalleryImageUris((prev) =>
                prev.filter((_, i) => i !== index),
              ),
            ),
          )}
          <TouchableOpacity
            style={[styles.photoAdd, { width: photoSize, height: photoSize }]}
            onPress={() => setImagePickerVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("bkFlowAddPhoto")}
          >
            <Feather
              name="plus"
              size={moderateWidthScale(28)}
              color={theme.darkGreen}
            />
            <Text style={styles.photoAddText}>{t("bkFlowAddPhoto")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {renderNoteField()}
      {renderPrivacy()}
    </>
  );

  const reviewRow = (
    icon: React.ComponentProps<typeof MaterialIcons>["name"],
    label: string,
    value: string,
    target: StepKey,
    first: boolean,
  ) => (
    <View key={label} style={[styles.reviewRow, !first && styles.reviewRowBorder]}>
      <View style={styles.reviewIcon}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(20)}
          color={theme.darkGreen}
        />
      </View>
      <View style={styles.reviewText}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.reviewEdit}
        onPress={() => goToStep(target)}
        hitSlop={6}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`${t("edit")} ${label}`}
      >
        <Text style={styles.reviewEditText}>{t("edit")}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirm = () => {
    const staffName =
      selectedStaff === "anyone"
        ? t("bkFlowAnyone")
        : (selectedStaffMember?.name ?? t("bkFlowAnyone"));
    const rows = [
      ...(isSoloPlan
        ? []
        : [
            {
              icon: "person-outline" as const,
              label: t("staff"),
              value: staffName,
              target: "staff" as StepKey,
            },
          ]),
      {
        icon: "event" as const,
        label: t("date"),
        value: selectedDate.format("dddd, MMM D, YYYY"),
        target: "time" as StepKey,
      },
      {
        icon: "schedule" as const,
        label: t("time"),
        value: selectedTimeSlot
          ? convertTo12Hour(selectedTimeSlot)
          : t("bkFlowNoTimePicked"),
        target: "time" as StepKey,
      },
    ];
    return (
      <>
        <FlowTitle
          title={t("bkFlowConfirmTitle")}
          subtitle={t("bkFlowConfirmSubtitle")}
        />
        <FlowCard style={styles.reviewCard}>
          {rows.map((row, i) =>
            reviewRow(row.icon, row.label, row.value, row.target, i === 0),
          )}
        </FlowCard>
        {renderNoteField()}
        {renderPrivacy()}
      </>
    );
  };

  const renderStep = () => {
    switch (stepKey) {
      case "services":
        return renderServices();
      case "planServices":
        return renderPlanServices();
      case "staff":
        return renderStaff();
      case "time":
        return renderTime();
      case "payment":
        return renderPayment();
      case "extras":
        return renderExtras();
      case "confirm":
        return renderConfirm();
    }
  };

  // ── Footer ──────────────────────────────────────────────────────────

  const blockedHint =
    stepKey === "services" && selectedServices.length === 0
      ? t("bkFlowServicesHint")
      : stepKey === "planServices" && selectedSubscriptionServiceIds.length === 0
        ? t("bkFlowPlanHint")
        : stepKey === "time" && !selectedTimeSlot
          ? t("bkFlowTimeHint")
          : null;

  type FooterAction = React.ComponentProps<typeof FlowFooter>["primary"];
  const footerPrimary: FooterAction = !isLastStep
    ? {
        label: t("bkFlowNext", {
          step: t(STEP_LABEL_KEYS[steps[safeIndex + 1]]),
        }),
        trailingIcon: "chevron-right",
        disabled: !!blockedHint,
        onPress: () => goTo(safeIndex + 1, 1),
      }
    : isReschedule
      ? {
          label: t("bkFlowRescheduleButton"),
          icon: "event-available",
          loading: rescheduleLoading,
          disabled: rescheduleLoading || !!blockedHint,
          onPress: () => submitReschedule(params.late_fee_accepted === "1"),
        }
      : {
          label: t("bkFlowToCheckout"),
          trailingIcon: "chevron-right",
          loading: continueLoading,
          disabled: continueLoading,
          onPress: handleContinue,
        };

  // FlowFooter pads for the home indicator; under an open keyboard that
  // padding would be a gap, so the sticky view tucks it behind the keyboard.
  const stickyOpened =
    flowFooterBottomPad(insets.bottom) - moderateHeightScale(10);

  const Entering = direction === 1 ? FadeInRight : FadeInLeft;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <FlowHeader
        title={isReschedule ? t("bkFlowRescheduleTitle") : t("bkFlowTitle")}
        step={{ current: safeIndex + 1, total: steps.length }}
        onBack={onHeaderBack}
        backDisabled={busy}
        backIcon={safeIndex === 0 ? "close" : "back"}
      />

      <KeyboardAwareScrollView
        key={stepKey}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(110)}
        extraKeyboardSpace={moderateHeightScale(8)}
      >
        <Animated.View
          style={styles.stepBody}
          entering={Entering.duration(240).reduceMotion(ReduceMotion.System)}
        >
          {renderStep()}
        </Animated.View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: stickyOpened }}>
        {showTotalBar ? (
          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>{t("bkFlowEstimatedTotal")}</Text>
            <Text style={styles.totalValue}>{formatMoney(estimatedTotal)}</Text>
          </View>
        ) : null}
        <FlowFooter primary={footerPrimary} hint={blockedHint} />
      </KeyboardStickyView>

      <Modal
        visible={showAnyoneHint}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnyoneHint(false)}
      >
        <View style={styles.anyoneHintOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowAnyoneHint(false)}
            accessibilityLabel={t("close")}
          />
          <View style={styles.anyoneHintBubble}>
            <TouchableOpacity
              style={styles.anyoneHintClose}
              onPress={() => setShowAnyoneHint(false)}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Feather
                name="x"
                size={moderateWidthScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <Text style={styles.anyoneHintText}>{t("bkFlowAnyoneHint")}</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={intervalMenu != null}
        transparent
        animationType="fade"
        onRequestClose={() => setIntervalMenu(null)}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setIntervalMenu(null)}
          accessibilityLabel={t("close")}
        />
        {intervalMenu ? (
          <View
            style={[
              styles.menu,
              {
                top: intervalMenu.top,
                right: intervalMenu.right,
              },
            ]}
            accessibilityRole="menu"
          >
            {SLOT_MINUTE_OPTIONS.map((minutes, index) => {
              const isSelected = slotMinutes === minutes;
              return (
                <TouchableOpacity
                  key={minutes}
                  activeOpacity={0.7}
                  style={[
                    styles.menuItem,
                    index > 0 && styles.menuItemBorder,
                    isSelected && styles.menuItemOn,
                  ]}
                  onPress={() => {
                    setIntervalMenu(null);
                    if (minutes === slotMinutes) return;
                    setSlotMinutes(minutes);
                    setSelectedTimeSlotState(null);
                    dispatch(setSelectedTimeSlot(null));
                    dispatch(setAssignedStaffId(null));
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[styles.menuText, isSelected && styles.menuTextOn]}
                  >
                    {t("bkFlowSlotLength", { count: minutes })}
                  </Text>
                  {isSelected ? (
                    <MaterialIcons
                      name="check"
                      size={moderateWidthScale(18)}
                      color={theme.selectCard}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </Modal>

      <OutcomeConfirmSheet
        visible={rescheduleFeeMessage != null}
        onClose={() => setRescheduleFeeMessage(null)}
        onConfirm={handleConfirmRescheduleFee}
        title={t("lateRescheduleFeeTitle")}
        question={t("lateRescheduleFeeQuestion")}
        message={rescheduleFeeMessage ?? ""}
        confirmLabel={t("acceptFeeAndReschedule")}
      />

      <AddServiceBottomSheet
        visible={addServiceModalVisible}
        onClose={handleCloseModal}
        services={allServices}
        selectedServiceIds={selectedServiceIds}
        onUpdateServices={handleUpdateSelectedServices}
      />
      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        allowsMultipleSelection
        showCameraOption={false}
        showTryOnOption
        onFromTryOnPress={() => {
          setImagePickerVisible(false);
          dispatch(setBookingTryOnPreselectedUrls(tryOnImageUrls));
          router.push({
            pathname: "/aiRequests",
            params: { returnTo: "booking" },
          });
        }}
        onImageSelected={(uri) => {
          setGalleryImageUris((prev) => [...prev, uri]);
        }}
        onImagesSelected={(uris) => {
          setGalleryImageUris((prev) => [...prev, ...uris]);
        }}
      />
    </View>
  );
}
