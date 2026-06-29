import React, { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useRouter, useSegments } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import OnboardingModal from "@/src/components/onboardingModal";
import { setCurrentStep } from "@/src/state/slices/completeProfileSlice";

export default function OnboardingHandler() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const segments = useSegments() as string[];
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);
  const accessToken = useAppSelector((state) => state.user.accessToken);

  const isOnOnboardingScreen = segments.includes(MAIN_ROUTES.COMPLETE_PROFILE);

  // Show modal only for business users if onboarding is not completed
  // Staff and client don't need onboarding
  const shouldShowModal =
    userRole === "business" &&
    accessToken &&
    businessStatus &&
    !businessStatus.onboarding_completed;

  const modalVisible = shouldShowModal && !isOnOnboardingScreen;

  const handleContinue = useCallback(() => {
    if (businessStatus?.next_step) {
      dispatch(setCurrentStep(businessStatus.next_step));
      router.push(`/(main)/${MAIN_ROUTES.COMPLETE_PROFILE}`);
    } else {
      dispatch(setCurrentStep(1));
      router.push(`/(main)/${MAIN_ROUTES.COMPLETE_PROFILE}`);
    }
  }, [businessStatus, dispatch, router]);

  if (!shouldShowModal) {
    return null;
  }

  return <OnboardingModal visible={modalVisible} onContinue={handleContinue} />;
}
