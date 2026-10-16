import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import AppImage from "@/src/components/AppImage";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale, widthScale } from "@/src/theme/dimensions";
import { createStyles, SINGLE_CARD_WIDTH } from "./styles";

interface AppointmentCard {
  id: number;
  badgeText: string;
  dateTime: string;
  businessLogoUrl: string;
  services: string;
  membershipInfo: string;
  staffName: string;
  staffImage: string;
  originalAppointment?: {
    appointmentDate?: string;
    appointmentTime?: string;
    businessTitle?: string;
  };
}

interface ShowAppointmentsProps {
  appointments: AppointmentCard[];
}

/** "MM/DD/YYYY" + "HH:mm" from the appointments API. */
const parseWhen = (date?: string, time?: string) => {
  if (!date) return null;
  const [m, d, y] = date.split("/").map(Number);
  if (!m || !d || !y) return null;
  const [h, min] = (time ?? "0:0").split(":").map(Number);
  const when = dayjs(new Date(y, m - 1, d, h || 0, min || 0));
  return when.isValid() ? when : null;
};

export default function ShowAppointments({
  appointments,
}: ShowAppointmentsProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { t } = useTranslation();

  const relativeDay = (when: dayjs.Dayjs) => {
    const days = when.startOf("day").diff(dayjs().startOf("day"), "day");
    if (days <= 0) return t("today");
    if (days === 1) return t("tomorrow");
    return t("homeApptInDays", { count: days });
  };

  // Soonest first, whatever order the API returns.
  const sorted = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const wa = parseWhen(
          a.originalAppointment?.appointmentDate,
          a.originalAppointment?.appointmentTime,
        );
        const wb = parseWhen(
          b.originalAppointment?.appointmentDate,
          b.originalAppointment?.appointmentTime,
        );
        return (wa?.valueOf() ?? Infinity) - (wb?.valueOf() ?? Infinity);
      }),
    [appointments],
  );

  const single = appointments.length === 1;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.appointmentsScroll}
      nestedScrollEnabled
      decelerationRate="fast"
    >
      {sorted.map((appointment) => {
        const raw = appointment.originalAppointment;
        const when = parseWhen(raw?.appointmentDate, raw?.appointmentTime);
        const isSoon =
          !!when && when.startOf("day").diff(dayjs().startOf("day"), "day") <= 1;
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              router.push({
                pathname: "/(main)/bookingDetailsById",
                params: { bookingId: appointment.id },
              });
            }}
            key={appointment.id}
            style={[styles.card, single && { width: SINGLE_CARD_WIDTH }]}
            accessibilityRole="button"
            accessibilityLabel={[
              appointment.services,
              appointment.dateTime,
              raw?.businessTitle,
              appointment.staffName,
            ]
              .filter(Boolean)
              .join(", ")}
          >
            <View style={styles.topRow}>
              {when ? (
                <View style={styles.dateTile}>
                  <Text style={styles.dateMonth}>
                    {when.format("MMM").toUpperCase()}
                  </Text>
                  <Text style={styles.dateDay}>{when.format("D")}</Text>
                  <Text style={styles.dateWeekday}>{when.format("ddd")}</Text>
                </View>
              ) : null}

              <View style={styles.mainText}>
                <View style={styles.pillRow}>
                  <View style={[styles.pill, isSoon && styles.pillSoon]}>
                    <View style={[styles.pillDot, isSoon && styles.pillDotSoon]} />
                    <Text style={[styles.pillText, isSoon && styles.pillTextSoon]}>
                      {when ? relativeDay(when) : appointment.badgeText}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.serviceName}>
                  {appointment.services}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="schedule"
                    size={moderateWidthScale(15)}
                    color={theme.lightGreen}
                  />
                  <Text numberOfLines={1} style={styles.metaText}>
                    {when ? when.format("h:mm A") : appointment.dateTime}
                  </Text>
                </View>
                {raw?.businessTitle ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="storefront"
                      size={moderateWidthScale(15)}
                      color={theme.lightGreen}
                    />
                    <Text numberOfLines={1} style={styles.metaText}>
                      {raw.businessTitle}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.footer}>
              <AppImage
                uri={appointment.staffImage}
                style={styles.staffImage}
                iconSize={widthScale(14)}
                iconColor={theme.lightGreen}
              />
              <Text numberOfLines={1} style={styles.staffName}>
                {appointment.staffName}
              </Text>
              <Text numberOfLines={1} style={styles.footerMeta}>
                {appointment.membershipInfo}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={moderateWidthScale(20)}
                color={theme.darkGreen}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
