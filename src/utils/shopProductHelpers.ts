import type { TFunction } from "i18next";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import type {
  ShopDeliveryOptions,
  ShopProduct,
} from "@/src/types/shopProduct";

export function createEmptyProductDraft(): Omit<
  ShopProduct,
  "id" | "createdAt" | "updatedAt" | "published" | "delivery"
> {
  return {
    name: "",
    brand: "",
    category: "Hair Styling",
    description: "",
    imageUri: null,
    sellingPrice: 0,
    cost: null,
    inventoryCount: 0,
    lowStockAlertEnabled: true,
    lowStockThreshold: 5,
    trackInventory: true,
  };
}

export interface DeliveryLine {
  icon: "local-shipping" | "storefront";
  label: string;
}

/** Lines describing the salon's delivery, e.g. "Shipping $7.50 per order", "Pickup at the salon". */
export function describeDelivery(
  delivery: ShopDeliveryOptions | null | undefined,
  t: TFunction,
): DeliveryLine[] {
  if (!delivery?.configured) return [];
  const lines: DeliveryLine[] = [];
  if (delivery.shipping === "paid") {
    lines.push({
      icon: "local-shipping",
      label: t("shippingPerOrder", {
        amount: formatShopPrice(delivery.shippingPrice ?? 0),
      }),
    });
  } else if (delivery.shipping === "free") {
    lines.push({ icon: "local-shipping", label: t("freeShipping") });
  }
  if (delivery.pickupAvailable) {
    lines.push({ icon: "storefront", label: t("pickupAtSalon") });
  }
  return lines;
}
