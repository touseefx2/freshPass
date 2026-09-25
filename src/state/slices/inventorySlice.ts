import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ShopProduct } from "@/src/types/shopProduct";

export interface InventoryState {
  products: ShopProduct[];
}

const initialState: InventoryState = {
  products: [],
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
      // BACKEND_SWAP: replace local list with API response
      state.products = action.payload;
    },
    clearInventory: (state) => {
      state.products = [];
    },
  },
});

export const {
  addProduct,
  updateProduct,
  removeProduct,
  setProducts,
  clearInventory,
} = inventorySlice.actions;

export default inventorySlice.reducer;
