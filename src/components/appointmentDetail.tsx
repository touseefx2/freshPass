import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { Ionicons } from "@expo/vector-icons";
import { SubscriptionTicketIcon, PersonIcon } from "@/assets/icons";
import dayjs from "dayjs";

export interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "subscription" | "service";
  status: string;
  user: string;
  userEmail: string;
  subscription: string | null;
  subscriptionServices: Array<{
    id: number;
    name: string;
    description: string;
    price: string;
    duration: {
      hours: number;
      minutes: number;
    };
  }> | {};
  subscriptionVisits: {
    used: number;
    total: number;
  } | null;
  services: Array<{
    id: number;
    name: string;
    description: string;
    price: string;
    duration: {
      hours: number;
      minutes: number;
    };
  }> | {};
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

interface AppointmentDetailProps {
  appointment: Appointment | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(50),
    },
    // Header Card - Compact
    headerCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    statusIcon: {
      width: moderateWidthScale(28),
      height: moderateHeightScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadge: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(12),
    },
    statusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
      textTransform: "capitalize",
    },
    priceSection: {
      alignItems: "flex-end",
    },
    priceLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    priceText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // Card
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    // Section Header - Compact
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(10),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen1,
    },
    sectionIcon: {
      width: moderateWidthScale(24),
      height: moderateHeightScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    // Info Row - Compact
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(14),
    },
    infoRowLast: {
      marginBottom: 0,
    },
    infoIcon: {
      width: moderateWidthScale(28),
      height: moderateHeightScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(10),
      marginTop: moderateHeightScale(2),
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    infoValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flexWrap: "wrap",
    },
    infoValueBold: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
      flexWrap: "wrap",
    },
    infoSubValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      flexWrap: "wrap",
    },
    // Service Item - Compact
    serviceItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      marginHorizontal: moderateWidthScale(-16),
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(8),
      borderLeftWidth: 3,
      borderLeftColor: theme.orangeBrown,
    },
    serviceItemLast: {
      marginBottom: 0,
    },
    serviceContent: {
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    serviceName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      flexWrap: "wrap",
    },
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
      flexWrap: "wrap",
    },
    serviceMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    serviceMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    serviceMetaText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    servicePrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "right",
      minWidth: moderateWidthScale(70),
    },
    // Subscription Visits - Compact
    visitsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      borderLeftWidth: 3,
      borderLeftColor: theme.orangeBrown,
    },
    visitsInfo: {
      flex: 1,
    },
    visitsLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    visitsValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    visitsProgress: {
      width: moderateWidthScale(50),
      height: moderateHeightScale(50),
      borderRadius: moderateWidthScale(25),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.selectCard,
    },
    visitsProgressText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    // Notes - Compact
    notesContainer: {
      backgroundColor: theme.lightBeige,
      borderRadius: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
      borderLeftWidth: 3,
      borderLeftColor: theme.orangeBrown,
    },
    notesText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(18),
      flexWrap: "wrap",
    },
    emptyNotes: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: moderateHeightScale(12),
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function AppointmentDetail({ appointment }: AppointmentDetailProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  if (!appointment) {
    return (
      <View style={styles.container}>
        <StackHeader title="Appointment Detail" />
        <View style={styles.contentContainer}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No appointment data available</Text>
          </View>
        </View>
      </View>
    );
  }

  const formatDateTime = (
    date: string,
    time: string,
    totalMinutes?: number
  ) => {
    const formattedDate = date;
    const timeObj = dayjs(`2025-01-01 ${time}`, "YYYY-MM-DD HH:mm");
    const formattedTime = timeObj.format("h:mm a");

    let durationText = "";
    if (totalMinutes) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours > 0 && minutes > 0) {
        durationText = ` • ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        durationText = ` • ${hours}h`;
      } else {
        durationText = ` • ${minutes}m`;
      }
    }

    return `${formattedDate} - ${formattedTime}${durationText}`;
  };

  const formatPrice = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)} USD`;
  };

  const calculateTotalDuration = (
    services: Array<{ duration: { hours: number; minutes: number } }>
  ) => {
    if (!services || services.length === 0) return 0;
    const totalMinutes = services.reduce((total, service) => {
      return total + service.duration.hours * 60 + service.duration.minutes;
    }, 0);
    return totalMinutes;
  };

  const getServices = () => {
    if (
      appointment.appointmentType === "subscription" &&
      Array.isArray(appointment.subscriptionServices) &&
      appointment.subscriptionServices.length > 0
    ) {
      return appointment.subscriptionServices;
    } else if (
      appointment.appointmentType === "service" &&
      Array.isArray(appointment.services) &&
      appointment.services.length > 0
    ) {
      return appointment.services;
    }
    return [];
  };

  const services = getServices();
  const totalDuration = appointment.appointmentType === "subscription"
    ? Array.isArray(appointment.subscriptionServices)
      ? calculateTotalDuration(appointment.subscriptionServices)
      : 0
    : Array.isArray(appointment.services)
    ? calculateTotalDuration(appointment.services)
    : 0;

  return (
    <View style={styles.container}>
      <StackHeader title="Appointment Detail" />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card - Compact Design */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={moderateWidthScale(16)}
                  color={theme.selectCard}
                />
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText} numberOfLines={1}>
                  {appointment.status === "scheduled"
                    ? "On-going apt."
                    : appointment.status}
                </Text>
              </View>
            </View>
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Total Amount</Text>
              <Text style={styles.priceText} numberOfLines={1}>
                {formatPrice(appointment.paidAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Appointment Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="information-circle-outline"
                size={moderateWidthScale(14)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.sectionTitle}>Appointment Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="time-outline"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {formatDateTime(
                  appointment.appointmentDate,
                  appointment.appointmentTime,
                  totalDuration
                )}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <SubscriptionTicketIcon
                width={moderateWidthScale(16)}
                height={moderateWidthScale(16)}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Appointment Type</Text>
              <Text style={styles.infoValueBold} numberOfLines={1}>
                {appointment.appointmentType === "subscription"
                  ? appointment.subscription || "Subscription"
                  : "Service Base"}
              </Text>
            </View>
          </View>
        </View>

        {/* People Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="people-outline"
                size={moderateWidthScale(14)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.sectionTitle}>People</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <PersonIcon
                width={moderateWidthScale(16)}
                height={moderateWidthScale(16)}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer</Text>
              <Text style={styles.infoValueBold} numberOfLines={1}>
                {appointment.user}
              </Text>
              <Text style={styles.infoSubValue} numberOfLines={1}>
                {appointment.userEmail}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Assigned Staff</Text>
              <Text style={styles.infoValueBold} numberOfLines={1}>
                {appointment.staffName}
              </Text>
              <Text style={styles.infoSubValue} numberOfLines={1}>
                {appointment.staffEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Services */}
        {services.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="list-outline"
                  size={moderateWidthScale(14)}
                  color={theme.darkGreen}
                />
              </View>
              <Text style={styles.sectionTitle}>
                {appointment.appointmentType === "subscription"
                  ? "Subscription Services"
                  : "Services"}
              </Text>
            </View>
            {services.map((service, index) => {
              const durationText =
                service.duration.hours > 0 && service.duration.minutes > 0
                  ? `${service.duration.hours}h ${service.duration.minutes}m`
                  : service.duration.hours > 0
                  ? `${service.duration.hours}h`
                  : `${service.duration.minutes}m`;

              return (
                <View
                  key={service.id}
                  style={[
                    styles.serviceItem,
                    index === services.length - 1 && styles.serviceItemLast,
                  ]}
                >
                  <View style={styles.serviceContent}>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {service.name}
                    </Text>
                    {service.description && (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {service.description}
                      </Text>
                    )}
                    <View style={styles.serviceMeta}>
                      <View style={styles.serviceMetaItem}>
                        <Ionicons
                          name="time-outline"
                          size={moderateWidthScale(12)}
                          color={theme.lightGreen}
                        />
                        <Text style={styles.serviceMetaText}>
                          {durationText}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.servicePrice} numberOfLines={1}>
                    {formatPrice(service.price)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Subscription Visits */}
        {appointment.appointmentType === "subscription" &&
          appointment.subscriptionVisits && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={moderateWidthScale(14)}
                    color={theme.darkGreen}
                  />
                </View>
                <Text style={styles.sectionTitle}>Subscription Visits</Text>
              </View>
              <View style={styles.visitsContainer}>
                <View style={styles.visitsInfo}>
                  <Text style={styles.visitsLabel}>Visits Used</Text>
                  <Text style={styles.visitsValue}>
                    {appointment.subscriptionVisits.used} /{" "}
                    {appointment.subscriptionVisits.total}
                  </Text>
                </View>
                <View style={styles.visitsProgress}>
                  <Text style={styles.visitsProgressText}>
                    {Math.round(
                      (appointment.subscriptionVisits.used /
                        appointment.subscriptionVisits.total) *
                        100
                    )}
                    %
                  </Text>
                </View>
              </View>
            </View>
          )}

        {/* Business Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="business-outline"
                size={moderateWidthScale(14)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="storefront-outline"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Business Name</Text>
              <Text style={styles.infoValueBold} numberOfLines={2}>
                {appointment.businessTitle}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="location-outline"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue} numberOfLines={3}>
                {appointment.businessAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="document-text-outline"
                size={moderateWidthScale(14)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          {appointment.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={10}>
                {appointment.notes}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyNotes}>No notes available</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
