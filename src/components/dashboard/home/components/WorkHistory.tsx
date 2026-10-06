import React, { useMemo, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Skeleton } from "@/src/components/skeletons";
import EmptyState from "@/src/components/emptyState";
import dayjs from "dayjs";
import { Appointment } from "@/src/components/appointmentDetail";
import { useRouter } from "expo-router";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    workHistoryContainer: {
      marginBottom: moderateHeightScale(24),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
    },
    card: {
      flexDirection: "row",
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: moderateWidthScale(6),
        },
        android: {
          elevation: 3,
          shadowColor: theme.darkGreen,
        },
      }),
    },
    cardAccent: {
      width: moderateWidthScale(4),
    },
    accentScheduled: {
      backgroundColor: theme.orangeBrown,
    },
    accentCompleted: {
      backgroundColor: theme.buttonBack,
    },
    accentCancelled: {
      backgroundColor: theme.red,
    },
    cardContent: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(8),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
      lineHeight: fontSize.size18,
    },
    priceText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      alignSelf: "flex-start",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(4),
    },
    metaText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "capitalize",
    },
    bookingId: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(6),
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      alignSelf: "flex-start",
    },
    statusBadgeScheduled: {
      backgroundColor: theme.orangeBrown30,
    },
    statusBadgeCompleted: {
      backgroundColor: theme.lightGreen1,
    },
    statusBadgeCancelled: {
      backgroundColor: theme.lightRed,
    },
    statusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      textTransform: "capitalize",
    },
    statusTextScheduled: {
      color: theme.orangeBrownText,
    },
    statusTextCompleted: {
      color: theme.darkGreen,
    },
    statusTextCancelled: {
      color: theme.red,
    },
    workHistoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    line: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },
    cardGap: {
      height: moderateHeightScale(10),
    },
    emptyStateContainer: {
      paddingVertical: moderateHeightScale(4),
    },
  });

interface WorkHistoryProps {
  data: Appointment[] | null;
  totalCount: number;

  callApi: () => Promise<void>;
}

export default function WorkHistory({
  data,
  totalCount,
  callApi,
}: WorkHistoryProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    callApi();
  }, []);

  // Format date and time
  const formatDateTime = (date: string, time: string) => {
    const formattedDate = date; // Already formatted as "12/12/2025"
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm A");
    return `${formattedDate} - ${formattedTime}`;
  };

  // Format price
  const formatPrice = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Get service titles
  const getServiceTitles = (appointment: Appointment) => {
    if (
      appointment.appointmentType === "subscription" &&
      Array.isArray(appointment.subscriptionServices) &&
      appointment.subscriptionServices.length > 0
    ) {
      return appointment.subscriptionServices.map((s) => s.name).join(", ");
    } else if (
      appointment.appointmentType === "service" &&
      Array.isArray(appointment.services) &&
      appointment.services.length > 0
    ) {
      return appointment.services.map((s) => s.name).join(", ");
    }
    return t("service");
  };

  const getAccentStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.accentCompleted;
    if (status === "cancelled") return styles.accentCancelled;
    return styles.accentScheduled;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.statusBadgeCompleted;
    if (status === "cancelled") return styles.statusBadgeCancelled;
    return styles.statusBadgeScheduled;
  };

  const getStatusTextStyle = (status: string) => {
    if (status === "completed" || status === "complete") return styles.statusTextCompleted;
    if (status === "cancelled") return styles.statusTextCancelled;
    return styles.statusTextScheduled;
  };

  // Limit to first 5 items for display
  const displayedItems = data ? data.slice(0, 5) : [];

  return (
    <View style={styles.workHistoryContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("workHistory")}</Text>
        {data !== null && data.length > 5 && (
          <TouchableOpacity
            onPress={() => {
              router.push("/(main)/dashboard/(home)/workHistory");
            }}
          >
            <Text style={styles.sectionLink}>{t("viewAll")}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!data ? (
        <Skeleton screenType="WorkHistory" styles={styles} />
      ) : displayedItems.length > 0 ? (
        displayedItems.map((item, index) => (
          <View key={item.id}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: "/(main)/bookingDetailsById",
                  params: {
                    bookingId: String(item.id),
                  },
                });
              }}
            >
              <View style={styles.card}>
                <View style={[styles.cardAccent, getAccentStyle(item.status)]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {getServiceTitles(item)}
                    </Text>
                    <Text style={styles.priceText}>
                      {formatPrice(item.paidAmount ?? item.totalPrice)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusBadgeStyle(item.status), { marginBottom: moderateHeightScale(4) }]}>
                    <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
                      {item.status === "scheduled" ? t("onGoingApt") : item.status}
                    </Text>
                  </View>
                  {!!item.user && (
                    <View style={styles.metaRow}>
                      <MaterialIcons name="person-outline" size={moderateWidthScale(14)} color={theme.lightGreen} />
                      <Text style={styles.metaText}>{item.user}</Text>
                    </View>
                  )}
                  {!!item.staffName && (
                    <View style={styles.metaRow}>
                      <MaterialIcons name="content-cut" size={moderateWidthScale(14)} color={theme.lightGreen} />
                      <Text style={styles.metaText}>{item.staffName}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <MaterialIcons name="schedule" size={moderateWidthScale(14)} color={theme.lightGreen} />
                    <Text style={styles.metaText}>
                      {formatDateTime(item.appointmentDate, item.appointmentTime)}
                    </Text>
                  </View>
                  {!!item.id && (
                    <Text style={styles.bookingId}>{`#FP${item.id}`}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            {index < displayedItems.length - 1 && <View style={styles.cardGap} />}
          </View>
        ))
      ) : (
        <EmptyState
          compact
          icon="history"
          title={t("noWorkHistoryFound")}
          subtitle={t("workHistoryEmptySubtitle")}
          containerStyle={styles.emptyStateContainer}
        />
      )}
    </View>
  );
}
