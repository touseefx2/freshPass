import React from "react";
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
  const features = [
    {
      icon: FindNearbySalonsIcon,
      title: "Find nearby salons",
      description:
        "See top-rated barbers, nail salons, and spas closest to you.",
    },
    {
      icon: FlexiblePaymentOptionsIcon,
      title: "Flexible payment options",
      description:
        "Choose to pay for individual services or unlock greater value with exclusive monthly subscriptions.",
    },
    {
      icon: CheckRealTimeAvailabilityIcon,
      title: "Check real-time availability",
      description:
        "Instantly see who has an open slot and book your appointment in seconds.",
    },
  ];

  return (
    <CoreFeatureScreen
      headline="Discover & book instantly."
      features={features}
      buttonTitle="Continue"
      backgroundImage={IMAGES.introductionBack2C}
      onNext={onNext}
    />
  );
}
