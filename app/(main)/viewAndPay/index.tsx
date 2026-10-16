import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useStripe } from "@stripe/stripe-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
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
  RadioCard,
  RowDivider,
  StarRating,
  SuccessHero,
  TipPicker,
  formatIsoDateTime,
  formatVisitDateTime,
  formatVisitMoney,
  tipFromChoice,
  type TipChoice,
} from "@/src/components/afterVisit/afterVisitParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  claimPaidInPerson,
  fetchReviewSuggestions,
  fetchViewAndPay,
  getApiErrorMessage,
  submitVisitReview,
  waitForVisitPaid,
  type ReviewSuggestion,
} from "@/src/services/afterVisitService";
import {
  fetchAppointmentPaymentSheetParams,
  useStripeAccount as setStripeAccount,
} from "@/src/services/stripeService";
import {
  confirmTipPaid,
  createTipPaymentSheet,
  formatTipRecipientName,
} from "@/src/services/tipService";
import type { ViewAndPay } from "@/src/types/afterVisit";

/**
 * View & Pay — one step at a time after a completed visit:
 * visit summary → (how you paid) → tip → Stripe sheet → done → review.
 * "I paid at the salon" → cash tip → done (waiting for the business).
 * Everything the screen offers comes from GET /appointments/{id}/view-and-pay.
 */
type Step = "visit" | "method" | "tip" | "salon" | "done" | "tipOnly" | "review";
type PayRoute = "online" | "salon";

const PAY_STEPS: Step[] = ["visit", "method", "tip", "salon"];

