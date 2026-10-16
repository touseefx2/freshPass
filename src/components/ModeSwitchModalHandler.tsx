import React, { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useSegments } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { setModeSwitchModalVisible } from "@/src/state/slices/generalSlice";
import type { UserMode } from "@/src/state/slices/userSlice";
import { switchActiveMode } from "@/src/state/thunks/userModeThunks";
import { resetToDashboardHome } from "@/src/utils/navigation";
import ModeSwitchModal, {
  type ModeSwitchPhase,
} from "@/src/components/ModeSwitchModal";

/**
 * Business ↔ customer mode switch: dropdown menu hanging from the FreshPass
 * logo chevron in the dashboard headers. Mounted at the root so it stays up
 * while the dashboard swaps to the other mode underneath.
 */
export default function ModeSwitchModalHandler() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const segments = useSegments() as string[];
  const visible = useAppSelector((state) => state.general.modeSwitchModalVisible);
  const activeMode = useAppSelector((state) => state.user.active_mode);
  const anchor = useAppSelector((state) => state.general.modeSwitchAnchor);

  const [phase, setPhase] = useState<ModeSwitchPhase>("menu");
  // Frozen when the modal opens — active_mode flips mid-switch
  const [fromMode, setFromMode] = useState<UserMode>("business");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPhase("menu");
    setErrorMessage(null);
    setFromMode(activeMode ?? "business");
    // Only on open — active_mode changes mid-switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = useCallback(() => {
    dispatch(setModeSwitchModalVisible(false));
  }, [dispatch]);

  const handleSelect = useCallback(async (toMode: UserMode) => {
    if (phase === "switching" || toMode === fromMode) return;

    setPhase("switching");
    setErrorMessage(null);
    try {
      await dispatch(switchActiveMode(toMode)).unwrap();

      // Fresh stack on the new side's Home (other tabs may hold old-mode screens)
      const isOnHomeRoot = segments[segments.length - 1] === "(home)";
      if (!isOnHomeRoot) {
        resetToDashboardHome();
      }

      // No congrats card — the new side's Home is the confirmation
      close();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(
        toMode === "customer"
          ? t("modeSwitchedCustomerTitle")
          : t("modeSwitchedBusinessTitle"),
      );
    } catch (error: any) {
      setPhase("menu");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // No-internet toast is already shown by ApiService
      if (!error?.isNoInternet) {
        setErrorMessage(error?.message || t("modeSwitchFailed"));
      }
    }
  }, [close, dispatch, fromMode, phase, segments, t]);

  return (
    <ModeSwitchModal
      visible={visible}
      phase={phase}
      fromMode={fromMode}
      anchor={anchor}
      errorMessage={errorMessage}
      onSelect={handleSelect}
      onCancel={close}
    />
  );
}
