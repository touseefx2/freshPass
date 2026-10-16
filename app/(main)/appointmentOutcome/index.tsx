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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
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
  PersonRow,
  RadioCard,
  SuccessHero,
  formatIsoDateTime,
  formatVisitDateTime,
  formatVisitMoney,
  parseAmount,
  parseVisitDate,
  sanitizeAmountInput,
} from "@/src/components/afterVisit/afterVisitParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { getStripeModeHeaders } from "@/src/services/stripeService";
import {
  confirmInPersonPayment,
  getApiErrorMessage,
  rejectInPersonPayment,
} from "@/src/services/afterVisitService";
import type { OutcomePreview } from "@/src/types/cancellationPolicy";
import type { InPersonPayment } from "@/src/types/afterVisit";

/**
 * Pro side after a visit, one step at a time:
 * Update status (Completed / No-show + the policy preview) → All set,
 * and the salon payment: Confirm payment received (cash tip) or Not received.
 * Opened from Appointment Details, Needs Attention and the claim notification.
 */
type Outcome = "completed" | "no_show";
type Step = "status" | "done" | "payment" | "reject" | "paid" | "rejected";

type Appointment = {
  id: number;
  user: string | null;
  userProfilePic: string | null;
  appointmentType: "service" | "subscription" | string;
  subscription?: string | { name?: string; title?: string } | null;
  services?: Array<{ id: number; name: string; price?: string | number }>;
  subscriptionServices?: Array<{ id: number; name: string }> | unknown;
  appointmentDate: string;
  appointmentTime: string;
  totalPrice?: number | string | null;
  status: string;
  canMarkOutcome?: boolean;
  canConfirmInPersonPayment?: boolean;
  canRejectInPersonPayment?: boolean;
  inPersonPayment?: InPersonPayment | null;
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
    previewLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
    },
    actions: { gap: moderateHeightScale(12) },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      gap: moderateHeightScale(6),
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

