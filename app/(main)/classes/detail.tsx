// Customer class detail + enroll (backend guide 13.4).
// GET /master-classes/{id} → Enroll Now → payment sheet on the pro's Stripe
// account → poll the enrollment until confirmed / refunded → result view.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useStripe } from "@stripe/stripe-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import LocalVideoPreviewModal from "@/src/components/localVideoPreviewModal";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { getOwnBusinessIds } from "@/src/state/slices/userSlice";
// Not a React hook despite the name: points the Stripe SDK at an account.
import { useStripeAccount as setStripeAccount } from "@/src/services/stripeService";
import {
  enrollmentPaymentSheet,
  getClass,
  getEnrollment,
  parseApiError,
  pollUntil,
} from "@/src/services/masterClassService";
import type {
  ClassEnrollmentPaymentSheet,
  ClassEnrollmentStatus,
  MasterClass,
} from "@/src/types/masterClass";
import {
  formatClassPrice,
  getClassPrice,
  getClassStatusMeta,
  getInstructorName,
  getSeatsLeft,
} from "@/src/utils/masterClassHelpers";
import { resetToDashboardHome } from "@/src/utils/navigation";
import {
  ClassStateView,
  ClassTypePill,
  StatusChip,
} from "@/src/components/masterClasses/parts";
import {
  CLASS_DETAIL_GUTTER,
  ClassDetailHero,
  ClassDetailInfoGrid,
  ClassDetailInstructor,
  ClassDetailLocationCard,
  ClassDetailSkeleton,
  ClassDetailTextSection,
} from "@/src/components/masterClasses/classDetailParts";
import {
  ClassDetailEnrollBar,
  ClassEnrollBarMode,
} from "@/src/components/masterClasses/classDetailEnrollBar";
import {
  ClassDetailConfirming,
  ClassDetailResult,
  ClassEnrollResultKind,
} from "@/src/components/masterClasses/classDetailResult";

type LoadState = "loading" | "ready" | "notFound" | "error";
/** idle → starting (server call) → sheet (Stripe UI) → confirming (poll) → result */
type Phase = "idle" | "starting" | "sheet" | "confirming" | "result";

type EnrollResult = {
  kind: ClassEnrollResultKind;
  enrollmentId: number;
  amount: number | null;
  reason: string | null;
  /** Snapshot: the class may 404 later (e.g. last seat taken). */
  masterClass: MasterClass;
};

/** Poll stops on any of these. */
const SETTLED: ClassEnrollmentStatus[] = [
  "confirmed",
  "refunded",
  "failed",
  "cancelled",
  "expired",
];

