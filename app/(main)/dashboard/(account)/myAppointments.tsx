import React from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/src/hooks/hooks";
import AppointmentsList from "@/src/components/AppointmentsList";

export default function MyAppointmentsScreen() {
  const { t } = useTranslation();
  const staffId = useAppSelector(
    (state) => state.user.businessStatus?.owner_as_staff?.staff_id ?? null,
  );

  return <AppointmentsList headerTitle={t("myAppointments")} staffId={staffId} />;
}
