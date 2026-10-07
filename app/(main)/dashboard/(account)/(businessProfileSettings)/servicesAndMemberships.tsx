import React from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import BusinessSettingsHub from "@/src/components/BusinessSettingsHub";

/** Services & Memberships section: the business's services and the memberships it sells to customers. */
export default function ServicesAndMembershipsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <BusinessSettingsHub
      title={t("servicesAndMemberships")}
      subtitle={t("servicesAndMembershipsSubtitle")}
      note={t("membershipsSeparateNote")}
      items={[
        {
          key: "services",
          title: t("individualServicesListTitle"),
          subtitle: t("individualServicesListSubtitle"),
          iconName: "content-cut",
          onPress: () => router.push("./services"),
        },
        {
          key: "memberships",
          title: t("membershipList"),
          subtitle: t("membershipListSubtitle"),
          iconName: "crown",
          iconFamily: "community",
          onPress: () => router.push("./subscriptions"),
        },
      ]}
    />
  );
}
