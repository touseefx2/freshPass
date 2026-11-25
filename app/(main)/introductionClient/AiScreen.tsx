import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const features = [
    {
      icon: AiHairTryOnIcon,
      title: t("hairTryon"),
      description: t("introClientAiTryOnDesc"),
    },
    {
      icon: AiReceptionistIcon,
      title: t("aiReceptionist"),
      description: t("introClientAiReceptionistDesc"),
    },
    {
      icon: AiChatSupportIcon,
      title: t("introBizAiChatTitle"),
      description: t("introBizAiChatDesc"),
    },
  ];

  return (
    <AiFeatureScreen
      headline={t("introBizAiHeadline")}
      features={features}
      buttonTitle={t("continue")}
      backgroundImage={IMAGES.aiFeatureBackC}
      onNext={onNext}
    />
  );
}
