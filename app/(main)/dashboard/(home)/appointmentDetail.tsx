import React from "react";
import Logger from "@/src/services/logger";
import { useLocalSearchParams } from "expo-router";
import AppointmentDetail, { Appointment } from "@/src/components/appointmentDetail";

export default function AppointmentDetailScreen() {
  const params = useLocalSearchParams<{ appointment?: string }>();

  let appointment: Appointment | null = null;

  try {
    if (params.appointment) {
      appointment = JSON.parse(params.appointment);
    }
  } catch (error) {
    Logger.error("Error parsing appointment data:", error);
  }

  return <AppointmentDetail appointment={appointment} />;
}
