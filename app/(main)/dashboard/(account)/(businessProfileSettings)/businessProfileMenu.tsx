import React, { useMemo } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import BusinessSettingsHub, {
  BusinessSettingsHubItem,
} from "@/src/components/BusinessSettingsHub";
import { useAppSelector } from "@/src/hooks/hooks";

/** Business Profile section: info, location, hours, description, portfolio and subscription. */
export default function BusinessProfileMenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const businessStatus = user.businessStatus;
  const isBusinessOwner = user.userRole === "business";
  const showStripeBanner =
    isBusinessOwner &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";

  const items = useMemo((): BusinessSettingsHubItem[] => {
    const baseItems: BusinessSettingsHubItem[] = [
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
        key: "businessHours",
        title: t("businessHoursTitle"),
        iconName: "calendar-month",
        onPress: () => router.push("./setupAvailability"),
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
    ];

    if (!showStripeBanner) {
      baseItems.push({
        key: "freshpassSubscription",
        title: t("freshpassSubscription"),
        iconName: "crown",
        iconFamily: "community",
        onPress: () =>
          router.push("/(main)/dashboard/(account)/subscription"),
      });
    }

    return baseItems;
  }, [t, router, showStripeBanner]);

  return (
    <BusinessSettingsHub
      title={t("businessProfileTitle")}
      subtitle={t("businessProfileHubSubtitle")}
      items={items}
    />
  );
}
