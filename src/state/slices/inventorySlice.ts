import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  ShopDeliveryOptions,
  ShopProduct,
} from "@/src/types/shopProduct";

export interface InventoryState {
  products: ShopProduct[];
  /** Salon-level delivery options (owner). Null until fetched. */
  deliveryOptions: ShopDeliveryOptions | null;
}

const initialState: InventoryState = {
  products: [],
  deliveryOptions: null,
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    addProduct: (state, action: PayloadAction<ShopProduct>) => {
      state.products.unshift(action.payload);
    },
    updateProduct: (state, action: PayloadAction<ShopProduct>) => {
      const index = state.products.findIndex((p) => p.id === action.payload.id);
      if (index >= 0) {
        state.products[index] = action.payload;
      }
    },
    removeProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter((p) => p.id !== action.payload);
    },
    setProducts: (state, action: PayloadAction<ShopProduct[]>) => {
      state.products = action.payload;
    },
    setDeliveryOptions: (
      state,
      action: PayloadAction<ShopDeliveryOptions | null>,
    ) => {
      state.deliveryOptions = action.payload;
    },
    clearInventory: (state) => {
      state.products = [];
      state.deliveryOptions = null;
    },
  },
});

export const {
  addProduct,
  updateProduct,
  removeProduct,
  setProducts,
  setDeliveryOptions,
  clearInventory,
} = inventorySlice.actions;

export default inventorySlice.reducer;
