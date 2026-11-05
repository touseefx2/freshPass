import type { TFunction } from "i18next";

const BRAND_NAMES: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  americanexpress: "Amex",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  dinersclub: "Diners Club",
  unionpay: "UnionPay",
};

/** "visa" + "4242" → "Visa ending 4242"; no brand → "Card ending 4242" */
export const formatCardLabel = (
  t: TFunction,
  lastFour: string,
  brand?: string | null,
): string => {
  const key = (brand ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const name = BRAND_NAMES[key];
  return name
    ? t("cardEndingIn", { brand: name, last4: lastFour })
    : t("cardEndingInNoBrand", { last4: lastFour });
};
