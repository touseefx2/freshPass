import React, { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { getStripeModeHeaders } from "@/src/services/stripeService";
import OutcomeConfirmSheet from "@/src/components/OutcomeConfirmSheet";
import Logger from "@/src/services/logger";
import type { OutcomePreview } from "@/src/types/cancellationPolicy";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppSelector } from "@/src/hooks/hooks";
import { PersonIcon } from "@/assets/icons";
import dayjs from "dayjs";

export interface AwaitingOutcomeAppointment {
  id: number;
  user: string;
  staffName?: string | null;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: "service" | "subscription" | string;
  paymentMethod?: string;
  paidAt?: string | null;
  canMarkOutcome?: boolean;
  hasSavedCard?: boolean;
  services?: Array<{ id: number; name: string }>;
  subscriptionServices?: Array<{ id: number; name: string }>;
  subscription?: string | null;
  serviceName?: string;
}

interface AwaitingOutcomeSectionProps {
  data: AwaitingOutcomeAppointment[] | null;
  loading?: boolean;
  onRefresh: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(6),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    countBadge: {
      backgroundColor: theme.darkGreen,
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    viewAllText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
    },
    helpText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
      marginBottom: moderateHeightScale(12),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
    },
    serviceName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      flex: 1,
    },
    priceText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(8),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    infoText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginLeft: moderateWidthScale(6),
      flexShrink: 1,
    },
    infoLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    staffRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
    },
    staffRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    statusSeparator: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: moderateHeightScale(10),
      marginTop: moderateHeightScale(6),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    statusLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    chip: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
    },
    chipPaid: {
      backgroundColor: theme.apptMintBg,
    },
    chipMembership: {
      backgroundColor: theme.lightBeige,
    },
    chipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    chipTextPaid: {
      color: theme.apptMintAccent,
    },
    chipTextMembership: {
      color: theme.darkGreen,
    },
    actionsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(10),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    actionButton: {
      flex: 1,
      height: moderateHeightScale(34),
      borderRadius: moderateWidthScale(6),
      alignItems: "center",
      justifyContent: "center",
    },
    completedButton: {
      backgroundColor: theme.apptMintBg,
      borderWidth: 1,
      borderColor: theme.apptMintAccent,
    },
    noShowButton: {
      backgroundColor: theme.lightRed,
      borderWidth: 1,
      borderColor: theme.lightRedBorder,
    },
    completedButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.apptMintAccent,
    },
    noShowButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    loaderWrap: {
      paddingVertical: moderateHeightScale(12),
      alignItems: "center",
    },
  });

function formatServiceLabel(item: AwaitingOutcomeAppointment): string {
  if (item.appointmentType === "subscription") {
    const services = item.subscriptionServices || item.services || [];
    if (item.serviceName) return item.serviceName;
    if (services.length === 0) return item.subscription || "—";
    if (services.length === 1) return services[0].name;
    return `${services[0].name} +${services.length - 1} more`;
  }
  if (item.serviceName) return item.serviceName;
  const services = item.services || [];
  if (services.length === 0) return "—";
  if (services.length === 1) return services[0].name;
  return `${services[0].name} +${services.length - 1} more`;
}

function formatDateTime(date: string, time: string): string {
  const dateObj = dayjs(date, "MM/DD/YYYY");
  const formattedDate = dateObj.isValid()
    ? dateObj.format("MMM D, YYYY")
    : date;
  const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
  const formattedTime = timeObj.isValid()
    ? timeObj.format("h:mm A")
    : time;
  return `${formattedDate} • ${formattedTime}`;
}

