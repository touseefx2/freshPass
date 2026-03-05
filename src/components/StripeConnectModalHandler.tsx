import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import StripeConnectModal from "@/src/components/StripeConnectModal";
import { useSegments } from "expo-router";

export default function StripeConnectModalHandler() {
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const [dismissed, setDismissed] = useState(false);
  const segments = useSegments() as string[];

  const isOnHomeTab = Array.isArray(segments) && segments.includes("(home)");

  const showStripeBanner =
    isOnHomeTab &&
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";

  useEffect(() => {
    if (!showStripeBanner) {
      setDismissed(false);
    }
  }, [showStripeBanner]);

  const visible = showStripeBanner && !dismissed;

  return (
    <StripeConnectModal visible={visible} onClose={() => setDismissed(true)} />
  );
}
