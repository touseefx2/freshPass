import React, { useMemo, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { Skeleton } from "@/src/components/skeletons";
import dayjs from "dayjs";
import { SubscriptionTicketIcon, PersonIcon } from "@/assets/icons";
import { useRouter } from "expo-router";
import { Appointment } from "@/src/components/appointmentDetail";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    appointmentsContainer: {
      marginBottom: moderateHeightScale(18),
    },
    sectionHeader: {
      marginBottom: moderateHeightScale(12),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
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
      paddingHorizontal: moderateWidthScale(16),
      height: moderateHeightScale(112),
      marginBottom: moderateHeightScale(12),
      shadowColor: theme.shadow,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(10),
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
    appointmentService: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.black,
    },
    appointmentPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    appointmentServiceRow: {
      marginBottom: moderateHeightScale(12),
    },
    appointmentInfoContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    appointmentInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "45%",
    },
    appointmentInfoText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginLeft: moderateWidthScale(2),
    },
    appointmentStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    appointmentStatus: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(4),
      flexDirection: "row",
      alignItems: "center",
    },
    appointmentStatusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
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
    const formattedDate = date; // Already formatted as "12/12/2025"
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm a");

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

    return `${formattedDate} - ${formattedTime}${durationText}`;
  };

  // Format price
  const formatPrice = (data: any) => {
    let res = "";

    if (data?.appointmentType === "subscription") {
      res = data?.subscription;
    } else {
      res = `$${parseFloat(data?.paidAmount ?? 0).toFixed(2)} USD`;
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
    return "Service";
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
      return "Service";
    }
  };

  const firstAppointment = data && data.length > 0 ? data[0] : null;

  return (
    <View style={styles.appointmentsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Appointments</Text>
      </View>

      {!data ? (
        <Skeleton screenType="AppointmentsSection" styles={styles} />
      ) : (
        <>
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingText}>
              {totalCount === 0
                ? "No upcoming appointments"
                : totalCount === 1
                ? "1 upcoming appointment"
                : `${totalCount} upcoming appointments`}
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push("/(main)/dashboard/(calendar)")}
            >
              <View style={styles.sectionLink}>
                <Text style={styles.sectionLink}>View calendar</Text>
                <Entypo
                  name="chevron-small-right"
                  size={moderateWidthScale(18)}
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
              <View
                style={{
                  gap: moderateHeightScale(7),
                  width: "58%",
                }}
              >
                <Text numberOfLines={1} style={styles.appointmentService}>
                  {getServiceTitles(firstAppointment)}
                </Text>
                <View style={styles.appointmentInfoContainer}>
                  <View style={styles.appointmentInfoRow}>
                    <SubscriptionTicketIcon
                      width={moderateWidthScale(15)}
                      height={moderateWidthScale(15)}
                    />
                    <Text numberOfLines={1} style={styles.appointmentInfoText}>
                      {formatMembershipInfo(firstAppointment)}
                    </Text>
                  </View>
                  <View style={styles.appointmentInfoRow}>
                    <PersonIcon
                      width={moderateWidthScale(15)}
                      height={moderateWidthScale(15)}
                    />
                    <Text numberOfLines={1} style={styles.appointmentInfoText}>
                      {firstAppointment.user}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.appointmentInfoRow,
                    { alignItems: "baseline", width: "90%" },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={moderateWidthScale(15)}
                    color={theme.darkGreen}
                  />
                  <Text style={styles.appointmentInfoText}>
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

              <View
                style={{
                  gap: moderateHeightScale(10),
                  alignItems: "flex-end",
                  width: "40%",
                }}
              >
                <Text style={styles.appointmentPrice}>
                  {formatPrice(firstAppointment)}
                </Text>
                <View style={styles.appointmentStatusRow}>
                  <View style={[styles.appointmentStatus]}>
                    <Text style={styles.appointmentStatusText}>
                      {firstAppointment.status === "scheduled"
                        ? "On-going apt."
                        : firstAppointment.status}
                    </Text>
                  </View>
                  <Entypo
                    name="chevron-small-right"
                    size={moderateWidthScale(22)}
                    color={theme.darkGreen}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No appointments to display
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
