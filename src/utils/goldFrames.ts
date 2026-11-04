import { store } from "@/src/state/store";
import {
  markSetupProgressDone,
  type SetupProgress,
} from "@/src/state/slices/userSlice";

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
