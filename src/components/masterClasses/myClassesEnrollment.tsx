// Customer enrollment screen (app/(main)/classes/enrollment.tsx): status
// banner, class summary, when & where, payment, policy, cancel sheet and
// the loading placeholder.

import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import type { ClassEnrollment, MasterClass } from "@/src/types/masterClass";
import {
  ClassBadgeTone,
  formatClassDate,
  formatClassDateTime,
  formatClassPrice,
  formatClassTime,
  formatDuration,
  formatIsoOnOwnClock,
  getClassAddress,
  getClassWhenText,
  getInstructorName,
  getRefundIfCancelledNow,
  getToneColors,
} from "@/src/utils/masterClassHelpers";
import {
  ClassSummaryRow,
  IoniconName,
  MetaRow,
  SectionCard,
  StatusChip,
} from "@/src/components/masterClasses/parts";

const useStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── Status banner ───────────────────────────────────────────────────

type StatusBannerProps = {
  enrollment: ClassEnrollment;
  /** Pending seat: still waiting for the payment to land. */
  checking?: boolean;
};

export function MyEnrollmentStatusBanner({
  enrollment,
  checking = false,
}: StatusBannerProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();

  let tone: ClassBadgeTone = "neutral";
  let icon: IoniconName = "information-circle-outline";
  let title = "";
  let text = "";

  switch (enrollment.status) {
    case "confirmed":
      tone = "live";
      icon = "checkmark-circle";
      title = t("mcYoureEnrolled");
      text = t("mcEnrollConfirmedText");
      break;
    case "pending":
      tone = "info";
      icon = "time-outline";
      title = t("mcEnrollStatusPending");
      text = t("mcEnrollPendingText");
      break;
    case "cancelled":
      tone = "neutral";
      icon = "close-circle-outline";
      title = t("mcEnrollStatusCancelled");
      text =
        enrollment.cancelled_by === "pro"
          ? t("mcCancelledByPro")
          : enrollment.cancelled_by === "admin"
            ? t("mcCancelledByAdmin")
            : t("mcCancelledByStudent");
      break;
    case "refunded":
      tone = "warning";
      icon = "return-down-back-outline";
      title = t("mcEnrollStatusRefunded");
      text = enrollment.refund?.reason || t("mcEnrollRefundedText");
      break;
    case "failed":
      tone = "danger";
      icon = "alert-circle-outline";
      title = t("mcEnrollStatusFailed");
      text = t("mcEnrollFailedText");
      break;
    case "expired":
      tone = "neutral";
      icon = "hourglass-outline";
      title = t("mcEnrollStatusExpired");
      text = t("mcEnrollExpiredText");
      break;
  }

  const c = getToneColors(theme, tone);
  const fg = tone === "neutral" ? theme.darkGreen : c.fg;

  return (
    <View
      style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${text}`}
    >
      <View style={[styles.bannerIcon, { borderColor: c.border }]}>
        {checking ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <Ionicons name={icon} size={iconScale(22)} color={fg} />
        )}
      </View>
      <View style={styles.bannerBody}>
        <Text style={[styles.bannerTitle, { color: fg }]}>{title}</Text>
        {text ? <Text style={styles.bannerText}>{text}</Text> : null}
      </View>
    </View>
  );
}

// ── Rescheduled notice ──────────────────────────────────────────────

export function MyEnrollmentRescheduledNotice({ cls }: { cls: MasterClass }) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const date = formatClassDateTime(cls.date, cls.time);
  return (
    <View style={styles.notice}>
      <Ionicons
        name="swap-horizontal"
        size={iconScale(20)}
        color={theme.orangeBrownText}
        style={styles.noticeIcon}
      />
      <View style={styles.noticeBody}>
        <Text style={styles.noticeTitle}>{t("mcRescheduled")}</Text>
        <Text style={styles.noticeText}>
          {t("mcRescheduledBanner", { date: date || t("mcNoDateYet") })}
        </Text>
      </View>
    </View>
  );
}

// ── Class summary (tap → class detail) ──────────────────────────────

type SummaryProps = {
  cls: MasterClass;
  onPress: () => void;
};

export function MyEnrollmentClassCard({ cls, onPress }: SummaryProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const instructor = getInstructorName(cls);
  const business = cls.business?.title ?? "";
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.summaryCard}
      accessibilityRole="button"
      accessibilityLabel={[cls.title, getClassWhenText(cls), business]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint={t("mcViewClass")}
    >
      <ClassSummaryRow masterClass={cls} thumbSize={moderateWidthScale(80)}>
        <MetaRow icon="storefront-outline" text={business} />
        {instructor && instructor !== business ? (
          <MetaRow
            icon="person-outline"
            text={t("mcByInstructor", { name: instructor })}
          />
        ) : null}
      </ClassSummaryRow>
      <View style={styles.summaryFooter}>
        <Text style={styles.summaryLink}>{t("mcViewClass")}</Text>
        <Ionicons
          name="chevron-forward"
          size={iconScale(16)}
          color={theme.darkGreen}
        />
      </View>
    </TouchableOpacity>
  );
}

// ── When & where ────────────────────────────────────────────────────

async function openInMaps(
  address: string,
  lat: number | null,
  lng: number | null,
) {
  const query = encodeURIComponent(address);
  const hasCoords = lat != null && lng != null;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${query}${hasCoords ? `&ll=${lat},${lng}` : ""}`
      : `https://www.google.com/maps/search/?api=1&query=${
          hasCoords ? `${lat},${lng}` : query
        }`;
  await Linking.openURL(url);
}

type InfoLineProps = {
  icon: IoniconName;
  label: string;
  value: string;
  children?: React.ReactNode;
};

function InfoLine({ icon, label, value, children }: InfoLineProps) {
  const { theme, styles } = useStyles();
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={iconScale(18)} color={theme.darkGreen} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {value}
        </Text>
        {children}
      </View>
    </View>
  );
}

