import React from "react";
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
    console.error("Error parsing appointment data:", error);
  }

  return <AppointmentDetail appointment={appointment} />;
}