export default function AwaitingOutcomeSection({
  data,
  loading,
  onRefresh,
}: AwaitingOutcomeSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const userRole = useAppSelector((state) => state.user.userRole);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeOutcome, setActiveOutcome] = useState<
    "completed" | "no_show" | null
  >(null);
  const [preview, setPreview] = useState<OutcomePreview | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Hide appointments as soon as they're marked so the next one can be processed
  // while the list refetches.
  const [processedIds, setProcessedIds] = useState<number[]>([]);
  // Ignore preview responses that arrive after another appointment was opened.
  const previewRequestRef = useRef(0);

  const items = (data || []).filter((item) => !processedIds.includes(item.id));
  if (!loading && items.length === 0) {
    return null;
  }

  const openDetails = (id: number) => {
    router.push({
      pathname: "/(main)/bookingDetailsById",
      params: { bookingId: String(id) },
    });
  };

  const openOutcomePreview = async (
    id: number,
    outcome: "completed" | "no_show",
  ) => {
    if (confirming) return;
    const requestId = ++previewRequestRef.current;
    setActiveId(id);
    setActiveOutcome(outcome);
    setPreview(null);
    setSubmitError(null);
    setPreviewLoading(true);
    setSheetVisible(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message?: string;
        data: OutcomePreview;
      }>(appointmentsEndpoints.outcomePreview(id, outcome));
      if (requestId !== previewRequestRef.current) return;
      if (response.success && response.data) {
        setPreview(response.data);
      } else {
        setSheetVisible(false);
        showBanner(
          t("error"),
          response.message || "Could not load outcome preview.",
          "error",
          2500,
        );
      }
    } catch (error: any) {
      if (requestId !== previewRequestRef.current) return;
      Logger.error("Outcome preview error:", error);
      setSheetVisible(false);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          "Could not load outcome preview.",
        "error",
        2500,
      );
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (confirming) return;
    if (!activeId || !activeOutcome) {
      setSubmitError("Unable to mark outcome. Please close and try again.");
      return;
    }
    const id = activeId;
    setSubmitError(null);
    setConfirming(true);
    try {
      const stripeHeaders = await getStripeModeHeaders();
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
        data?: unknown;
      }>(
        appointmentsEndpoints.markOutcome(id),
        { outcome: activeOutcome },
        { headers: stripeHeaders },
      );

      if (response.success) {
        showBanner(
          t("success"),
          response.message || "Outcome marked successfully.",
          "success",
          2500,
        );
        setProcessedIds((prev) => [...prev, id]);
        setSheetVisible(false);
        setPreview(null);
        setActiveId(null);
        onRefresh();
      } else {
        setSubmitError(response.message || "Unable to mark outcome.");
      }
    } catch (error: any) {
      Logger.error("Mark outcome error:", error);
      setSubmitError(
        error?.data?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to mark outcome.",
      );
    } finally {
      setConfirming(false);
    }
  };

  const confirmLabel =
    activeOutcome === "no_show" ? t("confirmNoShow") : t("markCompleted");

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>{t("awaitingOutcome")}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{items.length}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(main)/dashboard/(calendar)")}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>{t("viewAll")} &gt;</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.helpText}>{t("awaitingOutcomeHelp")}</Text>

      {loading && items.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      ) : (
        items.map((item) => {
          const isMembership = item.appointmentType === "subscription";
          const isPayLater =
            !isMembership &&
            item.paymentMethod === "pay_later" &&
            !item.paidAt;
          const paymentChipLabel = isMembership
            ? item.subscription || t("membershipsSection")
            : isPayLater
              ? t("payLaterLabel")
              : t("paidLabel");
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => openDetails(item.id)}
            >
              {/* Row 1: Service name + Price */}
              <View style={styles.cardRow}>
                <Text numberOfLines={1} style={styles.serviceName}>
                  {formatServiceLabel(item)}
                </Text>
              </View>

              {/* Row 2: Customer */}
              <View style={styles.infoRow}>
                <PersonIcon
                  width={moderateWidthScale(15)}
                  height={moderateWidthScale(15)}
                  color={theme.darkGreen}
                />
                <Text numberOfLines={1} style={styles.infoText}>
                  Customer: {item.user || "Customer"}
                </Text>
              </View>

              {/* Row 3: Barber / Staff */}
              {item.staffName ? (
                <View style={styles.staffRow}>
                  <View style={styles.staffRowLeft}>
                    <Ionicons
                      name="person-circle-outline"
                      size={iconScale(16)}
                      color={theme.darkGreen}
                    />
                    <Text numberOfLines={1} style={styles.infoText}>
                      Barber: {item.staffName}
                    </Text>
                  </View>
                  <Entypo
                    name="chevron-small-right"
                    size={iconScale(22)}
                    color={theme.darkGreen}
                  />
                </View>
              ) : null}

              {/* Row 4: Date/Time */}
              <View style={styles.infoRow}>
                <Ionicons
                  name="time-outline"
                  size={iconScale(16)}
                  color={theme.darkGreen}
                />
                <Text numberOfLines={1} style={styles.infoText}>
                  {formatDateTime(
                    item.appointmentDate,
                    item.appointmentTime,
                  )}
                </Text>
              </View>

              {/* Row 5: Status row with separator */}
              <View style={styles.statusSeparator}>
                <View style={styles.footerGroup}>
                  <Text style={styles.statusLabel}>Appointment:</Text>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{t("awaitingOutcome")}</Text>
                  </View>
                </View>
                <View style={styles.footerGroup}>
                  <Text style={styles.statusLabel}>Payment:</Text>
                  <View
                    style={[
                      styles.chip,
                      isMembership
                        ? styles.chipMembership
                        : !isPayLater && styles.chipPaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isMembership
                          ? styles.chipTextMembership
                          : !isPayLater && styles.chipTextPaid,
                      ]}
                      numberOfLines={1}
                    >
                      {paymentChipLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Row 6: Action buttons */}
              {item.canMarkOutcome ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completedButton]}
                    onPress={() => openOutcomePreview(item.id, "completed")}
                  >
                    <Text style={styles.completedButtonText}>
                      {t("markCompleted")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.noShowButton]}
                    onPress={() => openOutcomePreview(item.id, "no_show")}
                  >
                    <Text style={styles.noShowButtonText}>
                      {t("markNoShow")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}

      <OutcomeConfirmSheet
        visible={sheetVisible}
        onClose={() => {
          if (!confirming) {
            setSheetVisible(false);
            setPreview(null);
            setSubmitError(null);
          }
        }}
        onConfirm={handleConfirm}
        title={
          preview?.title ||
          (activeOutcome === "no_show"
            ? t("confirmNoShow")
            : t("markCompleted"))
        }
        question={
          preview?.question || (previewLoading ? "Loading..." : "")
        }
        message={preview?.message || ""}
        confirmLabel={confirmLabel}
        confirmDestructive={activeOutcome === "no_show"}
        showNoSavedCardWarning={
          !!preview &&
          preview.appointmentType !== "subscription" &&
          activeOutcome === "no_show" &&
          !preview.hasSavedCard &&
          !preview.paid
        }
        confirming={confirming || previewLoading}
        submitting={confirming}
        errorMessage={submitError}
      />
    </View>
  );
}
