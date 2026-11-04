import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import CartSellerGroupCard from "@/src/components/marketplace/cart/CartSellerGroupCard";
import CartSkeleton from "@/src/components/marketplace/cart/CartSkeleton";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { setMarketCheckout } from "@/src/state/slices/marketCartSlice";
import {
  fetchCart,
  getCartErrorMessage,
  removeCartItem,
  updateCartItemQuantity,
} from "@/src/services/cartService";
import type {
  MarketCartGroup,
  MarketCartItem,
  MarketCheckoutLine,
} from "@/src/types/marketplace";
import type { ShopSeller } from "@/src/types/shopProduct";

// Catalog copy outside the tab bar, so Back returns to this cart
const MARKETPLACE_CATALOG = "/(main)/marketplace";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    list: { flex: 1 },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(16),
    },
    listContentEmpty: { flexGrow: 1, justifyContent: "center" },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(4),
    },
    summaryText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
      fontVariant: ["tabular-nums"],
    },
  });

function toCheckoutLine(item: MarketCartItem): MarketCheckoutLine {
  return {
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    name: item.name,
    variantName: item.variantName,
    imageUrl: item.imageUrl,
    unitPrice: item.unitPrice,
    regularUnitPrice: item.regularUnitPrice,
  };
}

/** Marketplace cart (guide §6 Step 3): grouped by seller, one checkout each. */
export default function MarketplaceCartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isGuest = useAppSelector((s) => s.user.isGuest);
  const accessToken = useAppSelector((s) => s.user.accessToken);
  const cart = useAppSelector((s) => s.marketCart.cart);
  const signedIn = !isGuest && !!accessToken;

  const [loading, setLoading] = useState(cart == null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyLineIds, setBusyLineIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const requestId = useRef(0);

  const setLineBusy = useCallback((lineId: number, busy: boolean) => {
    setBusyLineIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!signedIn) return;
      const id = ++requestId.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      try {
        await fetchCart();
        if (id === requestId.current) setError(null);
      } catch (err: any) {
        if (id === requestId.current) {
          setError(err?.message || t("somethingWentWrong"));
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [signedIn, t],
  );

  // Prices / stock change while away: re-read on every visit
  const hasCartRef = useRef(cart != null);
  hasCartRef.current = cart != null;
  useFocusEffect(
    useCallback(() => {
      void load(hasCartRef.current ? "silent" : "initial");
    }, [load]),
  );

  const handleChangeQuantity = useCallback(
    async (item: MarketCartItem, quantity: number): Promise<number | null> => {
      const next = Math.max(1, Math.min(item.maxQuantity || 1, quantity));
      setLineBusy(item.id, true);
      try {
        const updated = await updateCartItemQuantity(item.id, next);
        const line = updated?.groups
          .flatMap((group) => group.items)
          .find((l) => l.id === item.id);
        return line?.quantity ?? null;
      } catch (err) {
        showBanner(
          t("mpCart"),
          getCartErrorMessage(err) ||
            (err as any)?.message ||
            t("somethingWentWrong"),
          "error",
        );
        // Stock may have moved: show the server's view
        void load("silent");
        return null;
      } finally {
        setLineBusy(item.id, false);
      }
    },
    [load, setLineBusy, showBanner, t],
  );

  const handleRemove = useCallback(
    async (item: MarketCartItem) => {
      if (busyLineIds.has(item.id)) return;
      setLineBusy(item.id, true);
      try {
        await removeCartItem(item.id);
      } catch (err) {
        showBanner(
          t("mpCart"),
          getCartErrorMessage(err) ||
            (err as any)?.message ||
            t("somethingWentWrong"),
          "error",
        );
        void load("silent");
      } finally {
        setLineBusy(item.id, false);
      }
    },
    [busyLineIds, load, setLineBusy, showBanner, t],
  );

  const handleCheckout = useCallback(
    (group: MarketCartGroup) => {
      const lines = group.items.filter((item) => !item.issue).map(toCheckoutLine);
      if (!group.canCheckout || lines.length === 0) return;
      dispatch(
        setMarketCheckout({
          mode: "cart",
          seller: group.seller,
          delivery: group.delivery,
          lines,
        }),
      );
      router.push("/(main)/marketplace/checkout" as any);
    },
    [dispatch, router],
  );

  const handleOpenSeller = useCallback(
    (seller: ShopSeller) => {
      if (!seller.id) return;
      router.push({
        pathname: "/(main)/businessDetail",
        params: { business_id: String(seller.id) },
      } as any);
    },
    [router],
  );

  const handleOpenProduct = useCallback(
    (item: MarketCartItem) => {
      if (!item.productId) return;
      router.push({
        pathname: "/(main)/marketplace/product",
        params: { productId: String(item.productId) },
      } as any);
    },
    [router],
  );

  const browse = useCallback(() => {
    router.push(MARKETPLACE_CATALOG as any);
  }, [router]);

  const groups = cart?.groups ?? [];
  const itemCount = cart?.itemCount ?? 0;

  const renderGroup = useCallback(
    ({ item }: { item: MarketCartGroup }) => (
      <CartSellerGroupCard
        group={item}
        busyLineIds={busyLineIds}
        onChangeQuantity={handleChangeQuantity}
        onRemove={(line) => void handleRemove(line)}
        onCheckout={handleCheckout}
        onOpenSeller={handleOpenSeller}
        onOpenProduct={handleOpenProduct}
      />
    ),
    [
      busyLineIds,
      handleChangeQuantity,
      handleCheckout,
      handleOpenProduct,
      handleOpenSeller,
      handleRemove,
    ],
  );

  const header = <StackHeader title={t("mpCart")} />;

  if (!signedIn) {
    return (
      <View style={styles.container}>
        {header}
        <View style={[styles.listContent, styles.listContentEmpty]}>
          <MarketplaceEmptyState
            icon="account-lock-outline"
            title={t("guestMode")}
            message={t("mpCartSignInMessage")}
            actionLabel={t("signIn")}
            onAction={() => dispatch(setGuestModeModalVisible(true))}
          />
        </View>
      </View>
    );
  }

  const summary =
    groups.length > 1
      ? t("mpCartSummaryMany", {
          items: t("mpCartItemsCount", { count: itemCount }),
          sellers: t("mpCartSellersCount", { count: groups.length }),
        })
      : t("mpCartSummaryOne", {
          items: t("mpCartItemsCount", { count: itemCount }),
          seller: groups[0]?.seller.name || t("mpCartSellerFallback"),
        });

  const listEmpty = loading ? (
    <CartSkeleton />
  ) : error ? (
    <MarketplaceEmptyState
      icon="wifi-off"
      title={t("somethingWentWrong")}
      message={error}
      actionLabel={t("retry")}
      onAction={() => void load("initial")}
    />
  ) : (
    <MarketplaceEmptyState
      icon="cart-outline"
      title={t("cartEmpty")}
      message={t("mpCartEmptyMessage")}
      actionLabel={t("mpCartBrowse")}
      onAction={browse}
    />
  );

  // Skeleton fills the screen top-down; empty / error states sit centred
  const showList = groups.length > 0 && !(loading && !cart);

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        style={styles.list}
        data={showList ? groups : []}
        keyExtractor={(group) => String(group.seller.id)}
        renderItem={renderGroup}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
          !showList && !loading && styles.listContentEmpty,
          loading && !showList && { paddingHorizontal: 0, paddingTop: 0 },
        ]}
        ListHeaderComponent={
          showList ? (
            <View style={styles.summary}>
              <MaterialIcons
                name="storefront"
                size={moderateWidthScale(18)}
                color={theme.selectCard}
              />
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
