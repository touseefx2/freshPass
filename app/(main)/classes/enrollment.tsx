import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  cancelEnrollment,
  getEnrollment,
  parseApiError,
  pollUntil,
} from "@/src/services/masterClassService";
import type { ClassEnrollment } from "@/src/types/masterClass";
import { formatClassPrice } from "@/src/utils/masterClassHelpers";
import {
  CertificationNotice,
  ClassStateView,
} from "@/src/components/masterClasses/parts";
import {
  MyEnrollmentCancelButton,
  MyEnrollmentCancelSheet,
  MyEnrollmentClassCard,
  MyEnrollmentPaymentCard,
  MyEnrollmentPolicyCard,
  MyEnrollmentRescheduledNotice,
  MyEnrollmentSkeleton,
  MyEnrollmentStatusBanner,
  MyEnrollmentWhenWhere,
} from "@/src/components/masterClasses/myClassesEnrollment";

/**
 * One class seat the customer paid for (from My classes or a
 * `class_enrollment` notification): status, when & where, payment,
 * the refund rule and Cancel.
 */
export default function ClassEnrollmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [enrollment, setEnrollment] = useState<ClassEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(
    null,
  );
  const [checking, setChecking] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [preparingCancel, setPreparingCancel] = useState(false);

  const enrollmentId = typeof id === "string" && id.trim() ? id : null;
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const enrollmentRef = useRef(enrollment);
  enrollmentRef.current = enrollment;
  const firstFocusRef = useRef(true);
  const pollingRef = useRef(false);
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** A seat opened before the payment landed: wait for it (≤ 30 s). */
  const waitWhilePending = useCallback(async (eid: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setChecking(true);
    try {
      const result = await pollUntil(
        () => getEnrollment(eid),
        (value) => value.status !== "pending",
        { isCancelled: () => !mountedRef.current },
      );
      if (!mountedRef.current) return;
      if (result.value) {
        // Keep the class from before if the poll answer came without it
        const next = result.value;
        setEnrollment((prev) =>
          next.class || !prev ? next : { ...next, class: prev.class },
        );
      }
    } finally {
      pollingRef.current = false;
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!enrollmentId) {
        setLoading(false);
        setError({ message: t("mcEnrollmentNotFound"), notFound: true });
        return;
      }
      const request = ++requestRef.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      try {
        const next = await getEnrollment(enrollmentId);
        if (!mountedRef.current || request !== requestRef.current) return;
        setEnrollment(next);
        setError(null);
        if (next.status === "pending") void waitWhilePending(enrollmentId);
      } catch (err) {
        if (!mountedRef.current || request !== requestRef.current) return;
        const parsed = parseApiError(err, t("mcSomethingWrong"));
        if (enrollmentRef.current && mode !== "initial") {
          if (mode === "refresh") {
            showBannerRef.current(t("error"), parsed.message, "error");
          }
        } else {
          setEnrollment(null);
          setError({
            message: parsed.message,
            notFound: parsed.status === 404 || parsed.status === 403,
          });
        }
      } finally {
        if (mountedRef.current && request === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enrollmentId, t, waitWhilePending],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  // Back from the class page: the class time or link may have changed
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (enrollmentRef.current) void load("silent");
    }, [load]),
  );

  const openClass = useCallback(() => {
    const classId = enrollmentRef.current?.class?.id;
    if (!classId) return;
    const href = {
      pathname: "/(main)/classes/detail",
      params: { id: String(classId) },
    } as any;
    // Class page already under this one: go back to it (no Detail ↔ Enrollment pile-up)
    const routes = navigation.getState()?.routes ?? [];
    if (routes.some((r) => r.name === "detail")) router.dismissTo(href);
    else router.push(href);
  }, [navigation, router]);

  /** Fetch the refund as it is right now, then ask (money message before an irreversible step). */
  const openCancelSheet = useCallback(async () => {
    if (!enrollmentId || preparingCancel) return;
    setPreparingCancel(true);
    // No requestRef bump: that would strand an in-flight load's spinner.
    // preparingCancel already blocks a second tap.
    try {
      const next = await getEnrollment(enrollmentId);
      if (!mountedRef.current) return;
      setEnrollment((prev) =>
        next.class || !prev ? next : { ...next, class: prev.class },
      );
      // Started or changed meanwhile: the Cancel button goes away instead
      if (next.status === "confirmed" && next.can_cancel) setSheetVisible(true);
    } catch {
      // Offline: the sheet still counts a passed refund deadline as no refund
      if (mountedRef.current) setSheetVisible(true);
    } finally {
      if (mountedRef.current) setPreparingCancel(false);
    }
  }, [enrollmentId, preparingCancel]);

  // Back to My classes if it is under this screen, else open it in place
  const goToMyClasses = useCallback(() => {
    router.dismissTo("/(main)/classes/myClasses" as any);
  }, [router]);

  const onConfirmCancel = useCallback(async () => {
    const current = enrollmentRef.current;
    if (!current || cancelling) return;
    setCancelling(true);
    try {
      const result = await cancelEnrollment(current.id);
      if (!mountedRef.current) return;
      const refundAmount =
        result.enrollment?.refund?.amount ??
        result.enrollment?.amount ??
        current.refund_if_cancelled_now;
      showBannerRef.current(
        result.status === "refunded"
          ? t("mcCancelledRefundResult", {
              amount: formatClassPrice(refundAmount),
            })
          : t("mcCancelledResult"),
        result.message ?? "",
        "success",
      );
      if (result.enrollment) {
        const next = result.enrollment;
        setEnrollment(next.class ? next : { ...next, class: current.class });
      }
      setSheetVisible(false);
      void load("silent");
    } catch (err) {
      if (!mountedRef.current) return;
      const parsed = parseApiError(err, t("mcSomethingWrong"));
      setSheetVisible(false);
      showBannerRef.current(t("error"), parsed.message, "error");
      // The class may have started since this screen loaded
      void load("silent");
    } finally {
      if (mountedRef.current) setCancelling(false);
    }
  }, [cancelling, load, t]);

  const cls = enrollment?.class ?? null;
  const isConfirmed = enrollment?.status === "confirmed";
  const canCancel = !!enrollment && isConfirmed && enrollment.can_cancel;
  const showCertification =
    !!cls &&
    (!!cls.certification_notice || cls.type === "certification_training");

  const renderBody = () => {
    if (loading && !enrollment) return <MyEnrollmentSkeleton />;
    if (error || !enrollment) {
      return error?.notFound ? (
        <ClassStateView
          icon="search-outline"
          title={t("mcEnrollmentNotFound")}
          message={error.message !== t("mcEnrollmentNotFound") ? error.message : undefined}
          actionLabel={t("mcGoToMyClasses")}
          actionIcon="school-outline"
          onAction={goToMyClasses}
          style={styles.state}
        />
      ) : (
        <ClassStateView
          icon="cloud-offline-outline"
          title={t("mcSomethingWrong")}
          message={
            error?.message && error.message !== t("mcSomethingWrong")
              ? error.message
              : undefined
          }
          actionLabel={t("retry")}
          actionIcon="refresh"
          onAction={() => void load("initial")}
          style={styles.state}
        />
      );
    }

    return (
      <View style={styles.sections}>
        <MyEnrollmentStatusBanner enrollment={enrollment} checking={checking} />
        {cls && isConfirmed && enrollment.rescheduled ? (
          <MyEnrollmentRescheduledNotice cls={cls} />
        ) : null}
        {cls ? <MyEnrollmentClassCard cls={cls} onPress={openClass} /> : null}
        {cls ? <MyEnrollmentWhenWhere cls={cls} active={isConfirmed} /> : null}
        <MyEnrollmentPaymentCard enrollment={enrollment} />
        <MyEnrollmentPolicyCard enrollment={enrollment} />
        {showCertification ? (
          <CertificationNotice text={cls?.certification_notice} />
        ) : null}
        {canCancel ? (
          <View style={styles.cancelWrap}>
            <MyEnrollmentCancelButton
              onPress={() => void openCancelSheet()}
              loading={preparingCancel}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("mcMyClasses")} centerLogo />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(28) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          enrollmentId ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          ) : undefined
        }
      >
        {renderBody()}
      </ScrollView>

      <MyEnrollmentCancelSheet
        visible={sheetVisible}
        enrollment={enrollment}
        submitting={cancelling}
        onClose={() => {
          if (!cancelling) setSheetVisible(false);
        }}
        onConfirm={() => void onConfirmCancel()}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
    },
    sections: {
      gap: moderateHeightScale(14),
    },
    cancelWrap: {
      marginTop: moderateHeightScale(6),
    },
    state: {
      flex: 1,
    },
  });
