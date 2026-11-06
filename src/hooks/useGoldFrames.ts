import { useMemo } from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import {
  GOLD_TASK_FLAG,
  MENU_ITEM_TASK,
  goldTapOwner,
  type GoldTask,
} from "@/src/utils/goldFrames";

// Gold frame reminders. Client 11-06: every untouched button glows at the
// same time and stops glowing after its first tap; Connect Stripe glows until
// its setup is done. A feature already done on the server never glows
// (GET /api/user/status → setup_progress, fetched by Home on focus and when
// the app comes back). Taps are kept per user on this device.

const OWNER_TASKS: GoldTask[] = [
  "stripe",
  "createReel",
  "addProduct",
  "membership",
  "cancellationPolicy",
  "hiring",
];
const STAFF_TASKS: GoldTask[] = ["createReel", "uploadWork"];

const MENU_TASKS = new Set<GoldTask>(Object.values(MENU_ITEM_TASK));
const NONE: string[] = [];

export interface GoldFrames {
  /** Glow on this feature's buttons */
  isFramed: (task: GoldTask) => boolean;
  /** Glow on a + menu item */
  isMenuItemFramed: (itemId: string) => boolean;
  /** Glow on the + button: not tapped yet and something inside still glows */
  plusFramed: boolean;
}

export function useGoldFrames(): GoldFrames {
  const userId = useAppSelector((s) => s.user.id);
  const userRole = useAppSelector((s) => s.user.userRole);
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const tapOwner = goldTapOwner(userRole, userId);
  const tapped = useAppSelector((s) =>
    tapOwner == null ? NONE : (s.general.goldTapped?.[tapOwner] ?? NONE),
  );

  return useMemo(() => {
    const isOwner =
      userRole === "business" && businessStatus?.onboarding_completed === true;
    const isStaff = userRole === "staff";
    const tasks = isOwner ? OWNER_TASKS : isStaff ? STAFF_TASKS : [];
    const progress = businessStatus?.setup_progress;
    // A missing flag (not loaded yet, older server) shows no glow
    const glowing = tasks.filter((task) =>
      task === "stripe"
        ? !isStripeOnboardingCompleted(businessStatus)
        : progress?.[GOLD_TASK_FLAG[task]] === false && !tapped.includes(task),
    );

    return {
      isFramed: (task: GoldTask) => glowing.includes(task),
      isMenuItemFramed: (itemId: string) => {
        const task = MENU_ITEM_TASK[itemId];
        return task != null && glowing.includes(task);
      },
      plusFramed:
        !tapped.includes("plus") &&
        glowing.some((task) => MENU_TASKS.has(task)),
    };
  }, [userRole, businessStatus, tapped]);
}
