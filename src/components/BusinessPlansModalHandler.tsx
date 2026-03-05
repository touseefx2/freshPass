import React, { useEffect, useRef } from "react";
import { useSegments } from "expo-router";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { setBusinessPlansModalVisible } from "@/src/state/slices/generalSlice";
import BusinessPlansModal from "@/src/components/businessPlansModal";

const HOME_TAB_NESTED_ROUTES = [
  "userReviews",
  "appointmentDetail",
  "workHistory",
  "businessList",
  "businessDetail",
  "staffDetail",
  "aiRequests",
  "aiResults",
];

export default function BusinessPlansModalHandler() {
  const dispatch = useAppDispatch();
  const segments = useSegments() as string[];
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const businessPlansModalVisible = useAppSelector(
    (state) => state.general.businessPlansModalVisible,
  );
  const hasAutoOpenedOnce = useRef(false);

  const isOnHomeTab = Array.isArray(segments) && segments.includes("(home)");

  const showBusinessSubscription =
    isOnHomeTab &&
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "completed" &&
    businessStatus?.has_subscription === false;

  useEffect(() => {
    if (showBusinessSubscription && !hasAutoOpenedOnce.current) {
      dispatch(setBusinessPlansModalVisible(true));
      hasAutoOpenedOnce.current = true;
    }
    if (!showBusinessSubscription) {
      hasAutoOpenedOnce.current = false;
    }
  }, [showBusinessSubscription, dispatch]);

  const handleClose = () => {
    dispatch(setBusinessPlansModalVisible(false));
  };

  return (
    <BusinessPlansModal
      visible={businessPlansModalVisible}
      onClose={handleClose}
    />
  );
}
