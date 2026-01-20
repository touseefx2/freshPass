import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import DashboardHeader from "@/src/components/DashboardHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { PersonIcon } from "@/assets/icons";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter } from "expo-router";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "subscription" | "service";
  status: string;
  user: string;
  userEmail: string;
  subscription: string | null;
  subscriptionServices:
    | Array<{
        id: number;
        name: string;
        description: string;
        price: string;
        duration: {
          hours: number;
          minutes: number;
        };
      }>
    | {};
  subscriptionVisits: {
    used: number;
    total: number;
  } | null;
  services:
    | Array<{
        id: number;
        name: string;
        description: string;
        price: string;
        duration: {
          hours: number;
          minutes: number;
        };
      }>
    | {};
  totalPrice: number | {};
  paidAmount: string;
  staffName: string;
  staffEmail: string;
  notes: string | null;
  businessTitle: string;
  businessAddress: string;
  businessLogoUrl: string | null;
  createdAt: string;
}

interface CalendarAppointment {
  id: string;
  title: string;
  scheduled_at: string;
  duration: string;
  price: number;
  status_label: string;
  client_name: string;
  originalAppointment: Appointment;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) => {
  const hour24 = hour; // 0 to 23
  let formattedHour: number;
  let suffix: string;

  if (hour24 === 0) {
    formattedHour = 12;
    suffix = "am";
  } else if (hour24 < 12) {
    formattedHour = hour24;
    suffix = "am";
  } else if (hour24 === 12) {
    formattedHour = 12;
    suffix = "pm";
  } else {
    formattedHour = hour24 - 12;
    suffix = "pm";
  }

  return `${formattedHour} ${suffix}`;
});

const getWeekDays = (date: dayjs.Dayjs) => {
  const startOfWeek = date.startOf("week");
  return Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));
};

