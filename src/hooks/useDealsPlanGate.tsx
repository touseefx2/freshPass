import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import { setBusinessPlansModalVisible } from "@/src/state/slices/generalSlice";
import { isBusinessSubscriptionActive } from "@/src/state/slices/userSlice";

/**
 * Last-minute deals need a FreshPass plan (trial, Solo or Business — user
 * 11-05). Everyone sees My Deals / Post a Deal; without a plan a tap shows
 * "Choose a plan" instead. Render `planModal` once on the screen that calls
 * `ensureCanPostDeals`.
 */
export function useDealsPlanGate() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const [promptVisible, setPromptVisible] = useState(false);

  const ensureCanPostDeals = useCallback((): boolean => {
    // Same rule as products / reels / the Profile layout. No status loaded
    // yet: let it through, the server still checks.
    if (!businessStatus || isBusinessSubscriptionActive(businessStatus)) {
      return true;
    }
    setPromptVisible(true);
    return false;
  }, [businessStatus]);

  const openPlans = useCallback(() => {
    setPromptVisible(false);
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const planModal = (
    <BuyBusinessPlanModal
      visible={promptVisible}
      onClose={() => setPromptVisible(false)}
      onViewPlans={openPlans}
      subtitle={t("buyPlanDealsSubtitle")}
      message={t("buyPlanBeforeDeals")}
    />
  );

  return { ensureCanPostDeals, planModal };
}
