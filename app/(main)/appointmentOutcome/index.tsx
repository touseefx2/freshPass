import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
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
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import {
  MoneyRow,
  RadioCard,
  SuccessHero,
  formatIsoDateTime,
  formatVisitDateTime,
  formatVisitMoney,
} from "@/src/components/afterVisit/afterVisitParts";
import {
  CHECKOUT_METHODS,
  CHECKOUT_TIP_PRESETS,
  CheckoutTipPicker,
  PaymentOptionRow,
  StatusBadges,
  SummaryDivider,
  TipMethodToggle,
  VisitSummaryCard,
  checkoutMethodLabel,
  checkoutTipAmount,
  type CheckoutTip,
} from "@/src/components/afterVisit/checkoutParts";
import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { getStripeModeHeaders } from "@/src/services/stripeService";
import {
  completeAppointment,
  confirmInPersonPayment,
  getApiErrorMessage,
  getApiFieldError,
  rejectInPersonPayment,
} from "@/src/services/afterVisitService";
import type {
  CheckoutOption,
  OutcomePreview,
} from "@/src/types/cancellationPolicy";
import type {
  CheckoutMethod,
  InPersonPayment,
  ShopPaymentMethod,
  VisitReceipt,
} from "@/src/types/afterVisit";

/**
 * Pro side after a visit — the register:
 * Complete & Checkout (all five payment options; the outcome preview's
 * `checkout` block says which can be picked and which is pre-selected) →
 * Review payment (tip, total collected) → one POST /outcome → done screen
 * built from the response's `receipt`. Nothing is ever charged here.
 * Also: No-show (Update status); recording a Not Yet Paid visit later
 * (step=payment: Cash / Card – Store Terminal → same review → done);
 * Not received for a customer's "I paid at the salon" claim.
 */
type Outcome = "completed" | "no_show";
type Step = "status" | "method" | "review" | "done" | "reject" | "rejected";
type DoneResult =
  | { kind: "receipt"; receipt: VisitReceipt; collected: boolean }
  | { kind: "no_show" };

type Appointment = {
  id: number;
  userId?: number | null;
  user: string | null;
  userEmail?: string | null;
  userProfilePic: string | null;
  staffId?: number | null;
  appointmentType: "service" | "subscription" | string;
  subscription?: string | { name?: string; title?: string } | null;
  services?: Array<{ id: number; name: string; price?: string | number }>;
  subscriptionServices?: Array<{ id: number; name: string }> | unknown;
  appointmentDate: string;
  appointmentTime: string;
  totalPrice?: number | string | null;
  status: string;
  owesPayment?: boolean;
  canMarkOutcome?: boolean;
  canConfirmInPersonPayment?: boolean;
  canRejectInPersonPayment?: boolean;
  inPersonPayment?: InPersonPayment | null;
  receipt?: VisitReceipt | null;
};

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
      gap: moderateHeightScale(20),
    },
    card: {
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(8),
    },
    metaText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    previewLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
    },
    group: { gap: moderateHeightScale(12) },
    options: { gap: moderateHeightScale(10) },
    actions: { gap: moderateHeightScale(12) },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      gap: moderateHeightScale(6),
    },
    subTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // "Payment method · Cash / Change"
    methodRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    methodLabel: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      paddingTop: moderateHeightScale(2),
    },
    methodValueWrap: { alignItems: "flex-end", flexShrink: 1 },
    methodValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "right",
    },
    changeBtn: {
      paddingTop: moderateHeightScale(2),
    },
    changeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
      textDecorationLine: "underline",
    },
    doneHeader: {
      alignItems: "center",
      gap: moderateHeightScale(10),
    },
    doneName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(4),
    },
    doneWhen: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

function serviceLabel(appt: Appointment | null): string {
  if (!appt) return "";
  if (appt.appointmentType === "subscription") {
    const list = Array.isArray(appt.subscriptionServices)
      ? (appt.subscriptionServices as Array<{ name: string }>)
      : [];
    if (list.length) return list.map((s) => s.name).join(" + ");
    const sub = appt.subscription;
    return typeof sub === "string" ? sub : sub?.name || sub?.title || "";
  }
  return (appt.services ?? []).map((s) => s.name).join(" + ");
}

