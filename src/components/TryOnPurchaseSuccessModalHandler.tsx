import React from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { setTryOnPurchaseSuccessModalVisible } from "@/src/state/slices/generalSlice";
import TryOnPurchaseSuccessModal from "@/src/components/TryOnPurchaseSuccessModal";

export default function TryOnPurchaseSuccessModalHandler() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const visible = useAppSelector(
    (state) => state.general.tryOnPurchaseSuccessModalVisible,
  );
  const source = useAppSelector(
    (state) => state.general.tryOnPurchaseSuccessSource,
  );
  const appGateBlocked = useAppSelector(
    (state) =>
      state.general.maintenanceModeActive || state.general.forceUpdateActive,
  );

  const closeModal = () => {
    dispatch(setTryOnPurchaseSuccessModalVisible(false));
  };

  const handleTryNow = () => {
    closeModal();
    router.push("/(main)/aiTools/toolList");
  };

  return (
    <TryOnPurchaseSuccessModal
      visible={visible && !appGateBlocked}
      source={source}
      onTryNow={handleTryNow}
      onSkip={closeModal}
      onContinue={closeModal}
    />
  );
}
