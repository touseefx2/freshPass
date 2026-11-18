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
 * The offer that applies to a service row. An active (picked / linked) offer
 * wins when it covers the service. Otherwise: the cheapest offer this customer
 * qualifies for; if none qualifies, the first offer that covers it (label only).
 */
export function pickServiceOffer(
  promotions: Promotion[],
  activeId: number | null,
  serviceId: number | string,
): ServiceOfferPrice | null {
  const id = Number(serviceId);
  const matches: ServiceOfferPrice[] = [];
  const active =
    activeId != null ? promotions.find((p) => p.id === activeId) : undefined;
  for (const promotion of active ? [active] : promotions) {
    const service = promotion.services.find((s) => s.id === id);
    if (!service) continue;
    matches.push({
      promotion,
      service,
      showDiscount:
        promotion.eligibility?.eligible === true &&
        service.final_price < service.original_price,
    });
  }
  const best = matches
    .filter((m) => m.showDiscount)
    .sort((a, b) => a.service.final_price - b.service.final_price)[0];
  return best ?? matches[0] ?? null;
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