const convertTo24Hour = (time12h: string) => {
  const [time, period] = time12h.split(" ");
  const hour = parseInt(time);
  let hour24: number;

  if (period === "am") {
    if (hour === 12) {
      hour24 = 0; // 12 am = midnight (00:00)
    } else {
      hour24 = hour;
    }
  } else {
    // pm
    if (hour === 12) {
      hour24 = 12; // 12 pm = noon (12:00)
    } else {
      hour24 = hour + 12;
    }
  }

  return `${hour24.toString().padStart(2, "0")}:00`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    calendarHeader: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.lightGreen1,
    },
    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(16),
    },
    weekText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    arrowButton: {
      padding: moderateWidthScale(8),
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(4),
    },
    dayContainer: {
      alignItems: "center",
      flex: 1,
    },
    dayName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(8),
    },
    dayNumberContainer: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    dayNumberSelected: {
      backgroundColor: theme.orangeBrown30,
    },
    dayNumber: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    dayNumberSelectedText: {
      color: theme.text,
    },
    dayNumberTodayText: {
      color: theme.primary,
    },
    agendaContainer: {
      flex: 1,
    },
    agendaHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    allDayLabel: {
      width: widthScale(80),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(12),
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
      justifyContent: "center",
    },
    allDayText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    todayLabel: {
      flex: 1,
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(12),
      justifyContent: "center",
    },
    todayLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    todayText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    timeSlotRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      minHeight: heightScale(80),
    },
    timeSlotRowWithMultiple: {
      minHeight: heightScale(120),
    },
    timeSlot: {
      width: widthScale(80),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(12),
      borderRightWidth: 1,
      borderRightColor: theme.borderLight,
      justifyContent: "flex-start",
    },
    timeSlotText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    appointmentsContainer: {
      flex: 1,
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
    },
    appointmentWrapper: {
      marginBottom: moderateHeightScale(8),
    },
    appointmentWrapperLast: {
      marginBottom: 0,
    },
    appointmentCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
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
    appointmentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(8),
      width: "100%",
    },
    appointmentLeftSection: {
      width: "70%",
    },
    appointmentTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    appointmentRightSection: {
      alignItems: "flex-end",
      gap: moderateHeightScale(8),
      width: "29%",
    },
    clientNameContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    clientNameText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      width: "70%",
    },
    appointmentStatus: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(4),
    },
    appointmentStatusText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
    },
    appointmentMeta: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    emptyState: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function CalendarScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showBanner } = useNotificationContext();
  const router = useRouter();
  const userRole = useAppSelector((state: any) => state.user.userRole);

  const today = dayjs();
  const [selectedDate, setSelectedDate] = useState(today);
  const [week, setWeek] = useState(getWeekDays(today));
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Set to current week on mount
  useEffect(() => {
    const currentWeek = getWeekDays(today);
    setWeek(currentWeek);
    setSelectedDate(today);
  }, []);

  // Fetch appointments when week changes
  useEffect(() => {
    if (userRole === "business" || userRole === "staff") {
      if (week.length > 0) {
        fetchAppointments();
      }
    }
  }, [week]);

  const fetchAppointments = async () => {
    if (week.length === 0) return;

    setLoading(true);
    try {
      const fromDate = week[0].format("YYYY-MM-DD");
      const toDate = week[6].format("YYYY-MM-DD");

      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          data: Appointment[];
          meta: {
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
          };
        };
      }>(
        appointmentsEndpoints.list({
          from_date: fromDate,
          to_date: toDate,
          per_page: 100,
          direction: "desc",
        })
      );

      if (response.success && response.data) {
        const transformedAppointments = transformAppointments(
          response.data.data
        );
        setAppointments(transformedAppointments);
      }
    } catch (error: any) {
      showBanner(
        "API Failed",
        error?.message || "Failed to fetch appointments",
        "error",
        2500
      );
    } finally {
      setLoading(false);
    }
  };

  const transformAppointments = (
    apiAppointments: Appointment[]
  ): CalendarAppointment[] => {
    return apiAppointments.map((appointment) => {
      // Get service titles (subscription base or service base)
      const getServiceTitles = () => {
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
        return "Service";
      };

      // Calculate total duration
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

      const services =
        appointment.appointmentType === "subscription"
          ? appointment.subscriptionServices
          : appointment.services;

      const totalMinutes = calculateTotalDuration(
        Array.isArray(services) ? services : []
      );
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      let durationText = "";
      if (hours > 0 && minutes > 0) {
        durationText = `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
      } else if (hours > 0) {
        durationText = `${hours} hour${hours > 1 ? "s" : ""}`;
      } else {
        durationText = `${minutes} min`;
      }

      // Parse date and time
      // Date format is "MM/DD/YYYY"
      const dateParts = appointment.appointmentDate.split("/");
      const month = dateParts[0].padStart(2, "0");
      const day = dateParts[1].padStart(2, "0");
      const year = dateParts[2];
      const [hour, minute] = appointment.appointmentTime.split(":");

      const scheduledAt = dayjs(
        `${year}-${month}-${day} ${hour}:${minute}`,
        "YYYY-MM-DD HH:mm"
      ).toISOString();

      // Format status - show "On-going apt." for scheduled
      const statusLabel =
        appointment.status === "scheduled"
          ? "On-going apt."
          : appointment.status;

      // Format client name (truncate if needed)
      const clientName =
        appointment.user.length > 12
          ? `${appointment.user.substring(0, 10)}...`
          : appointment.user;

      return {
        id: appointment.id.toString(),
        title: getServiceTitles(),
        scheduled_at: scheduledAt,
        duration: durationText,
        price: parseFloat(appointment.paidAmount),
        status_label: statusLabel,
        client_name: clientName,
        originalAppointment: appointment,
      };
    });
  };

  const currentDate = selectedDate.format("YYYY-MM-DD");

  const nextWeek = () => {
    const next = selectedDate.add(7, "day");
    const nextWeekDays = getWeekDays(next);
    setSelectedDate(nextWeekDays[0]);
    setWeek(nextWeekDays);
  };

  const prevWeek = () => {
    const prev = selectedDate.subtract(7, "day");
    const prevWeekDays = getWeekDays(prev);
    setSelectedDate(prevWeekDays[6]);
    setWeek(prevWeekDays);
  };

  const formatDate = (date: dayjs.Dayjs) => {
    if (date.isSame(today, "day")) {
      return "(Today)";
    } else if (date.isSame(today.add(1, "day"), "day")) {
      return "(Tomorrow)";
    } else if (date.isSame(today.subtract(1, "day"), "day")) {
      return "(Yesterday)";
    } else {
      return `(${date.format("MMM D, YYYY")})`;
    }
  };

  const formatAppointmentDate = (dateString: string) => {
    const date = dayjs(dateString);
    return `${date.format("M/D/YYYY")} - ${date.format("h:mm a")}`;
  };

  return (
    <View style={styles.container}>
      <DashboardHeader />
      <View style={styles.content}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <View style={styles.weekNavigation}>
            <TouchableOpacity style={styles.arrowButton} onPress={prevWeek}>
              <MaterialIcons
                name="keyboard-arrow-left"
                size={moderateWidthScale(24)}
                color={theme.text}
              />
            </TouchableOpacity>
            <Text style={styles.weekText}>
              {week[0].format("MMM D")} - {week[6].format("MMM D, YYYY")}
            </Text>
            <TouchableOpacity style={styles.arrowButton} onPress={nextWeek}>
              <MaterialIcons
                name="keyboard-arrow-right"
                size={moderateWidthScale(24)}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          {/* Days Row */}
          <View style={styles.daysRow}>
            {week.map((day) => {
              const isSelected = day.isSame(selectedDate, "day");
              const isToday = day.isSame(today, "day");
              // Show brown circle only if selected (not just for today)
              const showBrownCircle = isSelected;
              // Show red text only if today (and not selected, or if selected then both apply)
              return (
                <TouchableOpacity
                  key={day.format("YYYY-MM-DD")}
                  style={styles.dayContainer}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text style={styles.dayName}>{day.format("ddd")}</Text>
                  <View
                    style={[
                      styles.dayNumberContainer,
                      showBrownCircle && styles.dayNumberSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelectedText,
                        isToday && styles.dayNumberTodayText,
                      ]}
                    >
                      {day.format("D")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Agenda View */}
        <View style={styles.agendaContainer}>
          <View style={styles.agendaHeader}>
            <View style={styles.allDayLabel}>
              <Text style={styles.allDayText}>All Day</Text>
            </View>
            <View style={styles.todayLabel}>
              <View style={styles.todayLabelRow}>
                <Text style={styles.todayText}>{formatDate(selectedDate)}</Text>
                {loading && (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: moderateHeightScale(20) }}
          >
            {TIME_SLOTS.map((time) => {
              const timeSlot24h = convertTo24Hour(time);
              const filteredAppointments = appointments.filter(
                (appointment) => {
                  if (!appointment.scheduled_at) return false;

                  const scheduledDate = dayjs(appointment.scheduled_at).format(
                    "YYYY-MM-DD"
                  );
                  const scheduledTime = dayjs(appointment.scheduled_at).format(
                    "HH:mm"
                  );

                  if (scheduledDate !== currentDate) return false;

                  const [scheduledHour, scheduledMinute] = scheduledTime
                    .split(":")
                    .map(Number);
                  const scheduledMinutes = scheduledHour * 60 + scheduledMinute;

                  const [slotHour] = timeSlot24h.split(":").map(Number);
                  const slotMinutes = slotHour * 60;

                  return (
                    scheduledMinutes >= slotMinutes &&
                    scheduledMinutes < slotMinutes + 60
                  );
                }
              );

              const hasMultipleAppointments = filteredAppointments.length > 1;

              return (
                <View
                  key={time}
                  style={[
                    styles.timeSlotRow,
                    hasMultipleAppointments && styles.timeSlotRowWithMultiple,
                  ]}
                >
                  <View style={styles.timeSlot}>
                    <Text style={styles.timeSlotText}>{time}</Text>
                  </View>
                  <View style={styles.appointmentsContainer}>
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment, index) => {
                        const isLast = index === appointments.length - 1;
                        return (
                          <View
                            key={appointment.id}
                            style={[
                              styles.appointmentWrapper,
                              isLast && styles.appointmentWrapperLast,
                            ]}
                          >
                            <TouchableOpacity
                              style={[styles.appointmentCard, styles.shadow]}
                              activeOpacity={0.7}
                              onPress={() => {
                                router.push({
                                  pathname: "/(main)/bookingDetailsById",
                                  params: {
                                    bookingId: appointment.id,
                                  },
                                });
                              }}
                            >
                              <View style={styles.appointmentHeader}>
                                <View style={styles.appointmentLeftSection}>
                                  <Text
                                    numberOfLines={1}
                                    style={styles.appointmentTitle}
                                  >
                                    {appointment.title}
                                  </Text>
                                  <Text style={styles.appointmentMeta}>
                                    {formatAppointmentDate(
                                      appointment.scheduled_at
                                    )}{" "}
                                    • {appointment.duration}
                                  </Text>
                                </View>
                                <View style={styles.appointmentRightSection}>
                                  <View style={styles.clientNameContainer}>
                                    <PersonIcon
                                      width={moderateWidthScale(14)}
                                      height={moderateWidthScale(14)}
                                      color={theme.darkGreen}
                                    />
                                    <Text
                                      numberOfLines={1}
                                      style={styles.clientNameText}
                                    >
                                      {appointment.client_name}
                                    </Text>
                                  </View>
                                  <View style={styles.appointmentStatus}>
                                    <Text style={styles.appointmentStatusText}>
                                      {appointment.status_label}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}></Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
