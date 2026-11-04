import { createContext, useContext, useMemo } from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import { GOLD_TASK_FLAG, type GoldTask } from "@/src/utils/goldFrames";

// Gold frame reminders (client 11-03): existing buttons keep a gold frame
// until the feature is actually completed. Done-ness comes from
// GET /api/user/status → setup_progress (Home fetches it on focus and when the
// app comes back), so it survives logout / reinstall / a new phone.

/** Client's order: only the first unfinished one pulses */
const OWNER_TASKS: GoldTask[] = [
  "stripe",
  "createReel",
  "addProduct",
  "membership",
  "cancellationPolicy",
  "hiring",
];
const STAFF_TASKS: GoldTask[] = ["createReel", "uploadWork"];

/** + menu item id → the feature it completes */
const MENU_ITEM_TASK: Record<string, GoldTask> = {
  createReel: "createReel",
  addProduct: "addProduct",
  servicesAndMemberships: "membership",
  hiring: "hiring",
  uploadWork: "uploadWork",
};
const MENU_TASKS = new Set<GoldTask>(Object.values(MENU_ITEM_TASK));

/** Where the one pulse is drawn: a Home button, the + button or a menu pill */
export type GoldTarget =
  | "stripe"
  | "membershipBar"
  | "policyBar"
  | "plus"
  | `menu:${string}`;

const homeTarget = (task: GoldTask): GoldTarget => {
  if (task === "stripe") return "stripe";
  if (task === "membership") return "membershipBar";
  if (task === "cancellationPolicy") return "policyBar";
  // Reel / product / hiring / work photos live inside the + menu
  return "plus";
};

const menuItemFor = (task: GoldTask): string | undefined =>
  Object.keys(MENU_ITEM_TASK).find((id) => MENU_ITEM_TASK[id] === task);

/** Whether the + menu is open: the one pulse then moves into it */
export const GoldMenuOpenContext = createContext(false);

export interface GoldFrames {
  /** Gold border on this feature's buttons */
  isFramed: (task: GoldTask) => boolean;
  /** Gold border on a + menu item */
  isMenuItemFramed: (itemId: string) => boolean;
  /** Gold border on the + button: something inside the menu isn't done */
  plusFramed: boolean;
  /** The one visible button that pulses right now */
  pulseTarget: GoldTarget | null;
}

export function useGoldFrames(): GoldFrames {
  const menuOpen = useContext(GoldMenuOpenContext);
  const userRole = useAppSelector((s) => s.user.userRole);
  const businessStatus = useAppSelector((s) => s.user.businessStatus);

  return useMemo(() => {
    const isOwner =
      userRole === "business" && businessStatus?.onboarding_completed === true;
    const isStaff = userRole === "staff";
    const tasks = isOwner ? OWNER_TASKS : isStaff ? STAFF_TASKS : [];
    const progress = businessStatus?.setup_progress;
    // A missing flag (not loaded yet, older server) shows no frame
    const pending = tasks.filter((task) =>
      task === "stripe"
        ? !isStripeOnboardingCompleted(businessStatus)
        : progress?.[GOLD_TASK_FLAG[task]] === false,
    );

    let pulseTarget: GoldTarget | null = null;
    if (menuOpen) {
      const first = pending.find((task) => MENU_TASKS.has(task));
      const itemId = first ? menuItemFor(first) : undefined;
      if (itemId) pulseTarget = `menu:${itemId}`;
    } else if (pending.length > 0) {
      pulseTarget = homeTarget(pending[0]);
    }

    return {
      isFramed: (task: GoldTask) => pending.includes(task),
      isMenuItemFramed: (itemId: string) => {
        const task = MENU_ITEM_TASK[itemId];
        return task != null && pending.includes(task);
      },
      plusFramed: pending.some((task) => MENU_TASKS.has(task)),
      pulseTarget,
    };
  }, [menuOpen, userRole, businessStatus]);
}
