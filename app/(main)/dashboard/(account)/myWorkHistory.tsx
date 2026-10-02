import React from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import WorkHistoryList from "@/src/components/dashboard/home/components/WorkHistoryList";

export default function MyWorkHistoryScreen() {
  const { t } = useTranslation();
  const staffId = useAppSelector(
    (state) => state.user.businessStatus?.owner_as_staff?.staff_id ?? null,
  );

  return (
    <WorkHistoryList
      staffId={staffId}
      headerTitle={t("myWorkHistory")}
    />
  );
}
