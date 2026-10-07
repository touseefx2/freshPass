import React from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import BusinessSettingsHub from "@/src/components/BusinessSettingsHub";

/** Business Profile section: info, location, description and portfolio in one place. */
export default function BusinessProfileMenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <BusinessSettingsHub
      title={t("businessProfileTitle")}
      subtitle={t("businessProfileHubSubtitle")}
      items={[
        {
          key: "businessInformation",
          title: t("businessInformation"),
          iconName: "storefront",
          onPress: () => router.push("./businessProfile"),
        },
        {
          key: "businessLocation",
          title: t("businessLocation"),
          iconName: "place",
          onPress: () => router.push("./location"),
        },
        {
          key: "aboutYourBusiness",
          title: t("aboutYourBusiness"),
          iconName: "notebook-edit-outline",
          iconFamily: "community",
          onPress: () => router.push("./description"),
        },
        {
          key: "businessPortfolio",
          title: t("businessPortfolio"),
          iconName: "image-outline",
          iconFamily: "community",
          onPress: () => router.push("./portfolio"),
        },
      ]}
    />
  );
}
