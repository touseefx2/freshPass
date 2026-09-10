import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";
import { setTotalUnreadChat } from "../slices/userSlice";
import {
  setChatContacts,
  setChatContactsMeta,
} from "../slices/generalSlice";
import { ApiService } from "@/src/services/api";
import { chatEndpoints } from "@/src/services/endpoints";
import { fetchChatContactsApi } from "@/src/services/chatContacts";

/**
 * Refresh chat tab badge + Recent contacts list from API.
 * Used when the users.{id} socket fires (.message.sent).
 * Guest / missing token: no-op (avoids 401 / session-expired).
 */
export const refreshChatInbox = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>("chat/refreshInbox", async (_, { dispatch, getState }) => {
  const { isGuest, accessToken } = getState().user;
  if (isGuest || !accessToken) {
    return;
  }

  try {
    const unreadRes = await ApiService.get<{
      success: boolean;
      data?: { unread_count: number };
    }>(chatEndpoints.unreadCount);
    if (unreadRes?.success && unreadRes?.data != null) {
      dispatch(setTotalUnreadChat(unreadRes.data.unread_count));
    }
  } catch {
    // Silent — inbox refresh is best-effort
  }

  try {
    const { list, current_page, last_page } = await fetchChatContactsApi(1);
    dispatch(setChatContacts(list));
    dispatch(
      setChatContactsMeta({ page: current_page, lastPage: last_page }),
    );
  } catch {
    // Silent — inbox refresh is best-effort
  }
});
