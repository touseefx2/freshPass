import React, { useMemo, useState } from "react";
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
  paymentMethod?: string;
  paidAt?: string | null;
  canMarkOutcome?: boolean;
  hasSavedCard?: boolean;
  services?: Array<{ id: number; name: string }>;
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
      marginBottom: moderateHeightScale(6),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    cardLeft: {
      flex: 1,
      gap: moderateHeightScale(7),
      paddingRight: moderateWidthScale(8),
    },
    cardRight: {
      alignItems: "flex-end",
      justifyContent: "flex-start",
      gap: moderateHeightScale(8),
      maxWidth: "38%",
    },
    serviceName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.black,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    infoText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginLeft: moderateWidthScale(2),
      flexShrink: 1,
    },
    chip: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(4),
    },
    chipPaid: {
      backgroundColor: theme.apptMintBg,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    chipTextPaid: {
      color: theme.apptMintAccent,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    staffText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "right",
    },
    actionsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(12),
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
  if (item.serviceName) return item.serviceName;
  const services = item.services || [];
  if (services.length === 0) return "—";
  if (services.length === 1) return services[0].name;
  return `${services[0].name} +${services.length - 1} more`;
}

function formatDateTime(date: string, time: string): string {
  const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
  if (timeObj.isValid()) {
    return `${date} - ${timeObj.format("h:mm a")}`;
  }
  return `${date} - ${time}`;
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

  const items = data || [];
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
    setActiveId(id);
    setActiveOutcome(outcome);
    setPreview(null);
    setPreviewLoading(true);
    setSheetVisible(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message?: string;
        data: OutcomePreview;
      }>(appointmentsEndpoints.outcomePreview(id, outcome));
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
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeId || !activeOutcome || confirming) return;
    setConfirming(true);
    try {
      const stripeHeaders = await getStripeModeHeaders();
      const response = await ApiService.post<{
        success: boolean;
        message?: string;
        data?: unknown;
      }>(
        appointmentsEndpoints.markOutcome(activeId),
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
        setSheetVisible(false);
        setPreview(null);
        onRefresh();
      } else {
        showBanner(
          t("error"),
          response.message || "Unable to mark outcome.",
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Mark outcome error:", error);
      showBanner(
        t("error"),
        error?.response?.data?.message ||
          error?.message ||
          "Unable to mark outcome.",
        "error",
        3000,
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
        <Text style={styles.sectionTitle}>{t("awaitingOutcome")}</Text>
      </View>
      <Text style={styles.helpText}>{t("awaitingOutcomeHelp")}</Text>

      {loading && items.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      ) : (
        items.map((item) => {
          const isPayLater =
            item.paymentMethod === "pay_later" && !item.paidAt;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => openDetails(item.id)}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text numberOfLines={1} style={styles.serviceName}>
                    {formatServiceLabel(item)}
                  </Text>
                  <View style={styles.infoRow}>
                    <PersonIcon
                      width={moderateWidthScale(15)}
                      height={moderateWidthScale(15)}
                    />
                    <Text numberOfLines={1} style={styles.infoText}>
                      {item.user || "Customer"}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="time-outline"
                      size={iconScale(15)}
                      color={theme.darkGreen}
                    />
                    <Text numberOfLines={1} style={styles.infoText}>
                      {formatDateTime(
                        item.appointmentDate,
                        item.appointmentTime,
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <View style={styles.statusRow}>
                    <View style={[styles.chip, !isPayLater && styles.chipPaid]}>
                      <Text
                        style={[
                          styles.chipText,
                          !isPayLater && styles.chipTextPaid,
                        ]}
                      >
                        {isPayLater ? t("payLaterLabel") : t("paidLabel")}
                      </Text>
                    </View>
                    <Entypo
                      name="chevron-small-right"
                      size={iconScale(22)}
                      color={theme.darkGreen}
                    />
                  </View>
                  {userRole === "business" && item.staffName ? (
                    <Text numberOfLines={1} style={styles.staffText}>
                      {item.staffName}
                    </Text>
                  ) : null}
                </View>
              </View>

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
          activeOutcome === "no_show" &&
          !preview.hasSavedCard &&
          !preview.paid
        }
        confirming={confirming || previewLoading}
      />
    </View>
  );
}
