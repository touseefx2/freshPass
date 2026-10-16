import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import dayjs from "dayjs";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import {
  MoneyRow,
  PersonRow,
  RowDivider,
  SuccessHero,
  formatVisitMoney,
} from "@/src/components/afterVisit/afterVisitParts";
import {
  DateStrip,
  PickerField,
  SelectRow,
  TimeChips,
} from "@/src/components/ownerBooking/ownerBookingParts";
import TimePickerModal from "@/src/components/timePickerModal";
import {
  CUSTOMER_SEARCH_PAGE_SIZE,
  OwnerBookingError,
  createOwnerBooking,
  fetchOwnerBookingServices,
  fetchOwnerBookingStaff,
  fetchOwnerFreeTimes,
  searchOwnerCustomers,
  type NewCustomerInput,
  type OwnerBookingCustomer,
  type OwnerBookingResult,
  type OwnerBookingService,
  type OwnerBookingStaff,
} from "@/src/services/ownerBookingService";

/**
 * Owner "New appointment", one step at a time:
 * customer (search or new) → services → barber, date & time → review →
 * booked. One-time service, paid at the shop (POST /api/appointments).
 * Opened from a calendar slot with the date, time and barber filled in.
 */
type Step = "customer" | "services" | "time" | "review" | "done";
const STEPS: Step[] = ["customer", "services", "time", "review"];

const SEARCH_DEBOUNCE_MS = 300;
const PHONE_MAX = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "14:30" → "2:30 PM" */
function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function isValidTime(value?: string | null): value is string {
  return !!value && /^\d{1,2}:\d{2}$/.test(value);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(16),
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(18),
    },
    list: { gap: moderateHeightScale(10) },
    card: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(10),
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(16),
    },
    muted: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    reviewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    reviewValue: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewSub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    actions: { gap: moderateHeightScale(12) },
  });

