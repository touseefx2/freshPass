import React from "react";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { setBusinessPlanPurchasedCongratsVisible } from "@/src/state/slices/generalSlice";
import BusinessPlanPurchasedCongratsModal from "@/src/components/BusinessPlanPurchasedCongratsModal";

export default function BusinessPlanPurchasedCongratsModalHandler() {
  const dispatch = useAppDispatch();
  const visible = useAppSelector(
    (state) => state.general.businessPlanPurchasedCongratsVisible,
  );
  const appGateBlocked = useAppSelector(
    (state) =>
      state.general.maintenanceModeActive || state.general.forceUpdateActive,
  );

  const handleOk = () => {
    dispatch(setBusinessPlanPurchasedCongratsVisible(false));
  };

  return (
    <BusinessPlanPurchasedCongratsModal
      visible={visible && !appGateBlocked}
      onOk={handleOk}
    />
  );
}
