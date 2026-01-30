import React from "react";
import CoreFeatureScreen from "@/src/components/CoreFeatureScreen";
import { IMAGES } from "@/src/constant/images";
import { DashboardIcon, CRMIcon, RevenueReportingIcon } from "@/assets/icons";

interface Screen2Props {
  onNext: () => void;
}

export default function Screen2({ onNext }: Screen2Props) {
  const features = [
    {
      icon: DashboardIcon,
      title: "All-in-one dashboard",
      description:
        "Get a real-time view of your daily appointments, staff performance, and revenue—all from a single screen.",
    },
    {
      icon: CRMIcon,
      title: "Smart customer CRM",
      description:
        "Track client history, preferences, and membership status to provide personalized service and boost retention.",
    },
    {
      icon: RevenueReportingIcon,
      title: "Automated revenue & reporting",
      description:
        "Effortlessly track your income from subscriptions, single services, and product sales with detailed, exportable reports.",
    },
  ];

  return (
    <CoreFeatureScreen
      headline="Discover & book instantly"
      features={features}
      buttonTitle="Next"
      backgroundImage={IMAGES.introductionBack2B}
      onNext={onNext}
    />
  );
}
