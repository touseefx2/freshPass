/** Reward balance (Invite a Pro) — GET /api/rewards, normalised to camelCase. */

export type RewardEntryType = "reward" | "spend" | "release" | "refund" | "expiry";

export interface RewardEntry {
  id: number;
  /** reward (+) · spend (−) · release (+) · refund (+) · expiry (−) */
  type: RewardEntryType | string;
  /** Dollars */
  amount: number;
  amountCents: number;
  /** spend only: "held" while its card payment is open, then "spent" */
  status: "held" | "spent" | null | string;
  purpose: string | null;
  description: string | null;
  expiresAt: string | null;
  /** Dollars still left on this reward */
  remaining: number | null;
  createdAt: string | null;
}

export interface RewardsMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface RewardsPage {
  /** Dollars */
  balance: number;
  balanceCents: number;
  /** Newest first */
  entries: RewardEntry[];
  meta: RewardsMeta;
}
