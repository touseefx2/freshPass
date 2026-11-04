import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { isOwnBusinessInCustomerMode } from "@/src/state/slices/userSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { addCartItem, getCartErrorMessage } from "@/src/services/cartService";
import { isRequestCanceled } from "@/src/services/api";
import type { ShopProduct } from "@/src/types/shopProduct";
import { productHasVariants } from "@/src/utils/shopProductHelpers";

/** Opens the Marketplace product page. */
export function openMarketplaceProduct(
  router: ReturnType<typeof useRouter>,
  productId: string,
) {
  router.push({
    pathname: "/(main)/marketplace/product",
    params: { productId },
  } as any);
}

/**
 * Cart button on a grid card: guests → sign-in popup, products with options →
 * product page (an option must be chosen), own salon → explained, otherwise
 * one unit goes into the cart. `addingId` drives the card spinner.
 */
export function useQuickAddToCart() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);
  const [addingId, setAddingId] = useState<string | null>(null);

  const addToCart = useCallback(
    async (product: ShopProduct) => {
      if (user.isGuest) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      if (productHasVariants(product)) {
        openMarketplaceProduct(router, product.id);
        return;
      }
      if (isOwnBusinessInCustomerMode(user, product.business_id ?? product.seller?.id)) {
        showBanner(
          t("ownBusinessBlockedTitle"),
          t("ownBusinessBlockedMessage"),
          "warning",
        );
        return;
      }
      if (addingId) return;
      setAddingId(product.id);
      try {
        await addCartItem({ productId: product.id, quantity: 1 });
        showBanner(t("addedToCart"), product.name, "success");
      } catch (err) {
        if (isRequestCanceled(err)) return;
        showBanner(
          t("mpPdAddFailed"),
          getCartErrorMessage(err) ??
            (err as any)?.data?.message ??
            t("somethingWentWrong"),
          "error",
        );
      } finally {
        setAddingId(null);
      }
    },
    [addingId, dispatch, router, showBanner, t, user],
  );

  return { addToCart, addingId };
}
