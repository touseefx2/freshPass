import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import StripeConnectModal from "@/src/components/StripeConnectModal";
import { setStripeConnectModalVisible } from "@/src/state/slices/generalSlice";
import { useSegments } from "expo-router";

export default function StripeConnectModalHandler() {
  const dispatch = useAppDispatch();
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const stripeConnectModalVisible = useAppSelector(
    (state) => state.general.stripeConnectModalVisible,
  );
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

  const visible =
    stripeConnectModalVisible || (showStripeBanner && !dismissed);

  const handleClose = () => {
    setDismissed(true);
    dispatch(setStripeConnectModalVisible(false));
  };

  return (
    <StripeConnectModal visible={visible} onClose={handleClose} />
  );
}
