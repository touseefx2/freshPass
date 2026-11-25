import React from "react";
import { useTranslation } from "react-i18next";
import CoreFeatureScreen from "@/src/components/CoreFeatureScreen";
import { IMAGES } from "@/src/constant/images";
import { DashboardIcon, CRMIcon, RevenueReportingIcon } from "@/assets/icons";

interface Screen2Props {
  onNext: () => void;
}

export default function Screen2({ onNext }: Screen2Props) {
  const { t } = useTranslation();
  const features = [
    {
      icon: DashboardIcon,
      title: t("introBizDashboardTitle"),
      description: t("introBizDashboardDesc"),
    },
    {
      icon: CRMIcon,
      title: t("introBizCrmTitle"),
      description: t("introBizCrmDesc"),
    },
    {
      icon: RevenueReportingIcon,
      title: t("introBizRevenueTitle"),
      description: t("introBizRevenueDesc"),
    },
  ];

  return (
    <CoreFeatureScreen
      headline={t("introBizCoreHeadline")}
      features={features}
      buttonTitle={t("next")}
      backgroundImage={IMAGES.introductionBack2B}
      onNext={onNext}
    />
  );
}
