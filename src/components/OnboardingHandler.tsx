import React, { useCallback, useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import OnboardingModal from "@/src/components/onboardingModal";
import { setCurrentStep } from "@/src/state/slices/completeProfileSlice";

export default function OnboardingHandler() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);
  const accessToken = useAppSelector((state) => state.user.accessToken);
  const [modalVisible, setModalVisible] = useState(false);

  // Show modal only for business users if onboarding is not completed
  // Staff and client don't need onboarding
  const shouldShowModal =
    userRole === "business" &&
    accessToken &&
    businessStatus &&
    !businessStatus.onboarding_completed;

  // Update modal visibility based on business status
  useEffect(() => {
    if (shouldShowModal) {
      setModalVisible(true);
    } else {
      setModalVisible(false);
    }
  }, [shouldShowModal]);

  const handleContinue = useCallback(() => {
    // Close modal immediately when Continue is clicked
    setModalVisible(false);
    
    if (businessStatus?.next_step) {
      // Set the step in Redux before navigating
      dispatch(setCurrentStep(businessStatus.next_step));
      // Navigate to complete profile
      router.push(`/(main)/${MAIN_ROUTES.COMPLETE_PROFILE}`);
    } else {
      // If no next_step, go to step 1
      dispatch(setCurrentStep(1));
      router.push(`/(main)/${MAIN_ROUTES.COMPLETE_PROFILE}`);
    }
  }, [businessStatus, dispatch, router]);

  if (!shouldShowModal) {
    return null;
  }

  return <OnboardingModal visible={modalVisible} onContinue={handleContinue} />;
}
