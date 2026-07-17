import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Modal, Platform } from "react-native";
import ForceUpdateScreen from "@/src/components/forceUpdateScreen";
import {
  fetchForceUpdateConfig,
  ForceUpdateConfig,
  shouldForceUpdate,
} from "@/src/services/forceUpdateService";
import Logger from "@/src/services/logger";

export default function ForceUpdateHandler() {
  const [config, setConfig] = useState<ForceUpdateConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const checkForceUpdate = useCallback(async () => {
    try {
      const nextConfig = await fetchForceUpdateConfig();
      setConfig(nextConfig);
      setVisible(shouldForceUpdate(nextConfig));
    } catch (error) {
      // Fail open — never block the app if Remote Config is unreachable
      Logger.warn("[ForceUpdateHandler] Check failed:", error);
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    checkForceUpdate();
  }, [checkForceUpdate]);

  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );

    return () => subscription.remove();
  }, [visible]);

  const handleRecheck = useCallback(async () => {
    setRechecking(true);
    try {
      await checkForceUpdate();
    } finally {
      setRechecking(false);
    }
  }, [checkForceUpdate]);

  if (!visible || !config) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        // Non-dismissible while force update is required
      }}
    >
      <ForceUpdateScreen
        message={config.message}
        currentVersion={config.currentVersion}
        minVersion={config.minVersion}
        storeUrl={config.storeUrl}
        onRecheck={handleRecheck}
        rechecking={rechecking}
      />
    </Modal>
  );
}
