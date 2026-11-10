// Reward balance held by an appointment's last payment sheet that was closed
// or failed without paying (POST /api/payment-sheet with appointment_id).
// User details leave a held balance out, but the next sheet for the same
// appointment gives it back first, so a retry should offer it again. Module
// level so it outlives the screen and is shared by View & Pay and booking
// details. The server frees a hold after 24h, so older entries read as 0.
const HELD_REWARD_TTL_MS = 24 * 60 * 60 * 1000;

type Hold = { userId: unknown; cents: number; at: number };

const holds = new Map<string, Hold>();

const keyOf = (appointmentId: string | number) => String(appointmentId);

// Screens open now re-read when a hold changes, e.g. the screen just left
// saves its hold only after its balance refresh ends.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** Called after every save / clear. Returns the unsubscribe. */
export const subscribeRewardHold = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Held cents for this appointment (0 if none, another user, or > 24h old). */
export const getRewardHold = (
  appointmentId: string | number | null | undefined,
  userId: unknown,
): number => {
  if (appointmentId == null || appointmentId === "") return 0;
  const hold = holds.get(keyOf(appointmentId));
  if (!hold) return 0;
  if (hold.userId !== userId || Date.now() - hold.at >= HELD_REWARD_TTL_MS) {
    return 0;
  }
  return hold.cents;
};

/**
 * Save the held cents (<= 0 deletes). newHold: a new sheet took it now, so its
 * 24h starts again; otherwise an adjusted hold keeps its first time.
 */
export const setRewardHold = (
  appointmentId: string | number | null | undefined,
  userId: unknown,
  cents: number,
  newHold = true,
): void => {
  if (appointmentId == null || appointmentId === "") return;
  const key = keyOf(appointmentId);
  if (!(cents > 0)) {
    if (holds.delete(key)) notify();
    return;
  }
  const prev = holds.get(key);
  const at =
    newHold || !prev || prev.userId !== userId ? Date.now() : prev.at;
  holds.set(key, { userId, cents, at });
  notify();
};

export const clearRewardHold = (
  appointmentId: string | number | null | undefined,
): void => {
  if (appointmentId == null || appointmentId === "") return;
  if (holds.delete(keyOf(appointmentId))) notify();
};
