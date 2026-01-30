import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";
import {
  setBusinessStatus,
  setBusinessStatusLoading,
  setBusinessStatusError,
  setUserDetails,
} from "../slices/userSlice";
import { ApiService } from "@/src/services/api";
import {
  businessEndpoints,
  staffEndpoints,
  userEndpoints,
} from "@/src/services/endpoints";
import { BusinessStatus } from "../slices/userSlice";

interface fetchUserStatusOptions {
  showError?: boolean;
}

export const fetchUserStatus = createAsyncThunk<
  BusinessStatus | null,
  fetchUserStatusOptions | undefined,
  { dispatch: AppDispatch; state: RootState }
>("user/status", async (options, { dispatch, rejectWithValue, getState }) => {
  const { showError = true } = options || {};

  dispatch(setBusinessStatusLoading(true));
  dispatch(setBusinessStatusError(false));

  try {
    const state = getState();
    const userRole = state.user.userRole;

    // For staff users, response structure is different
    if (userRole === "staff") {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: {
            id: number;
            title: string;
          };
          active: boolean;
        };
        active: boolean;
      }>(userEndpoints.status);

      if (response.success && response.data) {
        const businessStatusData: BusinessStatus = {
          onboarding_completed: false,
          current_step: null,
          next_step: null,
          business_category: null,
          stripe_onboarding_status: "",
          stripe_onboarding_link: null,
          has_subscription: false,
          subscription_status: "",
          active: response.data.active ?? response?.active ?? false,
          business_id: response.data.business?.id,
          business_name: response.data.business?.title,
        };
        dispatch(setBusinessStatus(businessStatusData));
        dispatch(setBusinessStatusError(false));

        // Set business_id and business_name in user state
        if (response.data.business?.id && response.data.business?.title) {
          dispatch(
            setUserDetails({
              business_id: response.data.business.id,
              business_name: response.data.business.title,
            }),
          );
        }

        return businessStatusData;
      }
      return null;
    } else if (userRole === "business") {
      // For business users, use existing structure
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: BusinessStatus;
      }>(userEndpoints.status);

      if (response.success && response.data) {
        // Ensure active field exists, default to false if not provided
        const businessStatusData = {
          ...response.data,
          active: response.data.active ?? false,
        };

        dispatch(setBusinessStatus(businessStatusData));
        dispatch(setBusinessStatusError(false));

        // Set business_id and business_name in user state
        if (response.data.business_id && response.data.business_name) {
          dispatch(
            setUserDetails({
              business_id: response.data.business_id,
              business_name: response.data.business_name,
            }),
          );
        }

        return businessStatusData;
      }
      return null;
    }

    // Return null for other user roles (customer, etc.)
    return null;
  } catch (error: any) {
    dispatch(setBusinessStatusError(true));
    dispatch(setBusinessStatusLoading(false));

    if (showError) {
      // Error will be handled by the component using the thunk
      return rejectWithValue(
        error.message || "Failed to fetch business status",
      );
    }
    throw error;
  } finally {
    dispatch(setBusinessStatusLoading(false));
  }
});

export const updateBusinessActiveStatus = createAsyncThunk<
  boolean,
  { active: boolean },
  { dispatch: AppDispatch; state: RootState }
>(
  "user/ActiveStatus",
  async ({ active }, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userRole = state.user.userRole;

      // Use different endpoint based on user role
      const endpoint =
        userRole === "staff"
          ? staffEndpoints.profile
          : businessEndpoints.profile;

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data: {
          active: boolean;
        };
      }>(endpoint, {
        active,
      });

      if (response.success && response.data) {
        // Only update active field in existing businessStatus, keep rest same
        const currentBusinessStatus = getState().user.businessStatus;
        if (currentBusinessStatus) {
          dispatch(
            setBusinessStatus({
              ...currentBusinessStatus,
              active: response.data.active ?? false,
            }),
          );
        }
        return response.data.active ?? false;
      }
      return rejectWithValue("Failed to update active status");
    } catch (error: any) {
      return rejectWithValue({
        message: error.message || "Failed to update active status",
        isNoInternet: error?.isNoInternet || false,
      });
    }
  },
);
