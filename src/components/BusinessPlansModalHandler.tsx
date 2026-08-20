import React, { useEffect, useRef } from "react";
import { useSegments } from "expo-router";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import {
  setBusinessPlansModalVisible,
  setSuppressBusinessPlansAutoOpen,
} from "@/src/state/slices/generalSlice";
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
  const appGateBlocked = useAppSelector(
    (state) =>
      state.general.maintenanceModeActive || state.general.forceUpdateActive,
  );
  const hasSeenStripeConnectCongrats = useAppSelector(
    (state) => state.general.hasSeenStripeConnectCongrats,
  );
  const suppressBusinessPlansAutoOpen = useAppSelector(
    (state) => state.general.suppressBusinessPlansAutoOpen,
  );
  const hasAutoOpenedOnce = useRef(false);

  const isOnHomeTab = Array.isArray(segments) && segments.includes("(home)");

  const waitingForStripeCongrats =
    businessStatus?.stripe_onboarding_status === "completed" &&
    hasSeenStripeConnectCongrats === false;

  const showBusinessSubscription =
    !appGateBlocked &&
    isOnHomeTab &&
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "completed" &&
    businessStatus?.has_subscription === false &&
    !waitingForStripeCongrats &&
    !suppressBusinessPlansAutoOpen;

  // Create navigates away from home — clear suppress so plans can auto-open on return
  useEffect(() => {
    if (!isOnHomeTab && suppressBusinessPlansAutoOpen) {
      dispatch(setSuppressBusinessPlansAutoOpen(false));
    }
  }, [isOnHomeTab, suppressBusinessPlansAutoOpen, dispatch]);

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
      visible={!appGateBlocked && businessPlansModalVisible}
      onClose={handleClose}
    />
  );
}
