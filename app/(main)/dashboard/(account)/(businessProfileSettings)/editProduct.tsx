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
import { updateProduct as updateProductRedux } from "@/src/state/slices/inventorySlice";
import { updateProduct as updateProductApi } from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

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

  const initial = useMemo((): ProductFormDraft | null => {
    if (!product) return null;
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      published: _p,
      delivery: _d,
      ...draft
    } = product;
    return draft;
  }, [product]);

  const handleSubmit = useCallback(
    async (draft: ProductFormDraft, publish: boolean) => {
      if (!product || submitting) return;
      setSubmitting(true);
      try {
        const imageChanged =
          draft.imageUri !== product.imageUri && draft.imageUri;
        const imageFile = imageChanged
          ? {
              uri: draft.imageUri!,
              name: `product-${Date.now()}.jpg`,
              type: "image/jpeg",
            }
          : null;
        // Live products keep their status; drafts publish or stay drafts.
        const updated = await updateProductApi(
          product.id,
          product.published ? draft : { ...draft, published: publish },
          imageFile,
        );
        dispatch(updateProductRedux(updated));
        router.back();
      } catch (err: any) {
        showBanner(
          t("editProduct"),
          err?.message || t("somethingWentWrong"),
          "error",
        );
      } finally {
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
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}
