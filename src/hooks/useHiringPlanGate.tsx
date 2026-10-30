import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import UpgradeToBusinessModal from "@/src/components/UpgradeToBusinessModal";
import {
  setBusinessPlansModalBusinessOnly,
  setBusinessPlansModalVisible,
} from "@/src/state/slices/generalSlice";
import {
  canPostJobs,
  isSoloSubscription,
} from "@/src/state/slices/userSlice";

/**
 * Hiring needs the Business plan. Everyone sees the Hiring entry; without the
 * plan a tap shows "Choose a plan" (no plan) or "Upgrade" (Solo) instead.
 * Render `planModals` once on the screen that calls `ensureCanHire`.
 */
export function useHiringPlanGate() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const [prompt, setPrompt] = useState<"buy" | "upgrade" | null>(null);

  const ensureCanHire = useCallback((): boolean => {
    if (canPostJobs(businessStatus)) return true;
    setPrompt(isSoloSubscription(businessStatus) ? "upgrade" : "buy");
    return false;
  }, [businessStatus]);

  const openBusinessPlans = useCallback(() => {
    setPrompt(null);
    dispatch(setBusinessPlansModalBusinessOnly(true));
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const planModals = (
    <>
      <BuyBusinessPlanModal
        visible={prompt === "buy"}
        onClose={() => setPrompt(null)}
        onViewPlans={openBusinessPlans}
        subtitle={t("buyBusinessPlanHiringSubtitle")}
        message={t("buyBusinessPlanBeforeHiring")}
      />
      <UpgradeToBusinessModal
        visible={prompt === "upgrade"}
        onClose={() => setPrompt(null)}
        onUpgradePlan={openBusinessPlans}
        message={t("soloPlanCannotHireMessage")}
      />
    </>
  );

  return { ensureCanHire, planModals, planPromptVisible: prompt !== null };
}
