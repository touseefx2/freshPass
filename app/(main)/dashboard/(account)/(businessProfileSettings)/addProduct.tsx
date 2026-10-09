import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/src/hooks/hooks";
// Old single-page form, kept so it can be switched back:
// import ProductFormScreen from "@/src/components/productFormScreen";
import type { ProductFormDraft } from "@/src/components/productFormScreen";
import ProductStepFlow from "@/src/components/productStepFlow";
import { addProduct } from "@/src/state/slices/inventorySlice";
import { createEmptyProductDraft } from "@/src/utils/shopProductHelpers";
import { createProduct } from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTranslation } from "react-i18next";

export default function AddProductScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (draft: ProductFormDraft, publish: boolean) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const imageFile =
          draft.imageUri
            ? {
                uri: draft.imageUri,
                name: `product-${Date.now()}.jpg`,
                type: "image/jpeg",
              }
            : null;
        const product = await createProduct(draft, publish, imageFile);
        dispatch(addProduct(product));
        router.back();
      } catch (err: any) {
        showBanner(
          t("addProduct"),
          err?.message || t("somethingWentWrong"),
          "error",
        );
        // Only on failure: router.back() runs on a later tick, and dropping
        // `submitting` first lets the flow's back guard turn it into a step back.
        setSubmitting(false);
      }
    },
    [dispatch, router, submitting, showBanner, t],
  );

  return (
    <ProductStepFlow
      mode="add"
      initial={createEmptyProductDraft()}
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}
