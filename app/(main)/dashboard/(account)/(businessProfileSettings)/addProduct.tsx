import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
// Old single-page form, kept so it can be switched back:
// import ProductFormScreen from "@/src/components/productFormScreen";
import type { ProductFormDraft } from "@/src/components/productFormScreen";
import ProductStepFlow from "@/src/components/productStepFlow";
import {
  productSaveErrorMessage,
  toProductServerError,
  type ProductServerError,
} from "@/src/components/productEditor/editorUtils";
import { addProduct } from "@/src/state/slices/inventorySlice";
import { setBusinessPlansModalVisible } from "@/src/state/slices/generalSlice";
import { isBusinessSubscriptionActive } from "@/src/state/slices/userSlice";
import { createEmptyProductDraft } from "@/src/utils/shopProductHelpers";
import { createProduct } from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";

export default function AddProductScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ProductServerError | null>(null);
  const [initial] = useState(createEmptyProductDraft);

  // Business owners on a plan (Business or Solo) sell; no plan → plans popup.
  // Unknown status (not loaded yet) is left to the server.
  // Checked once on open, so a status refresh never throws out a half-filled form.
  const [blocked] = useState(
    () => !!businessStatus && !isBusinessSubscriptionActive(businessStatus),
  );
  useEffect(() => {
    if (!blocked) return;
    dispatch(setBusinessPlansModalVisible(true));
    router.back();
  }, [blocked, dispatch, router]);

  const handleSubmit = useCallback(
    async (draft: ProductFormDraft, publish: boolean) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        // Photos go as images[] (draft.images); the old single `image` isn't sent.
        const product = await createProduct(draft, publish, null);
        dispatch(addProduct(product));
        router.back();
      } catch (err: any) {
        const fieldError = toProductServerError(err);
        if (fieldError) setServerError(fieldError);
        showBanner(
          t("addProduct"),
          productSaveErrorMessage(err, fieldError) || t("somethingWentWrong"),
          "error",
        );
        // Only on failure: router.back() runs on a later tick, and dropping
        // `submitting` first lets the flow's back guard turn it into a step back.
        setSubmitting(false);
      }
    },
    [dispatch, router, submitting, showBanner, t],
  );

  if (blocked) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  return (
    <ProductStepFlow
      mode="add"
      initial={initial}
      submitting={submitting}
      serverError={serverError}
      onSubmit={handleSubmit}
    />
  );
}
