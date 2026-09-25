import React, { useCallback } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/src/hooks/hooks";
import ProductFormScreen, {
  type ProductFormDraft,
} from "@/src/components/productFormScreen";
import { addProduct } from "@/src/state/slices/inventorySlice";
import { createEmptyProductDraft } from "@/src/utils/shopProductHelpers";
import type { ShopProduct } from "@/src/types/shopProduct";

export default function AddProductScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (draft: ProductFormDraft) => {
      const now = new Date().toISOString();
      const product: ShopProduct = {
        ...draft,
        id: `local-${Date.now()}`,
        published: true,
        createdAt: now,
        updatedAt: now,
      };
      // BACKEND_SWAP: POST product to inventory API, then sync store
      dispatch(addProduct(product));
      router.back();
    },
    [dispatch, router],
  );

  return (
    <ProductFormScreen
      mode="add"
      initial={createEmptyProductDraft()}
      onSubmit={handleSubmit}
    />
  );
}
