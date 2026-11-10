/**
 * Reward balance estimates shown BEFORE paying. The real numbers always come
 * from the response (rewardAmount, totalAmount, cardAmount).
 * The card always pays at least $0.50 (Stripe minimum) when it pays anything.
 */

const CARD_MINIMUM = 0.5;

const round2 = (n: number) => Math.round(n * 100) / 100;

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

const finite = (n: number) => (Number.isFinite(n) ? n : 0);

export const centsToDollars = (cents: number): number =>
  round2(finite(Number(cents)) / 100);

export const dollarsToCents = (dollars: number): number =>
  Math.round(finite(Number(dollars)) * 100);

/**
 * Appointments: reward = min(balance, max(0, service − 0.50)), dollars.
 * The card pays service − reward + tip.
 */
export function estimateAppointmentReward(
  balanceCents: number,
  serviceAmount: number,
): number {
  const balance = safe(centsToDollars(balanceCents));
  const service = safe(Number(serviceAmount));
  return round2(Math.min(balance, Math.max(0, service - CARD_MINIMUM)));
}

/**
 * Hair Try-on (Android): balance ≥ price → paid fully from the balance
 * (card 0). Otherwise reward = min(balance, max(0, price − 0.50)) and the card
 * pays the rest. `coversFull` is also the iPhone "reward_only" check.
 */
export function estimateTryOnReward(
  balanceCents: number,
  price: number,
): { reward: number; card: number; coversFull: boolean } {
  const balance = safe(centsToDollars(balanceCents));
  const p = round2(safe(Number(price)));
  if (p > 0 && dollarsToCents(balance) >= dollarsToCents(p)) {
    return { reward: p, card: 0, coversFull: true };
  }
  const reward = round2(Math.min(balance, Math.max(0, p - CARD_MINIMUM)));
  return { reward, card: round2(p - reward), coversFull: false };
}

/** "$30.00" — Intl when available, else "$x.xx". */
export function formatRewardMoney(amount: number, currency = "USD"): string {
  const n = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const code = (currency || "USD").toUpperCase();
  try {
    if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    }
  } catch {
    // fall through (unknown currency code / no Intl)
  }
  const sign = n < 0 ? "-" : "";
  const prefix = code === "USD" ? "$" : `${code} `;
  return `${sign}${prefix}${Math.abs(n).toFixed(2)}`;
}
