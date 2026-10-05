import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  ShopProduct,
  ShopShippingAddress,
  ShopShippingMethod,
} from "@/src/types/shopProduct";

/**
 * Customer product purchase. The product comes from the reel feed
 * (`reel.product`), so customers never read the owner's inventory.
 */
export interface ShopCartState {
  product: ShopProduct | null;
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
  quantity: 1,
  shippingMethod: null,
  address: emptyAddress,
  lastOrderId: null,
};

const shopCartSlice = createSlice({
  name: "shopCart",
  initialState,
  reducers: {
    setShopProduct: (state, action: PayloadAction<ShopProduct>) => {
      if (state.product?.id !== action.payload.id) {
        state.quantity = 1;
        state.shippingMethod = null;
      }
      state.product = action.payload;
    },
    setShopQuantity: (state, action: PayloadAction<number>) => {
      state.quantity = Math.max(1, action.payload);
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
      state.quantity = 1;
      state.shippingMethod = null;
    },
  },
});

export const {
  setShopProduct,
  setShopQuantity,
  setShippingMethod,
  setShippingAddress,
  setLastOrderId,
  resetShopCheckout,
} = shopCartSlice.actions;

export default shopCartSlice.reducer;
