import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import { fetchMyProducts } from "@/src/services/productService";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { isInStock, type ShopProduct } from "@/src/types/shopProduct";

/**
 * The user's inventory for "Promote a product" on a reel. Reloads when the
 * screen regains focus — products may have been added in Products & Inventory.
 */
export function useInventoryProducts(enabled: boolean) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setError(false);
    // Spinner only until the first list arrives; later reloads are silent
    if (!loadedRef.current) setLoading(true);
    try {
      const { products: list } = await fetchMyProducts({ per_page: 100 });
      // Shop-ready products first; hidden ones stay listed so the user sees why
      setProducts(
        [...list].sort((a, b) => Number(b.published) - Number(a.published)),
      );
      loadedRef.current = true;
    } catch (err) {
      Logger.error("Failed to load products for reel:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (enabled) void load();
    }, [enabled, load]),
  );

  const retry = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  return { products, loading, error, retry };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  products: ShopProduct[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  selectedId: number | null;
  onSelect: (product: ShopProduct | null) => void;
  isOwner: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      paddingBottom: moderateHeightScale(12),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderLight,
    },
    rowActive: {
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(12),
    },
    dimmed: { opacity: 0.45 },
    thumb: {
      width: widthScale(54),
      height: widthScale(54),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    text: { flex: 1, minWidth: 0 },
    name: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    meta: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    badge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightRed,
    },
    badgeStock: {
      backgroundColor: theme.upcomingCard,
    },
    badgeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    badgeTextStock: {
      color: theme.orangeBrownText,
    },
    state: {
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingVertical: moderateHeightScale(28),
      paddingHorizontal: moderateWidthScale(16),
    },
    stateTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    stateText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size21,
    },
    helper: {
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
  });

export default function ProductPickerSheet({
  visible,
  onClose,
  products,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  isOwner,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.state}>
          <ActivityIndicator color={theme.buttonBack} />
        </View>
      );
    }
    if (error) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.state}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <MaterialIcons
            name="refresh"
            size={moderateWidthScale(28)}
            color={theme.buttonBack}
          />
          <Text style={styles.stateTitle}>{t("productsLoadFailed")}</Text>
          <Text style={styles.stateText}>{t("tapToRetry")}</Text>
        </TouchableOpacity>
      );
    }
    if (products.length === 0) {
      return (
        <View style={styles.state}>
          <MaterialIcons
            name="inventory-2"
            size={moderateWidthScale(30)}
            color={theme.buttonBack}
          />
          <Text style={styles.stateTitle}>{t("noInventoryProducts")}</Text>
          <Text style={styles.stateText}>
            {isOwner
              ? t("noInventoryProductsHintOwner")
              : t("noInventoryProductsHintStaff")}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.list}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.row,
            selectedId == null && styles.rowActive,
          ]}
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId == null }}
        >
          <View style={styles.thumb}>
            <MaterialIcons
              name="block"
              size={moderateWidthScale(22)}
              color={theme.lightGreen}
            />
          </View>
          <View style={styles.text}>
            <Text style={styles.name}>{t("flowNoProduct")}</Text>
          </View>
          {selectedId == null ? (
            <MaterialIcons
              name="check"
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          ) : null}
        </TouchableOpacity>
        {products.map((p) => {
          const active = Number(p.id) === selectedId;
          const hidden = !p.published;
          const outOfStock = !hidden && !isInStock(p);
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              key={p.id}
              style={[
                styles.row,
                active && styles.rowActive,
              ]}
              onPress={() => onSelect(p)}
              // Hidden from the shop → nothing for customers to buy
              disabled={hidden}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: hidden }}
            >
              <View style={[styles.thumb, hidden && styles.dimmed]}>
                {p.imageUri ? (
                  <Image
                    source={{ uri: p.imageUri }}
                    style={styles.thumbImage}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="inventory-2"
                    size={moderateWidthScale(22)}
                    color={theme.buttonBack}
                  />
                )}
              </View>
              <View style={[styles.text, hidden && styles.dimmed]}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[p.brand, formatShopPrice(p.sellingPrice)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              {hidden || outOfStock ? (
                <View style={[styles.badge, !hidden && styles.badgeStock]}>
                  <Text
                    style={[styles.badgeText, !hidden && styles.badgeTextStock]}
                  >
                    {hidden ? t("productHiddenFromShop") : t("outOfStock")}
                  </Text>
                </View>
              ) : active ? (
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
        <Text style={styles.helper}>
          {products.some((p) => !p.published)
            ? t("productTagHelperHidden")
            : t("productTagHelper")}
        </Text>
      </View>
    );
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("flowPromoteProduct")}
      maxHeightPercent={0.85}
    >
      {renderBody()}
    </ModalizeBottomSheet>
  );
}
