import React from "react";
import { useTranslation } from "react-i18next";
import AppointmentsList from "@/src/components/AppointmentsList";

export default function AllAppointmentsScreen() {
  const { t } = useTranslation();

  return <AppointmentsList headerTitle={t("appointments")} showBarberFilter />;
}
