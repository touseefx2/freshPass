/**
 * Owner "Post a Deal" — step-by-step flow:
 *   service → staff (if team) → time → price & closing → preview → done
 *
 * Opened from the calendar slot menu (with date/time/staff prefilled)
 * or from My Deals screen.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  iconScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import AppImage from "@/src/components/AppImage";
import RetryButton from "@/src/components/retryButton";
import Logger from "@/src/services/logger";
import {
  fetchOwnerBookingStaff,
  fetchOwnerBookingServices,
  fetchOwnerFreeTimes,
  fetchOwnerBusinessHours,
  type OwnerBusinessHours,
  type OwnerBookingStaff,
  type OwnerBookingService,
} from "@/src/services/ownerBookingService";
import { createSlotOffer } from "@/src/services/slotOfferService";
import SlotOfferCard from "@/src/components/slotOffer/SlotOfferCard";
import type { SlotOffer } from "@/src/types/slotOffer";
import { resolveApiImageUrl } from "@/src/utils/media";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { isSoloSubscription } from "@/src/state/slices/userSlice";
import { formatSlotTime, slotProblem } from "@/src/utils/dealSlotCheck";
import {
  getDeviceTimeZone,
  parseSalonClock,
  salonNow,
  type SalonClock,
} from "@/src/utils/salonTimezone";

type StepKey = "service" | "staff" | "time" | "price" | "preview";

/** "13:00","14:00" → "1 – 2 PM"; "09:00","18:00" → "9 AM – 6 PM" */
function shortRange(from: string, to: string) {
  const part = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return {
      text: m ? `${h % 12 || 12}:${String(m).padStart(2, "0")}` : `${h % 12 || 12}`,
      ampm: h >= 12 ? "PM" : "AM",
    };
  };
  const a = part(from);
  const b = part(to);
  return a.ampm === b.ampm
    ? `${a.text} – ${b.text} ${b.ampm}`
    : `${a.text} ${a.ampm} – ${b.text} ${b.ampm}`;
}

function formatPrice(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
    },
    body: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    scrollContent: {
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(40),
      gap: moderateHeightScale(12),
    },
    // Service / Staff tiles
    tile: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    tileSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.mintTint,
    },
    tileImage: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    tileTextCol: { flex: 1, gap: moderateHeightScale(1) },
    tileName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tileSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    tileCheck: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    tileCheckSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    // Price step
    slotStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.mintTint,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(12),
    },
    slotStripIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    slotStripTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    slotStripSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    priceCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
    },
    priceCardError: { borderColor: theme.red },
    priceInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    priceCurrency: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    priceInput: {
      flex: 1,
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingVertical: moderateHeightScale(6),
    },
    priceDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(10),
    },
    priceFootRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    priceNormal: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    priceNormalValue: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    savePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      backgroundColor: theme.successGreen,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
    },
    savePillText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    noDiscountText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    priceErrorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      marginTop: -moderateHeightScale(4),
    },
    quickRow: {
      flexDirection: "row",
      gap: moderateWidthScale(6),
    },
    quickChip: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(2),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    quickChipSel: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    quickChipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    quickChipTextSel: { color: theme.white },
    closeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    closeCard: {
      flexBasis: "47%",
      flexGrow: 1,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(12),
      gap: moderateHeightScale(4),
    },
    closeCardSel: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    closeCardOff: { opacity: 0.4 },
    closeHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    closeTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    closeSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    closeTextSel: { color: theme.white },
    // Preview step
    detailCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(14),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    detailRowBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    detailIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.mintTint,
      alignItems: "center",
      justifyContent: "center",
    },
    detailLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    detailValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(2),
    },
    detailValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    detailStrike: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
    },
    changeBtn: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.orangeBrown015,
    },
    changeBtnText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    // "Why these times" card (time step) — compact
    timeInfoCard: {
      backgroundColor: theme.mintTint,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      gap: moderateHeightScale(6),
    },
    timeInfoHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    timeInfoTitle: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    timeInfoBody: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    timeInfoPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(2),
    },
    timeInfoPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(3),
    },
    timeInfoPillText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Time chips
    timeChipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    timeChip: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    timeChipSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    timeChipText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    timeChipTextSelected: { color: theme.white },
    // Price input
    inputHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: -moderateHeightScale(8),
    },
    // Done
    doneScroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(24),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(14),
    },
    doneHero: {
      alignItems: "center",
      gap: moderateHeightScale(6),
      marginBottom: moderateHeightScale(4),
    },
    doneHalo: {
      width: moderateWidthScale(104),
      height: moderateWidthScale(104),
      borderRadius: moderateWidthScale(52),
      backgroundColor: theme.mintTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    doneHaloInner: {
      width: moderateWidthScale(76),
      height: moderateWidthScale(76),
      borderRadius: moderateWidthScale(38),
      backgroundColor: theme.mintTintStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    doneCheck: {
      width: moderateWidthScale(54),
      height: moderateWidthScale(54),
      borderRadius: moderateWidthScale(27),
      backgroundColor: theme.successGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
    },
    liveDot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.toggleActive,
    },
    liveText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
      letterSpacing: 0.5,
    },
    doneTitle: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(6),
    },
    doneSub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size21,
      paddingHorizontal: moderateWidthScale(12),
    },
    nextCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(12),
    },
    nextRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    nextNum: {
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.mintTint,
      alignItems: "center",
      justifyContent: "center",
    },
    nextNumText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    nextText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    dateChipsWrap: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
    },
    dateChip: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      minWidth: widthScale(54),
    },
    dateChipSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    dateChipDay: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    dateChipDaySelected: { color: theme.white },
    dateChipDate: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    dateChipDateSelected: { color: theme.white },
    timeLoadingWrap: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },    slotProblemBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      backgroundColor: theme.orangeBrown015,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      marginBottom: moderateHeightScale(14),
    },
    slotProblemTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      marginBottom: moderateHeightScale(4),
    },
    slotProblemText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(19),
    },
  });

