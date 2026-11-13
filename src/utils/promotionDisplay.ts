import type { Promotion, PromotionServicePrice } from "@/src/types/promotion";

/**
 * Display helpers for profile offers. The server already worked out every
 * price and who qualifies; these only pick which numbers to show.
 */

export type ServiceOfferPrice = {
  promotion: Promotion;
  service: PromotionServicePrice;
  /** true → show final_price with original_price struck through */
  showDiscount: boolean;
};

/**
 * The offer that applies to a service row: the active offer when it covers the
 * service, otherwise (no active offer) the first offer that covers it.
 */
export function pickServiceOffer(
  promotions: Promotion[],
  activeId: number | null,
  serviceId: number | string,
): ServiceOfferPrice | null {
  const id = Number(serviceId);
  const find = (p: Promotion) => p.services.find((s) => s.id === id);
  const active =
    activeId != null ? promotions.find((p) => p.id === activeId) : undefined;
  const candidates = active ? [active] : promotions;
  for (const promotion of candidates) {
    const service = find(promotion);
    if (service) {
      return {
        promotion,
        service,
        showDiscount:
          promotion.eligibility?.eligible === true &&
          service.final_price < service.original_price,
      };
    }
  }
  return null;
}

/** "15% OFF" headline from the server's savings label. */
export function savingsHeadline(promotion: Promotion): string {
  return (promotion.savings_label ?? "").toUpperCase();
}

export function formatOfferPrice(value: number): string {
  return `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

// An offer opened from a link / email is kept here so the business profile
// can activate it without fetching (and counting a view) a second time.
const remembered = new Map<number, Promotion>();

export function rememberPromotion(promotion: Promotion): void {
  if (promotion.id) remembered.set(promotion.id, promotion);
}

export function getRememberedPromotion(id: number): Promotion | undefined {
  return remembered.get(id);
}
