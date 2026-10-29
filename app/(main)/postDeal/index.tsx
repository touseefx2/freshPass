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
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import RetryButton from "@/src/components/retryButton";
import Logger from "@/src/services/logger";
import {
  fetchOwnerBookingStaff,
  fetchOwnerBookingServices,
  fetchOwnerFreeTimes,
  type OwnerBookingStaff,
  type OwnerBookingService,
} from "@/src/services/ownerBookingService";
import { createSlotOffer } from "@/src/services/slotOfferService";
import { resolveApiImageUrl } from "@/src/utils/media";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { isSoloSubscription } from "@/src/state/slices/userSlice";

type StepKey = "service" | "staff" | "time" | "price" | "preview";

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
      paddingBottom: moderateHeightScale(120),
      gap: moderateHeightScale(12),
    },
    stepLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(4),
    },
    stepTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    // Service / Staff tiles
    tile: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    tileSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen05,
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
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tileSub: {
      fontSize: fontSize.size12,
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
    inputLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    inputHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(12),
    },
    input: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(9),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    chipSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextSelected: { color: theme.white },
    closesPreview: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(8),
    },
    // Preview card
    previewCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    previewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    previewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    previewValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    savingsBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.tileMint,
    },
    savingsText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
    },
    divider: { height: 1, backgroundColor: theme.lightGreen07 },
    // Footer
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(34),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen07,
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    backBtn: {
      flex: 1,
      borderRadius: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(15),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.darkGreen,
    },
    backBtnText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    nextBtn: {
      flex: 2,
      borderRadius: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(15),
      alignItems: "center",
      backgroundColor: theme.darkGreen,
    },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    // Done
    doneIcon: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(8),
    },
    doneTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    doneSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
      lineHeight: fontSize.size20,
    },
    doneBtn: {
      marginTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(32),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    doneBtnText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
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
    },
    emptyTimeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
      marginTop: moderateHeightScale(8),
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
      const [staff, services] = await Promise.all([
        isSolo ? Promise.resolve([]) : withTimeout(fetchOwnerBookingStaff(businessId)),
        withTimeout(fetchOwnerBookingServices(businessId)),
      ]);
      setStaffList(staff);
      setServiceList(services);
      if (params.staff_id) {
        const pre = staff.find((s) => s.id === Number(params.staff_id));
        if (pre) setSelectedStaff(pre);
      }
    } catch (err) {
      Logger.error("PostDeal: load data failed", err);
      setLoadError(true);
    } finally {
      setLoadingData(false);
    }
  }, [businessId, isSolo, params.staff_id]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Load free times when service + staff + date are set
  useEffect(() => {
    if (!selectedService || !selectedDate || !businessId) return;
    if (staffList.length > 0 && !selectedStaff) return;
    let active = true;
    setTimesLoading(true);
    fetchOwnerFreeTimes({
      businessId,
      date: selectedDate,
      staffId: selectedStaff?.id ?? 0,
      serviceIds: [selectedService.id],
    })
      .then(({ times }) => {
        if (active) setFreeTimes(times);
      })
      .catch((err) => {
        Logger.error("PostDeal: free times failed", err);
        if (active) setFreeTimes([]);
      })
      .finally(() => {
        if (active) setTimesLoading(false);
      });
    return () => { active = false; };
  }, [businessId, staffList.length, selectedDate, selectedService, selectedStaff]);

  const steps = useMemo<StepKey[]>(() => {
    const s: StepKey[] = ["service"];
    if (!isSolo && staffList.length > 0) s.push("staff");
    s.push("time", "price", "preview");
    return s;
  }, [isSolo, staffList.length]);

  const stepIndex = steps.indexOf(step);
  const stepNumber = stepIndex + 1;

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

  // Dates: next 14 days
  const dates = useMemo(() => {
    const base = dayjs();
    return Array.from({ length: 14 }, (_, i) => base.add(i, "day"));
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case "service":
        return !!selectedService;
      case "staff":
        return !!selectedStaff;
      case "time":
        return !!selectedTime;
      case "price": {
        if (!closesAtTime) return false;
        if (offerPriceText.trim() !== "" && !Number.isFinite(Number(offerPriceText))) return false;
        return true;
      }
      case "preview":
        return true;
      default:
        return false;
    }
  }, [step, selectedService, selectedStaff, selectedTime, closesAtTime, offerPriceText]);

  const goNext = () => {
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
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[Object.keys(err?.response?.data?.errors ?? {})[0]]?.[0] ||
        t("sdPostError");
      setPostError(msg);
      Alert.alert(t("sdError"), msg);
    } finally {
      setPosting(false);
    }
  };

  // DONE screen
  if (done) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("sdPostADeal")} />
        <View style={styles.center}>
          <View style={styles.doneIcon}>
            <MaterialIcons
              name="check"
              size={iconScale(36)}
              color={theme.successGreen}
            />
          </View>
          <Text style={styles.doneTitle}>{t("sdDealPosted")}</Text>
          <Text style={styles.doneSub}>{t("sdDealPostedSub")}</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.75}
            onPress={resetToDashboardHome}
          >
            <MaterialIcons
              name="home"
              size={iconScale(20)}
              color={theme.white}
            />
            <Text style={styles.doneBtnText}>{t("goToHome")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loadingData) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("sdPostADeal")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("sdPostADeal")} />
        <View style={styles.center}>
          <RetryButton onPress={loadInitial} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StackHeader title={t("sdPostADeal")} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepLabel}>
            {t("sdStep")} {stepNumber} {t("sdOf")} {steps.length}
          </Text>

          {/* SERVICE STEP */}
          {step === "service" && (
            <>
              <Text style={styles.stepTitle}>{t("sdChooseService")}</Text>
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
              <Text style={styles.stepTitle}>{t("sdChooseStaff")}</Text>
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
              <Text style={styles.stepTitle}>{t("sdPickTime")}</Text>
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
                <Text style={styles.emptyTimeText}>
                  {t("sdNoFreeSlots")}
                </Text>
              ) : (
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
              )}
            </>
          )}

          {/* PRICE STEP */}
          {step === "price" && (
            <>
              <Text style={styles.stepTitle}>{t("sdSetDealPrice")}</Text>

              <Text style={styles.inputLabel}>{t("sdDealPrice")}</Text>
              <Text style={styles.inputHint}>
                {t("sdNormalPrice")}: {formatPrice(normalPrice)}.{" "}
                {t("sdLeaveEmptyForNormal")}
              </Text>
              <TextInput
                style={styles.input}
                value={offerPriceText}
                onChangeText={setOfferPriceText}
                placeholder="0.00"
                placeholderTextColor={theme.lightGreen2}
                keyboardType="numeric"
                accessibilityLabel={t("sdDealPrice")}
              />

              <Text style={styles.inputLabel}>{t("sdClosesAt")}</Text>
              <Text style={styles.inputHint}>
                {t("sdClosesAtHint")}
              </Text>
              <View style={styles.chipsRow}>
                {[
                  { min: 30, label: "30 min before" },
                  { min: 60, label: "1 hr before" },
                  { min: 120, label: "2 hrs before" },
                  { min: 180, label: "3 hrs before" },
                ].map((opt) => {
                  const [h, m] = (selectedTime ?? "00:00").split(":").map(Number);
                  const valid = h * 60 + m - opt.min >= 0;
                  if (!valid) return null;
                  const selected = closesBeforeMinutes === opt.min;
                  return (
                    <TouchableOpacity
                      key={opt.min}
                      style={[styles.chip, selected && styles.chipSelected]}
                      activeOpacity={0.75}
                      onPress={() => setClosesBeforeMinutes(opt.min)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {closesAtTime ? (
                <Text style={styles.closesPreview}>
                  {t("sdBookingCloses")} {closesAtTime} on {selectedDate}
                </Text>
              ) : null}
            </>
          )}

          {/* PREVIEW STEP */}
          {step === "preview" && (
            <>
              <Text style={styles.stepTitle}>{t("sdReviewDeal")}</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t("sdService")}</Text>
                  <Text style={styles.previewValue}>
                    {selectedService?.name}
                  </Text>
                </View>
                {selectedStaff && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>{t("sdStaff")}</Text>
                      <Text style={styles.previewValue}>
                        {selectedStaff.name}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.divider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t("sdDate")}</Text>
                  <Text style={styles.previewValue}>
                    {dayjs(selectedDate).format("ddd, MMM D")}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t("sdTime")}</Text>
                  <Text style={styles.previewValue}>{selectedTime}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t("sdNormalPrice")}</Text>
                  <Text style={styles.previewValue}>
                    {formatPrice(normalPrice)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t("sdDealPrice")}</Text>
                  <Text style={[styles.previewValue, { color: theme.successGreen }]}>
                    {formatPrice(Number.isFinite(offerPrice) ? offerPrice : normalPrice)}
                  </Text>
                </View>
                {savings > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.savingsBadge}>
                      <MaterialIcons
                        name="local-offer"
                        size={iconScale(14)}
                        color={theme.successGreen}
                      />
                      <Text style={styles.savingsText}>
                        {t("sdCustomerSaves")} {formatPrice(savings)}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.divider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t("sdBookingCloses")}</Text>
                  <Text style={styles.previewValue}>
                    {selectedDate} {closesAtTime}
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.75}
          onPress={goBack}
        >
          <Text style={styles.backBtnText}>{t("sdBack")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
          activeOpacity={0.75}
          disabled={!canNext || posting}
          onPress={step === "preview" ? handlePost : goNext}
        >
          {posting ? (
            <ActivityIndicator color={theme.white} />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === "preview" ? t("sdPostDeal") : t("sdNext")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
