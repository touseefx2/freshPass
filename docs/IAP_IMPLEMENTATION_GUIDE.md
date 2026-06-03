# iOS In-App Purchase Implementation Guide

This guide documents what is now implemented in the app, what you need to configure in App Store Connect, and what backend APIs are required to complete the flow safely.

**Backend team — start here:**

- **[IAP Backend API Spec](./IAP_BACKEND_API_SPEC.md)** — Full request/response contract, errors, DB schema, webhooks (forward this to backend dev).
- **[IAP Backend Implementation Guide](./IAP_BACKEND_IMPLEMENTATION_GUIDE.md)** — Step-by-step Laravel-style implementation checklist and ticket text.

## What is implemented in frontend

- iOS purchase flow now uses Apple IAP for:
  - Business subscription purchase (`businessPlansModal`)
  - AI service unlock purchase (`tryOnPurchase`)
- Android and non-iOS flows still use existing Stripe implementation.
- Product ID resolution supports:
  1. `app_store_product_id` coming from backend payloads
  2. Environment fallback prefixes:
     - `EXPO_PUBLIC_IAP_BUSINESS_PLAN_PREFIX`
     - `EXPO_PUBLIC_IAP_AI_SERVICE_PREFIX`
- New shared service added: `src/services/iapService.ts`
- New backend endpoint reference added: `iapEndpoints.verify` (`/api/iap/verify`)

## Files changed

- `src/services/iapService.ts` (new)
- `src/services/endpoints.ts`
- `src/components/businessPlansModal.tsx`
- `app/(main)/tryOnPurchase/index.tsx`
- `src/state/slices/generalSlice.ts`

## App Store Connect setup (you must do this)

1. In App Store Connect, open your app.
2. Create In-App Purchases for all paid digital items:
   - Business plan products
   - AI feature products
3. Use product IDs that match one of the following:
   - Exact ID returned by backend (`app_store_product_id`)
   - Prefix-based fallback:
     - `${EXPO_PUBLIC_IAP_BUSINESS_PLAN_PREFIX}.${planId}`
     - `${EXPO_PUBLIC_IAP_AI_SERVICE_PREFIX}.${serviceId}`
4. Complete required metadata for each IAP:
   - Display name
   - Description
   - Price tier
   - Review screenshot
5. Submit each IAP for review (if required by your release flow).
6. Test with Sandbox test account on a real iOS device.

## Environment variables (frontend)

Add these to `.env` if you are not returning product IDs from API:

```bash
EXPO_PUBLIC_IAP_BUSINESS_PLAN_PREFIX=com.freshpass.business.plan
EXPO_PUBLIC_IAP_AI_SERVICE_PREFIX=com.freshpass.ai.service
```

If backend returns `app_store_product_id` for each item, these are optional.

## Backend tasks (must be done)

The app now posts IAP receipts to:

- `POST /api/iap/verify`

### Expected request payload

```json
{
  "productId": "com.freshpass.business.plan.1",
  "transactionId": "1000001234567890",
  "transactionReceipt": "<base64_receipt>",
  "originalTransactionId": "1000001234500000",
  "purchaseToken": "optional_for_ios",
  "kind": "business_subscription",
  "referenceId": 1
}
```

`kind` values:
- `business_subscription`
- `ai_service`

### Expected response payload

```json
{
  "success": true,
  "message": "Purchase verified",
  "data": {
    "ai_quota": 20,
    "has_subscription": true,
    "subscription_status": "active"
  }
}
```

### Backend responsibilities

1. Verify Apple receipt with Apple services (production + sandbox fallback).
2. Prevent duplicate processing using transaction identifiers.
3. Map `productId` to your internal plan/service.
4. Apply user entitlement updates:
   - business subscription state
   - AI quota increment/unlock
5. Return updated entitlement data in response.
6. Store transaction audit logs.
7. Implement App Store Server Notifications V2 webhook for renewal/cancel/refund events.

## Backend response enhancements recommended

Return `app_store_product_id` in these existing endpoints:

- `GET /api/subscription-plans`
- `GET /api/additional-services?type=customer|business`

This gives explicit product mapping and removes dependency on env prefix strategy.

## Testing checklist (iOS)

1. Open business plans modal on iOS.
2. Tap purchase button -> Apple payment sheet appears (not Stripe).
3. Complete sandbox purchase.
4. Confirm backend marks `has_subscription=true`.
5. Open AI try-on purchase screen.
6. Complete sandbox purchase.
7. Confirm `ai_quota` updates in app.
8. Cancel purchase and verify app handles gracefully.
9. Confirm Android still uses Stripe flow.

## App Review notes suggestion

Use this in App Review Information:

> On iOS, all paid digital subscriptions and AI unlock purchases are processed exclusively via Apple In-App Purchase. External payment methods are not used for in-app digital content purchases on iOS.

