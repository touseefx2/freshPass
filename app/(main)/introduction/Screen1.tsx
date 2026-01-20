import React from "react";
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
  const features = [
    {
      icon: EnvelopeIcon,
      title: "Instant booking alerts",
      description:
        "Get notified immediately when a new appointment is booked, so you're always prepared.",
    },
    {
      icon: MegaphoneIcon,
      title: "Modification & cancellations",
      description:
        "Receive instant updates if a client reschedules or cancels, allowing you to fill the slot.",
    },
    {
      icon: PersonScissorsIcon,
      title: "Customer reminders",
      description:
        "See a summary of which customers need an automatic reminder before their appointment tomorrow.",
    },
  ];

  return (
    <NotificationScreen
      headline="Never miss a customer"
      features={features}
      buttonTitle="Turn on notifications"
      backgroundImage={IMAGES.introductionBack1}
      footerText="Stop notifications anytime if you change you mind."
      onNext={onNext}
      onSkip={onSkip}
    />
  );
}
