import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import AppImage from "@/src/components/AppImage";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { heightScale, widthScale } from "@/src/theme/dimensions";
import { MonitorIcon, PersonIcon, ChevronRight } from "@/assets/icons";
import { createStyles } from "./styles";

interface AppointmentCard {
  id: number;
  badgeText: string;
  dateTime: string;
  businessLogoUrl: string;
  services: string;
  membershipInfo: string;
  staffName: string;
  staffImage: string;
}

interface ShowAppointmentsProps {
  appointments: AppointmentCard[];
}

export default function ShowAppointments({
  appointments,
}: ShowAppointmentsProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.appCard}
      contentContainerStyle={styles.appointmentsScroll}
      nestedScrollEnabled={true}
    >
      {appointments.map((appointment) => (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            router.push({
              pathname: "/(main)/bookingDetailsById",
              params: {
                bookingId: appointment.id,
              },
            });
          }}
          key={appointment.id}
          style={styles.verifiedSalonCard}
        >
          <View style={styles.verifiedCardTopRow}>
            <Text numberOfLines={1} style={styles.salonName}>
              {appointment.services}
            </Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>
                {appointment.badgeText}
              </Text>
            </View>
          </View>
          <Text style={styles.dateTimeBadgeText}>
            {appointment.dateTime}
          </Text>
          <View style={styles.verifiedCardInfoRow}>
            <AppImage
              uri={appointment.staffImage}
              style={styles.verifiedCardImage}
              iconSize={widthScale(14)}
              iconColor={theme.lightGreen}
            />
            <Text numberOfLines={1} style={styles.verifiedCardInfoText}>
              {appointment.staffName}
            </Text>
          </View>
          <View style={styles.verifiedCardInfoRow}>
            <MonitorIcon
              width={widthScale(14)}
              height={heightScale(14)}
              color={theme.lightGreen}
            />
            <Text numberOfLines={1} style={styles.verifiedCardInfoText}>
              {appointment.membershipInfo}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
