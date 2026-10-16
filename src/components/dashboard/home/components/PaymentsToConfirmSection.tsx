import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  formatVisitDateTime,
  formatVisitMoney,
} from "@/src/components/afterVisit/afterVisitParts";
import type { InPersonPayment } from "@/src/types/afterVisit";

/**
 * Business home: "I paid at the salon" claims nobody has confirmed yet
 * (GET /appointments?in_person_payment_status=claimed). Staff see only their
 * own appointments. Tapping a card opens Confirm payment / Not received.
 */
type ClaimAppointment = {
  id: number;
  user?: string | null;
  staffName?: string | null;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: string;
  totalPrice?: number | string | null;
  services?: Array<{ id: number; name: string }>;
  subscriptionServices?: Array<{ id: number; name: string }> | unknown;
  subscription?: string | null;
  inPersonPayment?: InPersonPayment | null;
};

type Props = {
  /** Bumped by the home screen's pull-to-refresh. */
  refreshKey: number;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(6),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    countBadge: {
      backgroundColor: theme.selectCard,
      minWidth: moderateWidthScale(22),
      height: moderateWidthScale(22),
      paddingHorizontal: moderateWidthScale(6),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
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
      borderColor: theme.upcomingBorder,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
    },
    amount: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(8),
      fontVariant: ["tabular-nums"],
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(6),
    },
    infoText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginLeft: moderateWidthScale(6),
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: moderateHeightScale(10),
      marginTop: moderateHeightScale(6),
      gap: moderateWidthScale(8),
    },
    chip: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
      flexShrink: 1,
    },
    chipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    reviewLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      minHeight: moderateHeightScale(32),
    },
    reviewLinkText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

function serviceLabel(item: ClaimAppointment): string {
  const list =
    item.appointmentType === "subscription" &&
    Array.isArray(item.subscriptionServices)
      ? (item.subscriptionServices as Array<{ name: string }>)
      : item.services ?? [];
  if (list.length === 0) return item.subscription || "—";
  if (list.length === 1) return list[0].name;
  return `${list[0].name} +${list.length - 1}`;
}

export default function PaymentsToConfirmSection({ refreshKey }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const [items, setItems] = useState<ClaimAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const refreshOnReturn = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: {
          data?: ClaimAppointment[];
          meta?: { total?: number };
        };
      }>(
        appointmentsEndpoints.list({
          in_person_payment_status: "claimed",
          sort: "appointment_date",
          direction: "desc",
          per_page: 20,
        }),
      );
      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      setItems(list);
      setTotal(response?.data?.meta?.total ?? list.length);
    } catch (error) {
      Logger.error("Payments to confirm fetch error:", error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnReturn.current) {
        refreshOnReturn.current = false;
        void load();
      }
    }, [load]),
  );

  if (items.length === 0) return null;

  const openPayment = (id: number) => {
    refreshOnReturn.current = true;
    router.push({
      pathname: "/(main)/appointmentOutcome" as any,
      params: { bookingId: String(id), step: "payment" },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t("ptcTitle")}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{total}</Text>
        </View>
      </View>
      <Text style={styles.helpText}>{t("ptcHelp")}</Text>

      {items.map((item) => {
        const amount = Number(item.totalPrice);
        const tip = item.inPersonPayment?.tipAmount ?? 0;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => openPayment(item.id)}
            accessibilityRole="button"
            accessibilityHint={t("ptcCardHint")}
          >
            <View style={styles.topRow}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {serviceLabel(item)}
              </Text>
              {Number.isFinite(amount) && amount > 0 ? (
                <Text style={styles.amount}>{formatVisitMoney(amount)}</Text>
              ) : null}
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="person-outline"
                size={iconScale(15)}
                color={theme.darkGreen}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.user || t("aoCustomer")}
                {item.staffName ? ` · ${item.staffName}` : ""}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={iconScale(15)}
                color={theme.darkGreen}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {formatVisitDateTime(item.appointmentDate, item.appointmentTime)}
              </Text>
            </View>
            <View style={styles.footer}>
              <View style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {tip > 0
                    ? t("ptcClaimWithTip", { tip: formatVisitMoney(tip) })
                    : t("ptcClaim")}
                </Text>
              </View>
              <View style={styles.reviewLink}>
                <Text style={styles.reviewLinkText}>{t("ptcReview")}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={iconScale(20)}
                  color={theme.darkGreen}
                />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
