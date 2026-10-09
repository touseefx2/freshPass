import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
import {
  removeProduct,
  setDeliveryOptions,
  setProducts,
} from "@/src/state/slices/inventorySlice";
import { describeDelivery } from "@/src/utils/shopProductHelpers";
import {
  getStockFilterMatch,
  isLowStock,
  type ShopProduct,
  type ShopStockFilter,
} from "@/src/types/shopProduct";
import {
  fetchMyProducts,
  fetchDeliveryOptions,
  deleteProduct as deleteProductApi,
  ProductDeleteBlockedError,
} from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    listHeader: {
      paddingTop: moderateHeightScale(12),
      gap: moderateHeightScale(12),
      marginBottom: moderateHeightScale(4),
    },
    summaryCard: {
      flexDirection: "row",
      alignItems: "stretch",
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(8),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.darkGreen,
    },
    summaryItem: {
      flex: 1,
      alignItems: "center",
      gap: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
    },
    summaryDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    summaryValue: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    summaryValueAlert: {
      color: "#F2B880",
    },
    summaryLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: "rgba(255, 255, 255, 0.75)",
      textAlign: "center",
    },
    deliveryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      paddingLeft: moderateWidthScale(10),
      paddingRight: moderateWidthScale(8),
      minHeight: moderateHeightScale(52),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    deliveryCardWarning: {
      borderColor: theme.selectCard,
      backgroundColor: theme.orangeBrown015,
    },
    deliveryIcon: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    deliveryIconWarning: {
      backgroundColor: "rgba(188, 108, 37, 0.15)",
    },
    deliveryText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    deliveryEdit: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    deliveryEditWarning: {
      color: theme.selectCard,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(14),
      height: moderateHeightScale(46),
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
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingLeft: moderateWidthScale(14),
      paddingRight: moderateWidthScale(6),
      minHeight: moderateHeightScale(36),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    tabActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    tabText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tabTextActive: {
      color: theme.white,
    },
    tabCount: {
      minWidth: moderateWidthScale(22),
      height: moderateWidthScale(22),
      paddingHorizontal: moderateWidthScale(6),
      borderRadius: moderateWidthScale(11),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    tabCountActive: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    tabCountText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(40),
      gap: moderateHeightScale(10),
    },
    emptyIconWrap: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(6),
    },
    emptyTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size19,
    },
    emptyLink: {
      marginTop: moderateHeightScale(4),
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
    },
    emptyLinkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(10),
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(10),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 1,
    },
    thumb: {
      width: widthScale(76),
      height: widthScale(76),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
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
      minWidth: 0,
      gap: moderateHeightScale(3),
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    cardTitle: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    cardFooter: {
      marginTop: moderateHeightScale(4),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    cardPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    draftBadge: {
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen1,
    },
    draftBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    stockPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
    },
    stockDot: {
      width: moderateWidthScale(6),
      height: moderateWidthScale(6),
      borderRadius: moderateWidthScale(3),
    },
    stockPillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
    },
    actions: {
      alignSelf: "stretch",
      justifyContent: "space-between",
      alignItems: "center",
    },
    iconBtn: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(17),
      alignItems: "center",
      justifyContent: "center",
    },
    deleteBtn: {
      backgroundColor: "rgba(186, 26, 26, 0.08)",
    },
    bottomBar: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.lightGreen2,
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function ProductsInventoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const products = useAppSelector((s) => s.inventory.products);
  const delivery = useAppSelector((s) => s.inventory.deliveryOptions);
  const deliveryLines = describeDelivery(delivery, t);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ShopStockFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const { products: list } = await fetchMyProducts();
      dispatch(setProducts(list));
    } catch {
      // keep existing Redux data on failure
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      fetchDeliveryOptions()
        .then((options) => dispatch(setDeliveryOptions(options)))
        .catch(() => {});
    }, [dispatch]),
  );

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

  const runDelete = async (product: ShopProduct, force = false) => {
    try {
      const { unlinkedReels } = await deleteProductApi(product.id, { force });
      dispatch(removeProduct(product.id));
      showBanner(
        t("products"),
        unlinkedReels > 0
          ? t("productDeletedFromReels", { count: unlinkedReels })
          : t("productDeleted"),
        "success",
      );
    } catch (err: any) {
      if (err instanceof ProductDeleteBlockedError) {
        // Decide on canForce, not on the wording of the message.
        if (err.canForce && !force) {
          Alert.alert(t("cannotDelete"), err.message, [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("deleteAnyway"),
              style: "destructive",
              onPress: () => runDelete(product, true),
            },
          ]);
        } else if (err.reason === "open_orders") {
          // Owner must complete or cancel those orders first
          Alert.alert(t("cannotDelete"), err.message, [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("viewOrders"),
              onPress: () => router.push("./orders" as any),
            },
          ]);
        } else {
          Alert.alert(t("cannotDelete"), err.message, [{ text: t("ok") }]);
        }
        return;
      }
      if (err?.status === 404) {
        // Already gone or not ours — resync the list.
        loadProducts();
        return;
      }
      showBanner(t("products"), err?.message || t("somethingWentWrong"), "error");
    }
  };

  const confirmDelete = (product: ShopProduct) => {
    Alert.alert(
      t("deleteProductTitle"),
      t("deleteProductMessage", { name: product.name }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => runDelete(product),
        },
      ],
    );
  };

  const tabs: { key: ShopStockFilter; label: string }[] = [
    { key: "all", label: t("productFilterAll") },
    { key: "in_stock", label: t("productFilterInStock") },
    { key: "low_stock", label: t("productFilterLowStock") },
  ];

  const tabCounts = useMemo(() => {
    const counts: Record<ShopStockFilter, number> = {
      all: 0,
      in_stock: 0,
      low_stock: 0,
    };
    tabs.forEach((tab) => {
      counts[tab.key] = products.filter((p) =>
        getStockFilterMatch(p, tab.key),
      ).length;
    });
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const summary = useMemo(() => {
    let units = 0;
    let restock = 0;
    products.forEach((p) => {
      if (!p.trackInventory) return;
      units += p.inventoryCount;
      if (p.inventoryCount <= 0 || isLowStock(p)) restock += 1;
    });
    return { total: products.length, units, restock };
  }, [products]);

  const getStockStatus = (item: ShopProduct) => {
    if (!item.trackInventory) {
      return { label: t("stockNotTracked"), tone: "ok" as const };
    }
    if (item.inventoryCount <= 0) {
      return { label: t("outOfStock"), tone: "out" as const };
    }
    if (isLowStock(item)) {
      return {
        label: `${t("lowStock")} · ${item.inventoryCount}`,
        tone: "low" as const,
      };
    }
    return {
      label: t("qtyInStock", { count: item.inventoryCount }),
      tone: "ok" as const,
    };
  };

  const toneColors = {
    ok: { bg: "rgba(96, 108, 56, 0.12)", fg: theme.buttonBack },
    low: { bg: theme.orangeBrown015, fg: theme.selectCard },
    out: { bg: "rgba(186, 26, 26, 0.08)", fg: theme.red },
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const openEdit = (item: ShopProduct) =>
    router.push({
      pathname: "./editProduct" as any,
      params: { id: item.id },
    });

  const hasQuery = search.trim().length > 0 || filter !== "all";

  const listHeader = (
    <View style={styles.listHeader}>
      {products.length > 0 ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>{t("inventoryStatProducts")}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.units}</Text>
            <Text style={styles.summaryLabel}>{t("inventoryStatUnits")}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryValue,
                summary.restock > 0 && styles.summaryValueAlert,
              ]}
            >
              {summary.restock}
            </Text>
            <Text style={styles.summaryLabel}>{t("inventoryStatRestock")}</Text>
          </View>
        </View>
      ) : null}

      {delivery ? (
        <TouchableOpacity
          style={[
            styles.deliveryCard,
            !delivery.configured && styles.deliveryCardWarning,
          ]}
          activeOpacity={0.85}
          onPress={() => router.push("./deliveryOptions" as any)}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.deliveryIcon,
              !delivery.configured && styles.deliveryIconWarning,
            ]}
          >
            <MaterialIcons
              name={delivery.configured ? "local-shipping" : "warning-amber"}
              size={moderateWidthScale(18)}
              color={delivery.configured ? theme.darkGreen : theme.selectCard}
            />
          </View>
          <Text style={styles.deliveryText} numberOfLines={2}>
            {delivery.configured
              ? deliveryLines.map((l) => l.label).join(" · ")
              : t("deliveryNotSetHint")}
          </Text>
          <Text
            style={[
              styles.deliveryEdit,
              !delivery.configured && styles.deliveryEditWarning,
            ]}
          >
            {delivery.configured ? t("edit") : t("setUp")}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(20)}
            color={delivery.configured ? theme.buttonBack : theme.selectCard}
          />
        </TouchableOpacity>
      ) : null}

      {products.length > 0 ? (
        <>
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
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearch("")}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t("clearFilters")}
              >
                <MaterialIcons
                  name="cancel"
                  size={moderateWidthScale(18)}
                  color={theme.lightGreen4}
                />
              </TouchableOpacity>
            ) : null}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.tabCount, active && styles.tabCountActive]}>
                    <Text
                      style={[styles.tabCountText, active && styles.tabTextActive]}
                    >
                      {tabCounts[tab.key]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );

  const listEmpty = loading && products.length === 0 ? (
    <View style={styles.emptyWrap}>
      <ActivityIndicator size="large" color={theme.darkGreen} />
    </View>
  ) : products.length > 0 && hasQuery ? (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons
          name="search-off"
          size={moderateWidthScale(34)}
          color={theme.darkGreen}
        />
      </View>
      <Text style={styles.emptyTitle}>{t("noProductsMatch")}</Text>
      <Text style={styles.emptySubtitle}>{t("noProductsMatchSubtitle")}</Text>
      <TouchableOpacity
        style={styles.emptyLink}
        onPress={() => {
          setSearch("");
          setFilter("all");
        }}
        accessibilityRole="button"
      >
        <Text style={styles.emptyLinkText}>{t("clearFilters")}</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons
          name="inventory-2"
          size={moderateWidthScale(34)}
          color={theme.darkGreen}
        />
      </View>
      <Text style={styles.emptyTitle}>{t("noProductsYet")}</Text>
      <Text style={styles.emptySubtitle}>{t("noProductsYetSubtitle")}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("productsInventory")} />
      <View style={styles.content}>
        <FlatList
          data={loading && products.length === 0 ? [] : filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: moderateHeightScale(20) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => {
            const status = getStockStatus(item);
            const tone = toneColors[status.tone];
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openEdit(item)}
                accessibilityRole="button"
                accessibilityLabel={`${t("editProduct")}: ${item.name}`}
              >
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
                      size={moderateWidthScale(28)}
                      color={theme.lightGreen4}
                    />
                  )}
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!item.published ? (
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftBadgeText}>{t("draft")}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {[item.brand, item.category].filter(Boolean).join(" · ")}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>
                      {formatShopPrice(item.sellingPrice)}
                    </Text>
                    <View style={[styles.stockPill, { backgroundColor: tone.bg }]}>
                      <View
                        style={[styles.stockDot, { backgroundColor: tone.fg }]}
                      />
                      <Text
                        style={[styles.stockPillText, { color: tone.fg }]}
                        numberOfLines={1}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.deleteBtn]}
                    onPress={() => confirmDelete(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t("delete")}: ${item.name}`}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={moderateWidthScale(18)}
                      color={theme.red}
                    />
                  </TouchableOpacity>
                  <View style={styles.iconBtn}>
                    <MaterialIcons
                      name="chevron-right"
                      size={moderateWidthScale(22)}
                      color={theme.lightGreen4}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + moderateHeightScale(12) },
          ]}
        >
          <Button
            title={t("addProductCta")}
            leftIcon={
              <MaterialIcons
                name="add"
                size={moderateWidthScale(20)}
                color={theme.buttonText}
              />
            }
            onPress={() => router.push("./addProduct" as any)}
          />
        </View>
      </View>
    </View>
  );
}
