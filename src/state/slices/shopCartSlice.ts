import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  ShopProduct,
  ShopShippingAddress,
  ShopShippingMethod,
} from "@/src/types/shopProduct";
import {
  MAX_PRODUCT_QUANTITY,
  normalizeShopProduct,
} from "@/src/utils/shopProductHelpers";

/**
 * Customer product purchase. The product comes from the reel feed
 * (`reel.product`), so customers never read the owner's inventory.
 */
export interface ShopCartState {
  product: ShopProduct | null;
  /** Chosen option (colour / model); required at checkout when the product has options. */
  variantId: number | null;
  quantity: number;
  shippingMethod: ShopShippingMethod | null;
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
  product: null,
  variantId: null,
  quantity: 1,
  shippingMethod: null,
  address: emptyAddress,
  lastOrderId: null,
};

const shopCartSlice = createSlice({
  name: "shopCart",
  initialState,
  reducers: {
    // The reel feed's `product` may predate the Marketplace fields — normalize
    // so screens always get images / variants / price / inStock.
    setShopProduct: {
      reducer: (state, action: PayloadAction<ShopProduct>) => {
        if (String(state.product?.id) !== String(action.payload.id)) {
          state.quantity = 1;
          state.shippingMethod = null;
          state.variantId = null;
        }
        state.product = action.payload;
      },
      prepare: (product: ShopProduct) => ({
        payload: normalizeShopProduct(product),
      }),
    },
    setShopVariant: (state, action: PayloadAction<number | null>) => {
      state.variantId = action.payload;
    },
    setShopQuantity: (state, action: PayloadAction<number>) => {
      state.quantity = Math.min(
        MAX_PRODUCT_QUANTITY,
        Math.max(1, Math.floor(action.payload) || 1),
      );
    },
    setShippingMethod: (
      state,
      action: PayloadAction<ShopShippingMethod | null>,
    ) => {
      state.shippingMethod = action.payload;
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
      state.product = null;
      state.variantId = null;
      state.quantity = 1;
      state.shippingMethod = null;
    },
  },
});

export const {
  setShopProduct,
  setShopVariant,
  setShopQuantity,
  setShippingMethod,
  setShippingAddress,
  setLastOrderId,
  resetShopCheckout,
} = shopCartSlice.actions;

export default shopCartSlice.reducer;
