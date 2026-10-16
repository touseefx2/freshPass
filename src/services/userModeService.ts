import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import {
  normalizeUserMode,
  type UserMode,
  type UserState,
} from "@/src/state/slices/userSlice";

/** GET /api/user/mode */
export interface ModeState {
  active_mode: UserMode;
  can_switch: boolean;
  business_ai_quota: number;
  customer_ai_quota: number;
}

/** POST /api/user/mode */
export interface SwitchModeResponse {
  active_mode: UserMode;
  /** AI balance of the mode just switched to */
  ai_quota: number;
  can_switch: boolean;
}

/** Mode fields on GET /api/user/details */
export interface UserModeDetailsFields {
  active_mode?: string | null;
  can_switch_mode?: boolean | null;
  customer_ai_quota?: number | null;
  ai_quota?: number | null;
}

export const getUserMode = () =>
  ApiService.get<{ success: boolean; message?: string; data: ModeState }>(
    userEndpoints.mode,
  );

export const switchUserMode = (mode: UserMode) =>
  ApiService.post<{
    success: boolean;
    message?: string;
    data: SwitchModeResponse;
  }>(userEndpoints.mode, { mode });

/**
 * A details/status request that started before a switch can land after it and
 * carry the old mode (and the old mode's AI balance). While a switch is running
 * and briefly after, ignore mode data from those background fetches — the switch
 * flow writes the fresh values itself.
 */
const STALE_MODE_WINDOW_MS = 5000;
let modeSwitchInFlight = false;
let lastModeSwitchAt = 0;

export const beginModeSwitch = () => {
  modeSwitchInFlight = true;
};

export const endModeSwitch = () => {
  modeSwitchInFlight = false;
  lastModeSwitchAt = Date.now();
};

export const canApplyServerMode = () =>
  !modeSwitchInFlight && Date.now() - lastModeSwitchAt > STALE_MODE_WINDOW_MS;

/**
 * Mode fields (+ the mode-aware `ai_quota`) to spread into setUserDetails from
 * a /api/user/details response. `active_mode: null` from the server means business.
 */
export const pickUserModeDetails = (data: UserModeDetailsFields) => {
  const canApply = canApplyServerMode();
  return {
    ...(typeof data.can_switch_mode === "boolean" && {
      can_switch_mode: data.can_switch_mode,
    }),
    ...(canApply &&
      data.customer_ai_quota !== undefined && {
        customer_ai_quota: data.customer_ai_quota,
      }),
    ...(canApply &&
      typeof data.ai_quota === "number" && { ai_quota: data.ai_quota }),
    ...(canApply &&
      "active_mode" in data && {
        active_mode: normalizeUserMode(data.active_mode),
      }),
  };
};

/**
 * `mode` sent on notification list / unread count / mark-all-read and on AI
 * credit purchases. Only switchable accounts send it — without it the server
 * uses everything / the current mode, which is right for plain customers.
 */
export const getModeParam = (user: UserState): UserMode | undefined =>
  user.can_switch_mode ? (user.active_mode ?? "business") : undefined;

export const getNotificationMode = getModeParam;

/** Server `error_code` from an ApiService error (`data.error_code` in the body) */
export const getApiErrorCode = (error: any): string | undefined => {
  const code = error?.data?.data?.error_code;
  return typeof code === "string" ? code : undefined;
};
