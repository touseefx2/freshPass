import React from "react";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { setBusinessPlansModalVisible } from "@/src/state/slices/generalSlice";
import BusinessPlansModal from "@/src/components/businessPlansModal";

// Never auto-opens (client 11-03): the "Choose a plan" banner on Home opens it.
export default function BusinessPlansModalHandler() {
  const dispatch = useAppDispatch();
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