export default function PostDealScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    date?: string;
    time?: string;
    staff_id?: string;
  }>();

  const user = useAppSelector((s) => s.user);
  const businessId = Number(user.business_id);
  const businessStatus = useAppSelector(
    (state: any) => state.user.businessStatus,
  );
  const isSolo = isSoloSubscription(businessStatus);

  const [step, setStep] = useState<StepKey>("service");
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [staffList, setStaffList] = useState<OwnerBookingStaff[]>([]);
  const [serviceList, setServiceList] = useState<OwnerBookingService[]>([]);

  // Selections
  const [selectedService, setSelectedService] = useState<OwnerBookingService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OwnerBookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    params.date || dayjs().format("YYYY-MM-DD"),
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(params.time ?? null);
  const [offerPriceText, setOfferPriceText] = useState("");
  const [closesBeforeMinutes, setClosesBeforeMinutes] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [done, setDone] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Time slots
  const [freeTimes, setFreeTimes] = useState<string[]>([]);
  const [timesLoading, setTimesLoading] = useState(false);
  /** Which date|service|staff `freeTimes` belongs to (stale list ≠ ready) */
  const [timesFor, setTimesFor] = useState("");
  const [salonClock, setSalonClock] = useState<SalonClock | null>(null);
  const [hours, setHours] = useState<OwnerBusinessHours | null>(null);

  // Time tapped on the calendar: skip the time step when it's free for the
  // picked service; otherwise show the step with the reason (client 11-06).
  const presetTime = params.time ?? null;
  const [presetProblem, setPresetProblem] = useState<string | null>(null);
  /** "Change" on preview brings the time step back */
  const [forceTimeStep, setForceTimeStep] = useState(false);

  const loadInitial = useCallback(async () => {
    if (!businessId) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setLoadError(false);
    try {
      const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
        Promise.race([
          p,
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("timeout")), 10_000),
          ),
        ]);
      const [staff, services, hoursRes] = await Promise.all([
        // Solo owners still have their own staff row — slots need its id.
        withTimeout(fetchOwnerBookingStaff(businessId)),
        withTimeout(fetchOwnerBookingServices(businessId)),
        // Only explains a refused calendar time — never blocks the flow.
        withTimeout(fetchOwnerBusinessHours(businessId)).catch(() => null),
      ]);
      setHours(hoursRes);
      setStaffList(staff);
      setServiceList(services);
      const pre =
        (params.staff_id
          ? staff.find((s) => s.id === Number(params.staff_id))
          : undefined) ??
        // Solo / one barber: no choice to make, pick them.
        (isSolo || staff.length === 1
          ? staff.find((s) => s.isOwner) ?? staff[0]
          : undefined);
      if (pre) setSelectedStaff(pre);
    } catch (err) {
      Logger.error("PostDeal: load data failed", err);
      setLoadError(true);
    } finally {
      setLoadingData(false);
    }
  }, [businessId, isSolo, params.staff_id]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const timesKey = `${selectedDate}|${selectedService?.id ?? ""}|${selectedStaff?.id ?? ""}`;

  // Load free times when service + staff + date are set
  useEffect(() => {
    if (!selectedService || !selectedDate || !businessId) return;
    if (staffList.length > 0 && !selectedStaff) return;
    let active = true;
    const key = timesKey;
    setTimesLoading(true);
    fetchOwnerFreeTimes({
      businessId,
      date: selectedDate,
      staffId: selectedStaff?.id,
      serviceIds: [selectedService.id],
    })
      .then(({ times, now }) => {
        if (!active) return;
        setFreeTimes(times);
        setSalonClock(parseSalonClock(now));
        setTimesFor(key);
      })
      .catch((err) => {
        Logger.error("PostDeal: free times failed", err);
        if (!active) return;
        setFreeTimes([]);
        setTimesFor(key);
      })
      .finally(() => {
        if (active) setTimesLoading(false);
      });
    return () => { active = false; };
    // timesKey is derived from date/service/staff below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, staffList.length, selectedDate, selectedService, selectedStaff]);

  const timesReady = !timesLoading && timesFor === timesKey;

  // Hours for the day on screen (barber's own when set, else the salon's)
  const dayHours = useMemo(() => {
    if (!hours) return null;
    const key = dayjs(selectedDate).locale("en").format("dddd").toLowerCase();
    const staffRows = selectedStaff ? hours.staffHours[selectedStaff.id] : undefined;
    return staffRows?.[key] ?? hours.hours[key] ?? null;
  }, [hours, selectedDate, selectedStaff]);

  /** Small pills on the "why these times" card: staff / open / break / zone */
  const timeInfoPills = useMemo(() => {
    const pills: { icon: keyof typeof MaterialIcons.glyphMap; text: string }[] = [];
    if (selectedStaff && staffList.length > 1) {
      pills.push({ icon: "person", text: selectedStaff.name });
    }
    if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
      pills.push({
        icon: "schedule",
        text: shortRange(dayHours.open, dayHours.close),
      });
      dayHours.breaks.forEach((b) =>
        pills.push({
          icon: "free-breakfast",
          text: `${t("sdBlockBreak")} ${shortRange(b.start, b.end)}`,
        }),
      );
    }
    const zone = hours?.timezone;
    if (zone && zone !== getDeviceTimeZone()) {
      pills.push({
        icon: "public",
        text: t("sdSalonTimePill", {
          city: (zone.split("/").pop() ?? zone).replace(/_/g, " "),
        }),
      });
    }
    return pills;
  }, [selectedStaff, staffList.length, dayHours, hours, t]);

  const showTimeStep = !presetTime || !!presetProblem || forceTimeStep;

  const steps = useMemo<StepKey[]>(() => {
    const s: StepKey[] = ["service"];
    if (!isSolo && staffList.length > 1) s.push("staff");
    if (showTimeStep) s.push("time");
    s.push("price", "preview");
    return s;
  }, [isSolo, staffList.length, showTimeStep]);

  const stepIndex = steps.indexOf(step);
  const stepNumber = stepIndex + 1;
  /** Next goes straight to price on the calendar time: check it first */
  const checksPresetOnNext = !showTimeStep && steps[stepIndex + 1] === "price";

  const closesAtTime = useMemo(() => {
    if (!selectedTime || closesBeforeMinutes == null) return "";
    const [h, m] = selectedTime.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const closeMinutes = startMinutes - closesBeforeMinutes;
    if (closeMinutes < 0) return "";
    const ch = Math.floor(closeMinutes / 60);
    const cm = closeMinutes % 60;
    return `${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}`;
  }, [selectedTime, closesBeforeMinutes]);

  useEffect(() => {
    if (selectedTime && closesBeforeMinutes != null) {
      const [h, m] = selectedTime.split(":").map(Number);
      if (h * 60 + m - closesBeforeMinutes < 0) setClosesBeforeMinutes(null);
    }
  }, [selectedTime, closesBeforeMinutes]);

  const normalPrice = selectedService?.price ?? 0;
  const offerPrice = offerPriceText.trim() === "" ? normalPrice : Number(offerPriceText);
  const savings = normalPrice - (Number.isFinite(offerPrice) ? offerPrice : normalPrice);
  const percentOff =
    savings > 0 && normalPrice > 0 ? Math.round((savings / normalPrice) * 100) : 0;
  const priceError = useMemo(() => {
    if (offerPriceText.trim() === "") return null;
    const n = Number(offerPriceText);
    if (!Number.isFinite(n) || n <= 0) return t("sdPriceInvalid");
    if (n > normalPrice) return t("sdPriceTooHigh", { price: formatPrice(normalPrice) });
    return null;
  }, [offerPriceText, normalPrice, t]);

  /** "Fri, Nov 6 · 3:00 PM" (+ " · with Touseef") */
  const slotLabelNoStaff = selectedTime
    ? `${dayjs(selectedDate).format("ddd, MMM D")} · ${formatSlotTime(selectedTime)}`
    : "";
  const slotLabel =
    selectedStaff && staffList.length > 1
      ? `${slotLabelNoStaff} · ${t("sdWith")} ${selectedStaff.name}`
      : slotLabelNoStaff;

  /** "Stop taking bookings" choices; ones already past on the salon clock are off */
  const closeOptions = useMemo(() => {
    if (!selectedTime) return [];
    const now = salonNow(salonClock, hours?.timezone);
    const [h, m] = selectedTime.split(":").map(Number);
    const start = h * 60 + m;
    const build = (o: { min: number; labelKey: string }) => {
      const close = start - o.min;
      const hhmm = `${String(Math.floor(close / 60)).padStart(2, "0")}:${String(close % 60).padStart(2, "0")}`;
      const passed =
        selectedDate < now.day || (selectedDate === now.day && close <= now.minutes);
      return { ...o, timeLabel: formatSlotTime(hhmm), passed };
    };
    const options = [
      { min: 30, labelKey: "sdClose30" },
      { min: 60, labelKey: "sdClose60" },
      { min: 120, labelKey: "sdClose120" },
      { min: 180, labelKey: "sdClose180" },
    ]
      .filter((o) => start - o.min >= 0)
      .map(build);
    // Slot less than 30 min away: offer a last-minute close so the step
    // never dead-ends (the time step's own list already hides past starts).
    if (options.every((o) => o.passed) && start - 5 >= 0) {
      const last = build({ min: 5, labelKey: "sdClose5" });
      if (!last.passed) options.unshift(last);
    }
    return options;
  }, [selectedTime, selectedDate, salonClock, hours]);

  /** Every close time is already past: this slot starts too soon for a deal */
  const slotTooSoon = !!selectedTime && closeOptions.every((o) => o.passed);

  // A pick that is now in the past can't be kept
  useEffect(() => {
    if (closesBeforeMinutes == null) return;
    if (closeOptions.find((o) => o.min === closesBeforeMinutes)?.passed) {
      setClosesBeforeMinutes(null);
    }
  }, [closeOptions, closesBeforeMinutes]);

  /** Same card customers see in Last-Minute Deals */
  const previewDeal = useMemo<SlotOffer | null>(() => {
    if (!selectedService || !selectedTime) return null;
    const dealPrice = Number.isFinite(offerPrice) ? offerPrice : normalPrice;
    return {
      id: 0,
      status: "live",
      bookable: true,
      business: {
        id: businessId,
        title: hours?.profile.title || user.business_name || "",
        image_url: hours?.profile.imageUrl ?? null,
        address: null,
        city: hours?.profile.city ?? null,
        state: hours?.profile.state ?? null,
        category: null,
      },
      staff: selectedStaff ? { id: selectedStaff.id, name: selectedStaff.name } : null,
      service: { id: selectedService.id, name: selectedService.name },
      date: selectedDate,
      start_time: selectedTime,
      starts_at: `${selectedDate}T${selectedTime}:00`,
      duration_minutes: selectedService.durationMinutes,
      normal_price: normalPrice,
      offer_price: dealPrice,
      savings: Math.max(0, normalPrice - dealPrice),
      closes_at: "",
      timezone: hours?.timezone ?? "",
      cancellation_policy: null,
      views_count: null,
      appointment: null,
    };
  }, [
    selectedService,
    selectedTime,
    selectedStaff,
    selectedDate,
    offerPrice,
    normalPrice,
    businessId,
    hours,
    user.business_name,
  ]);

  // Dates: next 14 days
  const dates = useMemo(() => {
    const base = dayjs();
    return Array.from({ length: 14 }, (_, i) => base.add(i, "day"));
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case "service":
        return !!selectedService && (!checksPresetOnNext || timesReady);
      case "staff":
        return !!selectedStaff && (!checksPresetOnNext || timesReady);
      case "time":
        // Only a time that is in the list — a hidden pick can't slip through
        return !!selectedTime && timesReady && freeTimes.includes(selectedTime);
      case "price":
        return !!closesAtTime && !priceError;
      case "preview":
        return true;
      default:
        return false;
    }
  }, [
    step,
    selectedService,
    selectedStaff,
    selectedTime,
    closesAtTime,
    checksPresetOnNext,
    timesReady,
    freeTimes,
    priceError,
  ]);

  const goNext = () => {
    if (checksPresetOnNext && presetTime && params.date) {
      if (!timesReady) return;
      if (selectedDate === params.date && freeTimes.includes(presetTime)) {
        setSelectedTime(presetTime);
        setStep("price");
        return;
      }
      // Not free for this service: say why, clear the pick, show the time step.
      const reason =
        slotProblem(
          {
            date: params.date,
            time: presetTime,
            hours,
            now: salonNow(salonClock, hours?.timezone),
            staffId: selectedStaff?.id,
            staffName: selectedStaff?.name,
            serviceName: selectedService?.name,
            durationMinutes: selectedService?.durationMinutes,
          },
          t,
        ) ??
        (selectedStaff && staffList.length > 1
          ? t("sdSlotBookedStaff", { name: selectedStaff.name })
          : t("sdSlotBooked"));
      setPresetProblem(reason);
      setSelectedTime(null);
      setStep("time");
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
    else router.back();
  };

  const handlePost = async () => {
    if (!selectedService || !selectedTime || !businessId) return;
    setPosting(true);
    setPostError(null);
    try {
      const closesAtFull = `${selectedDate} ${closesAtTime}`;
      await createSlotOffer({
        service_id: selectedService.id,
        ...(selectedStaff ? { staff_id: selectedStaff.id } : {}),
        date: selectedDate,
        start_time: selectedTime,
        ...(offerPriceText.trim() !== "" && Number.isFinite(Number(offerPriceText))
          ? { offer_price: Number(offerPriceText) }
          : {}),
        closes_at: closesAtFull,
      });
      setDone(true);
    } catch (err: any) {
      // api.ts rejects with a plain Error: server reply is on err.data, not err.response.
      // Field error first — Laravel's top-level message adds "(and 1 more error)".
      const errors = err?.data?.errors ?? {};
      const firstFieldError = errors[Object.keys(errors)[0]]?.[0];
      const msg =
        firstFieldError ||
        err?.data?.message ||
        err?.message ||
        t("sdPostError");
      setPostError(msg);
      Alert.alert(t("sdError"), msg);
    } finally {
      setPosting(false);
    }
  };

  // DONE screen
  if (done) {
    const nextSteps = [
      t("sdNext1"),
      t("sdNext2"),
      closesAtTime
        ? t("sdNext3", { time: formatSlotTime(closesAtTime) })
        : null,
    ].filter(Boolean) as string[];
    return (
      <View style={styles.container}>
        <FlowHeader
          title={t("sdPostADeal")}
          onBack={resetToDashboardHome}
          backIcon="close"
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.doneScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.doneHero}>
            <View style={styles.doneHalo}>
              <View style={styles.doneHaloInner}>
                <View style={styles.doneCheck}>
                  <MaterialIcons name="check" size={iconScale(32)} color={theme.white} />
                </View>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("sdLiveNow")}</Text>
            </View>
            <Text style={styles.doneTitle}>{t("sdDealPosted")}</Text>
            <Text style={styles.doneSub}>{t("sdDealPostedSub")}</Text>
          </View>

          {previewDeal ? (
            <View pointerEvents="none" accessibilityElementsHidden>
              <SlotOfferCard deal={previewDeal} />
            </View>
          ) : null}

          <SectionLabel label={t("sdWhatsNext")} style={{ marginTop: moderateHeightScale(4) }} />
          <View style={styles.nextCard}>
            {nextSteps.map((text, i) => (
              <View key={i} style={styles.nextRow}>
                <View style={styles.nextNum}>
                  <Text style={styles.nextNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.nextText}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <FlowFooter
          row
          secondary={{ label: t("goToHome"), onPress: resetToDashboardHome, icon: "home" }}
          primary={{
            label: t("sdViewMyDeals"),
            onPress: () => router.replace("/(main)/myDeals" as any),
            trailingIcon: "arrow-forward",
          }}
        />
      </View>
    );
  }

  if (loadingData) {
    return (
      <View style={styles.container}>
        <FlowHeader title={t("sdPostADeal")} onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <FlowHeader title={t("sdPostADeal")} onBack={() => router.back()} />
        <View style={styles.center}>
          <RetryButton onPress={loadInitial} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlowHeader
        title={t("sdPostADeal")}
        step={{ current: stepNumber, total: steps.length }}
        onBack={goBack}
        backDisabled={posting}
        backIcon={stepIndex === 0 ? "close" : "back"}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* SERVICE STEP */}
          {step === "service" && (
            <>
              <FlowTitle title={t("sdChooseService")} subtitle={t("sdServiceStepSub")} />
              {serviceList.map((svc) => {
                const sel = selectedService?.id === svc.id;
                return (
                  <TouchableOpacity
                    key={svc.id}
                    style={[styles.tile, sel && styles.tileSelected]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedService(svc)}
                  >
                    <View style={styles.tileTextCol}>
                      <Text style={styles.tileName}>{svc.name}</Text>
                      <Text style={styles.tileSub}>
                        {formatPrice(svc.price)} · {svc.durationMinutes} {t("sdMin")}
                      </Text>
                    </View>
                    <View
                      style={[styles.tileCheck, sel && styles.tileCheckSelected]}
                    >
                      {sel && (
                        <MaterialIcons
                          name="check"
                          size={iconScale(14)}
                          color={theme.white}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* STAFF STEP */}
          {step === "staff" && (
            <>
              <FlowTitle title={t("sdChooseStaff")} subtitle={t("sdStaffStepSub")} />
              {staffList.map((staff) => {
                const sel = selectedStaff?.id === staff.id;
                const img = resolveApiImageUrl(staff.image);
                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={[styles.tile, sel && styles.tileSelected]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedStaff(staff)}
                  >
                    <View style={styles.tileImage}>
                      {img ? (
                        <AppImage
                          uri={img}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <MaterialIcons
                          name="person"
                          size={iconScale(20)}
                          color={theme.lightGreen2}
                        />
                      )}
                    </View>
                    <View style={styles.tileTextCol}>
                      <Text style={styles.tileName}>{staff.name}</Text>
                      {staff.experience && (
                        <Text style={styles.tileSub}>{staff.experience}</Text>
                      )}
                    </View>
                    <View
                      style={[styles.tileCheck, sel && styles.tileCheckSelected]}
                    >
                      {sel && (
                        <MaterialIcons
                          name="check"
                          size={iconScale(14)}
                          color={theme.white}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* TIME STEP */}
          {step === "time" && (
            <>
              <FlowTitle title={t("sdPickTime")} subtitle={t("sdTimeStepSub")} />
              {presetProblem && presetTime && selectedDate === params.date && !selectedTime ? (
                <View style={styles.slotProblemBox}>
                  <MaterialIcons
                    name="event-busy"
                    size={iconScale(20)}
                    color={theme.selectCard}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotProblemTitle}>
                      {t("sdSlotNotFreeTitle", {
                        time: formatSlotTime(presetTime),
                        service: selectedService?.name ?? "",
                      })}
                    </Text>
                    <Text style={styles.slotProblemText}>
                      {presetProblem} {t("sdSlotPickAnother")}
                    </Text>
                  </View>
                </View>
              ) : selectedService ? (
                <View style={styles.timeInfoCard}>
                  <View style={styles.timeInfoHead}>
                    <MaterialIcons
                      name="event-available"
                      size={iconScale(18)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.timeInfoTitle} numberOfLines={1}>
                      {t("sdFreeTimesTitle", {
                        service: selectedService.name,
                        mins: selectedService.durationMinutes,
                      })}
                    </Text>
                  </View>
                  <Text style={styles.timeInfoBody}>
                    {t("sdFreeTimesBody", { mins: selectedService.durationMinutes })}
                  </Text>
                  {timeInfoPills.length > 0 && (
                    <View style={styles.timeInfoPills}>
                      {timeInfoPills.map((pill) => (
                        <View key={`${pill.icon}-${pill.text}`} style={styles.timeInfoPill}>
                          <MaterialIcons
                            name={pill.icon}
                            size={iconScale(13)}
                            color={theme.buttonBack}
                          />
                          <Text style={styles.timeInfoPillText}>{pill.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateChipsWrap}
              >
                {dates.map((d) => {
                  const ds = d.format("YYYY-MM-DD");
                  const sel = ds === selectedDate;
                  return (
                    <TouchableOpacity
                      key={ds}
                      style={[styles.dateChip, sel && styles.dateChipSelected]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setSelectedDate(ds);
                        setSelectedTime(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dateChipDay,
                          sel && styles.dateChipDaySelected,
                        ]}
                      >
                        {d.format("ddd")}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipDate,
                          sel && styles.dateChipDateSelected,
                        ]}
                      >
                        {d.format("D")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {timesLoading ? (
                <View style={styles.timeLoadingWrap}>
                  <ActivityIndicator color={theme.darkGreen} />
                </View>
              ) : freeTimes.length === 0 ? (
                <InfoNote
                  tone="warm"
                  icon="event-busy"
                  text={
                    dayHours && (dayHours.closed || !dayHours.open)
                      ? t("sdClosedThisDay", { day: dayjs(selectedDate).format("dddd") })
                      : t("sdNoFreeSlots")
                  }
                />
              ) : (
                <>
                <SectionLabel
                  label={t("sdFreeTimesLabel")}
                  meta={t("sdFreeTimesCount", { count: freeTimes.length })}
                />
                <View style={styles.timeChipsWrap}>
                  {freeTimes.map((time) => {
                    const sel = selectedTime === time;
                    const hour = Number(time.split(":")[0]);
                    const min = time.split(":")[1];
                    const ampm = hour >= 12 ? "PM" : "AM";
                    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const label = `${h12}:${min} ${ampm}`;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeChip,
                          sel && styles.timeChipSelected,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setSelectedTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            sel && styles.timeChipTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                </>
              )}
            </>
          )}

          {/* PRICE STEP */}
          {step === "price" && selectedService && (
            <>
              <FlowTitle title={t("sdSetDealPrice")} subtitle={t("sdPriceStepSub")} />

              {/* The slot this deal fills */}
              <View style={styles.slotStrip}>
                <View style={styles.slotStripIcon}>
                  <MaterialIcons name="event" size={iconScale(20)} color={theme.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotStripTitle} numberOfLines={1}>
                    {`${selectedService.name} · ${selectedService.durationMinutes} ${t("sdMin")}`}
                  </Text>
                  <Text style={styles.slotStripSub} numberOfLines={1}>
                    {slotLabel}
                  </Text>
                </View>
              </View>

              <SectionLabel label={t("sdDealPrice")} meta={t("optional")} />
              <View style={[styles.priceCard, !!priceError && styles.priceCardError]}>
                <View style={styles.priceInputRow}>
                  <Text style={styles.priceCurrency}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={offerPriceText}
                    onChangeText={(v) => setOfferPriceText(v.replace(/[^0-9.]/g, ""))}
                    placeholder={String(normalPrice)}
                    placeholderTextColor={theme.lightGreen2}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t("sdDealPrice")}
                  />
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceFootRow}>
                  <Text style={styles.priceNormal}>
                    {t("sdNormalPrice")}{" "}
                    <Text style={styles.priceNormalValue}>{formatPrice(normalPrice)}</Text>
                  </Text>
                  {savings > 0 && !priceError ? (
                    <View style={styles.savePill}>
                      <MaterialIcons name="local-offer" size={iconScale(13)} color={theme.white} />
                      <Text style={styles.savePillText}>
                        {t("sdSavePill", { amount: formatPrice(savings), percent: percentOff })}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noDiscountText}>{t("sdNoDiscount")}</Text>
                  )}
                </View>
              </View>
              {priceError ? <Text style={styles.priceErrorText}>{priceError}</Text> : null}

              <View style={styles.quickRow}>
                {[10, 20, 30, 50].map((pct) => {
                  const price = Math.round(normalPrice * (100 - pct)) / 100;
                  const sel = offerPriceText.trim() !== "" && Number(offerPriceText) === price;
                  return (
                    <TouchableOpacity
                      key={pct}
                      style={[styles.quickChip, sel && styles.quickChipSel]}
                      activeOpacity={0.75}
                      onPress={() => setOfferPriceText(String(price))}
                    >
                      <Text
                        style={[styles.quickChipText, sel && styles.quickChipTextSel]}
                        numberOfLines={1}
                      >
                        {t("sdPercentOffShort", { percent: pct })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.quickChip, offerPriceText.trim() === "" && styles.quickChipSel]}
                  activeOpacity={0.75}
                  onPress={() => setOfferPriceText("")}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      offerPriceText.trim() === "" && styles.quickChipTextSel,
                    ]}
                  >
                    {t("sdFullPrice")}
                  </Text>
                </TouchableOpacity>
              </View>

              <SectionLabel label={t("sdStopBookingsLabel")} style={{ marginTop: moderateHeightScale(10) }} />
              <Text style={styles.inputHint}>{t("sdStopBookingsHint")}</Text>
              {slotTooSoon ? (
                <View style={{ gap: moderateHeightScale(10) }}>
                  <InfoNote
                    tone="warm"
                    icon="schedule"
                    title={t("sdTooSoonTitle")}
                    text={t("sdTooSoonText")}
                  />
                  <TouchableOpacity
                    style={[styles.changeBtn, { alignSelf: "flex-start" }]}
                    activeOpacity={0.75}
                    onPress={() => {
                      setForceTimeStep(true);
                      setSelectedTime(null);
                      setStep("time");
                    }}
                  >
                    <Text style={styles.changeBtnText}>{t("sdPickLaterTime")}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
              <View style={styles.closeGrid}>
                {closeOptions.map((opt) => {
                  const sel = closesBeforeMinutes === opt.min;
                  return (
                    <TouchableOpacity
                      key={opt.min}
                      style={[
                        styles.closeCard,
                        sel && styles.closeCardSel,
                        opt.passed && styles.closeCardOff,
                      ]}
                      activeOpacity={0.75}
                      disabled={opt.passed}
                      onPress={() => setClosesBeforeMinutes(opt.min)}
                    >
                      <View style={styles.closeHead}>
                        <MaterialIcons
                          name="timer"
                          size={iconScale(16)}
                          color={sel ? theme.white : theme.selectCard}
                        />
                        <Text style={[styles.closeTitle, sel && styles.closeTextSel]}>
                          {t(opt.labelKey)}
                        </Text>
                      </View>
                      <Text style={[styles.closeSub, sel && styles.closeTextSel]}>
                        {opt.passed ? t("sdClosePassed") : t("sdCloseAt", { time: opt.timeLabel })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              )}
            </>
          )}

          {/* PREVIEW STEP */}
          {step === "preview" && selectedService && (
            <>
              <FlowTitle title={t("sdReviewDeal")} subtitle={t("sdPreviewStepSub")} />

              <SectionLabel label={t("sdHowCustomersSee")} />
              {previewDeal ? (
                <View pointerEvents="none" accessibilityElementsHidden>
                  <SlotOfferCard deal={previewDeal} />
                </View>
              ) : null}

              <SectionLabel label={t("sdDealDetailsLabel")} style={{ marginTop: moderateHeightScale(6) }} />
              <View style={styles.detailCard}>
                {[
                  {
                    icon: "content-cut" as const,
                    label: t("sdService"),
                    value: `${selectedService.name} · ${selectedService.durationMinutes} ${t("sdMin")}`,
                  },
                  ...(selectedStaff
                    ? [{ icon: "person" as const, label: t("sdStaff"), value: selectedStaff.name }]
                    : []),
                  {
                    icon: "event" as const,
                    label: t("sdWhen"),
                    value: slotLabelNoStaff,
                    change: true,
                  },
                  {
                    icon: "sell" as const,
                    label: t("sdDealPrice"),
                    value: formatPrice(Number.isFinite(offerPrice) ? offerPrice : normalPrice),
                    strike: savings > 0 ? formatPrice(normalPrice) : null,
                  },
                  {
                    icon: "timer" as const,
                    label: t("sdBookingCloses"),
                    value: closesAtTime
                      ? `${dayjs(selectedDate).format("ddd, MMM D")} · ${formatSlotTime(closesAtTime)}`
                      : "",
                  },
                ].map((row, i) => (
                  <View key={row.label} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                    <View style={styles.detailIcon}>
                      <MaterialIcons name={row.icon} size={iconScale(18)} color={theme.buttonBack} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <View style={styles.detailValueRow}>
                        <Text style={styles.detailValue}>{row.value}</Text>
                        {"strike" in row && row.strike ? (
                          <Text style={styles.detailStrike}>{row.strike}</Text>
                        ) : null}
                      </View>
                    </View>
                    {"change" in row && row.change ? (
                      <TouchableOpacity
                        onPress={() => {
                          setForceTimeStep(true);
                          setStep("time");
                        }}
                        activeOpacity={0.75}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.changeBtn}
                      >
                        <Text style={styles.changeBtnText}>{t("change")}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>

              <InfoNote icon="info-outline" text={t("sdPreviewNote")} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <FlowFooter
        row
        secondary={{ label: t("sdBack"), onPress: goBack, disabled: posting }}
        primary={{
          label: step === "preview" ? t("sdPostDeal") : t("sdNext"),
          onPress: step === "preview" ? handlePost : goNext,
          disabled: !canNext || posting,
          loading: posting || (checksPresetOnNext && !!selectedService && !timesReady),
          trailingIcon: step === "preview" ? undefined : "arrow-forward",
          icon: step === "preview" ? "local-offer" : undefined,
        }}
      />
    </View>
  );
}