export default function ClassDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const params = useLocalSearchParams<{ id?: string }>();
  const classId = params.id ? String(params.id) : "";

  const user = useAppSelector((s) => s.user);
  const isGuest = !!user.isGuest;

  const [cls, setCls] = useState<MasterClass | null>(null);
  const [load, setLoad] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const loadedRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Load ──────────────────────────────────────────────────────────

  const fetchClass = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!classId) {
        setLoad("notFound");
        return;
      }
      if (mode === "initial") setLoad("loading");
      if (mode === "refresh") setRefreshing(true);
      try {
        const data = await getClass(classId);
        if (!mountedRef.current) return;
        setCls(data);
        setLoad("ready");
        loadedRef.current = true;
      } catch (e) {
        if (!mountedRef.current) return;
        const err = parseApiError(e);
        if (err.status === 404) {
          setCls(null);
          setLoad("notFound");
        } else if (!loadedRef.current) {
          setLoad("error");
        }
        // A failed background refresh keeps the class on screen.
      } finally {
        if (mountedRef.current && mode === "refresh") setRefreshing(false);
      }
    },
    [classId],
  );

  useEffect(() => {
    void fetchClass("initial");
  }, [fetchClass]);

  // Back from My class (cancelled there?) → refresh seats / my_enrollment.
  useFocusEffect(
    useCallback(() => {
      if (loadedRef.current && !busyRef.current && phaseRef.current === "idle") {
        void fetchClass("silent");
      }
    }, [fetchClass]),
  );

  // ── Navigation ────────────────────────────────────────────────────

  // No leaving while Stripe is open or the payment is being confirmed.
  const locked = phase === "sheet" || phase === "confirming";
  usePreventRemove(locked, () => {});

  const goBack = useCallback(() => {
    if (busyRef.current && phaseRef.current !== "starting") return;
    if (router.canGoBack()) router.back();
    else resetToDashboardHome();
  }, [router]);

  const openBusiness = useCallback(() => {
    const id = cls?.business?.id;
    if (!id) return;
    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: String(id) },
    } as any);
  }, [cls?.business?.id, router]);

  const openEnrollment = useCallback(
    (enrollmentId: number, replace = false) => {
      const href = {
        pathname: "/(main)/classes/enrollment",
        params: { id: String(enrollmentId) },
      } as any;
      if (replace) {
        router.replace(href);
        return;
      }
      // Enrollment already under this page: go back to it (no Detail ↔ Enrollment pile-up)
      const routes = navigation.getState()?.routes ?? [];
      if (routes.some((r) => r.name === "enrollment")) router.dismissTo(href);
      else router.push(href);
    },
    [navigation, router],
  );

  // ── Who can enroll ────────────────────────────────────────────────

  const isOwnClass = useMemo(() => {
    const businessId = cls?.business?.id;
    if (!businessId) return false;
    return getOwnBusinessIds(user).includes(Number(businessId));
  }, [cls?.business?.id, user]);

  const price = useMemo(
    () =>
      cls ? getClassPrice(cls) : { current: null as number | null, original: null },
    [cls],
  );

  const enrolledId =
    cls?.my_enrollment && cls.my_enrollment.status === "confirmed"
      ? cls.my_enrollment.id
      : null;

  const blockedReason = useMemo(() => {
    if (!cls) return "";
    if (isOwnClass) return t("mcOwnClassNoEnroll");
    if (!isGuest && user.userRole !== "customer") return t("mcEnrollCustomerOnly");
    if (cls.can_enroll === false || cls.status !== "published") {
      return getSeatsLeft(cls) === 0 && cls.status === "published"
        ? t("mcClassIsFull")
        : t("mcNotTakingEnrollments");
    }
    if (price.current == null) return t("mcNotTakingEnrollments");
    return "";
  }, [cls, isGuest, isOwnClass, price, t, user.userRole]);

  const barMode: ClassEnrollBarMode = enrolledId
    ? "enrolled"
    : blockedReason
      ? "blocked"
      : "enroll";

  const summary = useMemo(() => {
    if (!cls || price.current == null) return "";
    const business = cls.business?.title || getInstructorName(cls);
    const parts: string[] = [];
    if (business) {
      parts.push(
        t("mcPayToBusiness", {
          amount: formatClassPrice(price.current),
          business,
        }),
      );
    }
    if (cls.cancellation_window_hours) {
      parts.push(t("mcFullRefundWindow", { hours: cls.cancellation_window_hours }));
    }
    return parts.join(" ");
  }, [cls, price, t]);

  // ── Enroll (13.4) ─────────────────────────────────────────────────

  const enroll = useCallback(async () => {
    if (!cls || busyRef.current) return;
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    busyRef.current = true;
    setEnrollError(null);
    setPhase("starting");

    // 1. Seat hold + PaymentIntent on the pro's account
    let sheet: ClassEnrollmentPaymentSheet;
    try {
      sheet = await enrollmentPaymentSheet(cls.id);
      if (
        !sheet.paymentIntentClientSecret ||
        !sheet.connectedAccountId ||
        !sheet.enrollmentId
      ) {
        throw new Error(t("mcPaymentFailed"));
      }
    } catch (e) {
      busyRef.current = false;
      if (!mountedRef.current) return;
      const err = parseApiError(e, t("mcPaymentFailed"));
      setEnrollError(err.status === 403 ? t("mcOwnClassNoEnroll") : err.message);
      setPhase("idle");
      // Full / closed / already enrolled: show the class as it is now
      if (err.status === 422) void fetchClass("silent");
      return;
    }
    // Left the screen while the server answered: don't pop a sheet elsewhere
    if (!mountedRef.current) {
      busyRef.current = false;
      return;
    }

    // 2. Payment sheet (direct charge → connected account)
    setPhase("sheet");
    try {
      await setStripeAccount(sheet.connectedAccountId);
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "FreshPass",
        // Stripe rejects an empty customer: only pass what the server sent
        ...(sheet.customerId ? { customerId: sheet.customerId } : {}),
        ...(sheet.customerSessionClientSecret
          ? { customerSessionClientSecret: sheet.customerSessionClientSecret }
          : {}),
        paymentIntentClientSecret: sheet.paymentIntentClientSecret,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      await setStripeAccount(null);

      if (presentError) {
        // Closed the sheet: the seat hold just expires
        if (presentError.code === "Canceled") {
          busyRef.current = false;
          if (mountedRef.current) setPhase("idle");
          return;
        }
        throw new Error(presentError.message);
      }
    } catch (e: any) {
      await setStripeAccount(null).catch(() => {});
      busyRef.current = false;
      if (!mountedRef.current) return;
      setEnrollError(e?.message || t("mcPaymentFailed"));
      setPhase("idle");
      return;
    }

    // 3. The webhook confirms the seat — never trust the sheet alone
    if (mountedRef.current) setPhase("confirming");
    const poll = await pollUntil(
      () => getEnrollment(sheet.enrollmentId),
      (enrollment) => SETTLED.includes(enrollment.status),
      { isCancelled: () => !mountedRef.current },
    );
    busyRef.current = false;
    if (poll.cancelled || !mountedRef.current) return;

    const status = poll.value?.status;
    if (status === "failed" || status === "cancelled" || status === "expired") {
      setEnrollError(t("mcPaymentFailed"));
      setPhase("idle");
      void fetchClass("silent");
      return;
    }
    const kind: ClassEnrollResultKind =
      status === "confirmed" ? "confirmed" : status === "refunded" ? "refunded" : "pending";
    setResult({
      kind,
      enrollmentId: sheet.enrollmentId,
      amount: poll.value?.amount || sheet.amount || price.current,
      reason: poll.value?.refund?.reason ?? null,
      masterClass: poll.value?.class ?? cls,
    });
    setPhase("result");
    // Seats / my_enrollment for when the student comes back here
    void fetchClass("silent");
  }, [
    cls,
    dispatch,
    fetchClass,
    initPaymentSheet,
    isGuest,
    presentPaymentSheet,
    price,
    t,
  ]);

  // ── Render ────────────────────────────────────────────────────────

  const header = <StackHeader title="" centerLogo onBack={goBack} />;

  let body: React.ReactNode;
  if (phase === "confirming") {
    body = <ClassDetailConfirming />;
  } else if (phase === "result" && result) {
    body = (
      <ClassDetailResult
        kind={result.kind}
        masterClass={result.masterClass}
        amount={result.amount}
        refundReason={result.reason}
        onViewMine={() => openEnrollment(result.enrollmentId, true)}
        onGoHome={resetToDashboardHome}
        bottomInset={insets.bottom}
      />
    );
  } else if (load === "loading") {
    body = <ClassDetailSkeleton />;
  } else if (load === "notFound") {
    body = (
      <ClassStateView
        icon="school-outline"
        title={t("mcClassUnavailable")}
        message={t("mcClassUnavailableText")}
        actionLabel={t("goBack")}
        actionIcon="arrow-back"
        onAction={goBack}
        style={styles.state}
      />
    );
  } else if (load === "error" || !cls) {
    body = (
      <ClassStateView
        icon="cloud-offline-outline"
        title={t("mcClassLoadError")}
        message={t("mcSomethingWrong")}
        actionLabel={t("retry")}
        actionIcon="refresh"
        onAction={() => void fetchClass("initial")}
        style={styles.state}
      />
    );
  } else {
    const statusMeta = cls.status !== "published" ? getClassStatusMeta(cls.status) : null;
    const cancellationText =
      cls.cancellation_terms ||
      (cls.cancellation_window_hours
        ? t("mcFullRefundWindow", { hours: cls.cancellation_window_hours })
        : null);
    const busy = phase === "starting" || phase === "sheet";

    body = (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchClass("refresh")}
              enabled={!busy}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
        >
          <ClassDetailHero masterClass={cls} onPlay={() => setVideoOpen(true)} />

          <View style={styles.headBlock}>
            <View style={styles.pillRow}>
              <ClassTypePill label={cls.label} size="md" showIcon />
              {statusMeta ? <StatusChip meta={statusMeta} /> : null}
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {cls.title}
            </Text>
          </View>

          <ClassDetailInstructor masterClass={cls} onPress={openBusiness} />
          <ClassDetailInfoGrid masterClass={cls} />
          <ClassDetailLocationCard masterClass={cls} />
          <ClassDetailTextSection
            title={t("mcWhatYoullLearn")}
            icon="bulb-outline"
            text={cls.description}
          />
          <ClassDetailTextSection
            title={t("mcPrerequisites")}
            icon="list-outline"
            text={cls.prerequisites}
          />
          <ClassDetailTextSection
            title={t("mcCancellationPolicy")}
            icon="shield-checkmark-outline"
            text={cancellationText}
          />
        </ScrollView>

        <ClassDetailEnrollBar
          mode={barMode}
          price={price}
          blockedReason={blockedReason}
          summary={summary}
          busy={busy}
          error={enrollError}
          onDismissError={() => setEnrollError(null)}
          onEnroll={() => void enroll()}
          onViewMine={() => enrolledId && openEnrollment(enrolledId)}
          bottomInset={insets.bottom}
        />

        <LocalVideoPreviewModal
          visible={videoOpen}
          uri={cls.media?.type === "video" ? cls.media.url : null}
          onClose={() => setVideoOpen(false)}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      {body}
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
    content: {
      paddingHorizontal: CLASS_DETAIL_GUTTER,
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(14),
    },
    headBlock: {
      gap: moderateHeightScale(8),
      paddingTop: moderateHeightScale(2),
    },
    pillRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    title: {
      fontSize: fontSize.size24,
      lineHeight: fontSize.size24 * 1.25,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    state: {
      flex: 1,
    },
  });
