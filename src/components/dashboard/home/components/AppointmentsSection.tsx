import React, { useMemo, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
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
import { Skeleton } from "@/src/components/skeletons";
import dayjs from "dayjs";
import { SubscriptionTicketIcon, PersonIcon } from "@/assets/icons";
import { useRouter } from "expo-router";
import { Appointment } from "@/src/components/appointmentDetail";
import EmptyState from "@/src/components/emptyState";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    appointmentsContainer: {
      marginBottom: moderateHeightScale(18),
    },
    sectionHeader: {
      marginBottom: moderateHeightScale(12),
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    upcomingCard: {
      backgroundColor: theme.upcomingCard,
      borderRadius: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(12),
      height: moderateHeightScale(42),
      marginBottom: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: theme.upcomingBorder,
    },
    upcomingText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    sectionLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      flexDirection: "row",
      alignItems: "center",
    },
    currentAppointmentCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
      shadowColor: theme.shadow,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    shadow: {
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    cardBody: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      gap: moderateHeightScale(8),
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    appointmentService: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    appointmentPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    appointmentInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    appointmentInfoText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginLeft: moderateWidthScale(6),
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    footerGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    footerLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    appointmentBadge: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
    },
    appointmentBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    emptyStateContainer: {
      paddingVertical: moderateHeightScale(4),
    },
  });

interface AppointmentsSectionProps {
  data: Appointment[] | null;
  totalCount: number;
  callApi: () => Promise<void>;
}

