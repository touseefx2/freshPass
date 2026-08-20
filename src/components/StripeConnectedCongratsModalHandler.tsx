import React from "react";
import { useRouter, useSegments } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import {
  setBusinessPlansModalVisible,
  setHasSeenStripeConnectCongrats,
  setSuppressBusinessPlansAutoOpen,
} from "@/src/state/slices/generalSlice";
import StripeConnectedCongratsModal from "@/src/components/StripeConnectedCongratsModal";

export default function StripeConnectedCongratsModalHandler() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments() as string[];
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const hasSeenStripeConnectCongrats = useAppSelector(
    (state) => state.general.hasSeenStripeConnectCongrats,
  );
  const appGateBlocked = useAppSelector(
    (state) =>
      state.general.maintenanceModeActive || state.general.forceUpdateActive,
  );

  const isOnHomeTab = Array.isArray(segments) && segments.includes("(home)");

  const visible =
    !appGateBlocked &&
    isOnHomeTab &&
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "completed" &&
    hasSeenStripeConnectCongrats === false;

  const markSeen = () => {
    dispatch(setHasSeenStripeConnectCongrats(true));
  };

  const handleSkip = () => {
    markSeen();
  };

  const handleCreate = () => {
    dispatch(setSuppressBusinessPlansAutoOpen(true));
    dispatch(setBusinessPlansModalVisible(false));
    markSeen();

    // Profile → Business profile settings → Manage subscription list
    router.push("/(main)/dashboard/(account)");
    setTimeout(() => {
      router.push("/(main)/dashboard/(account)/(businessProfileSettings)");
      setTimeout(() => {
        router.push(
          "/(main)/dashboard/(account)/(businessProfileSettings)/subscriptions",
        );
      }, 15);
    }, 15);
  };

  return (
    <StripeConnectedCongratsModal
      visible={visible}
      onSkip={handleSkip}
      onCreate={handleCreate}
    />
  );
}
