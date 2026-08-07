import {
  fetchRemoteConfigEntries,
  readRemoteConfigEntry,
} from "@/src/services/remoteConfigService";
import Logger from "@/src/services/logger";

/** Firebase Remote Config parameter keys — set these in Firebase Console */
export const MAINTENANCE_RC_KEYS = {
  maintenanceMode: "maintenance_mode",
  message: "maintenance_message",
} as const;

export type MaintenanceConfig = {
  maintenanceMode: boolean;
  message: string;
};

const DEFAULTS = {
  maintenanceMode: false,
  message:
    "FreshPass is temporarily under maintenance. Please try again in a little while.",
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return fallback;
}

export async function fetchMaintenanceConfig(): Promise<MaintenanceConfig> {
  const entries = await fetchRemoteConfigEntries();

  const maintenanceMode = parseBoolean(
    readRemoteConfigEntry(entries, MAINTENANCE_RC_KEYS.maintenanceMode),
    DEFAULTS.maintenanceMode,
  );
  const message =
    readRemoteConfigEntry(entries, MAINTENANCE_RC_KEYS.message)?.trim() ||
    DEFAULTS.message;

  Logger.log("[Maintenance] Remote Config:", {
    maintenance_mode: maintenanceMode,
    maintenance_message: message,
    willShowMaintenanceScreen: maintenanceMode,
  });

  return {
    maintenanceMode,
    message,
  };
}

export function shouldShowMaintenance(config: MaintenanceConfig): boolean {
  return config.maintenanceMode;
}
