import React from "react";
import { useTranslation } from "react-i18next";
import WorkHistoryList from "@/src/components/dashboard/home/components/WorkHistoryList";

export default function AllWorkHistoryScreen() {
  const { t } = useTranslation();

  return (
    <WorkHistoryList headerTitle={t("allWorkHistory")} />
  );
}
