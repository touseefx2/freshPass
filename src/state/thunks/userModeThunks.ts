import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";
import {
  normalizeUserMode,
  setActiveMode,
  setCanSwitchMode,
  setUnreadCount,
  setUserDetails,
  type UserMode,
} from "../slices/userSlice";
import { resetChatContacts } from "../slices/generalSlice";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import {
  beginModeSwitch,
  canApplyServerMode,
  endModeSwitch,
  getApiErrorCode,
  switchUserMode,
  type SwitchModeResponse,
  type UserModeDetailsFields,
} from "@/src/services/userModeService";
import { fetchNotificationUnreadCount } from "./notificationThunks";
import { refreshChatInbox } from "./chatThunks";

export interface SwitchActiveModeResult extends SwitchModeResponse {
  message?: string;
}

export interface SwitchActiveModeError {
  message: string;
  /** "No internet" toast was already shown by ApiService */
  isNoInternet?: boolean;
  /** e.g. `onboarding_incomplete` — owner must finish setup first */
  errorCode?: string;
}

/**
 * Business/Staff ↔ customer mode.
 * POST /api/user/mode → flip Redux (tabs, home, explore follow `userRole`) →
 * re-read details for the new mode → refresh notification badge + chat inbox,
 * which the server now scopes to the new mode. Home screens refetch their own
 * data (business status, stats) when they mount for the new mode.
 */
export const switchActiveMode = createAsyncThunk<
  SwitchActiveModeResult,
  UserMode,
  {
    dispatch: AppDispatch;
    state: RootState;
    rejectValue: SwitchActiveModeError;
  }
>("user/switchActiveMode", async (mode, { dispatch, rejectWithValue }) => {
  beginModeSwitch();
  try {
    const response = await switchUserMode(mode);
    if (!response?.success || !response.data) {
      return rejectWithValue({ message: response?.message ?? "" });
    }

    const data = response.data;
    const nextMode = normalizeUserMode(data.active_mode) ?? mode;

    dispatch(setActiveMode(nextMode));
    dispatch(setCanSwitchMode(data.can_switch !== false));
    if (typeof data.ai_quota === "number") {
      dispatch(setUserDetails({ ai_quota: data.ai_quota }));
    }
    // Badge + inbox belong to the old mode until the refresh below lands
    dispatch(setUnreadCount(0));
    dispatch(resetChatContacts());

    await Promise.allSettled([
      refreshModeDetails(dispatch),
      dispatch(fetchNotificationUnreadCount()),
      dispatch(refreshChatInbox()),
    ]);

    return { ...data, active_mode: nextMode, message: response.message };
  } catch (error: any) {
    return rejectWithValue({
      message: error?.message ?? "",
      isNoInternet: error?.isNoInternet === true,
      errorCode: getApiErrorCode(error),
    });
  } finally {
    endModeSwitch();
  }
});

/** Mode as reported by the server: `.mode.changed` socket event or GET /api/user/mode */
export interface ServerModeState {
  active_mode?: string | null;
  ai_quota?: number | null;
  can_switch?: boolean | null;
}

/**
 * The mode changed somewhere else (another device, or a socket event that
 * outran this one). Applies it like a local switch; resolves to the new mode,
 * or null when nothing changed. The caller resets navigation and tells the user.
 */
export const syncModeFromServer = createAsyncThunk<
  UserMode | null,
  ServerModeState,
  { dispatch: AppDispatch; state: RootState }
>("user/syncModeFromServer", async (server, { dispatch, getState }) => {
  const user = getState().user;
  const serverMode = normalizeUserMode(server.active_mode);
  const currentMode: UserMode = user.active_mode ?? "business";

  // Our own switch (and its echo) is still settling, or nothing changed
  if (!serverMode || serverMode === currentMode || !canApplyServerMode()) {
    return null;
  }

  // Same stale-response guard as a local switch
  beginModeSwitch();
  try {
    dispatch(setActiveMode(serverMode));
    if (typeof server.can_switch === "boolean") {
      dispatch(setCanSwitchMode(server.can_switch));
    }
    if (typeof server.ai_quota === "number") {
      dispatch(setUserDetails({ ai_quota: server.ai_quota }));
    }
    dispatch(setUnreadCount(0));
    dispatch(resetChatContacts());

    await Promise.allSettled([
      refreshModeDetails(dispatch),
      dispatch(fetchNotificationUnreadCount()),
      dispatch(refreshChatInbox()),
    ]);
  } finally {
    endModeSwitch();
  }

  return serverMode;
});

/** Fresh after the switch, so applied directly (not through the stale-response guard). */
async function refreshModeDetails(dispatch: AppDispatch) {
  try {
    const response = await ApiService.get<{
      success: boolean;
      data: UserModeDetailsFields;
    }>(userEndpoints.details);
    if (!response?.success || !response.data) return;

    const data = response.data;
    dispatch(
      setUserDetails({
        ...("active_mode" in data && {
          active_mode: normalizeUserMode(data.active_mode),
        }),
        ...(typeof data.can_switch_mode === "boolean" && {
          can_switch_mode: data.can_switch_mode,
        }),
        ...(data.customer_ai_quota !== undefined && {
          customer_ai_quota: data.customer_ai_quota,
        }),
        ...(typeof data.ai_quota === "number" && { ai_quota: data.ai_quota }),
      }),
    );
  } catch (error) {
    Logger.warn("Mode switch: details refresh failed", error);
  }
}
