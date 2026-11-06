// Pay $50 & Publish / Renew (client Design 4).
// Params: `id` (class), `mode?` ("renew").
// Flow (backend guide 13.2): listing payment sheet → Stripe sheet on the
// FreshPass account → poll the class until the listing is active (renew:
// until the end date moves) → success. The sheet's own success is never
// treated as published.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useStripe } from "@stripe/stripe-react-native";
import * as Haptics from "expo-haptics";
import StackHeader from "@/src/components/StackHeader";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { ensureStripeReady } from "@/src/services/stripeService";
import {
  getClass,
  listingPaymentSheet,
  parseApiError,
  pollUntil,
} from "@/src/services/masterClassService";
import type { MasterClass } from "@/src/types/masterClass";
import {
  formatClassPrice,
  formatIsoOnOwnClock,
  getClassWhenText,
  getListedUntilText,
  getListingBadge,
} from "@/src/utils/masterClassHelpers";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import { useOpenStripeConnect } from "@/src/components/masterClasses/useOpenStripeConnect";
import {
  ClassStateView,
  ClassSummaryRow,
  MetaRow,
  SectionCard,
  StatusChip,
} from "@/src/components/masterClasses/parts";
import {
  PublishButton,
  PublishErrorNotice,
  PublishHero,
  PublishMissingCard,
  PublishPromotionCard,
  PublishSecureNote,
  PublishStatusView,
  PublishStripeCard,
} from "@/src/components/masterClasses/publishParts";

type Phase =
  | "review" // promotion card + Pay button
  | "starting" // asking the server for the payment sheet
  | "paying" // Stripe sheet open
  | "confirming" // polling the class after the sheet
  | "pending" // poll timed out — payment taken, not confirmed yet
  | "success";

type LoadError = { title: string; message: string; icon: "lock-closed-outline" | "alert-circle-outline" | "school-outline" };

const LIST_ROUTE = "/(main)/masterClasses";
const EDITOR_ROUTE = "/(main)/masterClasses/editor";
const DETAIL_ROUTE = "/(main)/masterClasses/detail";

const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Ready-to-show form messages from `missing` / 422 field errors. The class id
 * error is not a form field, and `stripe` is fixed in Connect, not the form.
 */
const NOT_FORM_FIELDS = ["master_class_id", "stripe"];
const missingMessages = (fields: Record<string, string> | null | undefined) =>
  Object.entries(fields ?? {})
    .filter(([key, msg]) => !NOT_FORM_FIELDS.includes(key) && !!msg)
    .map(([, msg]) => msg);