function isPayable(data: ViewAndPay): boolean {
  const status = data.payment.status;
  return (
    (status === "due" || status === "not_confirmed") && data.payment.required
  );
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
      gap: moderateHeightScale(20),
    },
    card: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(10),
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    metaText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    actions: { gap: moderateHeightScale(12) },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    chip: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: { color: theme.white },
    question: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    reviewStars: {
      flexDirection: "row",
      gap: moderateWidthScale(2),
    },
    reviewComment: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
    tipSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function ViewAndPayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAppSelector((state) => state.user);
  const params = useLocalSearchParams<{
    appointmentId?: string;
    /** "review" opens straight on the review step (review prompt). */
    step?: string;
    /** "1" when opened from Appointment Details ("View details" goes back). */
    fromDetails?: string;
  }>();
  const appointmentId = params.appointmentId ?? "";

  const [data, setData] = useState<ViewAndPay | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("visit");
  const [entryStep, setEntryStep] = useState<Step>("visit");
  const [route, setRoute] = useState<PayRoute>("online");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Card paid but the webhook hasn't landed yet → "Payment processing".
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Tip (online with the payment, or on its own) and cash tip (salon claim)
  const [tipChoice, setTipChoice] = useState<TipChoice>({ kind: "none" });
  const [tipText, setTipText] = useState("");
  const [tipError, setTipError] = useState<string | null>(null);

  // Review
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [suggestionId, setSuggestionId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);

  const setBusyState = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  const currency = data?.currency || data?.tip.currency || "usd";
  const money = (amount: number | null | undefined) =>
    formatVisitMoney(amount, currency);
  const businessName = data?.business.title ?? "";

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/dashboard/(home)" as any);
  }, [router]);

  const openReview = useCallback((next: ViewAndPay) => {
    const existing = next.review.review;
    setRating(existing?.overallRating ?? 0);
    setComment(existing?.comment ?? "");
    setSuggestionId(existing?.reviewSuggestionId ?? null);
    setActionError(null);
    setStep("review");
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!appointmentId) {
        setLoadError(t("avLoadError"));
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const next = await fetchViewAndPay(appointmentId);
        setData(next);
        return next;
      } catch (error) {
        if (!silent) setLoadError(getApiErrorMessage(error, t("avLoadError")));
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [appointmentId, t],
  );

  // First load picks the starting step from the payment status.
  useEffect(() => {
    let cancelled = false;
    load().then((next) => {
      if (cancelled || !next) return;
      let first: Step = isPayable(next) ? "visit" : "done";
      if (params.step === "review" && next.review.canReview) {
        first = "review";
        openReview(next);
      }
      setEntryStep(first);
      setStep(first);
      if (!next.payment.canPayOnline && next.payment.canClaimPaidInPerson) {
        setRoute("salon");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  useEffect(() => {
    fetchReviewSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

  // Back on screen (e.g. paid from another device / chat): refresh quietly.
  const hasLoadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        return;
      }
      if (busyRef.current) return;
      load(true).then((next) => {
        if (next && !isPayable(next)) {
          setStep((current) =>
            PAY_STEPS.includes(current) ? "done" : current,
          );
        }
      });
    }, [load]),
  );

  // ── Paths ──────────────────────────────────────────────────────────────
  const canOnline = !!data?.payment.canPayOnline;
  const canSalon = !!data?.payment.canClaimPaidInPerson;
  const tipWithPayment =
    !!data?.tip.canTip && data?.tip.payWith === "with_payment";
  const tipSeparate = !!data?.tip.canTip && data?.tip.payWith === "separate";
  // Cash tip can be named with a salon claim while tipping is still open.
  const cashTipAllowed = !!data?.tip.canTip && data?.tip.payWith !== "none";

  const payPath = useMemo<Step[]>(() => {
    const path: Step[] = ["visit"];
    if (canOnline && canSalon) path.push("method");
    if (route === "salon" && canSalon) path.push("salon");
    else if (canOnline && tipWithPayment) path.push("tip");
    return path;
  }, [canOnline, canSalon, route, tipWithPayment]);

  const stepIndex = payPath.indexOf(step);
  const isLastPayStep = stepIndex === payPath.length - 1;

  const tipAmount = tipFromChoice(tipChoice, tipText);
  const amountDue = data?.payment.amountDue ?? 0;
  const totalWithTip =
    amountDue + (tipWithPayment && route === "online" ? (tipAmount ?? 0) : 0);

  // ── Back ───────────────────────────────────────────────────────────────
  const previousStep = (): Step | null => {
    if (step === entryStep) return null;
    if (stepIndex > 0) return payPath[stepIndex - 1];
    if (step === "tipOnly" || step === "review") return "done";
    return null;
  };

  usePreventRemove(busy || previousStep() !== null, ({ data: event }) => {
    const type = event.action.type;
    if (type !== "GO_BACK" && type !== "POP") {
      navigation.dispatch(event.action);
      return;
    }
    if (busyRef.current) return;
    const prev = previousStep();
    if (prev) {
      setActionError(null);
      setStep(prev);
    }
  });

  const onHeaderBack = () => {
    if (busyRef.current) return;
    const prev = previousStep();
    if (prev) {
      setActionError(null);
      setStep(prev);
      return;
    }
    leave();
  };

  // ── Tip validation ─────────────────────────────────────────────────────
  const validateTip = (allowNone: boolean): boolean => {
    if (!data) return false;
    if (tipChoice.kind === "none") {
      if (allowNone) return true;
      setTipError(t("avTipPickAmount"));
      return false;
    }
    if (tipAmount == null || tipAmount <= 0) {
      setTipError(t("avTipEnterAmount"));
      return false;
    }
    if (tipAmount < data.tip.minAmount) {
      setTipError(t("avTipMin", { amount: money(data.tip.minAmount) }));
      return false;
    }
    if (tipAmount > data.tip.maxAmount) {
      setTipError(t("avTipMax", { amount: money(data.tip.maxAmount) }));
      return false;
    }
    setTipError(null);
    return true;
  };

  // ── Stripe ─────────────────────────────────────────────────────────────
  /** Presents a sheet; true when paid, false when cancelled / failed. */
  const presentSheet = async (sheet: {
    customer: string;
    paymentIntent?: string;
    setupIntent?: string;
    customerSessionClientSecret?: string;
    ephemeralKey?: string;
    connectedAccountId?: string | null;
    merchantName: string;
  }): Promise<boolean> => {
    try {
      await setStripeAccount(sheet.connectedAccountId ?? null);
      const config: Record<string, unknown> = {
        merchantDisplayName: sheet.merchantName,
        customerId: sheet.customer,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user.name || undefined,
          email: user.email || undefined,
        },
      };
      if (sheet.customerSessionClientSecret) {
        config.customerSessionClientSecret = sheet.customerSessionClientSecret;
      } else if (sheet.ephemeralKey) {
        config.customerEphemeralKeySecret = sheet.ephemeralKey;
      }
      if (sheet.paymentIntent?.trim()) {
        config.paymentIntentClientSecret = sheet.paymentIntent;
      } else if (sheet.setupIntent?.trim()) {
        config.setupIntentClientSecret = sheet.setupIntent;
      } else {
        throw new Error(t("avPaymentFailed"));
      }
      const { error: initError } = await initPaymentSheet(config as any);
      if (initError) {
        throw new Error(initError.message || t("avPaymentFailed"));
      }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (!presentError.code?.includes("Canceled")) {
          showBanner(
            t("avPaymentFailedTitle"),
            presentError.message || t("avPaymentFailed"),
            "error",
            4000,
          );
        }
        return false;
      }
      return true;
    } finally {
      await setStripeAccount(null);
    }
  };

  const payOnline = async () => {
    if (!data || busyRef.current) return;
    if (tipWithPayment && !validateTip(true)) return;
    setActionError(null);
    setBusyState(true);
    try {
      // "included": the old booking tip is already in amountDue — no tip_amount.
      const tip =
        tipWithPayment && tipAmount != null && tipAmount > 0 ? tipAmount : null;
      const sheet = await fetchAppointmentPaymentSheetParams(
        data.appointmentId,
        tip,
      );
      const paid = await presentSheet({
        ...sheet,
        merchantName: "Fresh Pass",
      });
      if (!paid) return;

      setConfirmingPayment(true);
      setProcessing(false);
      setStep("done");
      const result = await waitForVisitPaid(data.appointmentId);
      if (result.data) setData(result.data);
      setProcessing(!result.paid);
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("avPaymentFailed")));
    } finally {
      setConfirmingPayment(false);
      setBusyState(false);
    }
  };

  const claimSalon = async () => {
    if (!data || busyRef.current) return;
    if (cashTipAllowed && !validateTip(true)) return;
    setActionError(null);
    setBusyState(true);
    try {
      const cashTip = cashTipAllowed ? tipAmount : null;
      const next = await claimPaidInPerson(data.appointmentId, cashTip);
      setData(next);
      setStep("done");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("avClaimFailed")));
      // The claim may have been closed meanwhile (e.g. already paid).
      void load(true);
    } finally {
      setBusyState(false);
    }
  };

  const sendSeparateTip = async () => {
    if (!data || busyRef.current) return;
    if (!validateTip(false) || tipAmount == null) return;
    setActionError(null);
    setBusyState(true);
    try {
      const sheet = await createTipPaymentSheet(data.appointmentId, tipAmount);
      const paid = await presentSheet({
        ...sheet,
        merchantName: sheet.recipient?.name || businessName || "Fresh Pass",
      });
      if (!paid) return;
      showBanner(t("avTipSentTitle"), t("avTipSentBody"), "success", 3000);
      await confirmTipPaid(data.appointmentId).catch(() => null);
      await load(true);
      setStep("done");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("avTipFailed")));
    } finally {
      setBusyState(false);
    }
  };

  const sendReview = async () => {
    if (!data || busyRef.current || rating === 0) return;
    setActionError(null);
    setBusyState(true);
    try {
      await submitVisitReview({
        appointmentId: data.appointmentId,
        rating,
        comment,
        suggestionId,
      });
      showBanner(t("avReviewThanksTitle"), t("avReviewThanksBody"), "success", 3000);
      await load(true);
      if (entryStep === "review") {
        leave();
        return;
      }
      setStep("done");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("failedToSubmitReview")));
    } finally {
      setBusyState(false);
    }
  };

  const resetTip = (choice: TipChoice = { kind: "none" }) => {
    setTipChoice(choice);
    setTipText("");
    setTipError(null);
  };

  // A tip picked for the card isn't a cash tip (and the other way round).
  const chooseRoute = (next: PayRoute) => {
    if (next !== route) resetTip();
    setRoute(next);
  };

  const goNextPayStep = () => {
    setActionError(null);
    setTipError(null);
    const next = payPath[stepIndex + 1];
    if (next) setStep(next);
  };

  const openDetails = () => {
    if (params.fromDetails === "1") {
      leave();
      return;
    }
    router.push({
      pathname: "/(main)/bookingDetailsById",
      params: { bookingId: String(data?.appointmentId ?? appointmentId) },
    });
  };

  const openBookAgain = () => {
    router.push({
      pathname: "/(main)/bookAgain" as any,
      params: { appointmentId: String(data?.appointmentId ?? appointmentId) },
    });
  };

  // ── Pieces ─────────────────────────────────────────────────────────────
  const proName = formatTipRecipientName(data?.staff?.name) || businessName;
  const tipRecipientName =
    formatTipRecipientName(data?.tip.recipient?.name) || proName;
  const tipRecipientImage = data?.tip.recipient?.image ?? data?.staff?.image;

  const renderVisitCard = (showAmountDue: boolean) => {
    if (!data) return null;
    return (
      <FlowCard style={styles.card}>
        <PersonRow
          name={proName}
          subtitle={data.staff ? t("avYourProfessional") : null}
          image={data.staff?.image ?? data.business.logoUrl}
        />
        <RowDivider />
        {data.services.map((service) => (
          <MoneyRow
            key={service.id}
            label={service.name}
            value={money(service.price)}
          />
        ))}
        <View style={styles.metaRow}>
          <MaterialIcons
            name="event"
            size={moderateWidthScale(18)}
            color={theme.lightGreen}
          />
          <Text style={styles.metaText}>
            {formatVisitDateTime(data.appointmentDate, data.appointmentTime)}
          </Text>
        </View>
        {showAmountDue ? (
          <>
            {data.payment.bookingTipAmount != null &&
            data.payment.bookingTipAmount > 0 ? (
              <MoneyRow
                label={t("avBookingTip")}
                value={money(data.payment.bookingTipAmount)}
              />
            ) : null}
            <RowDivider />
            <MoneyRow
              label={t("avAmountDue")}
              value={money(data.payment.amountDue)}
              total
            />
          </>
        ) : null}
      </FlowCard>
    );
  };

  const renderTipChooser = (allowNone: boolean, noTipLabel: string) => {
    if (!data) return null;
    return (
      <TipPicker
        suggestedAmounts={data.tip.suggestedAmounts ?? []}
        currency={currency}
        choice={tipChoice}
        onChoice={(choice) => {
          setTipChoice(choice);
          setTipError(null);
        }}
        customText={tipText}
        onCustomText={(text) => {
          setTipText(text);
          setTipError(null);
        }}
        customError={tipChoice.kind === "custom" ? tipError : null}
        noTipLabel={noTipLabel}
        showNoTip={allowNone}
        customLabel={t("avCustomTip")}
      />
    );
  };

  const errorNote = actionError ? (
    <InfoNote tone="error" icon="error-outline" text={actionError} />
  ) : null;
  const tipErrorNote =
    tipError && tipChoice.kind !== "custom" ? (
      <InfoNote tone="error" icon="error-outline" text={tipError} />
    ) : null;

  // ── Steps ──────────────────────────────────────────────────────────────
  const renderVisit = () => {
    if (!data) return null;
    const notConfirmed = data.payment.status === "not_confirmed";
    const nothingToPayHere = !canOnline && !canSalon;
    return (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SuccessHero
            title={t("avServiceCompleteTitle")}
            subtitle={t("avServiceCompleteBody", { business: businessName })}
          />
          {notConfirmed ? (
            <InfoNote
              tone="error"
              icon="report-gmailerrorred"
              title={t("avNotConfirmedTitle")}
              text={
                data.payment.claimPaidInPersonReason ||
                t("avNotConfirmedBody", { business: businessName })
              }
            />
          ) : null}
          {renderVisitCard(true)}
          {nothingToPayHere ? (
            <InfoNote text={t("avCantPayHere", { business: businessName })} />
          ) : null}
          {errorNote}
        </ScrollView>
        <FlowFooter
          primary={
            nothingToPayHere
              ? { label: t("done"), onPress: leave }
              : isLastPayStep
                ? {
                    label: t("avPayAmount", { amount: money(totalWithTip) }),
                    onPress: payOnline,
                    loading: busy,
                    icon: "lock",
                  }
                : {
                    label: t("avContinueToPayment"),
                    onPress: goNextPayStep,
                    trailingIcon: "chevron-right",
                  }
          }
          tertiary={
            nothingToPayHere
              ? null
              : { label: t("avMaybeLater"), onPress: leave, disabled: busy }
          }
        />
      </>
    );
  };

  const renderMethod = () => {
    if (!data) return null;
    return (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("avMethodTitle")}
            subtitle={t("avMethodSubtitle", {
              amount: money(data.payment.amountDue),
            })}
          />
          <View style={{ gap: moderateHeightScale(12) }} accessibilityRole="radiogroup">
            <RadioCard
              icon="credit-card"
              title={t("avPayInApp")}
              subtitle={t("avPayInAppSub")}
              selected={route === "online"}
              onPress={() => chooseRoute("online")}
            />
            <RadioCard
              icon="storefront"
              title={t("avPaidAtSalon")}
              subtitle={t("avPaidAtSalonSub", { business: businessName })}
              selected={route === "salon"}
              onPress={() => chooseRoute("salon")}
            />
          </View>
          {errorNote}
        </ScrollView>
        <FlowFooter
          primary={
            isLastPayStep
              ? {
                  label: t("avPayAmount", { amount: money(totalWithTip) }),
                  onPress: payOnline,
                  loading: busy,
                  icon: "lock",
                }
              : {
                  label: t("continue"),
                  onPress: goNextPayStep,
                  trailingIcon: "chevron-right",
                }
          }
        />
      </>
    );
  };

  const renderTip = () => {
    if (!data) return null;
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <FlowTitle title={t("avTipTitle")} subtitle={t("avTipSubtitle")} />
          <PersonRow
            name={tipRecipientName}
            subtitle={
              data.tip.recipient?.type === "business"
                ? t("avTipTheTeam")
                : t("avYourProfessional")
            }
            image={tipRecipientImage}
          />
          {renderTipChooser(true, t("avNoTip"))}
          {tipErrorNote}
          <FlowCard style={styles.card}>
            <MoneyRow label={t("avServiceTotal")} value={money(amountDue)} />
            <MoneyRow
              label={t("avTipLabel")}
              value={money(tipAmount ?? 0)}
            />
            <RowDivider />
            <MoneyRow label={t("avTotal")} value={money(totalWithTip)} total />
          </FlowCard>
          {errorNote}
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label: t("avPayAmount", { amount: money(totalWithTip) }),
            onPress: payOnline,
            loading: busy,
            icon: "lock",
          }}
        />
      </>
    );
  };

  const renderSalon = () => {
    if (!data) return null;
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <FlowTitle
            title={t("avSalonTitle", { business: businessName })}
            subtitle={t("avSalonSubtitle", {
              business: businessName,
              amount: money(data.payment.amountDue),
            })}
          />
          {cashTipAllowed ? (
            <View style={{ gap: moderateHeightScale(12) }}>
              <SectionLabel
                label={t("avCashTipQuestion")}
                meta={t("optional")}
              />
              {renderTipChooser(true, t("avNoCashTip"))}
            </View>
          ) : null}
          {tipErrorNote}
          <InfoNote
            icon="hourglass-empty"
            text={t("avSalonNote", { business: businessName })}
          />
          {errorNote}
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label: t("avIPaidAtSalon"),
            onPress: claimSalon,
            loading: busy,
            icon: "storefront",
          }}
        />
      </>
    );
  };

  const renderDoneHero = () => {
    if (!data) return null;
    if (confirmingPayment) {
      return (
        <View style={[styles.centered, { paddingVertical: moderateHeightScale(40) }]}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
          <Text style={styles.metaText}>{t("avConfirmingPayment")}</Text>
        </View>
      );
    }
    if (processing && data.payment.status !== "paid") {
      return (
        <SuccessHero
          tone="pending"
          icon="sync"
          title={t("avProcessingTitle")}
          subtitle={t("avProcessingBody")}
        />
      );
    }
    const paidAt = formatIsoDateTime(data.payment.paidAt);
    switch (data.payment.status) {
      case "paid":
        return (
          <SuccessHero
            title={t("avPaidTitle")}
            amount={money(data.payment.amountPaid ?? data.payment.amountDue)}
            subtitle={t("avPaidTo", { business: businessName })}
            lines={[paidAt]}
          />
        );
      case "paid_in_person":
        return (
          <SuccessHero
            icon="storefront"
            title={t("avPaidInPersonTitle")}
            amount={
              data.payment.amountPaid != null
                ? money(data.payment.amountPaid)
                : null
            }
            subtitle={t("avPaidInPersonBody", { business: businessName })}
            lines={[paidAt]}
          />
        );
      case "awaiting_confirmation": {
        const cashTip = data.payment.inPersonPayment?.tipAmount;
        return (
          <SuccessHero
            tone="pending"
            icon="hourglass-empty"
            title={t("avAwaitingTitle", { business: businessName })}
            amount={money(data.payment.amountDue)}
            subtitle={t("avAwaitingBody", { business: businessName })}
            lines={[
              cashTip != null && cashTip > 0
                ? t("avCashTipNamed", { amount: money(cashTip) })
                : null,
            ]}
          />
        );
      }
      case "membership":
        return (
          <SuccessHero
            icon="card-membership"
            title={t("avMembershipTitle")}
            subtitle={t("avMembershipBody")}
          />
        );
      case "no_charge":
        return (
          <SuccessHero title={t("avNoChargeTitle")} subtitle={t("avNoChargeBody")} />
        );
      default:
        return (
          <SuccessHero
            title={t("avServiceCompleteTitle")}
            subtitle={t("avServiceCompleteBody", { business: businessName })}
          />
        );
    }
  };

  const renderDone = () => {
    if (!data) return null;
    const paidTip = data.tip.tip;
    const review = data.review.review;
    const actions: Array<{
      key: string;
      label: string;
      icon: React.ComponentProps<typeof FlowButton>["icon"];
      onPress: () => void;
    }> = [];
    if (data.review.canReview && !review) {
      actions.push({
        key: "review",
        label: t("avLeaveReview"),
        icon: "star",
        onPress: () => openReview(data),
      });
    }
    if (tipSeparate) {
      actions.push({
        key: "tip",
        label: t("avAddTip"),
        icon: "volunteer-activism",
        onPress: () => {
          const first = data.tip.suggestedAmounts?.[0];
          resetTip(first != null ? { kind: "amount", amount: first } : { kind: "custom" });
          setActionError(null);
          setStep("tipOnly");
        },
      });
    }
    if (data.review.canReview && review) {
      actions.push({
        key: "editReview",
        label: t("avEditReview"),
        icon: "rate-review",
        onPress: () => openReview(data),
      });
    }
    actions.push({
      key: "details",
      label: t("avViewDetails"),
      icon: "receipt-long",
      onPress: openDetails,
    });
    if (data.canBookAgain) {
      actions.push({
        key: "bookAgain",
        label: t("bookAgain"),
        icon: "event-repeat",
        onPress: openBookAgain,
      });
    }

    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderDoneHero()}

        {!confirmingPayment && paidTip ? (
          <FlowCard style={styles.card}>
            <MoneyRow
              label={t("avTipFor", {
                name: formatTipRecipientName(paidTip.recipientName) || proName,
              })}
              value={formatVisitMoney(paidTip.amount, paidTip.currency || currency)}
            />
            <Text style={styles.tipSub}>
              {paidTip.paymentChannel === "in_person" ||
              paidTip.source === "in_person"
                ? t("avTipCashChannel")
                : t("avTipOnlineChannel")}
            </Text>
          </FlowCard>
        ) : null}

        {!confirmingPayment &&
        !paidTip &&
        data.tip.payWith === "none" &&
        data.tip.reason &&
        !data.tip.tipDeclined ? (
          <InfoNote text={data.tip.reason} />
        ) : null}

        {!confirmingPayment && review ? (
          <FlowCard style={styles.card}>
            <SectionLabel label={t("avYourReview")} />
            <View
              style={styles.reviewStars}
              accessible
              accessibilityLabel={t("avStarsLabel", {
                count: review.overallRating,
              })}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name={star <= review.overallRating ? "star" : "star-border"}
                  size={moderateWidthScale(22)}
                  color={
                    star <= review.overallRating
                      ? theme.orangeBrown
                      : theme.lightGreen2
                  }
                />
              ))}
            </View>
            {review.comment ? (
              <Text style={styles.reviewComment}>{review.comment}</Text>
            ) : null}
          </FlowCard>
        ) : null}

        {!confirmingPayment ? (
          <View style={styles.actions}>
            {actions.map((action, index) => (
              <FlowButton
                key={action.key}
                label={action.label}
                icon={action.icon}
                variant={index === 0 ? "primary" : "outline"}
                onPress={action.onPress}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  const renderTipOnly = () => {
    if (!data) return null;
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <FlowTitle title={t("avTipTitle")} subtitle={t("avTipSubtitle")} />
          <PersonRow
            name={tipRecipientName}
            subtitle={
              data.tip.recipient?.type === "business"
                ? t("avTipTheTeam")
                : t("avYourProfessional")
            }
            image={tipRecipientImage}
          />
          {renderTipChooser(false, t("avNoTip"))}
          {tipErrorNote}
          {errorNote}
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label:
              tipAmount != null && tipAmount > 0
                ? t("avSendTipAmount", { amount: money(tipAmount) })
                : t("avSendTip"),
            onPress: sendSeparateTip,
            loading: busy,
            icon: "volunteer-activism",
          }}
        />
      </>
    );
  };

  const renderReview = () => {
    if (!data) return null;
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <PersonRow
            name={proName}
            subtitle={data.staff ? businessName : null}
            image={data.staff?.image ?? data.business.logoUrl}
          />
          <Text style={styles.question} accessibilityRole="header">
            {t("avHowWasIt")}
          </Text>
          <StarRating value={rating} onChange={setRating} />
          {suggestions.length > 0 ? (
            <View style={{ gap: moderateHeightScale(10) }}>
              <SectionLabel label={t("avWhatStoodOut")} meta={t("optional")} />
              <View style={styles.chipsRow}>
                {suggestions.map((suggestion) => {
                  const on = suggestion.id === suggestionId;
                  return (
                    <TouchableOpacity
                      key={suggestion.id}
                      activeOpacity={0.8}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() =>
                        setSuggestionId(on ? null : suggestion.id)
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {suggestion.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
          <FlowTextField
            label={t("avReviewCommentLabel")}
            placeholder={t("avReviewCommentPlaceholder")}
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
          {errorNote}
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label: data.review.review ? t("avUpdateReview") : t("avSubmitReview"),
            onPress: sendReview,
            disabled: rating === 0,
            loading: busy,
          }}
          hint={rating === 0 ? t("avPickStars") : null}
        />
      </>
    );
  };

  // ── Frame ──────────────────────────────────────────────────────────────
  // Steps carry their own big title, so the header keeps the flow's name.
  const headerTitle = step === "review" ? t("avLeaveReview") : t("viewAndPay");
  const headerStep =
    stepIndex >= 0 && payPath.length > 1
      ? { current: stepIndex + 1, total: payPath.length }
      : null;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.darkGreen} />
      </View>
    );
  } else if (loadError || !data) {
    body = (
      <View style={styles.centered}>
        <InfoNote
          tone="error"
          icon="error-outline"
          text={loadError || t("avLoadError")}
          style={{ alignSelf: "stretch" }}
        />
        <View style={[styles.actions, { alignSelf: "stretch" }]}>
          <FlowButton label={t("retry")} onPress={() => void load()} />
          {appointmentId ? (
            <FlowButton
              variant="outline"
              label={t("avViewDetails")}
              onPress={openDetails}
            />
          ) : null}
        </View>
      </View>
    );
  } else {
    body =
      step === "visit"
        ? renderVisit()
        : step === "method"
          ? renderMethod()
          : step === "tip"
            ? renderTip()
            : step === "salon"
              ? renderSalon()
              : step === "tipOnly"
                ? renderTipOnly()
                : step === "review"
                  ? renderReview()
                  : renderDone();
  }

  return (
    <View style={styles.root}>
      <FlowHeader
        title={headerTitle}
        step={headerStep}
        onBack={onHeaderBack}
        backDisabled={busy}
        backIcon={previousStep() ? "back" : "close"}
      />
      {body}
    </View>
  );
}
