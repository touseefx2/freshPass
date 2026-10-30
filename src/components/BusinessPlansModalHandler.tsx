import React, { useEffect } from "react";
import { useSegments } from "expo-router";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import {
  dismissSetupReminder,
  setBusinessPlansModalVisible,
  setSuppressBusinessPlansAutoOpen,
} from "@/src/state/slices/generalSlice";
import BusinessPlansModal from "@/src/components/businessPlansModal";

const HOME_TAB_NESTED_ROUTES = [
  "userReviews",
  "businessEarnings",
  "appointmentDetail",
  "workHistory",
  "businessList",
  "businessDetail",
  "staffDetail",
  "aiRequests",
  "aiResults",
];

const AUTO_OPEN_KEY = "auto:businessPlans";

export default function BusinessPlansModalHandler() {
  const dispatch = useAppDispatch();
  const segments = useSegments() as string[];
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const businessPlansModalVisible = useAppSelector(
    (state) => state.general.businessPlansModalVisible,
  );
  const businessPlansModalBusinessOnly = useAppSelector(
    (state) => state.general.businessPlansModalBusinessOnly,
  );
  const appGateBlocked = useAppSelector(
    (state) =>
      state.general.maintenanceModeActive || state.general.forceUpdateActive,
  );
  const suppressBusinessPlansAutoOpen = useAppSelector(
    (state) => state.general.suppressBusinessPlansAutoOpen,
  );
  const businessPlanPurchasedCongratsVisible = useAppSelector(
    (state) => state.general.businessPlanPurchasedCongratsVisible,
  );
  // Auto-open only once per login; after that the "Choose a plan" banner opens it.
  const hasAutoOpenedOnce = useAppSelector((state) =>
    state.general.dismissedSetupReminders.includes(AUTO_OPEN_KEY),
  );

  const isOnHomeTab = Array.isArray(segments) && segments.includes("(home)");

  const waitingForStripeCongrats =
    businessStatus?.stripe_onboarding_status === "completed" &&
    businessStatus?.has_seen_stripe_connect_congrats !== true;

  // Free trial no longer waits for Stripe Connect — open right after the profile
  const showBusinessSubscription =
    !appGateBlocked &&
    isOnHomeTab &&
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.has_subscription === false &&
    !waitingForStripeCongrats &&
    !suppressBusinessPlansAutoOpen &&
    !businessPlanPurchasedCongratsVisible;

  // Create navigates away from home — clear suppress so plans can auto-open on return
  useEffect(() => {
    if (!isOnHomeTab && suppressBusinessPlansAutoOpen) {
      dispatch(setSuppressBusinessPlansAutoOpen(false));
    }
  }, [isOnHomeTab, suppressBusinessPlansAutoOpen, dispatch]);

  useEffect(() => {
    if (showBusinessSubscription && !hasAutoOpenedOnce) {
      dispatch(setBusinessPlansModalVisible(true));
      dispatch(dismissSetupReminder(AUTO_OPEN_KEY));
    }
  }, [showBusinessSubscription, hasAutoOpenedOnce, dispatch]);

  const handleClose = () => {
    dispatch(setBusinessPlansModalVisible(false));
  };

  return (
    <BusinessPlansModal
      visible={!appGateBlocked && businessPlansModalVisible}
      onClose={handleClose}
      businessOnly={businessPlansModalBusinessOnly}
    />
  );
}