function amountOwed(appt: Appointment | null): number | null {
  const n = Number(appt?.totalPrice);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function AppointmentOutcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    bookingId?: string;
    /** Preselects the choice on the Update status step. */
    outcome?: string;
    /** "payment" | "reject" open the salon payment steps directly. */
    step?: string;
  }>();
  const bookingId = params.bookingId ?? "";
  const entryStep: Step =
    params.step === "payment"
      ? "payment"
      : params.step === "reject"
        ? "reject"
        : "status";

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(entryStep);
  const [outcome, setOutcome] = useState<Outcome | null>(
    params.outcome === "completed" || params.outcome === "no_show"
      ? params.outcome
      : null,
  );
  const [markedOutcome, setMarkedOutcome] = useState<Outcome | null>(null);
  const [preview, setPreview] = useState<OutcomePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequest = useRef(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cashTipText, setCashTipText] = useState("");
  const [recordedTip, setRecordedTip] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [nextLoading, setNextLoading] = useState(false);

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
      const claimTip = data?.inPersonPayment?.tipAmount;
      if (data?.inPersonPayment?.status === "claimed" && claimTip != null && claimTip > 0) {
        setCashTipText(String(claimTip));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Policy preview for the picked outcome (fee / membership visit / walk-in note).
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
    if (step === "status" && outcome && appt?.canMarkOutcome) {
      void loadPreview(outcome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, appt?.canMarkOutcome]);

  // ── Back ───────────────────────────────────────────────────────────────
  const previousStep = (): Step | null => {
    if (step === entryStep) return null;
    if (step === "reject") return "payment";
    if (step === "payment" && markedOutcome) return "done";
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

  // ── Actions ────────────────────────────────────────────────────────────
  const saveOutcome = async () => {
    if (!bookingId || !outcome || busyRef.current) return;
    setActionError(null);
    setBusyState(true);
    try {
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
      }>(
        appointmentsEndpoints.markOutcome(bookingId),
        { outcome },
        { headers: await getStripeModeHeaders() },
      );
      if (!response.success) {
        setActionError(response.message || t("aoSaveError"));
        return;
      }
      setMarkedOutcome(outcome);
      await load(true);
      setStep("done");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("aoSaveError")));
    } finally {
      setBusyState(false);
    }
  };

  const confirmPayment = async () => {
    if (!bookingId || busyRef.current) return;
    const tip = parseAmount(cashTipText) ?? 0;
    if (tip < 0 || tip > 1000) {
      setActionError(t("aoCashTipRange"));
      return;
    }
    setActionError(null);
    setBusyState(true);
    try {
      const updated = await confirmInPersonPayment<Appointment>(bookingId, tip);
      if (updated && typeof updated === "object" && "id" in updated) {
        setAppt(updated);
      }
      setRecordedTip(tip);
      setStep("paid");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("aoConfirmError")));
    } finally {
      setBusyState(false);
    }
  };

  const rejectPayment = async () => {
    if (!bookingId || busyRef.current) return;
    setActionError(null);
    setBusyState(true);
    try {
      const updated = await rejectInPersonPayment<Appointment>(bookingId, reason);
      if (updated && typeof updated === "object" && "id" in updated) {
        setAppt(updated);
      }
      setStep("rejected");
    } catch (error) {
      setActionError(getApiErrorMessage(error, t("aoRejectError")));
    } finally {
      setBusyState(false);
    }
  };

  const openCalendar = () =>
    router.navigate("/(main)/dashboard/(calendar)" as any);
  const openDashboard = () =>
    router.navigate("/(main)/dashboard/(home)" as any);

  const openNextAppointment = async () => {
    if (nextLoading) return;
    setNextLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: { data?: Array<{ id: number; appointmentDate: string; appointmentTime: string }> };
      }>(
        appointmentsEndpoints.list({
          status: "scheduled",
          sort: "appointment_date",
          direction: "asc",
          appointment_from_date: dayjs().format("YYYY-MM-DD"),
          per_page: 20,
        }),
      );
      const now = Date.now();
      const next = (response?.data?.data ?? []).find((item) => {
        if (String(item.id) === bookingId) return false;
        const at = parseVisitDate(item.appointmentDate, item.appointmentTime);
        return !at || at.getTime() >= now;
      });
      if (!next) {
        showBanner(t("aoNextAppointment"), t("aoNoNextAppointment"), "info", 3000);
        return;
      }
      router.replace({
        pathname: "/(main)/bookingDetailsById",
        params: { bookingId: String(next.id) },
      });
    } catch (error) {
      showBanner(
        t("error"),
        getApiErrorMessage(error, t("aoNoNextAppointment")),
        "error",
        3000,
      );
    } finally {
      setNextLoading(false);
    }
  };

  // ── Pieces ─────────────────────────────────────────────────────────────
  const customerName = appt?.user?.trim() || t("aoCustomer");
  const service = serviceLabel(appt);
  const when = appt
    ? formatVisitDateTime(appt.appointmentDate, appt.appointmentTime)
    : "";
  const owed = amountOwed(appt);
  const claim =
    appt?.inPersonPayment?.status === "claimed" ? appt.inPersonPayment : null;

  const customerCard = (
    <FlowCard style={styles.card}>
      <PersonRow
        name={customerName}
        subtitle={service || null}
        image={appt?.userProfilePic}
      />
      {when ? (
        <View style={styles.metaRow}>
          <MaterialIcons
            name="event"
            size={moderateWidthScale(18)}
            color={theme.lightGreen}
          />
          <Text style={styles.metaText}>{when}</Text>
        </View>
      ) : null}
    </FlowCard>
  );

  const errorNote = actionError ? (
    <InfoNote tone="error" icon="error-outline" text={actionError} />
  ) : null;

  const renderStatus = () => {
    if (!appt?.canMarkOutcome) {
      return (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {customerCard}
            <InfoNote text={t("aoAlreadyMarked")} />
          </ScrollView>
          <FlowFooter primary={{ label: t("done"), onPress: leave }} />
        </>
      );
    }
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
          {customerCard}
          <View style={{ gap: moderateHeightScale(12) }} accessibilityRole="radiogroup">
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
          {outcome && preview?.message ? (
            <InfoNote
              tone={outcome === "no_show" ? "warm" : "info"}
              icon={outcome === "no_show" ? "warning-amber" : "info-outline"}
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
            label: t("aoSave"),
            onPress: saveOutcome,
            disabled: !outcome || previewLoading || !!previewError,
            loading: busy,
          }}
          hint={!outcome ? t("aoPickOutcome") : null}
        />
      </>
    );
  };

  const renderDone = () => {
    const noShow = markedOutcome === "no_show";
    const canConfirm = !!appt?.canConfirmInPersonPayment;
    const actions = [
      { key: "calendar", label: t("aoViewInCalendar"), icon: "calendar-month" as const, onPress: openCalendar },
      { key: "next", label: t("aoNextAppointment"), icon: "skip-next" as const, onPress: openNextAppointment, loading: nextLoading },
      { key: "home", label: t("aoBackToDashboard"), icon: "home" as const, onPress: openDashboard },
    ];
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SuccessHero
          tone={noShow ? "danger" : "success"}
          icon={noShow ? "person-off" : "check"}
          title={noShow ? t("aoNoShowDoneTitle") : t("aoCompletedDoneTitle")}
          subtitle={customerName}
          lines={[when]}
        />
        {canConfirm ? (
          <InfoNote
            icon="storefront"
            title={claim ? t("aoClaimWaitingTitle") : null}
            text={
              claim
                ? t("aoClaimWaitingBody", { name: customerName })
                : t("aoPaysAtShop")
            }
          />
        ) : null}
        <View style={styles.actions}>
          {canConfirm ? (
            <FlowButton
              label={t("aoConfirmPayment")}
              icon="payments"
              onPress={() => {
                setActionError(null);
                setStep("payment");
              }}
            />
          ) : null}
          {actions.map((action, index) => (
            <FlowButton
              key={action.key}
              label={action.label}
              icon={action.icon}
              variant={!canConfirm && index === 0 ? "primary" : "outline"}
              onPress={action.onPress}
              loading={"loading" in action ? action.loading : false}
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderPayment = () => {
    if (!appt?.canConfirmInPersonPayment) {
      return (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {customerCard}
            <InfoNote text={t("aoNothingToConfirm")} />
          </ScrollView>
          <FlowFooter primary={{ label: t("done"), onPress: leave }} />
        </>
      );
    }
    const claimedAt = formatIsoDateTime(claim?.claimedAt);
    return (
      <>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={moderateHeightScale(24)}
        >
          <FlowTitle
            title={t("aoPaymentQuestion")}
            subtitle={t("aoPaymentSubtitle")}
          />
          {customerCard}
          {claim ? (
            <InfoNote
              tone="warm"
              icon="storefront"
              title={t("aoClaimTitle", { name: customerName })}
              text={[
                claim.tipAmount != null && claim.tipAmount > 0
                  ? t("aoClaimWithTip", {
                      amount: formatVisitMoney(owed),
                      tip: formatVisitMoney(claim.tipAmount),
                    })
                  : t("aoClaimNoTip", { amount: formatVisitMoney(owed) }),
                claimedAt,
              ]
                .filter(Boolean)
                .join("\n")}
            />
          ) : (
            <InfoNote icon="storefront" text={t("aoPaysAtShop")} />
          )}
          {owed != null ? (
            <FlowCard style={styles.card}>
              <MoneyRow label={t("aoAmountDue")} value={formatVisitMoney(owed)} total />
            </FlowCard>
          ) : null}
          <FlowTextField
            label={t("aoCashTipLabel")}
            prefix="$"
            value={cashTipText}
            onChangeText={(text) => setCashTipText(sanitizeAmountInput(text))}
            keyboardType="decimal-pad"
            placeholder="0.00"
            helper={t("aoCashTipHelper")}
            returnKeyType="done"
          />
          {errorNote}
        </KeyboardAwareScrollView>
        <FlowFooter
          primary={{
            label: t("aoConfirmPayment"),
            onPress: confirmPayment,
            loading: busy,
            icon: "check",
          }}
          tertiary={
            appt.canRejectInPersonPayment
              ? {
                  label: t("aoNotReceived"),
                  onPress: () => {
                    setActionError(null);
                    setStep("reject");
                  },
                  disabled: busy,
                }
              : null
          }
        />
      </>
    );
  };

  const renderReject = () => {
    if (!appt?.canRejectInPersonPayment) {
      return (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {customerCard}
            <InfoNote text={t("aoNoClaimToReject")} />
          </ScrollView>
          <FlowFooter primary={{ label: t("done"), onPress: leave }} />
        </>
      );
    }
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
          {customerCard}
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

  const renderPaid = () => (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SuccessHero
        icon="payments"
        title={t("aoPaidTitle")}
        amount={owed != null ? formatVisitMoney(owed) : null}
        subtitle={t("aoPaidBody", { name: customerName })}
        lines={[
          recordedTip > 0
            ? t("aoPaidCashTip", { amount: formatVisitMoney(recordedTip) })
            : null,
        ]}
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
      : step === "done"
        ? t("aoAllSet")
        : step === "reject" || step === "rejected"
          ? t("aoNotReceived")
          : t("aoPaymentTitle");
  const headerStep =
    step === "status" && appt?.canMarkOutcome
      ? { current: 1, total: 2 }
      : step === "done"
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
        : step === "done"
          ? renderDone()
          : step === "payment"
            ? renderPayment()
            : step === "reject"
              ? renderReject()
              : step === "paid"
                ? renderPaid()
                : renderRejected();
  }

  const isEndScreen = step === "done" || step === "paid" || step === "rejected";

  return (
    <View style={styles.root}>
      <FlowHeader
        title={headerTitle}
        step={headerStep}
        onBack={onHeaderBack}
        backDisabled={busy}
        backIcon={isEndScreen || !previousStep() ? "close" : "back"}
      />
      {body}
    </View>
  );
}
