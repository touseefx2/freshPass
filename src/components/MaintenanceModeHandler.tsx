import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Modal, Platform } from "react-native";
import MaintenanceModeScreen from "@/src/components/maintenanceModeScreen";
import {
  fetchMaintenanceConfig,
  MaintenanceConfig,
  shouldShowMaintenance,
} from "@/src/services/maintenanceService";
import { useAppDispatch } from "@/src/hooks/hooks";
import { setMaintenanceModeActive } from "@/src/state/slices/generalSlice";
import Logger from "@/src/services/logger";

export default function MaintenanceModeHandler() {
  const dispatch = useAppDispatch();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const checkMaintenance = useCallback(async () => {
    try {
      const nextConfig = await fetchMaintenanceConfig();
      const nextVisible = shouldShowMaintenance(nextConfig);
      setConfig(nextConfig);
      setVisible(nextVisible);
      dispatch(setMaintenanceModeActive(nextVisible));
    } catch (error) {
      // Fail open — never block the app if Remote Config is unreachable
      Logger.warn("[MaintenanceModeHandler] Check failed:", error);
      setVisible(false);
      dispatch(setMaintenanceModeActive(false));
    }
  }, [dispatch]);

  useEffect(() => {
    checkMaintenance();
  }, [checkMaintenance]);

  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );

    return () => subscription.remove();
  }, [visible]);

  useEffect(() => {
    return () => {
      dispatch(setMaintenanceModeActive(false));
    };
  }, [dispatch]);

  const handleRecheck = useCallback(async () => {
    setRechecking(true);
    try {
      await checkMaintenance();
    } finally {
      setRechecking(false);
    }
  }, [checkMaintenance]);

  if (!visible || !config) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        // Non-dismissible while maintenance mode is on
      }}
    >
      <MaintenanceModeScreen
        message={config.message}
        onRecheck={handleRecheck}
        rechecking={rechecking}
      />
    </Modal>
  );
}