export default function PublishClassScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const userName = useAppSelector((s) => s.user.name);
  const userEmail = useAppSelector((s) => s.user.email);
  const stripeDone = useAppSelector((s) =>
    isStripeOnboardingCompleted(s.user.businessStatus),
  );
  const openStripe = useOpenStripeConnect();

  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const classId = Number(params.id);
  const validId = Number.isFinite(classId) && classId > 0;

  const [cls, setCls] = useState<MasterClass | null>(null);
  // load() is memoized; read the shown class from a ref, not a stale closure
  const clsRef = useRef<MasterClass | null>(null);
  clsRef.current = cls;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [phase, setPhase] = useState<Phase>("review");
  const [payError, setPayError] = useState<string | null>(null);
  const [serverMissing, setServerMissing] = useState<string[] | null>(null);
  /** 422 `stripe` from the payment sheet call (Connect not done / revoked). */
  const [serverStripe, setServerStripe] = useState<string | null>(null);
  const [feeOverride, setFeeOverride] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  // Listing end before paying — a renewal is confirmed once it moves later
  const prevEndsAtRef = useRef<string | null>(null);
  const renewRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Load ─────────────────────────────────────────────────────────

  const load = useCallback(
    async (asRefresh = false) => {
      if (!validId) {
        setLoadError({
          title: t("mcClassUnavailable"),
          message: "",
          icon: "school-outline",
        });
        setLoading(false);
        return;
      }
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await getClass(classId);
        if (!mountedRef.current) return;
        setCls(data);
        setLoadError(null);
        setServerMissing(null);
        setServerStripe(null);
        setPayError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        const e = parseApiError(err, t("mcLoadError"));
        // Keep the screen on a refresh failure when a class is already shown
        if (asRefresh && clsRef.current) {
          setPayError(e.message);
        } else if (e.status === 403) {
          setLoadError({ title: t("mcOwnerOnly"), message: "", icon: "lock-closed-outline" });
        } else if (e.status === 404) {
          setLoadError({ title: t("mcClassUnavailable"), message: "", icon: "school-outline" });
        } else {
          setLoadError({ title: t("mcLoadError"), message: e.message === t("mcLoadError") ? "" : e.message, icon: "alert-circle-outline" });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [classId, validId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // ── Derived ──────────────────────────────────────────────────────

  const isRenew =
    params.mode === "renew" || (cls != null && cls.status === "published");
  const listing = cls?.listing ?? null;
  const fee = feeOverride ?? listing?.fee ?? 50;
  const days = listing?.days ?? 30;
  const feeText = formatClassPrice(fee);
  const liveNow = listing?.status === "active";

  /** Why this class can't be paid for right now (null = it can). */
  const blockedReason = useMemo<string | null>(() => {
    if (!cls) return null;
    if (cls.status === "draft") return null;
    if (cls.status === "published") {
      return listing?.can_renew ? null : t("mcRenewUnavailable");
    }
    // cancelled / suspended / removed
    if (cls.status === "cancelled") return t("mcCancelledText");
    if (cls.status === "suspended") return t("mcSuspendedText");
    return t("mcRemovedText");
  }, [cls, listing?.can_renew, t]);

  // Stripe is fixed in Connect: shown as its own card, never blocks retrying Pay
  const stripeMessage =
    serverStripe ??
    (!stripeDone && cls?.status === "draft" ? cls.missing?.stripe || null : null);

  const missing = useMemo(() => {
    if (serverMissing && serverMissing.length) return serverMissing;
    if (cls?.status === "draft") {
      const list = missingMessages(cls.missing);
      return list.length ? list : null;
    }
    return null;
  }, [cls, serverMissing]);

  // ── Back handling (no leaving while paying / confirming) ─────────

  const locked = phase === "starting" || phase === "paying" || phase === "confirming";
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const goToMyClasses = useCallback(() => {
    router.dismissTo(LIST_ROUTE as any);
  }, [router]);

  const viewClass = useCallback(() => {
    const target = { pathname: DETAIL_ROUTE as any, params: { id: String(classId) } };
    // POP_TO matches by route name: with no detail in this stack it would
    // replace this screen and leave the editor under the class. Drop back to
    // the list first so Back from the class lands there.
    const routes = navigation.getState()?.routes ?? [];
    if (routes.some((r) => r.name === "detail")) {
      router.dismissTo(target);
    } else {
      router.dismissTo(LIST_ROUTE as any);
      router.push(target);
    }
  }, [navigation, router, classId]);

  const backToEdit = useCallback(() => {
    router.dismissTo({ pathname: EDITOR_ROUTE as any, params: { id: String(classId) } });
  }, [router, classId]);

  const handleBack = useCallback(() => {
    if (lockedRef.current) return;
    // After paying, the form behind this screen is stale — land on the list
    if (phaseRef.current === "success" || phaseRef.current === "pending") {
      goToMyClasses();
      return;
    }
    if (router.canGoBack()) router.back();
    else goToMyClasses();
  }, [goToMyClasses, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (lockedRef.current) return true;
      if (phaseRef.current === "success" || phaseRef.current === "pending") {
        goToMyClasses();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goToMyClasses]);

  // Swipe / parent-stack pops while the payment is in flight
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      const type = event?.data?.action?.type;
      if (lockedRef.current && (type === "GO_BACK" || type === "POP")) {
        event.preventDefault();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // ── Pay ──────────────────────────────────────────────────────────

  const confirm = useCallback(async () => {
    setPhase("confirming");
    const isRenewal = renewRef.current;
    const prevMs = toMs(prevEndsAtRef.current);
    const prevRaw = prevEndsAtRef.current;
    const result = await pollUntil(
      () => getClass(classId),
      (value) => {
        if (value.listing?.status !== "active") return false;
        if (!isRenewal) return value.status === "published";
        const nextRaw = value.listing.ends_at;
        if (!prevRaw) return true;
        const nextMs = toMs(nextRaw);
        return nextMs != null && prevMs != null ? nextMs > prevMs : nextRaw !== prevRaw;
      },
      { intervalMs: 2000, timeoutMs: 30000, isCancelled: () => !mountedRef.current },
    );
    if (!mountedRef.current || result.cancelled) return;
    if (result.value) setCls(result.value);
    if (result.matched) {
      setPhase("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setPhase("pending");
    }
  }, [classId]);

  const pay = useCallback(async () => {
    if (busyRef.current || !cls || blockedReason || missing) return;
    busyRef.current = true;
    setPayError(null);
    setServerMissing(null);
    setServerStripe(null);
    setPhase("starting");
    renewRef.current = isRenew;
    prevEndsAtRef.current = cls.listing?.ends_at ?? null;

    let sheetPresented = false;
    try {
      const sheet = await listingPaymentSheet(classId);
      if (!mountedRef.current) return;
      if (sheet.amount) setFeeOverride(sheet.amount);
      if (!sheet.paymentIntentClientSecret) throw new Error(t("mcPaymentFailed"));

      // FreshPass's own account: never a connected account here
      await ensureStripeReady();
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "FreshPass",
        paymentIntentClientSecret: sheet.paymentIntentClientSecret,
        ...(sheet.customerId ? { customerId: sheet.customerId } : {}),
        ...(sheet.customerSessionClientSecret
          ? { customerSessionClientSecret: sheet.customerSessionClientSecret }
          : {}),
        defaultBillingDetails: {
          name: userName || undefined,
          email: userEmail || undefined,
        },
      });
      if (initError) throw new Error(initError.message || t("mcPaymentFailed"));

      setPhase("paying");
      sheetPresented = true;
      const { error: presentError } = await presentPaymentSheet();
      if (!mountedRef.current) return;

      if (presentError) {
        // Closed the sheet: the class stays as it is, nothing to report
        if (presentError.code === "Canceled") {
          setPhase("review");
          return;
        }
        throw new Error(presentError.message || t("mcPaymentFailed"));
      }

      await confirm();
    } catch (err) {
      if (!mountedRef.current) return;
      const e = parseApiError(err, t("mcPaymentFailed"));
      if (!sheetPresented && e.status === 422) {
        const list = missingMessages(e.fieldErrors);
        const stripe = e.fieldErrors.stripe || null;
        if (stripe) setServerStripe(stripe);
        if (list.length) setServerMissing(list);
        else if (!stripe) setPayError(e.message);
      } else if (e.status === 403) {
        setPayError(t("mcOwnerOnly"));
      } else {
        setPayError(e.message);
      }
      setPhase("review");
    } finally {
      busyRef.current = false;
    }
  }, [
    blockedReason,
    classId,
    cls,
    confirm,
    initPaymentSheet,
    isRenew,
    missing,
    presentPaymentSheet,
    t,
    userEmail,
    userName,
  ]);

  const checkAgain = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await confirm();
    } finally {
      busyRef.current = false;
    }
  }, [confirm]);

  // ── Render ───────────────────────────────────────────────────────

  const screenOptions = <Stack.Screen options={{ gestureEnabled: phase === "review" }} />;
  const header = <StackHeader title="" centerLogo onBack={handleBack} />;

  if (loading || loadError || !cls) {
    return (
      <View style={styles.container}>
        {screenOptions}
        {header}
        <ClassStateView
          loading={loading}
          icon={loadError?.icon}
          title={loadError?.title}
          message={loadError?.message || undefined}
          actionLabel={loadError?.icon === "alert-circle-outline" ? t("retry") : t("back")}
          actionIcon={loadError?.icon === "alert-circle-outline" ? "refresh" : "arrow-back"}
          onAction={loadError?.icon === "alert-circle-outline" ? () => void load() : handleBack}
          style={styles.stateFill}
        />
      </View>
    );
  }

  const classPreview = (
    <SectionCard>
      <ClassSummaryRow masterClass={cls} thumbSize={moderateWidthScale(96)}>
        <MetaRow icon="calendar-outline" text={getClassWhenText(cls)} />
        <MetaRow
          icon="people-outline"
          text={t("mcSeatsCount", { taken: cls.seats_taken ?? 0, total: cls.capacity ?? 0 })}
        />
        {cls.status === "published" ? (
          <StatusChip meta={getListingBadge(cls)} style={styles.previewChip} />
        ) : null}
      </ClassSummaryRow>
    </SectionCard>
  );

  // Confirming / pending / success replace the content
  if (phase === "confirming" || phase === "pending" || phase === "success") {
    const listedUntil = formatIsoOnOwnClock(
      cls.listing?.listed_until || cls.listing?.ends_at,
      false,
    );
    return (
      <View style={styles.container}>
        {screenOptions}
        {header}
        <ScrollView
          contentContainerStyle={[
            styles.statusContent,
            { paddingBottom: insets.bottom + moderateHeightScale(24) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {phase === "confirming" ? (
            <PublishStatusView
              kind="confirming"
              title={t("mcConfirmingPayment")}
              message={t("mcConfirmingPaymentText")}
            />
          ) : phase === "pending" ? (
            <>
              <PublishStatusView
                kind="pending"
                title={t("mcPaymentPendingTitle")}
                message={t("mcPaymentPendingText")}
              />
              <View style={styles.actions}>
                <PublishButton
                  label={t("mcGoToMyClasses")}
                  icon="list-outline"
                  onPress={goToMyClasses}
                />
                <PublishButton
                  label={t("mcCheckAgain")}
                  icon="refresh"
                  variant="outline"
                  onPress={() => void checkAgain()}
                />
                <PublishButton
                  label={t("goToHome")}
                  variant="text"
                  onPress={resetToDashboardHome}
                />
              </View>
            </>
          ) : (
            <>
              <PublishStatusView
                kind="success"
                title={renewRef.current ? t("mcRenewedTitle") : t("mcLiveTitle")}
                message={listedUntil ? t("mcListedUntil", { date: listedUntil }) : undefined}
                note={t("mcReceiptNote")}
              >
                {classPreview}
              </PublishStatusView>
              <View style={styles.actions}>
                <PublishButton label={t("mcViewClass")} icon="eye-outline" onPress={viewClass} />
                <PublishButton
                  label={t("mcGoToMyClasses")}
                  icon="list-outline"
                  variant="outline"
                  onPress={goToMyClasses}
                />
                <PublishButton
                  label={t("goToHome")}
                  variant="text"
                  onPress={resetToDashboardHome}
                />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // Review (also while the sheet is starting / open)
  const busy = phase === "starting" || phase === "paying";
  const payLabel = isRenew
    ? t("mcPayAndRenew", { amount: feeText })
    : t("mcPayAndPublish", { amount: feeText });
  const extendsFrom = isRenew && liveNow ? getListedUntilText(listing) : null;

  return (
    <View style={styles.container}>
      {screenOptions}
      {header}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            enabled={!busy}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        <PublishHero
          title={isRenew ? t("mcRenewTitle") : t("mcPublishTitle")}
          subtitle={t("mcPublishSubtitle")}
        />

        <View style={styles.section}>{classPreview}</View>

        {blockedReason ? (
          <View style={styles.section}>
            <PublishErrorNotice message={blockedReason} />
          </View>
        ) : (
          <>
            {stripeMessage ? (
              <View style={styles.section}>
                <PublishStripeCard message={stripeMessage} onConnect={openStripe} />
              </View>
            ) : null}
            {missing ? (
              <View style={styles.section}>
                <PublishMissingCard messages={missing} onBackToEdit={backToEdit} />
              </View>
            ) : null}
          </>
        )}

        <View style={styles.section}>
          <PublishPromotionCard fee={fee} days={days} extendsFrom={extendsFrom} />
        </View>

        {payError ? (
          <View style={styles.section}>
            <PublishErrorNotice message={payError} />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + moderateHeightScale(12) },
        ]}
      >
        <PublishButton
          label={payLabel}
          icon="card-outline"
          onPress={() => void pay()}
          loading={busy}
          disabled={!!blockedReason || !!missing}
        />
        <PublishButton
          label={t("cancel")}
          variant="outline"
          onPress={handleBack}
          disabled={busy}
          style={styles.footerSecondary}
        />
        <View style={styles.footerNote}>
          <PublishSecureNote />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    stateFill: {
      flex: 1,
    },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(22),
      paddingBottom: moderateHeightScale(24),
    },
    section: {
      marginTop: moderateHeightScale(18),
    },
    previewChip: {
      marginTop: moderateHeightScale(2),
    },
    statusContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(32),
    },
    actions: {
      marginTop: moderateHeightScale(28),
      gap: moderateHeightScale(10),
    },
    footer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    footerSecondary: {
      marginTop: moderateHeightScale(10),
    },
    footerNote: {
      marginTop: moderateHeightScale(12),
    },
  });
