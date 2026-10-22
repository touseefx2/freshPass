import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  canUseModeSwitch,
  getOwnBusinessIds,
} from "@/src/state/slices/userSlice";
import { switchActiveMode } from "@/src/state/thunks/userModeThunks";
import type { JobPost } from "@/src/types/jobs";

/**
 * Who may apply for a post:
 * - guest → sign in first
 * - own business (owner or its staff, any mode) → never
 * - Business/Staff in business mode → switch to customer mode first
 * - already applied (`has_applied`) → message the owner instead
 */
export type JobApplyAccess =
  "guest" | "own_business" | "business_mode" | "applied" | "can_apply";

export function useJobApplyAccess(post: JobPost | null) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const [switching, setSwitching] = useState(false);

  let access: JobApplyAccess = "can_apply";
  if (user.isGuest || !user.accessToken) {
    access = "guest";
  } else if (
    post &&
    (getOwnBusinessIds(user).includes(post.businessId) ||
      (user.id != null && post.business?.ownerId === user.id))
  ) {
    access = "own_business";
  } else if (user.userRole !== "customer") {
    access = "business_mode";
  } else if (post?.hasApplied) {
    access = "applied";
  }

  const canSwitch = canUseModeSwitch(user);

  /** Stays on the current screen; the dashboard below remounts for customer mode. */
  const switchToCustomerMode = useCallback(async (): Promise<boolean> => {
    if (switching) return false;
    setSwitching(true);
    try {
      await dispatch(switchActiveMode("customer")).unwrap();
      showBanner(
        t("jobSwitchedTitle"),
        t("jobSwitchedMessage"),
        "success",
        2500,
      );
      return true;
    } catch (error: any) {
      if (!error?.isNoInternet) {
        showBanner(
          t("error"),
          error?.message || t("modeSwitchFailed"),
          "error",
        );
      }
      return false;
    } finally {
      setSwitching(false);
    }
  }, [dispatch, showBanner, switching, t]);

  return { access, canSwitch, switching, switchToCustomerMode };
}
