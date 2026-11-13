import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import CustomersList from "@/src/components/customersList";

/** Customers an import created or updated (GET /api/business-customers?import_id=). */
export default function ImportedCustomersScreen() {
  const { t } = useTranslation();
  const { import_id } = useLocalSearchParams<{ import_id?: string }>();
  return <CustomersList importId={import_id} title={t("bcuImportedTitle")} />;
}
