import NetInfo from "@react-native-community/netinfo";
import { store } from "@/src/state/store";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import {
  markSetupProgressDone,
  type SetupProgress,
} from "@/src/state/slices/userSlice";
import { markGoldTapped as markGoldTappedAction } from "@/src/state/slices/generalSlice";

/** A feature with a gold-frame reminder until it's done */
export type GoldTask =
  | "stripe"
  | "createReel"
  | "addProduct"
  | "membership"
  | "cancellationPolicy"
  | "hiring"
  | "uploadWork";

/** setup_progress flag (GET /api/user/status) that says the task is done */
export const GOLD_TASK_FLAG: Record<
  Exclude<GoldTask, "stripe">,
  keyof SetupProgress
> = {
  createReel: "has_published_reel",
  addProduct: "has_listed_product",
  membership: "has_membership_plan",
  cancellationPolicy: "cancellation_policy_saved",
  hiring: "has_job_post",
  uploadWork: "has_work_photos",
};

/**
 * Client 11-06: every gold button stops glowing after its first tap, except
 * Stripe (glows until setup is done). The + button counts as its own button.
 */
export type GoldTapKey = Exclude<GoldTask, "stripe"> | "plus";

/** + menu item id → the feature it opens */
export const MENU_ITEM_TASK: Record<string, Exclude<GoldTask, "stripe">> = {
  createReel: "createReel",
  addProduct: "addProduct",
  servicesAndMemberships: "membership",
  hiring: "hiring",
  uploadWork: "uploadWork",
};

/**
 * Whose taps these are. The role is part of it: a removed staff member can
 * become an owner on the same user id and must start with every glow on.
 */
export function goldTapOwner(
  userRole: string | null | undefined,
  id: number | null | undefined,
): string | null {
  if ((userRole !== "business" && userRole !== "staff") || id == null) {
    return null;
  }
  return `${userRole}:${id}`;
}

/** App key → server key (POST /api/user { setup_tap }, setup_progress.tapped) */
const TAP_API_KEY: Record<GoldTapKey, string> = {
  plus: "plus",
  createReel: "create_reel",
  addProduct: "add_product",
  membership: "membership",
  cancellationPolicy: "cancellation_policy",
  hiring: "hiring",
  uploadWork: "upload_work",
};
const TAP_KEYS = Object.keys(TAP_API_KEY) as GoldTapKey[];

/** setup_progress.tapped from the server, as app keys */
export const tapKeysFromServer = (tapped?: string[] | null): GoldTapKey[] =>
  TAP_KEYS.filter((key) => tapped?.includes(TAP_API_KEY[key]));

/** Taps already sent this app session (one try per session; offline waits) */
const sentTaps = new Set<string>();

/** Save the tap for this login so a new phone / reinstall stays quiet too */
async function saveTapOnServer(owner: string, key: GoldTapKey): Promise<void> {
  const sentKey = `${owner}:${key}`;
  if (sentTaps.has(sentKey)) return;
  sentTaps.add(sentKey);
  try {
    // Offline: skip quietly (no toast); the next status call sends it
    if ((await NetInfo.fetch()).isConnected === false) {
      sentTaps.delete(sentKey);
      return;
    }
    await ApiService.post(userEndpoints.update, {
      setup_tap: TAP_API_KEY[key],
    });
  } catch {
    // The glow is already off on this phone; retried on the next app start
  }
}

/** A gold button was tapped: its glow goes away for this user for good. */
export function markGoldTapped(key: GoldTapKey | undefined): void {
  if (!key) return;
  const { user, general } = store.getState();
  const owner = goldTapOwner(user.userRole, user.id);
  if (!owner) return;
  const onServer = user.businessStatus?.setup_progress?.tapped ?? [];
  if (
    general.goldTapped?.[owner]?.includes(key) ||
    onServer.includes(TAP_API_KEY[key])
  ) {
    return;
  }
  store.dispatch(markGoldTappedAction({ owner, key }));
  void saveTapOnServer(owner, key);
}

/**
 * After GET /api/user/status: send taps this phone kept but the server
 * hasn't got yet (tapped offline, or before the server saved taps).
 */
export function syncGoldTaps(progress: SetupProgress | null | undefined): void {
  const onServer = progress?.tapped;
  if (!onServer) return;
  const { user, general } = store.getState();
  const owner = goldTapOwner(user.userRole, user.id);
  if (!owner) return;
  (general.goldTapped?.[owner] ?? []).forEach((key) => {
    const tapKey = key as GoldTapKey;
    if (TAP_API_KEY[tapKey] && !onServer.includes(TAP_API_KEY[tapKey])) {
      void saveTapOnServer(owner, tapKey);
    }
  });
}

/** When each flag was last set here (ms) */
const markedAt: Partial<Record<keyof SetupProgress, number>> = {};

/** A gold-frame feature was just completed: drop its frame right away. */
export function markGoldDone(task: Exclude<GoldTask, "stripe">): void {
  const { userRole } = store.getState().user;
  if (userRole !== "business" && userRole !== "staff") return;
  const flag = GOLD_TASK_FLAG[task];
  markedAt[flag] = Date.now();
  store.dispatch(markSetupProgressDone(flag));
}

/**
 * A status call that started before a step was completed answers false for
 * it; keep the step done (the server never turns a flag back to false).
 */
export function withRecentGoldMarks(
  progress: SetupProgress | null | undefined,
  requestStartedAt: number,
): SetupProgress | null | undefined {
  if (!progress) return progress;
  const result = { ...progress };
  (Object.keys(markedAt) as (keyof SetupProgress)[]).forEach((flag) => {
    if (result[flag] === false && (markedAt[flag] ?? 0) >= requestStartedAt) {
      result[flag] = true;
    }
  });
  return result;
}