type WhenWhereProps = {
  cls: MasterClass;
  /** Join / maps buttons only for a live seat. */
  active: boolean;
};

export function MyEnrollmentWhenWhere({ cls, active }: WhenWhereProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const online = cls.format === "online";
  const address = getClassAddress(cls);
  const time = formatClassTime(cls.time);
  const duration = formatDuration(cls.duration_minutes);

  const onMaps = async () => {
    if (!address) return;
    try {
      await openInMaps(
        address,
        cls.location?.latitude ?? null,
        cls.location?.longitude ?? null,
      );
    } catch {
      Alert.alert(t("error"), t("unableToOpenMaps"));
    }
  };

  const onJoin = async () => {
    if (!cls.meeting_url) return;
    try {
      await Linking.openURL(cls.meeting_url);
    } catch {
      Alert.alert(t("error"), t("mcSomethingWrong"));
    }
  };

  return (
    <SectionCard title={t("mcWhenWhere")} icon="calendar-outline">
      <View style={styles.infoList}>
        <InfoLine
          icon="calendar-clear-outline"
          label={t("mcDate")}
          value={formatClassDate(cls.date) || t("mcNoDateYet")}
        />
        {time ? (
          <InfoLine
            icon="time-outline"
            label={t("mcFieldTime")}
            value={duration ? `${time} • ${duration}` : time}
          />
        ) : null}
        {online ? (
          <InfoLine
            icon="videocam-outline"
            label={t("mcLocation")}
            value={t("mcOnlineClass")}
          >
            {active && cls.meeting_url ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onJoin}
                style={styles.joinButton}
                accessibilityRole="link"
                accessibilityLabel={t("mcJoinClass")}
              >
                <Ionicons
                  name="videocam"
                  size={iconScale(18)}
                  color={theme.white}
                />
                <Text style={styles.joinButtonText}>{t("mcJoinClass")}</Text>
              </TouchableOpacity>
            ) : active ? (
              <Text style={styles.infoHint}>{t("mcMeetingLinkSoon")}</Text>
            ) : null}
          </InfoLine>
        ) : (
          <InfoLine
            icon="location-outline"
            label={t("mcLocation")}
            value={address || cls.business?.title || t("mcFormatInPerson")}
          >
            {address ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onMaps}
                style={styles.outlineButton}
                accessibilityRole="link"
                accessibilityLabel={`${t("mcOpenInMaps")}, ${address}`}
              >
                <Ionicons
                  name="navigate-outline"
                  size={iconScale(17)}
                  color={theme.darkGreen}
                />
                <Text style={styles.outlineButtonText}>
                  {t("mcOpenInMaps")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </InfoLine>
        )}
      </View>
    </SectionCard>
  );
}

