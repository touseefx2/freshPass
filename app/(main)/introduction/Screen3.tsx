import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const features = [
    {
      icon: AiHairTryOnIcon,
      title: t("introBizPlanGenTitle"),
      description: t("introBizPlanGenDesc"),
    },
    {
      icon: AiReceptionistIcon,
      title: t("introBizPostGenTitle"),
      description: t("introBizPostGenDesc"),
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
      backgroundImage={IMAGES.aiFeatureBackB}
      onNext={onNext}
    />
  );
}
