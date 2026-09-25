import React, { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import ProductFormScreen, {
  type ProductFormDraft,
} from "@/src/components/productFormScreen";
import { updateProduct } from "@/src/state/slices/inventorySlice";

export default function EditProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const product = useAppSelector((s) =>
    s.inventory.products.find((p) => p.id === id),
  );

  const initial = useMemo((): ProductFormDraft | null => {
    if (!product) return null;
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      published: _p,
      ...draft
    } = product;
    return draft;
  }, [product]);

  const handleSubmit = useCallback(
    (draft: ProductFormDraft) => {
      if (!product) return;
      // BACKEND_SWAP: PUT/PATCH product API, then sync store
      dispatch(
        updateProduct({
          ...product,
          ...draft,
          updatedAt: new Date().toISOString(),
        }),
      );
      router.back();
    },
    [dispatch, product, router],
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
    <ProductFormScreen mode="edit" initial={initial} onSubmit={handleSubmit} />
  );
}