export default function AppointmentsSection({
  data,
  totalCount,
  callApi,
}: AppointmentsSectionProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    callApi();
  }, []);

  // Format date and time with duration
  const formatDateTime = (
    date: string,
    time: string,
    totalMinutes?: number
  ) => {
    const dateObj = dayjs(date, "MM/DD/YYYY");
    const formattedDate = dateObj.isValid()
      ? dateObj.format("MMM D, YYYY")
      : date;
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm A");

    let durationText = "";
    if (totalMinutes) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours > 0 && minutes > 0) {
        durationText = ` • ${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
      } else if (hours > 0) {
        durationText = ` • ${hours} hour${hours > 1 ? "s" : ""}`;
      } else {
        durationText = ` • ${minutes} min`;
      }
    }

    return `${formattedDate} • ${formattedTime}${durationText}`;
  };

  // Format price
  const formatPrice = (data: any) => {
    let res = "";

    if (data?.appointmentType === "subscription") {
      res = data?.subscription;
    } else {
      res = `$${parseFloat(data?.paidAmount ?? data?.totalPrice ?? 0).toFixed(2)} USD`;
    }

    return res;
  };

  // Calculate total duration from services
  const calculateTotalDuration = (
    services: Array<{ duration: { hours: number; minutes: number } }> | {}
  ) => {
    if (!services || !Array.isArray(services) || services.length === 0)
      return 0;
    const totalMinutes = services.reduce((total, service) => {
      return total + service.duration.hours * 60 + service.duration.minutes;
    }, 0);
    return totalMinutes;
  };

  // Get service titles
  const getServiceTitles = (appointment: Appointment) => {
    if (
      appointment.appointmentType === "subscription" &&
      Array.isArray(appointment.subscriptionServices) &&
      appointment.subscriptionServices.length > 0
    ) {
      return appointment.subscriptionServices.map((s) => s.name).join(" + ");
    } else if (
      appointment.appointmentType === "service" &&
      Array.isArray(appointment.services) &&
      appointment.services.length > 0
    ) {
      return appointment.services.map((s) => s.name).join(" + ");
    }
    return t("service");
  };

  const formatMembershipInfo = (appointment: any): string => {
    if (appointment.appointmentType === "subscription") {
      if (appointment.subscriptionVisits) {
        const { remaining } = appointment.subscriptionVisits;
        return `${remaining} visit${remaining !== 1 ? "s" : ""} left`;
      }
      return appointment.subscription || "Subscription";
    } else {
      // For service type, return service info
      if (
        Array.isArray(appointment.services) &&
        appointment.services.length > 0
      ) {
        return `${appointment.services.length} service${
          appointment.services.length !== 1 ? "s" : ""
        }`;
      }
      return t("service");
    }
  };

  const firstAppointment = data && data.length > 0 ? data[0] : null;

  return (
    <View style={styles.appointmentsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("appointments")}</Text>
      </View>

      {!data ? (
        <Skeleton screenType="AppointmentsSection" styles={styles} />
      ) : (
        <>
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingText}>
              {totalCount === 0
                ? t("noUpcomingAppointments")
                : totalCount === 1
                ? t("oneUpcomingAppointment")
                : t("upcomingAppointmentsCount", { count: totalCount })}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push("/(main)/dashboard/(calendar)")}
            >
              <View style={styles.sectionLink}>
                <Text style={styles.sectionLink}>{t("viewCalendar")}</Text>
                <Entypo
                  name="chevron-small-right"
                  size={iconScale(18)}
                  color={theme.selectCard}
                />
              </View>
            </TouchableOpacity>
          </View>

          {firstAppointment ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: "/(main)/bookingDetailsById",
                  params: {
                    bookingId: firstAppointment.id,
                  },
                });
              }}
              style={[styles.currentAppointmentCard, styles.shadow]}
            >
              <View style={styles.cardBody}>
                {/* Row 1: Service name + Price */}
                <View style={styles.cardRow}>
                  <Text numberOfLines={1} style={styles.appointmentService}>
                    {getServiceTitles(firstAppointment)}
                  </Text>
                  <Text style={styles.appointmentPrice}>
                    {formatPrice(firstAppointment)}
                  </Text>
                </View>

                {/* Row 2: Customer */}
                <View style={styles.appointmentInfoRow}>
                  <PersonIcon
                    width={moderateWidthScale(15)}
                    height={moderateWidthScale(15)}
                    color={theme.darkGreen}
                  />
                  <Text numberOfLines={1} style={styles.appointmentInfoText}>
                    {t("customer")}: {firstAppointment.user}
                  </Text>
                </View>

                {/* Row 3: Barber + chevron */}
                <View style={styles.cardRow}>
                  <View style={styles.appointmentInfoRow}>
                    <Ionicons
                      name="person-circle-outline"
                      size={iconScale(16)}
                      color={theme.darkGreen}
                    />
                    <Text numberOfLines={1} style={styles.appointmentInfoText}>
                      {t("barber")}: {firstAppointment.staffName}
                    </Text>
                  </View>
                  <Entypo
                    name="chevron-small-right"
                    size={iconScale(22)}
                    color={theme.darkGreen}
                  />
                </View>

                {/* Row 4: Date / Time / Duration */}
                <View style={styles.appointmentInfoRow}>
                  <Ionicons
                    name="time-outline"
                    size={iconScale(15)}
                    color={theme.darkGreen}
                  />
                  <Text numberOfLines={1} style={styles.appointmentInfoText}>
                    {formatDateTime(
                      firstAppointment.appointmentDate,
                      firstAppointment.appointmentTime,
                      firstAppointment.appointmentType === "subscription"
                        ? calculateTotalDuration(
                            firstAppointment.subscriptionServices
                          )
                        : calculateTotalDuration(firstAppointment.services)
                    )}
                  </Text>
                </View>
              </View>

              {/* Row 5: Footer with status + payment badges */}
              <View style={styles.cardFooter}>
                <View style={styles.footerGroup}>
                  <Text style={styles.footerLabel}>{t("appointment")}:</Text>
                  <View style={styles.appointmentBadge}>
                    <Text style={styles.appointmentBadgeText}>
                      {firstAppointment.status === "scheduled"
                        ? t("onGoingApt")
                        : firstAppointment.status === "awaiting_outcome"
                          ? t("statusAwaitingOutcome")
                          : firstAppointment.status === "no_show"
                            ? t("statusNoShow")
                            : firstAppointment.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.footerGroup}>
                  <Text style={styles.footerLabel}>{t("payment")}:</Text>
                  <View style={styles.appointmentBadge}>
                    <Text style={styles.appointmentBadgeText}>
                      {firstAppointment.paidAmount &&
                      parseFloat(firstAppointment.paidAmount) > 0
                        ? t("paid")
                        : t("payLater")}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <EmptyState
              compact
              icon="event-note"
              title={t("appointmentsEmptyTitle")}
              subtitle={t("appointmentsEmptySubtitle")}
              containerStyle={styles.emptyStateContainer}
            />
          )}
        </>
      )}
    </View>
  );
}
