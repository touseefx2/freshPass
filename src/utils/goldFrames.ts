import { store } from "@/src/state/store";
import {
  markGoldTaskDone,
  type GoldTask,
} from "@/src/state/slices/generalSlice";
import { LocalStorageService } from "@/src/services/storage";

/**
 * Gold frame results belong to one account and side (owner / staff);
 * null in customer mode or logged out — no frames there.
 */
export function buildGoldAccountKey(
  userRole: string | null | undefined,
  businessId: string | number | null | undefined,
  userId: string | number | null | undefined,
): string | null {
  if (userRole !== "business" && userRole !== "staff") return null;
  return `${userRole}:${businessId ?? ""}:${userId ?? ""}`;
}

export function goldAccountKey(): string | null {
  const user = store.getState().user;
  return buildGoldAccountKey(user.userRole, user.business_id, user.id);
}

/** When each feature was last marked done here (ms) */
export const goldDoneMarkedAt: Partial<Record<GoldTask, number>> = {};

/** A gold-frame feature was just completed: drop its frame right away. */
export function markGoldDone(task: GoldTask): void {
  const accountKey = goldAccountKey();
  if (!accountKey) return;
  goldDoneMarkedAt[task] = Date.now();
  store.dispatch(markGoldTaskDone({ accountKey, task }));
  if (task === "cancellationPolicy") void rememberPolicySaved();
}

// The policy API can't tell "saved" from "defaults" yet, so a save is also
// remembered on this device (kept across logout) until the server says so.
const policySavedKey = (businessId: string) =>
  `@freshpass/goldFrame/policySaved/${businessId}`;

async function rememberPolicySaved(): Promise<void> {
  const businessId = store.getState().user.business_id;
  if (businessId == null) return;
  try {
    await LocalStorageService.setItem(policySavedKey(String(businessId)), "1");
  } catch {
    // The frame just comes back until the next save
  }
}

export async function wasPolicySavedHere(
  businessId: string | number | null | undefined,
): Promise<boolean> {
  if (businessId == null || businessId === "") return false;
  return (
    (await LocalStorageService.getItem(policySavedKey(String(businessId)))) ===
    "1"
  );
}
