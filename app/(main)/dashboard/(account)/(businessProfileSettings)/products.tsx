import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import { removeProduct } from "@/src/state/slices/inventorySlice";
import {
  getStockFilterMatch,
  isLowStock,
  type ShopProduct,
  type ShopStockFilter,
} from "@/src/types/shopProduct";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    searchWrap: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      height: moderateHeightScale(44),
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      paddingVertical: 0,
    },
    tabs: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(14),
    },
    tab: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    tabActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    tabText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tabTextActive: {
      color: theme.buttonText,
    },
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(48),
      gap: moderateHeightScale(12),
    },
    emptyIconWrap: {
      width: widthScale(88),
      height: widthScale(88),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
    },
    emptyTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
      lineHeight: fontSize.size18,
    },
    listContent: {
      gap: moderateHeightScale(10),
    },
    listFooter: {
      marginTop: moderateHeightScale(16),
      gap: moderateHeightScale(10),
    },
    card: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    thumb: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
    cardBody: {
      flex: 1,
      gap: moderateHeightScale(2),
      minWidth: 0,
    },
    cardTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    cardPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(2),
    },
    badge: {
      alignSelf: "flex-start",
      marginTop: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown015,
    },
    badgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    actions: {
      justifyContent: "space-between",
      alignItems: "center",
      gap: moderateHeightScale(8),
    },
    iconBtn: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen05,
    },
  });

export default function ProductsInventoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const products = useAppSelector((s) => s.inventory.products);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ShopStockFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!getStockFilterMatch(p, filter)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, filter]);

  const confirmDelete = (product: ShopProduct) => {
    Alert.alert(
      t("deleteProductTitle"),
      t("deleteProductMessage", { name: product.name }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => dispatch(removeProduct(product.id)),
        },
      ],
    );
  };

  const tabs: { key: ShopStockFilter; label: string }[] = [
    { key: "all", label: t("productFilterAll") },
    { key: "in_stock", label: t("productFilterInStock") },
    { key: "low_stock", label: t("productFilterLowStock") },
  ];

  return (
    <View style={styles.container}>
      <StackHeader title={t("productsInventory")} />
      <View style={styles.content}>
        <View style={styles.searchWrap}>
          <MaterialIcons
            name="search"
            size={moderateWidthScale(20)}
            color={theme.lightGreen5}
          />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchProducts")}
            placeholderTextColor={theme.lightGreen5}
          />
        </View>

        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons
                name="inventory-2"
                size={moderateWidthScale(40)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.emptyTitle}>{t("noProductsYet")}</Text>
            <Text style={styles.emptySubtitle}>{t("noProductsYetSubtitle")}</Text>
            <View style={styles.listFooter}>
              <Button
                title={t("addProductCta")}
                onPress={() => router.push("./addProduct" as any)}
              />
            </View>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + moderateHeightScale(24) },
            ]}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <View style={styles.listFooter}>
                <Button
                  title={t("addProductCta")}
                  onPress={() => router.push("./addProduct" as any)}
                />
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.thumb}>
                  {item.imageUri ? (
                    <AppImage
                      uri={item.imageUri}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons
                      name="shopping-bag"
                      size={moderateWidthScale(26)}
                      color={theme.darkGreen}
                    />
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.brand} · {item.category}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {formatShopPrice(item.sellingPrice)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {t("qtyInStock", { count: item.inventoryCount })}
                  </Text>
                  {isLowStock(item) ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t("lowStock")}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() =>
                      router.push({
                        pathname: "./editProduct" as any,
                        params: { id: item.id },
                      })
                    }
                  >
                    <MaterialIcons
                      name="edit"
                      size={moderateWidthScale(18)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => confirmDelete(item)}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={moderateWidthScale(18)}
                      color={theme.red}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}