export default function AddAppointmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const businessId = useAppSelector((state) => state.user.business_id);
  const params = useLocalSearchParams<{
    /** YYYY-MM-DD from the tapped slot */
    date?: string;
    /** HH:mm (24h) from the tapped slot */
    time?: string;
    /** Barber the calendar was filtered to */
    staff_id?: string;
  }>();

  const [step, setStep] = useState<Step>("customer");
  const stepIndex = STEPS.indexOf(step);

  // ── Form data ──────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<OwnerBookingStaff[]>([]);
  const [services, setServices] = useState<OwnerBookingService[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ── Customer ───────────────────────────────────────────────────────────
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [customer, setCustomer] = useState<OwnerBookingCustomer | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerInput>({
    name: "",
    phone: "",
    email: "",
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState<
    Partial<Record<keyof NewCustomerInput, string>>
  >({});
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnerBookingCustomer[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searching, setSearching] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequest = useRef(0);

  // ── Services, barber, time ─────────────────────────────────────────────
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const paramStaffId = Number(params.staff_id);
  const [staffId, setStaffId] = useState<number | null>(
    Number.isFinite(paramStaffId) && paramStaffId > 0 ? paramStaffId : null,
  );
  const [date, setDate] = useState(() => {
    const d =
      params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
        ? dayjs(params.date)
        : null;
    return d?.isValid() ? d : dayjs();
  });
  const [time, setTime] = useState<string>(
    isValidTime(params.time) ? params.time.padStart(5, "0") : "09:00",
  );
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [freeTimes, setFreeTimes] = useState<string[] | null>(null);
  const [freeLoading, setFreeLoading] = useState(false);
  const [freeError, setFreeError] = useState<string | null>(null);
  const [freeTimesKey, setFreeTimesKey] = useState(0);
  const freeRequest = useRef(0);
  const [timeError, setTimeError] = useState<string | null>(null);

  // ── Review / submit ────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<OwnerBookingResult | null>(null);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/dashboard/(calendar)" as any);
  }, [router]);

  const loadFormData = useCallback(async () => {
    if (!businessId) {
      setDataError(t("oaNoBusiness"));
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    setDataError(null);
    try {
      const [staffList, serviceList] = await Promise.all([
        fetchOwnerBookingStaff(businessId),
        fetchOwnerBookingServices(businessId),
      ]);
      setStaff(staffList);
      setServices(serviceList);
      // Keep the calendar's barber when bookable; one barber needs no choice.
      setStaffId((current) =>
        current != null && staffList.some((s) => s.id === current)
          ? current
          : staffList.length === 1
            ? staffList[0].id
            : null,
      );
    } catch (error) {
      setDataError((error as Error)?.message || t("oaLoadError"));
    } finally {
      setDataLoading(false);
    }
  }, [businessId, t]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  // Customer search runs on the server as the owner types.
  const runSearch = useCallback(async (text: string, nextPage: number) => {
    const requestId = ++searchRequest.current;
    if (nextPage === 1) setSearching(true);
    else setLoadingMore(true);
    setSearchError(null);
    try {
      const response = await searchOwnerCustomers(text, nextPage);
      if (requestId !== searchRequest.current) return;
      setResults((prev) =>
        nextPage === 1 ? response.customers : [...prev, ...response.customers],
      );
      setPage(nextPage);
      setLastPage(response.lastPage);
    } catch (error) {
      if (requestId !== searchRequest.current) return;
      setSearchError((error as Error)?.message || t("oaSearchError"));
    } finally {
      if (requestId === searchRequest.current) {
        setSearching(false);
        setLoadingMore(false);
      }
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(query, 1), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const selectedServices = useMemo(
    () => services.filter((s) => serviceIds.includes(s.id)),
    [services, serviceIds],
  );
  const totalMinutes = selectedServices.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedStaff = staff.find((s) => s.id === staffId) ?? null;
  const dateStr = date.format("YYYY-MM-DD");
  const endTime = totalMinutes > 0 ? addMinutes(time, totalMinutes) : null;
  const timeLabel = endTime
    ? `${to12h(time)} – ${to12h(endTime)}`
    : to12h(time);

  // Free times for the chosen barber, day and services.
  useEffect(() => {
    if (step !== "time" || !businessId || staffId == null || !serviceIds.length) {
      return;
    }
    const requestId = ++freeRequest.current;
    setFreeLoading(true);
    setFreeError(null);
    fetchOwnerFreeTimes({
      businessId,
      date: dateStr,
      staffId,
      serviceIds,
    })
      .then((times) => {
        if (requestId === freeRequest.current) setFreeTimes(times);
      })
      .catch((error) => {
        if (requestId !== freeRequest.current) return;
        setFreeTimes(null);
        setFreeError((error as Error)?.message || t("oaFreeTimesError"));
      })
      .finally(() => {
        if (requestId === freeRequest.current) setFreeLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, businessId, staffId, dateStr, serviceIds.join(","), freeTimesKey]);

  // ── Validation ─────────────────────────────────────────────────────────
  const validateNewCustomer = (): boolean => {
    const errors: Partial<Record<keyof NewCustomerInput, string>> = {};
    if (!newCustomer.name.trim()) errors.name = t("oaNameRequired");
    if (!newCustomer.phone.trim()) errors.phone = t("oaPhoneRequired");
    else if (newCustomer.phone.trim().length > PHONE_MAX) {
      errors.phone = t("oaPhoneTooLong", { count: PHONE_MAX });
    }
    if (newCustomer.email.trim() && !EMAIL_RE.test(newCustomer.email.trim())) {
      errors.email = t("oaEmailInvalid");
    }
    setNewCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isPastSlot = useMemo(() => {
    if (date.isBefore(dayjs(), "day")) return true;
    if (!date.isSame(dayjs(), "day")) return false;
    const [h, m] = time.split(":").map(Number);
    return date.hour(h).minute(m).isBefore(dayjs());
  }, [date, time]);

  const timeNotFree =
    !freeLoading &&
    !!freeTimes &&
    freeTimes.length > 0 &&
    !freeTimes.includes(time);

  // ── Navigation ─────────────────────────────────────────────────────────
  const goTo = (next: Step) => {
    setSubmitError(null);
    setStep(next);
  };

  const onNext = () => {
    if (step === "customer") {
      setCustomerError(null);
      if (customerMode === "new") {
        if (!validateNewCustomer()) return;
      } else if (!customer) {
        setCustomerError(t("oaPickCustomer"));
        return;
      }
      goTo("services");
    } else if (step === "services") {
      if (!serviceIds.length) {
        setServiceError(t("oaPickService"));
        return;
      }
      setServiceError(null);
      goTo("time");
    } else if (step === "time") {
      if (staffId == null) {
        setTimeError(t("oaPickBarber"));
        return;
      }
      if (isPastSlot) {
        setTimeError(t("oaPastTime"));
        return;
      }
      setTimeError(null);
      goTo("review");
    }
  };

  const previousStep = (): Step | null => {
    if (step === "done" || stepIndex <= 0) return null;
    return STEPS[stepIndex - 1];
  };

  usePreventRemove(busy || previousStep() !== null, ({ data: event }) => {
    const type = event.action.type;
    if (type !== "GO_BACK" && type !== "POP") {
      navigation.dispatch(event.action);
      return;
    }
    if (busyRef.current) return;
    const prev = previousStep();
    if (prev) goTo(prev);
  });

  const onHeaderBack = () => {
    if (busyRef.current) return;
    const prev = previousStep();
    if (prev) {
      goTo(prev);
      return;
    }
    leave();
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const confirm = async () => {
    if (busyRef.current || !businessId || staffId == null) return;
    busyRef.current = true;
    setBusy(true);
    setSubmitError(null);
    try {
      const booked = await createOwnerBooking({
        businessId,
        serviceIds,
        staffId,
        date: dateStr,
        time,
        notes,
        ...(customerMode === "new"
          ? { newCustomer }
          : { userId: customer!.id }),
      });
      setResult(booked);
      setStep("done");
    } catch (error) {
      const err =
        error instanceof OwnerBookingError
          ? error
          : new OwnerBookingError((error as Error)?.message || t("oaBookError"), {});
      // Send the owner back to the step that needs fixing; the form stays filled.
      if (err.has("appointment_time") || err.has("appointment_date") || err.has("staff_id")) {
        setTimeError(
          err.first("appointment_time") ||
            err.first("appointment_date") ||
            err.first("staff_id") ||
            err.message,
        );
        setFreeTimesKey((key) => key + 1);
        setStep("time");
      } else if (err.has("new_customer")) {
        setNewCustomerErrors({
          name: err.first("new_customer.name") ?? undefined,
          phone: err.first("new_customer.phone") ?? undefined,
          email: err.first("new_customer.email") ?? undefined,
        });
        if (
          !err.first("new_customer.name") &&
          !err.first("new_customer.phone") &&
          !err.first("new_customer.email")
        ) {
          setCustomerError(err.message);
        }
        setCustomerMode("new");
        setStep("customer");
      } else if (err.has("user_id")) {
        setCustomerError(err.first("user_id") || err.message);
        setStep("customer");
      } else if (err.has("service_ids")) {
        setServiceError(err.first("service_ids") || err.message);
        setStep("services");
      } else {
        setSubmitError(err.message);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // ── Pieces ─────────────────────────────────────────────────────────────
  const guestTag = (c: { hasAppAccount?: boolean; email: string | null }) =>
    c.hasAppAccount === false
      ? c.email?.trim()
        ? t("oaNoAppEmailOnly")
        : t("oaNoApp")
      : null;

  const customerName =
    customerMode === "new"
      ? newCustomer.name.trim()
      : customer?.name?.trim() || t("aoCustomer");
  const customerContact =
    customerMode === "new"
      ? [newCustomer.phone.trim(), newCustomer.email.trim()]
          .filter(Boolean)
          .join(" · ")
      : [customer?.phone, customer?.email].filter(Boolean).join(" · ");

  /** Who hears about the booking, before confirming. */
  const notifyPreview = (): string => {
    if (customerMode === "new") {
      return newCustomer.email.trim()
        ? t("oaNotifyNewWithEmail")
        : t("oaNotifyNone", { name: customerName });
    }
    if (customer?.hasAppAccount === false) {
      return customer.email?.trim()
        ? t("oaNotifyEmail", { name: customerName })
        : t("oaNotifyNone", { name: customerName });
    }
    return t("oaNotifyApp", { name: customerName });
  };

  // ── Steps ──────────────────────────────────────────────────────────────
  const renderCustomer = () => (
    <>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={moderateHeightScale(24)}
      >
        <FlowTitle
          title={t("oaCustomerTitle")}
          subtitle={
            customerMode === "new"
              ? t("oaNewCustomerSubtitle")
              : t("oaCustomerSubtitle")
          }
        />
        {customerMode === "new" ? (
          <>
            <FlowTextField
              label={t("oaNameLabel")}
              required
              value={newCustomer.name}
              onChangeText={(name) => {
                setNewCustomer((c) => ({ ...c, name }));
                setNewCustomerErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder={t("oaNamePlaceholder")}
              autoCapitalize="words"
              textContentType="name"
              error={newCustomerErrors.name}
            />
            <FlowTextField
              label={t("oaPhoneLabel")}
              required
              value={newCustomer.phone}
              onChangeText={(phone) => {
                setNewCustomer((c) => ({ ...c, phone }));
                setNewCustomerErrors((e) => ({ ...e, phone: undefined }));
              }}
              placeholder={t("oaPhonePlaceholder")}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              maxLength={PHONE_MAX}
              error={newCustomerErrors.phone}
            />
            <FlowTextField
              label={t("oaEmailLabel")}
              value={newCustomer.email}
              onChangeText={(email) => {
                setNewCustomer((c) => ({ ...c, email }));
                setNewCustomerErrors((e) => ({ ...e, email: undefined }));
              }}
              placeholder={t("oaEmailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              helper={t("oaEmailHelper")}
              error={newCustomerErrors.email}
            />
            {customerError ? (
              <InfoNote tone="error" icon="error-outline" text={customerError} />
            ) : null}
            <FlowButton
              variant="text"
              compact
              label={t("oaPickExisting")}
              onPress={() => {
                setCustomerMode("existing");
                setCustomerError(null);
              }}
            />
          </>
        ) : (
          <>
            <FlowButton
              variant="outline"
              icon="person-add-alt"
              label={t("oaNewCustomer")}
              onPress={() => {
                setCustomerMode("new");
                setCustomerError(null);
                // Typed a name or number? Start the new customer with it.
                const typed = query.trim();
                if (typed && !newCustomer.name && !newCustomer.phone) {
                  setNewCustomer((c) =>
                    /^[+\d\s()-]+$/.test(typed)
                      ? { ...c, phone: typed }
                      : { ...c, name: typed },
                  );
                }
              }}
            />
            <FlowTextField
              label={t("oaSearchLabel")}
              value={query}
              onChangeText={setQuery}
              placeholder={t("oaSearchPlaceholder")}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {customerError ? (
              <InfoNote tone="error" icon="error-outline" text={customerError} />
            ) : null}
            {searching ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.darkGreen} />
                <Text style={styles.muted}>{t("oaSearching")}</Text>
              </View>
            ) : searchError ? (
              <InfoNote tone="error" icon="error-outline" text={searchError} />
            ) : results.length === 0 ? (
              <InfoNote
                icon="person-search"
                text={query.trim() ? t("oaNoCustomerMatch") : t("oaNoCustomersYet")}
              />
            ) : (
              <View style={styles.list}>
                {results.map((row) => (
                  <SelectRow
                    key={row.id}
                    title={row.name?.trim() || t("aoCustomer")}
                    subtitle={[row.phone, row.email].filter(Boolean).join(" · ") || null}
                    image={row.profile_image_url ?? null}
                    tag={guestTag(row)}
                    selected={customer?.id === row.id}
                    onPress={() => {
                      setCustomer(row);
                      setCustomerError(null);
                    }}
                  />
                ))}
                {page < lastPage ? (
                  <FlowButton
                    variant="text"
                    compact
                    label={t("oaMoreCustomers")}
                    loading={loadingMore}
                    onPress={() => void runSearch(query, page + 1)}
                  />
                ) : null}
              </View>
            )}
            {results.length >= CUSTOMER_SEARCH_PAGE_SIZE && !query.trim() ? (
              <Text style={styles.muted}>{t("oaSearchHint")}</Text>
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("oaNextServices"),
          onPress: onNext,
          trailingIcon: "chevron-right",
        }}
      />
    </>
  );

  const renderServices = () => (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle
          title={t("oaServicesTitle")}
          subtitle={t("oaServicesSubtitle", { name: customerName })}
        />
        {services.length === 0 ? (
          <InfoNote tone="warm" text={t("oaNoServices")} />
        ) : (
          <View style={styles.list}>
            {services.map((service) => {
              const on = serviceIds.includes(service.id);
              return (
                <SelectRow
                  key={service.id}
                  multiple
                  title={service.name}
                  subtitle={
                    service.durationMinutes > 0
                      ? formatDuration(service.durationMinutes)
                      : null
                  }
                  right={formatVisitMoney(service.price)}
                  selected={on}
                  onPress={() => {
                    setServiceError(null);
                    setServiceIds((ids) =>
                      on ? ids.filter((id) => id !== service.id) : [...ids, service.id],
                    );
                  }}
                />
              );
            })}
          </View>
        )}
        {serviceError ? (
          <InfoNote tone="error" icon="error-outline" text={serviceError} />
        ) : null}
      </ScrollView>
      <FlowFooter
        hint={
          serviceIds.length
            ? t("oaServicesSummary", {
                count: serviceIds.length,
                duration: formatDuration(totalMinutes),
                price: formatVisitMoney(totalPrice),
              })
            : null
        }
        primary={{
          label: t("oaNextTime"),
          onPress: onNext,
          trailingIcon: "chevron-right",
        }}
      />
    </>
  );

  const renderTime = () => (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle title={t("oaTimeTitle")} subtitle={t("oaTimeSubtitle")} />
        {timeError ? (
          <InfoNote tone="error" icon="event-busy" text={timeError} />
        ) : null}

        <View style={{ gap: moderateHeightScale(10) }}>
          <SectionLabel label={t("oaBarber")} />
          {staff.length === 0 ? (
            <InfoNote tone="warm" text={t("oaNoBarbers")} />
          ) : (
            <View style={styles.list} accessibilityRole="radiogroup">
              {staff.map((member) => (
                <SelectRow
                  key={member.id}
                  title={member.name}
                  image={member.image}
                  tag={member.isOwner ? t("owner") : null}
                  tagTone="neutral"
                  selected={staffId === member.id}
                  onPress={() => {
                    setStaffId(member.id);
                    setTimeError(null);
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: moderateHeightScale(10) }}>
          <SectionLabel label={t("oaWhen")} />
          <DateStrip
            value={date}
            onChange={(next) => {
              setDate(next);
              setTimeError(null);
            }}
          />
          <PickerField
            icon="schedule"
            label={endTime ? t("oaTimeWithEnd") : t("time")}
            value={timeLabel}
            onPress={() => setTimePickerOpen(true)}
            error={isPastSlot || timeNotFree}
          />
        </View>

        {staffId != null ? (
          <View style={{ gap: moderateHeightScale(10) }}>
            <SectionLabel
              label={t("oaFreeTimes")}
              meta={selectedStaff ? selectedStaff.name : null}
            />
            {freeLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.darkGreen} />
                <Text style={styles.muted}>{t("oaCheckingTimes")}</Text>
              </View>
            ) : freeError ? (
              <InfoNote tone="error" icon="error-outline" text={freeError} />
            ) : freeTimes && freeTimes.length === 0 ? (
              <InfoNote
                tone="warm"
                icon="event-busy"
                text={t("oaNoFreeTimes", {
                  name: selectedStaff?.name ?? "",
                  date: date.format("ddd, MMM D"),
                })}
              />
            ) : freeTimes ? (
              <>
                {timeNotFree ? (
                  <InfoNote
                    tone="warm"
                    icon="schedule"
                    text={t("oaTimeNotFree", {
                      time: to12h(time),
                      name: selectedStaff?.name ?? "",
                    })}
                  />
                ) : null}
                <TimeChips
                  times={freeTimes}
                  selected={time}
                  format={to12h}
                  onSelect={(next) => {
                    setTime(next);
                    setTimeError(null);
                  }}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <FlowFooter
        primary={{
          label: t("oaNextReview"),
          onPress: onNext,
          trailingIcon: "chevron-right",
        }}
      />
      <TimePickerModal
        visible={timePickerOpen}
        currentHours={Number(time.split(":")[0])}
        currentMinutes={Number(time.split(":")[1])}
        onSelect={(hours, minutes) => {
          setTime(
            `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
          );
          setTimeError(null);
          setTimePickerOpen(false);
        }}
        onClose={() => setTimePickerOpen(false)}
      />
    </>
  );

  const renderReview = () => (
    <>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={moderateHeightScale(24)}
      >
        <FlowTitle title={t("oaReviewTitle")} subtitle={t("oaReviewSubtitle")} />
        <FlowCard style={styles.card}>
          <PersonRow
            name={customerName}
            subtitle={
              [
                customerContact,
                customerMode === "new" ? t("oaNewCustomerTag") : null,
              ]
                .filter(Boolean)
                .join("\n") || null
            }
            image={customerMode === "new" ? null : customer?.profile_image_url}
          />
          <RowDivider />
          <Text style={styles.reviewLabel}>{t("oaWhen")}</Text>
          <Text style={styles.reviewValue}>
            {`${date.format("ddd, MMM D, YYYY")} · ${timeLabel}`}
          </Text>
          <Text style={styles.reviewSub}>
            {t("oaWithBarber", { name: selectedStaff?.name ?? "" })}
          </Text>
          <RowDivider />
          {selectedServices.map((service) => (
            <MoneyRow
              key={service.id}
              label={service.name}
              value={formatVisitMoney(service.price)}
            />
          ))}
          <RowDivider />
          <MoneyRow
            label={t("oaPayAtShop")}
            value={formatVisitMoney(totalPrice)}
            total
          />
        </FlowCard>
        <InfoNote icon="storefront" text={t("oaPayAtShopNote")} />
        <InfoNote icon="notifications-none" text={notifyPreview()} />
        <FlowTextField
          label={t("oaNotesLabel")}
          placeholder={t("oaNotesPlaceholder")}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
        />
        {submitError ? (
          <InfoNote tone="error" icon="error-outline" text={submitError} />
        ) : null}
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("oaConfirm"),
          onPress: confirm,
          loading: busy,
          disabled: busy,
          icon: "event-available",
        }}
      />
    </>
  );

  const renderDone = () => {
    const name = result?.user?.trim() || customerName;
    const notice =
      result?.customerHasAppAccount === true
        ? t("oaNotifyAppDone", { name })
        : result?.customerHasAppAccount === false
          ? result.userEmail?.trim()
            ? t("oaNotifyEmailDone", { name })
            : t("oaNotifyNoneDone", { name })
          : null;
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SuccessHero
          icon="event-available"
          title={t("oaBookedTitle")}
          subtitle={name}
          lines={[
            `${date.format("ddd, MMM D, YYYY")} · ${timeLabel}`,
            selectedStaff ? t("oaWithBarber", { name: selectedStaff.name }) : null,
          ]}
        />
        {notice ? <InfoNote icon="notifications-none" text={notice} /> : null}
        <View style={styles.actions}>
          {result?.id ? (
            <FlowButton
              label={t("oaViewAppointment")}
              icon="receipt-long"
              onPress={() =>
                router.replace({
                  pathname: "/(main)/bookingDetailsById",
                  params: { bookingId: String(result.id) },
                })
              }
            />
          ) : null}
          <FlowButton
            variant={result?.id ? "outline" : "primary"}
            label={t("oaBackToCalendar")}
            icon="calendar-month"
            onPress={leave}
          />
        </View>
      </ScrollView>
    );
  };

  // ── Frame ──────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (dataLoading) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.darkGreen} />
      </View>
    );
  } else if (dataError) {
    body = (
      <View style={styles.centered}>
        <InfoNote
          tone="error"
          icon="error-outline"
          text={dataError}
          style={{ alignSelf: "stretch" }}
        />
        <View style={[styles.actions, { alignSelf: "stretch" }]}>
          <FlowButton label={t("retry")} onPress={() => void loadFormData()} />
        </View>
      </View>
    );
  } else {
    body =
      step === "customer"
        ? renderCustomer()
        : step === "services"
          ? renderServices()
          : step === "time"
            ? renderTime()
            : step === "review"
              ? renderReview()
              : renderDone();
  }

  return (
    <View style={styles.root}>
      <FlowHeader
        title={step === "done" ? t("oaBookedHeader") : t("oaTitle")}
        step={
          step === "done"
            ? null
            : { current: stepIndex + 1, total: STEPS.length }
        }
        onBack={onHeaderBack}
        backDisabled={busy}
        backIcon={previousStep() ? "back" : "close"}
      />
      {body}
    </View>
  );
}