// ── Payment ─────────────────────────────────────────────────────────

export function MyEnrollmentPaymentCard({
  enrollment,
}: {
  enrollment: ClassEnrollment;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const paidOn = formatIsoOnOwnClock(enrollment.paid_at, false);
  const refund = enrollment.refund;

  if (enrollment.amount <= 0 && !refund) return null;

  return (
    <SectionCard title={t("mcPayment")} icon="card-outline">
      <View style={styles.payRow}>
        <View style={styles.payLeft}>
          <Text style={styles.payLabel}>{t("mcAmountPaid")}</Text>
          {paidOn ? (
            <Text style={styles.payHint}>{t("mcPaidOn", { date: paidOn })}</Text>
          ) : null}
        </View>
        <Text style={styles.payValue}>
          {formatClassPrice(enrollment.amount)}
        </Text>
      </View>
      {refund ? (
        <>
          <View style={styles.divider} />
          <View style={styles.payRow}>
            <View style={styles.payLeft}>
              <Text style={styles.payLabel}>
                {t("mcRefundAmount", {
                  amount: formatClassPrice(refund.amount),
                })}
              </Text>
              {refund.reason ? (
                <Text style={styles.payHint}>{refund.reason}</Text>
              ) : null}
            </View>
            <StatusChip
              tone={refund.status === "refunded" ? "live" : "warning"}
              label={
                refund.status === "refunded"
                  ? t("mcRefundDone")
                  : t("mcRefundProcessing")
              }
              icon={
                refund.status === "refunded"
                  ? "checkmark-circle"
                  : "hourglass-outline"
              }
            />
          </View>
          {refund.status === "processing" ? (
            <Text style={[styles.payHint, { color: theme.textMuted }]}>
              {t("mcRefundProcessingText")}
            </Text>
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
}

// ── Cancellation policy ─────────────────────────────────────────────

export function MyEnrollmentPolicyCard({
  enrollment,
}: {
  enrollment: ClassEnrollment;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const terms = enrollment.class?.cancellation_terms;
  const live = enrollment.status === "confirmed" && enrollment.can_cancel;
  const refundNow = getRefundIfCancelledNow(enrollment);

  let line: { text: string; icon: IoniconName; warn: boolean } | null = null;
  if (live && !enrollment.rescheduled) {
    if (refundNow > 0 && enrollment.refund_deadline) {
      line = {
        text: t("mcRefundDeadline", {
          date: formatIsoOnOwnClock(enrollment.refund_deadline),
        }),
        icon: "time-outline",
        warn: false,
      };
    } else if (refundNow <= 0) {
      line = {
        text: t("mcNoRefundNow"),
        icon: "alert-circle-outline",
        warn: true,
      };
    }
  }

  if (!terms && !line) return null;

  return (
    <SectionCard title={t("mcCancellationPolicy")} icon="shield-checkmark-outline">
      {terms ? <Text style={styles.bodyText}>{terms}</Text> : null}
      {line ? (
        <View style={[styles.policyLine, terms ? styles.policyLineGap : null]}>
          <Ionicons
            name={line.icon}
            size={iconScale(16)}
            color={line.warn ? theme.orangeBrownText : theme.successGreen}
          />
          <Text
            style={[
              styles.policyLineText,
              { color: line.warn ? theme.orangeBrownText : theme.successGreen },
            ]}
          >
            {line.text}
          </Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

// ── Cancel button + confirm sheet ───────────────────────────────────

export function MyEnrollmentCancelButton({
  onPress,
  loading = false,
}: {
  onPress: () => void;
  /** Checking the latest refund before the confirm sheet opens. */
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={loading}
      style={styles.cancelButton}
      accessibilityRole="button"
      accessibilityLabel={t("mcCancelEnrollment")}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.red} />
      ) : (
        <Ionicons
          name="close-circle-outline"
          size={iconScale(19)}
          color={theme.red}
        />
      )}
      <Text style={styles.cancelButtonText}>{t("mcCancelEnrollment")}</Text>
    </TouchableOpacity>
  );
}

type CancelSheetProps = {
  visible: boolean;
  enrollment: ClassEnrollment | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function MyEnrollmentCancelSheet({
  visible,
  enrollment,
  submitting,
  onClose,
  onConfirm,
}: CancelSheetProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const refund = getRefundIfCancelledNow(enrollment);
  const withRefund = refund > 0;
  const tone = getToneColors(theme, withRefund ? "live" : "warning");

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("mcCancelEnrollmentTitle")}
      dismissible={!submitting}
    >
      <View style={styles.sheetBody}>
        {enrollment?.class ? (
          <Text style={styles.sheetClass} numberOfLines={2}>
            {enrollment.class.title}
          </Text>
        ) : null}
        <View
          style={[
            styles.sheetNotice,
            { backgroundColor: tone.bg, borderColor: tone.border },
          ]}
        >
          <Ionicons
            name={withRefund ? "cash-outline" : "alert-circle-outline"}
            size={iconScale(22)}
            color={tone.fg}
          />
          <Text style={[styles.sheetNoticeText, { color: tone.fg }]}>
            {withRefund
              ? t("mcCancelRefundText", { amount: formatClassPrice(refund) })
              : t("mcCancelNoRefundText")}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onConfirm}
          disabled={submitting}
          style={[styles.sheetDanger, submitting && styles.sheetDangerBusy]}
          accessibilityRole="button"
          accessibilityLabel={t("mcCancelEnrollment")}
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.white} />
          ) : (
            <Text style={styles.sheetDangerText}>{t("mcCancelEnrollment")}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onClose}
          disabled={submitting}
          style={styles.sheetKeep}
          accessibilityRole="button"
          accessibilityLabel={t("mcKeepSeat")}
        >
          <Text style={styles.sheetKeepText}>{t("mcKeepSeat")}</Text>
        </TouchableOpacity>
      </View>
    </ModalizeBottomSheet>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

export function MyEnrollmentSkeleton() {
  const { styles } = useStyles();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.skelWrap, { opacity: pulse }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.skel, styles.skelBanner]} />
      <View style={[styles.skel, styles.skelCard]} />
      <View style={[styles.skel, styles.skelTall]} />
      <View style={[styles.skel, styles.skelCard]} />
    </Animated.View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Banner
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
    },
    bannerIcon: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderWidth: 1,
    },
    bannerBody: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    bannerTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
    },
    bannerText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },

    // Rescheduled notice
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme.tilePeach,
      borderColor: theme.orangeBrown30,
      borderWidth: 1,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(14),
    },
    noticeIcon: {
      marginRight: moderateWidthScale(10),
      marginTop: moderateHeightScale(1),
    },
    noticeBody: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    noticeTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    noticeText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },

    // Summary card
    summaryCard: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(12),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    summaryFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: moderateWidthScale(2),
      minHeight: 36,
      marginTop: moderateHeightScale(8),
      paddingTop: moderateHeightScale(8),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    summaryLink: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Info lines
    infoList: {
      gap: moderateHeightScale(14),
    },
    infoLine: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    infoIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    infoBody: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    infoLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
    infoValue: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.35,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    infoHint: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
      minHeight: 44,
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    outlineButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    joinButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(8),
      minHeight: 44,
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
    },
    joinButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // Payment
    payRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    payLeft: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    payLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    payHint: {
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    payValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },

    // Policy
    bodyText: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.5,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    policyLine: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    policyLineGap: {
      marginTop: moderateHeightScale(10),
    },
    policyLineText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontMedium,
    },

    // Cancel
    cancelButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.red,
      backgroundColor: theme.surfaceRaised,
    },
    cancelButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },

    // Sheet
    sheetBody: {
      gap: moderateHeightScale(12),
      paddingTop: moderateHeightScale(6),
    },
    sheetClass: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
    sheetNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
    },
    sheetNoticeText: {
      flex: 1,
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.4,
      fontFamily: fonts.fontBold,
    },
    sheetDanger: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.red,
      marginTop: moderateHeightScale(4),
    },
    sheetDangerBusy: {
      opacity: 0.8,
    },
    sheetDangerText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sheetKeep: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
    },
    sheetKeepText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Skeleton
    skelWrap: {
      gap: moderateHeightScale(14),
    },
    skel: {
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(14),
    },
    skelBanner: {
      height: moderateHeightScale(72),
    },
    skelCard: {
      height: moderateHeightScale(140),
    },
    skelTall: {
      height: moderateHeightScale(200),
    },
  });
