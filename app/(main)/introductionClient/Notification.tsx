import React from "react";
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
  const features = [
    {
      icon: NeverMissBeatIcon,
      title: "Never miss a beat",
      description:
        "Receive exclusive discounts and special offers from your favorite salons.",
    },
    {
      icon: AppointmentRemindersIcon,
      title: "Appointment reminders",
      description: 
        "Get notified before your appointment so you're always on time.",
    },
    {
      icon: BookingConfirmationsIcon,
      title: "Booking confirmations",
      description:
        "Instant confirmation when you book, modify, or cancel an appointment.",
    },
  ];

  return (
    <NotificationScreen
      headline="Never miss an appointment"
      features={features}
      buttonTitle="Turn on notifications"
      backgroundImage={IMAGES.acceptTermBack}
      footerText="Stop notifications anytime if you change you mind."
      onNext={onNext}
      onSkip={onSkip}
    />
  );
}
