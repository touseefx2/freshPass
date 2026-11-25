import React from "react";
import { useTranslation } from "react-i18next";
import CoreFeatureScreen from "@/src/components/CoreFeatureScreen";
import { IMAGES } from "@/src/constant/images";
import {
  FindNearbySalonsIcon,
  FlexiblePaymentOptionsIcon,
  CheckRealTimeAvailabilityIcon,
} from "@/assets/icons";

interface Screen2Props {
  onNext: () => void;
}

export default function Screen2({ onNext }: Screen2Props) {
  const { t } = useTranslation();
  const features = [
    {
      icon: FindNearbySalonsIcon,
      title: t("introClientNearbyTitle"),
      description: t("introClientNearbyDesc"),
    },
    {
      icon: FlexiblePaymentOptionsIcon,
      title: t("introClientPaymentTitle"),
      description: t("introClientPaymentDesc"),
    },
    {
      icon: CheckRealTimeAvailabilityIcon,
      title: t("introClientAvailabilityTitle"),
      description: t("introClientAvailabilityDesc"),
    },
  ];

  return (
    <CoreFeatureScreen
      headline={t("introClientCoreHeadline")}
      features={features}
      buttonTitle={t("continue")}
      backgroundImage={IMAGES.introductionBack2C}
      onNext={onNext}
    />
  );
}
