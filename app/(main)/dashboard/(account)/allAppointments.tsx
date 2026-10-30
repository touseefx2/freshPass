import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import AppointmentsList, {
  parseStatusFilter,
} from "@/src/components/AppointmentsList";

export default function AllAppointmentsScreen() {
  const { t } = useTranslation();
  const { status } = useLocalSearchParams<{ status?: string }>();

  return (
    <AppointmentsList
      headerTitle={t("appointments")}
      showBarberFilter
      initialStatus={parseStatusFilter(status)}
    />
  );
}
