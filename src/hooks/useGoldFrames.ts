import { createContext, useContext, useMemo } from "react";
import { store } from "@/src/state/store";
import { useAppSelector } from "@/src/hooks/hooks";
import {
  setGoldFrames,
  type GoldTask,
} from "@/src/state/slices/generalSlice";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { listMyReels } from "@/src/services/reelsService";
import { fetchMyProducts } from "@/src/services/productService";
import { fetchMyJobPosts } from "@/src/services/jobService";
import Logger from "@/src/services/logger";
import {
  buildGoldAccountKey,
  goldAccountKey,
  goldDoneMarkedAt,
  wasPolicySavedHere,
} from "@/src/utils/goldFrames";

// Gold frame reminders (client 11-03): existing buttons keep a gold frame
// until the feature is actually completed. Done-ness comes from the server, so
// it survives logout / reinstall / a new phone and counts what old accounts did.

/** Client's order: only the first unfinished one pulses */
const OWNER_TASKS: GoldTask[] = [
  "stripe",
  "createReel",
  "addProduct",
  "membership",
  "cancellationPolicy",
  "hiring",
];
const STAFF_TASKS: GoldTask[] = ["createReel"];

/** + menu item id → the feature it completes */
const MENU_ITEM_TASK: Record<string, GoldTask> = {
  createReel: "createReel",
  addProduct: "addProduct",
  servicesAndMemberships: "membership",
  hiring: "hiring",
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
  // Reel / product / hiring live inside the + menu
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
  const businessId = useAppSelector((s) => s.user.business_id);
  const userId = useAppSelector((s) => s.user.id);
  const goldFrames = useAppSelector((s) => s.general.goldFrames);

  return useMemo(() => {
    const isOwner =
      userRole === "business" && businessStatus?.onboarding_completed === true;
    const isStaff = userRole === "staff";
    const accountKey = buildGoldAccountKey(userRole, businessId, userId);
    const done =
      accountKey != null && goldFrames?.accountKey === accountKey
        ? goldFrames.done
        : {};
    const tasks = isOwner ? OWNER_TASKS : isStaff ? STAFF_TASKS : [];
    // Unknown (not loaded / request failed) shows no frame
    const pending = tasks.filter((task) =>
      task === "stripe"
        ? !isStripeOnboardingCompleted(businessStatus)
        : done[task] === false,
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
  }, [menuOpen, userRole, businessStatus, businessId, userId, goldFrames]);
}

// ── Server check ────────────────────────────────────────────────────

type DoneMap = Partial<Record<GoldTask, boolean>>;

/** Home focus fires on every tab switch; skip repeats within this window */
const REFRESH_TTL_MS = 15_000;
let lastRefresh: { key: string; at: number } | null = null;
let inFlight: { key: string; promise: Promise<void> } | null = null;

export function clearGoldFramesCache(): void {
  lastRefresh = null;
  inFlight = null;
}

/** Owner: the policy GET returns defaults even when nothing was saved */
async function fetchPolicySaved(
  businessId: number | null | undefined,
): Promise<boolean> {
  const response = await ApiService.get<{
    success: boolean;
    data?: { is_saved?: boolean } | null;
  }>(businessEndpoints.cancellationPolicy);
  if (typeof response?.data?.is_saved === "boolean") {
    return response.data.is_saved;
  }
  return wasPolicySavedHere(businessId);
}

/** "Listed" = published; drafts aren't in the shop. Drafts can fill a page. */
async function hasListedProduct(): Promise<boolean> {
  for (let page = 1; page <= 5; page++) {
    const { products, meta } = await fetchMyProducts({ page, per_page: 100 });
    if (products.some((p) => p.published)) return true;
    if (!meta?.has_more) return false;
  }
  return false;
}

async function fetchOwnerDone(
  businessId: number | null | undefined,
): Promise<DoneMap> {
  const [reel, product, membership, policy, hiring] = await Promise.allSettled([
    // Whole business: a staff member's reel counts too
    listMyReels(1, "published", 1, false).then(({ reels }) => reels.length > 0),
    hasListedProduct(),
    ApiService.get<{
      success: boolean;
      data?: { subscription_plans?: unknown[] };
    }>(businessEndpoints.moduleData("subscription-plans")).then((response) => {
      if (!response?.success) throw new Error("Memberships not loaded");
      const plans = response.data?.subscription_plans;
      return Array.isArray(plans) && plans.length > 0;
    }),
    fetchPolicySaved(businessId),
    // Any status: closed / expired posts were published once
    fetchMyJobPosts({ per_page: 1 }).then(
      ({ posts, meta }) => posts.length > 0 || (meta?.total ?? 0) > 0,
    ),
  ]);

  const done: DoneMap = {};
  const results: [GoldTask, PromiseSettledResult<boolean>][] = [
    ["createReel", reel],
    ["addProduct", product],
    ["membership", membership],
    ["cancellationPolicy", policy],
    ["hiring", hiring],
  ];
  results.forEach(([task, result]) => {
    if (result.status === "fulfilled") done[task] = result.value;
  });
  return done;
}

async function fetchStaffDone(): Promise<DoneMap> {
  // Staff: only the reels they made themselves
  const { reels } = await listMyReels(1, "published", 1, true);
  return { createReel: reels.length > 0 };
}

/** Ask the server which features are done (Home focus, app foreground). */
export function refreshGoldFrames(force = false): Promise<void> {
  const accountKey = goldAccountKey();
  if (!accountKey) return Promise.resolve();
  const { user } = store.getState();
  const isOwner =
    user.userRole === "business" &&
    user.businessStatus?.onboarding_completed === true;
  const isStaff = user.userRole === "staff";
  if (!isOwner && !isStaff) return Promise.resolve();

  if (inFlight?.key === accountKey) return inFlight.promise;
  if (
    !force &&
    lastRefresh?.key === accountKey &&
    Date.now() - lastRefresh.at < REFRESH_TTL_MS
  ) {
    return Promise.resolve();
  }

  const startedAt = Date.now();
  const promise = (isOwner ? fetchOwnerDone(user.business_id) : fetchStaffDone())
    .then((done) => {
      // Switched account or mode meanwhile
      if (goldAccountKey() !== accountKey) return;
      // Completed while this was loading: the answer is already stale
      (Object.keys(done) as GoldTask[]).forEach((task) => {
        if (done[task] === false && (goldDoneMarkedAt[task] ?? 0) >= startedAt) {
          delete done[task];
        }
      });
      store.dispatch(setGoldFrames({ accountKey, done }));
      lastRefresh = { key: accountKey, at: Date.now() };
    })
    .catch((error) => {
      Logger.warn("Gold frames: refresh failed", error);
    })
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
  inFlight = { key: accountKey, promise };
  return promise;
}
