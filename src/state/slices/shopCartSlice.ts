import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  ShopCartItem,
  ShopShippingAddress,
  ShopShippingMethod,
} from "@/src/types/shopProduct";
import {
  FREE_SHIPPING_THRESHOLD,
  MOCK_TAX_RATE,
  STANDARD_SHIPPING_PRICE,
} from "@/src/types/shopProduct";

export interface ShopCartState {
  items: ShopCartItem[];
  shippingMethod: ShopShippingMethod | null;
  checkedZip: string | null;
  address: ShopShippingAddress;
  lastOrderId: string | null;
}

const emptyAddress: ShopShippingAddress = {
  fullName: "",
  street: "",
  city: "",
  state: "",
  zip: "",
};

const initialState: ShopCartState = {
  items: [],
  shippingMethod: null,
  checkedZip: null,
  address: emptyAddress,
  lastOrderId: null,
};

const shopCartSlice = createSlice({
  name: "shopCart",
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{ productId: string; quantity?: number }>,
    ) => {
      const qty = Math.max(1, action.payload.quantity ?? 1);
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId,
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        state.items.push({
          productId: action.payload.productId,
          quantity: qty,
        });
      }
    },
    setCartItemQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) => {
      const qty = Math.max(0, action.payload.quantity);
      if (qty === 0) {
        state.items = state.items.filter(
          (i) => i.productId !== action.payload.productId,
        );
        return;
      }
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId,
      );
      if (existing) {
        existing.quantity = qty;
      } else {
        state.items.push({
          productId: action.payload.productId,
          quantity: qty,
        });
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
    seedBuyNow: (
      state,
      action: PayloadAction<{ productId: string; quantity?: number }>,
    ) => {
      state.items = [
        {
          productId: action.payload.productId,
          quantity: Math.max(1, action.payload.quantity ?? 1),
        },
      ];
    },
    setShippingMethod: (
      state,
      action: PayloadAction<ShopShippingMethod | null>,
    ) => {
      state.shippingMethod = action.payload;
    },
    setCheckedZip: (state, action: PayloadAction<string | null>) => {
      state.checkedZip = action.payload;
    },
    setShippingAddress: (
      state,
      action: PayloadAction<Partial<ShopShippingAddress>>,
    ) => {
      state.address = { ...state.address, ...action.payload };
    },
    setLastOrderId: (state, action: PayloadAction<string | null>) => {
      state.lastOrderId = action.payload;
    },
    resetShopCheckout: (state) => {
      state.shippingMethod = null;
      state.checkedZip = null;
      state.address = emptyAddress;
    },
  },
});

export const {
  addToCart,
  setCartItemQuantity,
  removeFromCart,
  clearCart,
  seedBuyNow,
  setShippingMethod,
  setCheckedZip,
  setShippingAddress,
  setLastOrderId,
  resetShopCheckout,
} = shopCartSlice.actions;

export function computeShippingCost(
  subtotal: number,
  method: ShopShippingMethod | null,
  productShippingPrice = STANDARD_SHIPPING_PRICE,
  freeOver = FREE_SHIPPING_THRESHOLD,
): number {
  if (!method || method === "local_pickup") return 0;
  if (method === "free_over") {
    return subtotal >= freeOver ? 0 : productShippingPrice;
  }
  return productShippingPrice;
}

export function computeOrderTotals(
  subtotal: number,
  method: ShopShippingMethod | null,
  productShippingPrice = STANDARD_SHIPPING_PRICE,
  freeOver = FREE_SHIPPING_THRESHOLD,
) {
  const shipping = computeShippingCost(
    subtotal,
    method,
    productShippingPrice,
    freeOver,
  );
  const tax = Math.round(subtotal * MOCK_TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  return { subtotal, shipping, tax, total };
}

export default shopCartSlice.reducer;
