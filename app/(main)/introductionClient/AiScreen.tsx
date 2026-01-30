import React from "react";
import { IMAGES } from "@/src/constant/images";
import {
  AiHairTryOnIcon,
  AiReceptionistIcon,
  AiChatSupportIcon,
} from "@/assets/icons";
import AiFeatureScreen from "@/src/components/AiFeatureScreen";

interface AiScreenProps {
  onNext: () => void;
}

export default function AiScreen({ onNext }: AiScreenProps) {
  const features = [
    {
      icon: AiHairTryOnIcon,
      title: "AI Hair Try-On",
      description:
        "Visualize new hairstyles on yourself before booking, using our AI virtual mirror.",
    },
    {
      icon: AiReceptionistIcon,
      title: "AI Receptionist",
      description:
        "Let our smart assistant find and book the perfect appointment for you, 24/7.",
    },
    {
      icon: AiChatSupportIcon,
      title: "AI Chat Support",
      description:
        "Get instant answers to your beauty and booking questions anytime.",
    },
  ];

  return (
    <AiFeatureScreen
      headline="AI-Powered Experience"
      features={features}
      buttonTitle="Continue"
      backgroundImage={IMAGES.aiFeatureBackC}
      onNext={onNext}
    />
  );
}
