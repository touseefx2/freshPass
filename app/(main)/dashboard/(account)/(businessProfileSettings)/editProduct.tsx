import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
// Old single-page form, kept so it can be switched back:
// import ProductFormScreen from "@/src/components/productFormScreen";
import type { ProductFormDraft } from "@/src/components/productFormScreen";
import ProductStepFlow from "@/src/components/productStepFlow";
import {
  productSaveErrorMessage,
  toProductServerError,
  type ProductServerError,
} from "@/src/components/productEditor/editorUtils";
import { updateProduct as updateProductRedux } from "@/src/state/slices/inventorySlice";
import { updateProduct as updateProductApi } from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { productToFormDraft } from "@/src/utils/shopProductHelpers";

export default function EditProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const product = useAppSelector((s) =>
    s.inventory.products.find((p) => p.id === id),
  );
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ProductServerError | null>(null);
  const initial = useMemo((): ProductFormDraft | null => {
    if (!product) return null;
    return productToFormDraft(product);
  }, [product]);

  const handleSubmit = useCallback(
    async (draft: ProductFormDraft, publish: boolean) => {
      if (!product || submitting) return;
      setSubmitting(true);
      try {
        // Photos go as images[] / remove_image_ids[] (draft.images); the old
        // single `image` would replace the main photo, so it isn't sent.
        // Live products keep their status; drafts publish or stay drafts.
        const updated = await updateProductApi(
          product.id,
          product.published ? draft : { ...draft, published: publish },
          null,
        );
        dispatch(updateProductRedux(updated));
        router.back();
      } catch (err: any) {
        const fieldError = toProductServerError(err);
        if (fieldError) setServerError(fieldError);
        showBanner(
          t("editProduct"),
          productSaveErrorMessage(err, fieldError) || t("somethingWentWrong"),
          "error",
        );
        // Only on failure: router.back() runs on a later tick, and dropping
        // `submitting` first lets the flow's back guard turn it into a step back.
        setSubmitting(false);
      }
    },
    [dispatch, product, router, submitting, showBanner, t],
  );

  if (!product || !initial) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingHorizontal: moderateWidthScale(20),
        }}
      >
        <StackHeader title={t("editProduct")} />
        <Text
          style={{
            marginTop: moderateHeightScale(24),
            fontSize: fontSize.size14,
            fontFamily: fonts.fontRegular,
            color: theme.lightGreen5,
          }}
        >
          {t("productNotFound")}
        </Text>
      </View>
    );
  }

  return (
    <ProductStepFlow
      mode="edit"
      initial={initial}
      published={product.published}
      moderation={product.moderation}
      submitting={submitting}
      serverError={serverError}
      onSubmit={handleSubmit}
    />
  );
}
