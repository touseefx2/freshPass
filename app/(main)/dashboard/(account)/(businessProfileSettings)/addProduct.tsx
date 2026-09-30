import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/src/hooks/hooks";
import ProductFormScreen, {
  type ProductFormDraft,
} from "@/src/components/productFormScreen";
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
    async (draft: ProductFormDraft) => {
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
        const product = await createProduct(draft, imageFile);
        dispatch(addProduct(product));
        router.back();
      } catch (err: any) {
        showBanner(
          t("addProduct"),
          err?.message || t("somethingWentWrong"),
          "error",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [dispatch, router, submitting, showBanner, t],
  );

  return (
    <ProductFormScreen
      mode="add"
      initial={createEmptyProductDraft()}
      onSubmit={handleSubmit}
    />
  );
}