function positiveAmount(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const roundCents = (n: number) => Math.round(n * 100) / 100;

function tipFromAmount(amount: number | null | undefined): {
  tip: CheckoutTip;
  text: string;
} {
  if (amount == null || amount <= 0) return { tip: { kind: "preset", amount: 0 }, text: "" };
  if (CHECKOUT_TIP_PRESETS.includes(amount)) {
    return { tip: { kind: "preset", amount }, text: "" };
  }
  return { tip: { kind: "custom" }, text: String(amount) };
}

/** Recording a Not Yet Paid visit later: money taken at the shop only. */
const COLLECT_OPTIONS: CheckoutOption[] = [
  { method: "cash", available: true, reason: null },
  { method: "card_terminal", available: true, reason: null },
];

export default function AppointmentOutcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const userRole = useAppSelector((state) => state.user.userRole);
  const params = useLocalSearchParams<{
    bookingId?: string;
    /** completed → straight to Complete & Checkout; no_show → Update status. */
    outcome?: string;
    /** "payment" records a Not Yet Paid visit's payment; "reject" = Not received. */
    step?: string;
    /** "details" when opened from Appointment Details (View Appointment = back). */
    from?: string;
  }>();
  const bookingId = params.bookingId ?? "";
  const entryStep: Step =
    params.step === "payment"
      ? "method"
      : params.step === "reject"
        ? "reject"
        : params.outcome === "completed"
          ? "method"
          : "status";

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(entryStep);
  const [history, setHistory] = useState<Step[]>([]);
  /** collect = recording the payment of a visit that is already completed */
  const [mode, setMode] = useState<"checkout" | "collect">(
    params.step === "payment" || params.step === "reject" ? "collect" : "checkout",
  );
  const [outcome, setOutcome] = useState<Outcome | null>(
    params.outcome === "completed" || params.outcome === "no_show"
      ? params.outcome
      : null,
  );
  const [preview, setPreview] = useState<OutcomePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequest = useRef(0);
  const [method, setMethod] = useState<CheckoutMethod | null>(null);
  const [tip, setTip] = useState<CheckoutTip>({ kind: "preset", amount: 0 });
  const [customTip, setCustomTip] = useState("");
  const [tipMethod, setTipMethod] = useState<ShopPaymentMethod>("cash");
  const [tipServerError, setTipServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<DoneResult | null>(null);
  const [reason, setReason] = useState("");

  const setBusyState = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/dashboard/(home)" as any);
  }, [router]);

  const load = useCallback(
    async (silent = false) => {
      if (!bookingId) {
        setLoadError(t("aoLoadError"));
        setLoading(false);
        return null;
      }
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const response = await ApiService.get<{
          success: boolean;
          message?: string;
          data: Appointment;
        }>(appointmentsEndpoints.getById(bookingId));
        if (response.success && response.data) {
          setAppt(response.data);
          return response.data;
        }
        if (!silent) setLoadError(response.message || t("aoLoadError"));
      } catch (error) {
        if (!silent) setLoadError(getApiErrorMessage(error, t("aoLoadError")));
      } finally {
        if (!silent) setLoading(false);
      }
      return null;
    },
    [bookingId, t],
  );

  useEffect(() => {
    load().then((data) => {
      if (!data) return;
      // Already completed but still owed (stale list / second tap): record it.
      if (
        entryStep !== "reject" &&
        !data.canMarkOutcome &&
        data.canConfirmInPersonPayment
      ) {
        setMode("collect");
        setStep("method");
      }
      // A customer's "I paid at the salon" claim is cash, with their tip.
      const claim = data.inPersonPayment;
      if (claim?.status === "claimed") {
        setMethod("cash");
        const prefill = tipFromAmount(claim.tipAmount);
        setTip(prefill.tip);
        setCustomTip(prefill.text);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Outcome preview: the policy note, and for completed the `checkout`
  // block (options, pre-selection, booked price, tip rules).
  const loadPreview = useCallback(
    async (next: Outcome) => {
      if (!bookingId) return;
      const requestId = ++previewRequest.current;
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(true);
      try {
        const response = await ApiService.get<{
          success: boolean;
          message?: string;
          data: OutcomePreview;
        }>(appointmentsEndpoints.outcomePreview(bookingId, next));
        if (requestId !== previewRequest.current) return;
        if (response.success && response.data) setPreview(response.data);
        else setPreviewError(response.message || t("aoPreviewError"));
      } catch (error) {
        if (requestId !== previewRequest.current) return;
        setPreviewError(getApiErrorMessage(error, t("aoPreviewError")));
      } finally {
        if (requestId === previewRequest.current) setPreviewLoading(false);
      }
    },
    [bookingId, t],
  );

  useEffect(() => {
    if (mode === "checkout" && outcome && appt?.canMarkOutcome) {
      void loadPreview(outcome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, mode, appt?.canMarkOutcome]);

  const completedPreview = preview?.outcome === "completed" ? preview : null;
  const checkout = completedPreview?.checkout ?? null;

  // All five options in fixed order. Older servers have no `checkout`
  // block: derive it from the booking (membership / paid / still owed).
  const options = useMemo<CheckoutOption[]>(() => {
    if (mode === "collect") return COLLECT_OPTIONS;
    const membershipBooking =
      (completedPreview?.appointmentType ?? appt?.appointmentType) === "subscription";
    const paidInAppFallback = !!completedPreview?.paid;
    return CHECKOUT_METHODS.map((m) => {
      const fromServer = checkout?.options?.find((o) => o.method === m);
      if (fromServer) return fromServer;
      const available = membershipBooking
        ? m === "membership"
        : paidInAppFallback
          ? m === "freshpass"
          : m !== "membership";
      return { method: m, available, reason: null };
    });
  }, [mode, checkout, completedPreview, appt?.appointmentType]);

  const fallbackPreselect: CheckoutMethod | null = completedPreview
    ? (completedPreview.appointmentType ?? appt?.appointmentType) === "subscription"
      ? "membership"
      : completedPreview.paid
        ? "freshpass"
        : null
    : null;

  // Apply the server's pre-selection once the preview is in.
  useEffect(() => {
    if (mode !== "checkout" || !completedPreview) return;
    const pre = checkout ? checkout.preselected : fallbackPreselect;
    setMethod((current) => {
      const stillAvailable = options.some(
        (o) => o.method === current && o.available,
      );
      if (current && stillAvailable) return current;
      return pre ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedPreview, mode]);

  // ── Steps / back ───────────────────────────────────────────────────────
  const goTo = (next: Step) => {
    setActionError(null);
    setHistory((h) => [...h, step]);
    setStep(next);
  };
  const isEndScreen = step === "done" || step === "rejected";
  const canStepBack = !isEndScreen && history.length > 0;

  const stepBack = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setActionError(null);
    setHistory(history.slice(0, -1));
    setStep(prev);
  };

  usePreventRemove(busy || canStepBack, ({ data: event }) => {
    const type = event.action.type;
    if (type !== "GO_BACK" && type !== "POP") {
      navigation.dispatch(event.action);
      return;
    }
    if (busyRef.current) return;
    stepBack();
  });

  const onHeaderBack = () => {
    if (busyRef.current) return;
    if (canStepBack) {
      stepBack();
      return;
    }
    leave();
  };

  // ── Money ──────────────────────────────────────────────────────────────
  const currency = completedPreview?.currency || "usd";
  const money = (n: number | null | undefined) => formatVisitMoney(n ?? 0, currency);
  const servicePrice =
    mode === "collect"
      ? (positiveAmount(appt?.receipt?.amountDue) ??
        positiveAmount(appt?.inPersonPayment?.serviceAmount) ??
        positiveAmount(appt?.totalPrice))
      : (checkout?.servicePrice ??
        completedPreview?.servicePrice ??
        positiveAmount(appt?.totalPrice));
  // Pay now: already paid in the app. Pay later + FreshPass = still owed.
  const paidInApp = checkout
    ? (checkout.amountPaid ?? 0) > 0 &&
      (checkout.amountPaid ?? 0) >= (servicePrice ?? 0) - 0.005
    : !!completedPreview?.paid;
  const freshpassOwed = method === "freshpass" && !paidInApp;
  const isShopPayment = method === "cash" || method === "card_terminal";

  const canAddTip = mode === "collect" || (checkout?.canAddTip ?? true);
  const existingTip = !canAddTip ? checkout?.existingTip ?? null : null;
  const showTipInput = !!method && method !== "not_paid" && canAddTip;
  const tipAmount = checkoutTipAmount(tip, customTip);
  const tipValue = showTipInput ? (tipAmount ?? 0) : 0;
  const askTipMethod =
    showTipInput && (method === "freshpass" || method === "membership") && tipValue > 0;
  const tipRangeError =
    tip.kind === "custom" && tipAmount == null ? t("ckTipRange") : null;
  const tipError = tipRangeError ?? tipServerError;
  const tipBlocked = showTipInput && tipAmount == null;

  const serviceCollected =
    isShopPayment || (method === "freshpass" && paidInApp) ? (servicePrice ?? 0) : 0;
  const tipShown = tipValue + (existingTip?.amount ?? 0);
  const totalCollected = roundCents(serviceCollected + tipShown);

  const onTipChange = (next: CheckoutTip) => {
    setTipServerError(null);
    setTip(next);
  };
  const onCustomTipChange = (text: string) => {
    setTipServerError(null);
    setCustomTip(text);
  };

  // ── Actions ────────────────────────────────────────────────────────────
  // The response is the updated appointment; merge so nothing shown goes blank.
  const applyUpdated = (updated: unknown): Appointment | null => {
    if (updated && typeof updated === "object" && "id" in updated) {
      const next = updated as Partial<Appointment>;
      setAppt((prev) => (prev ? { ...prev, ...next } : (next as Appointment)));
      return next as Appointment;
    }
    return null;
  };

  const finish = (next: DoneResult) => {
    setResult(next);
    setHistory([]);
    setActionError(null);
    setStep("done");
  };

  /** Used only if the server's response has no `receipt` block. */
  const localReceipt = (): VisitReceipt => {
    const unpaid = method === "not_paid" || freshpassOwed;
    const membership = method === "membership";
    return {
      status: unpaid ? "unpaid" : membership ? "covered" : "paid",
      method: method === "not_paid" ? null : method,
      serviceAmount: membership ? 0 : servicePrice,
      tipAmount: tipValue,
      tipMethod:
        tipValue > 0
          ? isShopPayment
            ? method
            : tipMethod
          : null,
      totalCollected: roundCents(serviceCollected + tipValue),
      amountDue: unpaid ? servicePrice : 0,
      currency,
    };
  };

  const showSubmitError = (error: unknown, fallback: string) => {
    const tipField = getApiFieldError(error, "tip_amount");
    if (tipField) setTipServerError(tipField);
    const methodField =
      getApiFieldError(error, "paid_method") ?? getApiFieldError(error, "paid_cash");
    setActionError(
      methodField ?? (tipField ? null : getApiErrorMessage(error, fallback)),
    );
  };

  const saveNoShow = async () => {
    if (!bookingId || busyRef.current) return;
    setActionError(null);
    setBusyState(true);
    try {
      const response = await ApiService.post<{ success: boolean; message?: string; data?: unknown }>(
        appointmentsEndpoints.markOutcome(bookingId),
        { outcome: "no_show" },
        { headers: await getStripeModeHeaders() },
      );
      if (!response.success) {
        setActionError(response.message || t("aoSaveError"));
        return;
      }
      if (!applyUpdated(response.data)) await load(true);
      finish({ kind: "no_show" });
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("aoSaveError")));
    } finally {
      setBusyState(false);
    }
  };

  const confirmCheckout = async () => {
    if (!bookingId || busyRef.current || !method || tipBlocked) return;
    setActionError(null);
    setTipServerError(null);
    setBusyState(true);
    try {
      const updated = applyUpdated(
        await completeAppointment<Appointment>(
          bookingId,
          { method, tip: tipValue, tipMethod: askTipMethod ? tipMethod : undefined },
          await getStripeModeHeaders(),
        ),
      );
      finish({
        kind: "receipt",
        receipt: updated?.receipt ?? localReceipt(),
        collected: false,
      });
    } catch (error) {
      showSubmitError(error, t("aoSaveError"));
    } finally {
      setBusyState(false);
    }
  };

  const confirmCollected = async () => {
    if (!bookingId || busyRef.current || tipBlocked) return;
    if (method !== "cash" && method !== "card_terminal") return;
    setActionError(null);
    setTipServerError(null);
    setBusyState(true);
    try {
      const updated = applyUpdated(
        await confirmInPersonPayment<Appointment>(bookingId, tipValue, method),
      );
      finish({
        kind: "receipt",
        receipt: updated?.receipt ?? localReceipt(),
        collected: true,
      });
    } catch (error) {
      showSubmitError(error, t("aoConfirmError"));
    } finally {
      setBusyState(false);
    }
  };

  const rejectPayment = async () => {
    if (!bookingId || busyRef.current) return;
    setActionError(null);
    setBusyState(true);
    try {
      applyUpdated(await rejectInPersonPayment<Appointment>(bookingId, reason));
      setHistory([]);
      setStep("rejected");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("aoRejectError")));
    } finally {
      setBusyState(false);
    }
  };

  const openDashboard = () =>
    router.navigate("/(main)/dashboard/(home)" as any);
  const openAppointment = () => {
    if (params.from === "details" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({
      pathname: "/(main)/bookingDetailsById",
      params: { bookingId },
    });
  };
  // Transactions and New appointment are owner-only; staff get the appointment.
  const isOwner = userRole === "business";
  const openTransactions = () =>
    router.replace({
      pathname: "/(main)/businessTransactions/list" as any,
      params: { period: "today" },
    });
  // Same customer, services and barber; the owner only picks the new time.
  const openBookNext = () => {
    const serviceIds = (appt?.services ?? []).map((s) => s.id).join(",");
    router.replace({
      pathname: "/(main)/addAppointment" as any,
      params: {
        user_id: appt?.userId != null ? String(appt.userId) : undefined,
        customer_name: appt?.user ?? undefined,
        customer_email: appt?.userEmail ?? undefined,
        customer_image: appt?.userProfilePic ?? undefined,
        service_ids: serviceIds || undefined,
        staff_id: appt?.staffId != null ? String(appt.staffId) : undefined,
      },
    });
  };

  // ── Pieces ─────────────────────────────────────────────────────────────
  const customerName = appt?.user?.trim() || t("aoCustomer");
  const service = serviceLabel(appt);
  const when = appt
    ? formatVisitDateTime(appt.appointmentDate, appt.appointmentTime)
    : "";
  const claim =
    appt?.inPersonPayment?.status === "claimed" ? appt.inPersonPayment : null;

  const errorNote = actionError ? (
    <InfoNote tone="error" icon="error-outline" text={actionError} />
  ) : null;

  /** The note under the options / on the review for the picked method. */
  const methodNote = (onReview: boolean) => {
    switch (method) {
      case "freshpass":
        return paidInApp ? (
          <InfoNote icon="phone-iphone" text={t("ckFreshPassPaidNote")} />
        ) : (
          <InfoNote
            tone="warm"
            icon="phone-iphone"
            text={t("ckFreshPassOwedNote", { amount: money(servicePrice) })}
          />
        );
      case "membership":
        return <InfoNote icon="card-membership" text={t("ckMembershipNote")} />;
      case "not_paid":
        return <InfoNote tone="warm" icon="schedule" text={t("ckUnpaidNote")} />;
      default:
        return onReview ? (
          <InfoNote icon="info-outline" text={t("ckConfirmAfterPayment")} />
        ) : (
          <InfoNote icon="storefront" text={t("ckRecordOnlyNote")} />
        );
    }
  };

  const unavailable = (text: string) => (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <VisitSummaryCard
          name={customerName}
          service={service}
          when={when}
          image={appt?.userProfilePic}
        />
        <InfoNote text={text} />
      </ScrollView>
      <FlowFooter primary={{ label: t("done"), onPress: leave }} />
    </>
  );

  const renderStatus = () => {
    if (!appt?.canMarkOutcome) return unavailable(t("aoAlreadyMarked"));
    const showNoCardWarning =
      outcome === "no_show" &&
      !!preview &&
      preview.appointmentType !== "subscription" &&
      !preview.hasSavedCard &&
      !preview.paid;
    return (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <VisitSummaryCard
            name={customerName}
            service={service}
            when={when}
            image={appt.userProfilePic}
          />
          <View style={styles.group} accessibilityRole="radiogroup">
            <SectionLabel label={t("aoMarkAs")} />
            <RadioCard
              icon="check-circle"
              title={t("aoCompleted")}
              subtitle={t("aoCompletedSub")}
              selected={outcome === "completed"}
              onPress={() => setOutcome("completed")}
            />
            <RadioCard
              icon="person-off"
              title={t("aoNoShow")}
              subtitle={t("aoNoShowSub")}
              selected={outcome === "no_show"}
              onPress={() => setOutcome("no_show")}
              danger
            />
          </View>
          {outcome && previewLoading ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={theme.darkGreen} />
              <Text style={styles.metaText}>{t("aoCheckingPolicy")}</Text>
            </View>
          ) : null}
          {outcome === "no_show" && preview?.message ? (
            <InfoNote
              tone="warm"
              icon="warning-amber"
              title={preview.question || null}
              text={preview.message}
            />
          ) : null}
          {showNoCardWarning ? (
            <InfoNote
              tone="error"
              icon="credit-card-off"
              text={t("noSavedCardWarning")}
            />
          ) : null}
          {previewError ? (
            <InfoNote tone="error" icon="error-outline" text={previewError} />
          ) : null}
          {errorNote}
        </ScrollView>
        <FlowFooter
          primary={{
            label: outcome === "no_show" ? t("aoSave") : t("continue"),
            onPress: outcome === "no_show" ? saveNoShow : () => goTo("method"),
            disabled: !outcome || previewLoading || !!previewError,
            loading: busy,
          }}
          hint={!outcome ? t("aoPickOutcome") : null}
        />
      </>
    );
  };

  const renderMethod = () => {
    if (mode === "collect" && !appt?.canConfirmInPersonPayment) {
      return unavailable(t("aoNothingToConfirm"));
    }
    if (mode === "checkout" && !appt?.canMarkOutcome) {
      return unavailable(t("aoAlreadyMarked"));
    }
    const ready = mode === "collect" || !!completedPreview;
    return (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <VisitSummaryCard
            name={customerName}
            service={service}
            when={when}
            image={appt?.userProfilePic}
          >
            {ready ? (
              <MoneyRow
                label={mode === "collect" ? t("ckStillOwed") : t("ckServiceTotal")}
                value={money(servicePrice)}
              />
            ) : (
              <View style={styles.previewLoading}>
                <ActivityIndicator color={theme.darkGreen} />
              </View>
            )}
          </VisitSummaryCard>
          {mode === "collect" && claim ? (
            <InfoNote
              tone="warm"
              icon="storefront"
              title={t("aoClaimTitle", { name: customerName })}
              text={[
                claim.tipAmount != null && claim.tipAmount > 0
                  ? t("aoClaimWithTip", {
                      amount: money(servicePrice),
                      tip: money(claim.tipAmount),
                    })
                  : t("aoClaimNoTip", { amount: money(servicePrice) }),
                formatIsoDateTime(claim.claimedAt),
              ]
                .filter(Boolean)
                .join("\n")}
            />
          ) : null}
          <View style={styles.group}>
            <FlowTitle compact title={t("ckHowPaid")} />
            {ready ? (
              <View style={styles.options} accessibilityRole="radiogroup">
                {options.map((option) => (
                  <PaymentOptionRow
                    key={option.method}
                    label={checkoutMethodLabel(t, option.method)}
                    selected={method === option.method}
                    available={option.available}
                    reason={option.reason}
                    onPress={() => setMethod(option.method as CheckoutMethod)}
                  />
                ))}
              </View>
            ) : null}
          </View>
          {ready ? methodNote(false) : null}
          {previewError ? (
            <InfoNote tone="error" icon="error-outline" text={previewError} />
          ) : null}
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("continue"),
            onPress: () => goTo("review"),
            disabled: !method || !ready,
          }}
          hint={ready && !method ? t("ckPickMethod") : null}
        />
      </>
    );
  };

  const renderReview = () => {
    if (mode === "collect" && !appt?.canConfirmInPersonPayment) {
      return unavailable(t("aoNothingToConfirm"));
    }
    if (mode === "checkout" && !appt?.canMarkOutcome) {
      return unavailable(t("aoAlreadyMarked"));
    }
    const existingTipMethod = existingTip?.method
      ? checkoutMethodLabel(t, existingTip.method === "online" ? "freshpass" : existingTip.method, true)
      : null;
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <VisitSummaryCard
            name={customerName}
            service={service}
            when={when}
            image={appt?.userProfilePic}
          >
            <View style={styles.methodRow}>
              <Text style={styles.methodLabel}>{t("ckPaymentMethod")}</Text>
              <View style={styles.methodValueWrap}>
                <Text style={styles.methodValue}>
                  {checkoutMethodLabel(t, method, true)}
                </Text>
                <TouchableOpacity
                  onPress={stepBack}
                  disabled={busy}
                  hitSlop={{ top: 12, bottom: 12, left: 20, right: 12 }}
                  style={styles.changeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t("ckChangeMethod")}
                >
                  <Text style={styles.changeText}>{t("ckChange")}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <SummaryDivider />
            <MoneyRow
              label={t("ckServiceTotal")}
              value={method === "membership" ? t("ckCovered") : money(servicePrice)}
            />
          </VisitSummaryCard>

          {showTipInput ? (
            <View style={styles.group}>
              <FlowTitle compact title={t("ckAddTip")} />
              <CheckoutTipPicker
                tip={tip}
                onTip={onTipChange}
                customText={customTip}
                onCustomText={onCustomTipChange}
                error={tipError}
              />
              {askTipMethod ? (
                <View style={styles.group}>
                  <Text style={styles.subTitle}>{t("ckTipHowGiven")}</Text>
                  <TipMethodToggle value={tipMethod} onChange={setTipMethod} />
                </View>
              ) : null}
            </View>
          ) : existingTip && method !== "not_paid" ? (
            <InfoNote
              icon="volunteer-activism"
              text={t("ckTipAlreadyRecorded", {
                amount: money(existingTip.amount),
              })}
            />
          ) : null}

          {method === "not_paid" ? (
            <FlowCard style={styles.card}>
              <MoneyRow label={t("ckStillOwed")} value={money(servicePrice)} total />
            </FlowCard>
          ) : (
            <FlowCard style={styles.card}>
              <MoneyRow
                label={freshpassOwed ? t("ckDueInApp") : t("ckService")}
                value={
                  method === "membership"
                    ? t("ckCovered")
                    : money(servicePrice)
                }
              />
              <MoneyRow
                label={
                  existingTipMethod
                    ? `${t("ckTip")} · ${existingTipMethod}`
                    : askTipMethod
                      ? `${t("ckTip")} · ${checkoutMethodLabel(t, tipMethod, true)}`
                      : t("ckTip")
                }
                value={money(tipShown)}
              />
              <SummaryDivider />
              <MoneyRow
                label={t("ckTotalCollected")}
                value={money(totalCollected)}
                total
              />
            </FlowCard>
          )}
          {methodNote(true)}
          {errorNote}
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label: mode === "collect" ? t("ckConfirmPayment") : t("ckConfirmComplete"),
            onPress: mode === "collect" ? confirmCollected : confirmCheckout,
            loading: busy,
            disabled: !method || tipBlocked,
          }}
          tertiary={
            mode === "collect" && appt?.canRejectInPersonPayment
              ? {
                  label: t("aoNotReceived"),
                  onPress: () => goTo("reject"),
                  disabled: busy,
                }
              : null
          }
        />
      </>
    );
  };

  const renderDone = () => {
    if (!result) return null;
    const header = (
      title: string,
      badges: React.ComponentProps<typeof StatusBadges>["items"],
      tone: "success" | "danger" = "success",
    ) => (
      <View style={styles.doneHeader}>
        <SuccessHero
          tone={tone}
          icon={tone === "danger" ? "person-off" : "check"}
          title={title}
        />
        {badges.length ? <StatusBadges items={badges} /> : null}
        <View>
          <Text style={styles.doneName}>{customerName}</Text>
          {when ? <Text style={styles.doneWhen}>{when}</Text> : null}
        </View>
      </View>
    );

    if (result.kind === "no_show") {
      return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {header(t("aoNoShowDoneTitle"), [], "danger")}
          <View style={styles.actions}>
            <FlowButton label={t("ckViewAppointment")} icon="event-note" onPress={openAppointment} />
            <FlowButton variant="light" icon="home" label={t("aoBackToDashboard")} onPress={openDashboard} />
          </View>
        </ScrollView>
      );
    }

    const r = result.receipt;
    const rCurrency = r.currency || currency;
    const rMoney = (n: number | null | undefined) => formatVisitMoney(n ?? 0, rCurrency);
    const unpaid = r.status === "unpaid";
    const covered = r.status === "covered";
    const tipAmt = r.tipAmount ?? 0;
    const tipVia =
      tipAmt > 0 && r.tipMethod && r.tipMethod !== r.method
        ? r.tipMethod === "online"
          ? t("ckMethodFreshPassShort")
          : checkoutMethodLabel(t, r.tipMethod, true)
        : null;
    const statusBadge = unpaid
      ? { label: t("ckBadgeUnpaid"), tone: "warn" as const, icon: "schedule" as const }
      : covered
        ? { label: t("ckBadgeCovered"), tone: "neutral" as const, icon: "card-membership" as const }
        : { label: t("ckBadgePaid"), tone: "success" as const, icon: "payments" as const };
    const services = r.services?.length ? r.services.join(" + ") : service;
    const total = r.totalCollected ?? roundCents((r.serviceAmount ?? 0) + tipAmt);

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {header(
          result.collected ? t("ckPaymentRecordedTitle") : t("aoCompletedDoneTitle"),
          [
            { label: t("ckBadgeCompleted"), tone: "success", icon: "check-circle" },
            statusBadge,
          ],
        )}
        <FlowCard style={styles.card}>
          <MoneyRow
            label={services || t("ckService")}
            value={covered ? t("ckCovered") : rMoney(unpaid ? r.amountDue ?? r.serviceAmount : r.serviceAmount)}
          />
          <SummaryDivider />
          <MoneyRow
            label={t("ckPaymentMethod")}
            value={
              unpaid
                ? r.method === "freshpass"
                  ? t("ckAwaitingInApp")
                  : t("ckMethodUnpaid")
                : checkoutMethodLabel(t, r.method, true)
            }
          />
          {!unpaid || tipAmt > 0 ? (
            <MoneyRow
              label={tipVia ? `${t("ckTip")} · ${tipVia}` : t("ckTip")}
              value={rMoney(tipAmt)}
            />
          ) : null}
          <SummaryDivider />
          {unpaid ? (
            <MoneyRow label={t("ckStillOwed")} value={rMoney(r.amountDue)} total />
          ) : (
            <MoneyRow label={t("ckTotalCollected")} value={rMoney(total)} total />
          )}
        </FlowCard>
        {unpaid ? (
          <InfoNote
            tone="warm"
            icon="schedule"
            text={
              r.method === "freshpass"
                ? t("ckFreshPassOwedDone", { name: customerName })
                : t("ckUnpaidDoneNote")
            }
          />
        ) : null}
        <View style={styles.actions}>
          {isOwner ? (
            <>
              <FlowButton label={t("ckBookNextVisit")} icon="event" onPress={openBookNext} />
              {unpaid ? (
                <FlowButton
                  variant="outline"
                  label={t("ckViewAppointment")}
                  icon="event-note"
                  onPress={openAppointment}
                />
              ) : (
                <FlowButton
                  variant="outline"
                  label={t("ckViewTransaction")}
                  icon="receipt-long"
                  onPress={openTransactions}
                />
              )}
            </>
          ) : (
            <FlowButton label={t("ckViewAppointment")} icon="event-note" onPress={openAppointment} />
          )}
          <FlowButton variant="light" icon="home" label={t("aoBackToDashboard")} onPress={openDashboard} />
        </View>
      </ScrollView>
    );
  };

  const renderReject = () => {
    if (!appt?.canRejectInPersonPayment) return unavailable(t("aoNoClaimToReject"));
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <FlowTitle
            title={t("aoRejectTitle")}
            subtitle={t("aoRejectSubtitle", { name: customerName })}
          />
          <VisitSummaryCard
            name={customerName}
            service={service}
            when={when}
            image={appt.userProfilePic}
          />
          <FlowTextField
            label={t("aoRejectReasonLabel")}
            placeholder={t("aoRejectReasonPlaceholder")}
            value={reason}
            onChangeText={setReason}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            helper={t("aoRejectReasonHelper")}
          />
          {errorNote}
        </KeyboardAwareScrollView>
        {/* Destructive: red outline, kept apart from the safe way back */}
        <View
          style={[
            styles.footer,
            { paddingBottom: flowFooterBottomPad(insets.bottom) },
          ]}
        >
          <FlowButton
            variant="outline"
            danger
            icon="money-off"
            label={t("aoMarkNotReceived")}
            onPress={rejectPayment}
            loading={busy}
          />
          <FlowButton
            variant="text"
            compact
            label={t("aoGoBack")}
            onPress={onHeaderBack}
            disabled={busy}
          />
        </View>
      </>
    );
  };

  const renderRejected = () => (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SuccessHero
        tone="pending"
        icon="money-off"
        title={t("aoRejectedTitle")}
        subtitle={t("aoRejectedBody", { name: customerName })}
      />
      <View style={styles.actions}>
        <FlowButton label={t("done")} onPress={leave} />
        <FlowButton
          variant="outline"
          icon="home"
          label={t("aoBackToDashboard")}
          onPress={openDashboard}
        />
      </View>
    </ScrollView>
  );

  // ── Frame ──────────────────────────────────────────────────────────────
  const headerTitle =
    step === "status"
      ? t("aoUpdateStatus")
      : step === "method"
        ? mode === "collect"
          ? t("ckRecordPaymentTitle")
          : t("ckCheckoutTitle")
        : step === "review"
          ? t("ckReviewTitle")
          : step === "reject" || step === "rejected"
            ? t("aoNotReceived")
            : "";
  const headerStep =
    step === "method"
      ? { current: 1, total: 2 }
      : step === "review"
        ? { current: 2, total: 2 }
        : null;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.darkGreen} />
      </View>
    );
  } else if (loadError || !appt) {
    body = (
      <View style={styles.centered}>
        <InfoNote
          tone="error"
          icon="error-outline"
          text={loadError || t("aoLoadError")}
          style={{ alignSelf: "stretch" }}
        />
        <View style={[styles.actions, { alignSelf: "stretch" }]}>
          <FlowButton label={t("retry")} onPress={() => void load()} />
        </View>
      </View>
    );
  } else {
    body =
      step === "status"
        ? renderStatus()
        : step === "method"
          ? renderMethod()
          : step === "review"
            ? renderReview()
            : step === "done"
              ? renderDone()
              : step === "reject"
                ? renderReject()
                : renderRejected();
  }

  return (
    <View style={styles.root}>
      <FlowHeader
        title={headerTitle}
        step={headerStep}
        onBack={onHeaderBack}
        backDisabled={busy}
        backIcon={isEndScreen || !canStepBack ? "close" : "back"}
      />
      {body}
    </View>
  );
}
