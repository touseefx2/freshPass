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
  endModeSwitch,
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
    });
  } finally {
    endModeSwitch();
  }
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
