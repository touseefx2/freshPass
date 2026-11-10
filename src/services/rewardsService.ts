import { ApiService } from "./api";
import { rewardEndpoints, userEndpoints } from "./endpoints";
import Logger from "./logger";
import { store } from "@/src/state/store";
import { setUserDetails } from "@/src/state/slices/userSlice";
import type {
  RewardEntry,
  RewardsMeta,
  RewardsPage,
} from "@/src/types/rewards";

const REQUEST_TIMEOUT = 15_000;

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStringOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;

const centsFrom = (cents: unknown, dollars: unknown): number => {
  const c = toNumber(cents);
  if (c !== null) return Math.round(c);
  const d = toNumber(dollars);
  return d !== null ? Math.round(d * 100) : 0;
};

const dollarsFrom = (dollars: unknown, cents: number): number => {
  const d = toNumber(dollars);
  return d !== null ? d : cents / 100;
};

function normaliseEntry(raw: any, index: number): RewardEntry {
  const amountCents = centsFrom(raw?.amount_cents, raw?.amount);
  return {
    id: toNumber(raw?.id) ?? -(index + 1),
    type: typeof raw?.type === "string" ? raw.type : "",
    amount: dollarsFrom(raw?.amount, amountCents),
    amountCents,
    status: toStringOrNull(raw?.status),
    purpose: toStringOrNull(raw?.purpose),
    description: toStringOrNull(raw?.description),
    expiresAt: toStringOrNull(raw?.expires_at),
    remaining: toNumber(raw?.remaining),
    createdAt: toStringOrNull(raw?.created_at),
  };
}

/**
 * GET /api/rewards — balance + every change, newest first.
 * Accepts the body wrapped (`{ success, data: { balance, ... } }`) or flat as in
 * the guide. Rejects on network/HTTP errors so screens can show a retry.
 */
export async function fetchRewards(params?: {
  page?: number;
  per_page?: number;
}): Promise<RewardsPage> {
  const res: any = await ApiService.get(rewardEndpoints.list(params), {
    timeout: REQUEST_TIMEOUT,
  });

  const wrapped =
    res?.data &&
    typeof res.data === "object" &&
    !Array.isArray(res.data) &&
    ("balance" in res.data ||
      "balance_cents" in res.data ||
      "entries" in res.data);
  const body: any = wrapped ? res.data : (res ?? {});

  const rawEntries: any[] = Array.isArray(body?.entries)
    ? body.entries
    : Array.isArray(body?.data)
      ? body.data
      : [];
  const entries = rawEntries.map(normaliseEntry);

  const rawMeta = body?.meta ?? res?.meta ?? {};
  const perPage = toNumber(rawMeta?.per_page) ?? params?.per_page ?? 20;
  const currentPage = toNumber(rawMeta?.current_page) ?? params?.page ?? 1;
  const meta: RewardsMeta = {
    currentPage,
    perPage,
    total: toNumber(rawMeta?.total) ?? entries.length,
    lastPage: toNumber(rawMeta?.last_page) ?? currentPage,
  };

  const balanceCents = centsFrom(body?.balance_cents, body?.balance);
  return {
    balance: dollarsFrom(body?.balance, balanceCents),
    balanceCents,
    entries,
    meta,
  };
}

export interface InviteRewardDetailsFields {
  invite_code?: string | null;
  invite_link?: string | null;
  reward_balance?: number | null;
  reward_balance_cents?: number | null;
}

/**
 * Invite + reward fields to spread into setUserDetails from an own
 * /api/user/details response. Only keys present in the response are returned,
 * so other details calls (without these fields) never wipe them.
 */
export const pickInviteRewardDetails = (
  data: any,
): InviteRewardDetailsFields => {
  const out: InviteRewardDetailsFields = {};
  if (!data || typeof data !== "object") return out;
  if ("invite_code" in data) out.invite_code = toStringOrNull(data.invite_code);
  if ("invite_link" in data) out.invite_link = toStringOrNull(data.invite_link);
  if ("reward_balance" in data) {
    out.reward_balance = toNumber(data.reward_balance);
  }
  if ("reward_balance_cents" in data) {
    const c = toNumber(data.reward_balance_cents);
    out.reward_balance_cents = c === null ? null : Math.round(c);
  }
  return out;
};

/**
 * Re-reads own /api/user/details and stores the invite code/link and reward
 * balance. Never throws: logs and returns null on failure.
 */
export async function refreshOwnInviteRewardDetails(): Promise<{
  inviteCode: string | null;
  inviteLink: string | null;
  rewardBalance: number | null;
  rewardBalanceCents: number | null;
} | null> {
  try {
    const response = await ApiService.get<{
      success?: boolean;
      message?: string;
      data?: any;
    }>(userEndpoints.details, { timeout: REQUEST_TIMEOUT });
    const data = response?.data;
    if (!data || typeof data !== "object") return null;
    const picked = pickInviteRewardDetails(data);
    store.dispatch(setUserDetails(picked));
    const user = store.getState().user;
    return {
      inviteCode: user.invite_code,
      inviteLink: user.invite_link,
      rewardBalance: user.reward_balance,
      rewardBalanceCents: user.reward_balance_cents,
    };
  } catch (error) {
    Logger.warn("refreshOwnInviteRewardDetails failed", error);
    return null;
  }
}
