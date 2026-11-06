import React from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import BusinessSettingsHub from "@/src/components/BusinessSettingsHub";
import { useAppSelector } from "@/src/hooks/hooks";
import { usesSoloProfileLayout } from "@/src/state/slices/userSlice";

/** Services & Memberships section: the business's services and the memberships it sells to customers. */
export default function ServicesAndMembershipsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  // Business plan keeps the policy here; the Solo profile has its own row
  const showCancellationPolicy =
    userRole === "business" && !usesSoloProfileLayout(businessStatus);

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
        ...(showCancellationPolicy
          ? [
              {
                key: "cancellationPolicy",
                title: t("cancellationPolicy"),
                subtitle: t("soloCancellationSub"),
                iconName: "policy",
                onPress: () => router.push("./cancellationPolicy"),
              },
            ]
          : []),
      ]}
    />
  );
}
