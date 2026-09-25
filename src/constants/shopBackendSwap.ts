/**
 * Product shop / inventory — frontend-only until backend MD is provided.
 *
 * BACKEND_SWAP checklist (search codebase for "BACKEND_SWAP"):
 * 1. src/constants/demoShopProduct.ts — STATIC_DEMO_PRODUCT
 * 2. app/(main)/reelsFeed/index.tsx — shopProduct = STATIC_DEMO_PRODUCT
 * 3. src/state/slices/inventorySlice.ts — setProducts / CRUD actions
 * 4. addProduct.tsx / editProduct.tsx — POST/PUT after form submit
 * 5. app/(main)/shop/checkout.tsx — placeOrder → order API + Stripe
 * 6. src/utils/shopProductHelpers.ts — resolveShopProduct
 */
export {};
