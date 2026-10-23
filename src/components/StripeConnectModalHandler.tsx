import React from "react";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import StripeConnectModal from "@/src/components/StripeConnectModal";
import { setStripeConnectModalVisible } from "@/src/state/slices/generalSlice";

/**
 * Stripe Connect is optional (free trial + going online only need a plan), so
 * the modal no longer opens by itself on Home. It opens from the "Get paid from
 * customers" banner, the reminder push and the payment-feature gates.
 */
export default function StripeConnectModalHandler() {
  const dispatch = useAppDispatch();
  const stripeConnectModalVisible = useAppSelector(
    (state) => state.general.stripeConnectModalVisible,
  );
  const appGateBlocked = useAppSelector(
    (state) =>
      state.general.maintenanceModeActive || state.general.forceUpdateActive,
  );

  const visible = !appGateBlocked && stripeConnectModalVisible;

  const handleClose = () => {
    dispatch(setStripeConnectModalVisible(false));
  };

  return (
    <StripeConnectModal visible={visible} onClose={handleClose} />
  );
}
