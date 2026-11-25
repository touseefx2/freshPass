import React from "react";
import { useTranslation } from "react-i18next";
import NotificationScreen from "@/src/components/NotificationScreen";
import { IMAGES } from "@/src/constant/images";
import {
  NeverMissBeatIcon,
  AppointmentRemindersIcon,
  BookingConfirmationsIcon,
} from "@/assets/icons";

interface NotificationProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function Notification({ onNext, onSkip }: NotificationProps) {
  const { t } = useTranslation();
  const features = [
    {
      icon: NeverMissBeatIcon,
      title: t("introClientDealsTitle"),
      description: t("introClientDealsDesc"),
    },
    {
      icon: AppointmentRemindersIcon,
      title: t("prefAppointmentReminders"),
      description: t("introClientRemindersDesc"),
    },
    {
      icon: BookingConfirmationsIcon,
      title: t("introClientConfirmTitle"),
      description: t("introClientConfirmDesc"),
    },
  ];

  return (
    <NotificationScreen
      headline={t("introClientNotifHeadline")}
      features={features}
      buttonTitle={t("introTurnOnNotifications")}
      backgroundImage={IMAGES.introductionBack1C}
      footerText={t("introNotifFooter")}
      onNext={onNext}
      onSkip={onSkip}
    />
  );
}
