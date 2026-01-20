import React from "react";
import { IMAGES } from "@/src/constant/images";
import {
  AiHairTryOnIcon,
  AiReceptionistIcon,
  AiChatSupportIcon,
} from "@/assets/icons";
import AiFeatureScreen from "@/src/components/AiFeatureScreen";

interface Screen2Props {
  onNext: () => void;
}

export default function Screen3({ onNext }: Screen2Props) {
  const features = [
    {
      icon: AiHairTryOnIcon,
      title: "Subscription Plan Generator",
      description:
        "Generate subscription plans for your business in seconds, using our AI assistant.",
    },
    {
      icon: AiReceptionistIcon,
      title: "Social Media Post Generator",
      description:
        "Generate social media posts for your business in seconds, using our AI assistant.",
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
      backgroundImage={IMAGES.aiFeatureBack}
      onNext={onNext}
    />
  );
}
