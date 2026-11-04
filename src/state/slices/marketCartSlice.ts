import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  MarketCart,
  MarketCheckoutDraft,
} from "@/src/types/marketplace";
import { resetUser, setUser } from "@/src/state/slices/userSlice";

/**
 * Marketplace cart (saved on the account, so not persisted here) and the
 * group / Buy Now being checked out. Cleared on logout, login and mode switch.
 */
export interface MarketCartState {
  cart: MarketCart | null;
  /** Header badge: units across all seller groups. */
  itemCount: number;
  checkout: MarketCheckoutDraft | null;
  lastOrderId: string | null;
}

const initialState: MarketCartState = {
  cart: null,
  itemCount: 0,
  checkout: null,
  lastOrderId: null,
};

const marketCartSlice = createSlice({
  name: "marketCart",
  initialState,
  reducers: {
    setMarketCart: (state, action: PayloadAction<MarketCart | null>) => {
      state.cart = action.payload;
      state.itemCount = action.payload?.itemCount ?? 0;
    },
    setMarketCartCount: (state, action: PayloadAction<number>) => {
      state.itemCount = Math.max(0, action.payload);
    },
    setMarketCheckout: (
      state,
      action: PayloadAction<MarketCheckoutDraft | null>,
    ) => {
      state.checkout = action.payload;
    },
    setMarketLastOrderId: (state, action: PayloadAction<string | null>) => {
      state.lastOrderId = action.payload;
    },
    clearMarketCart: () => initialState,
  },
  extraReducers: (builder) => {
    // Another account must never see this cart. Mode switches dispatch
    // clearMarketCart themselves (userModeThunks): setActiveMode also fires
    // with an unchanged mode, which must not drop a checkout in progress.
    builder
      .addCase(resetUser, () => initialState)
      .addCase(setUser, () => initialState);
  },
});

export const {
  setMarketCart,
  setMarketCartCount,
  setMarketCheckout,
  setMarketLastOrderId,
  clearMarketCart,
} = marketCartSlice.actions;

export default marketCartSlice.reducer;
