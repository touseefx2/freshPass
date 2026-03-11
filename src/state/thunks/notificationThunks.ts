import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";
import { setUnreadCount } from "../slices/userSlice";
import { ApiService } from "@/src/services/api";
import { notificationsEndpoints } from "@/src/services/endpoints";

export const fetchNotificationUnreadCount = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>(
  "notifications/fetchUnreadCount",
  async (_, { dispatch }) => {
    const response = await ApiService.get<{
      success: boolean;
      message: string;
      data: {
        unread_count: number;
      };
    }>(notificationsEndpoints.unreadCount);

    if (response.success && response.data) {
      dispatch(setUnreadCount(response.data.unread_count));
    }
  },
);
