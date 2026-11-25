import React from "react";
import { useTranslation } from "react-i18next";
import NotificationScreen from "@/src/components/NotificationScreen";
import { IMAGES } from "@/src/constant/images";
import {
  EnvelopeIcon,
  MegaphoneIcon,
  PersonScissorsIcon,
} from "@/assets/icons";

interface Screen1Props {
  onNext: () => void;
  onSkip: () => void;
}

export default function Screen1({ onNext, onSkip }: Screen1Props) {
  const { t } = useTranslation();
  const features = [
    {
      icon: EnvelopeIcon,
      title: t("introBizAlertsTitle"),
      description: t("introBizAlertsDesc"),
    },
    {
      icon: MegaphoneIcon,
      title: t("introBizChangesTitle"),
      description: t("introBizChangesDesc"),
    },
    {
      icon: PersonScissorsIcon,
      title: t("introBizRemindersTitle"),
      description: t("introBizRemindersDesc"),
    },
  ];

  return (
    <NotificationScreen
      headline={t("introBizNotifHeadline")}
      features={features}
      buttonTitle={t("introTurnOnNotifications")}
      backgroundImage={IMAGES.introductionBack1B}
      footerText={t("introNotifFooter")}
      onNext={onNext}
      onSkip={onSkip}
    />
  );
}
