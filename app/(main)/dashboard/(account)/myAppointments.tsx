import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/src/hooks/hooks";
import AppointmentsList, {
  StatusFilter,
} from "@/src/components/AppointmentsList";

export default function MyAppointmentsScreen() {
  const { t } = useTranslation();
  // Staff home Work History "See all" opens on the All tab
  const { status } = useLocalSearchParams<{ status?: StatusFilter }>();
  const isStaff = useAppSelector((state) => state.user.userRole === "staff");
  const ownerStaffId = useAppSelector(
    (state) => state.user.businessStatus?.owner_as_staff?.staff_id ?? null,
  );

  // Staff: the backend already narrows /appointments to the caller
  return (
    <AppointmentsList
      headerTitle={t("myAppointments")}
      staffId={isStaff ? null : ownerStaffId}
      hideStaffName={isStaff}
      initialStatus={status}
    />
  );
}
