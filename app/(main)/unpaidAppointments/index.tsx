import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import AppointmentsList from "@/src/components/AppointmentsList";

export default function UnpaidAppointmentsScreen() {
  const { t } = useTranslation();
  const { from, to } = useLocalSearchParams<{ from?: string; to?: string }>();
  const dateRange = useMemo(
    () => (from && to ? { from, to } : null),
    [from, to],
  );

  return (
    <AppointmentsList
      headerTitle={t("bhRecordPayments")}
      showBarberFilter
      initialStatus="completed"
      inPersonPaymentStatus="unpaid"
      fixedDateRange={dateRange}
    />
  );
}
