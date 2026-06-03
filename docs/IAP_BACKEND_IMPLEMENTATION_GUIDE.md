# FreshPass — Backend Implementation Guide (Apple IAP)

**Purpose:** Step-by-step instructions for backend developers to implement Apple In-App Purchase support so the iOS app can pass App Store review.

**Related docs:**

- API contract (field-level): [`IAP_BACKEND_API_SPEC.md`](./IAP_BACKEND_API_SPEC.md)
- Mobile / App Store Connect setup: [`IAP_IMPLEMENTATION_GUIDE.md`](./IAP_IMPLEMENTATION_GUIDE.md)

---

## What you are building (summary)

| # | Deliverable | Priority |
|---|-------------|----------|
| 1 | `POST /api/iap/verify` | **P0 — blocking** |
| 2 | DB table `iap_transactions` (idempotency + audit) | **P0** |
| 3 | Product mapping (`app_store_product_id` on plans/services OR mapping table) | **P0** |
| 4 | Entitlement updates (same as Stripe success paths) | **P0** |
| 5 | `POST /api/iap/apple-webhook` (Server Notifications V2) | **P1 — before production scale** |
| 6 | Admin/support view of IAP transactions | P2 |

Until **#1–#4** are deployed to staging, the iOS app purchase button will fail after Apple payment.

---

## Step 1 — Align with existing Stripe flows

Do **not** invent new business rules. Reuse logic from:

| Existing endpoint | IAP equivalent |
|-------------------|----------------|
| `POST /api/payment-sheet` with `subscription_plan_id` | `kind = business_subscription`, `referenceId = plan id` |
| `POST /api/payment-sheet/ai-tools` with `service_id` | `kind = ai_service`, `referenceId = service id` |

**Action items:**

1. Find the controller/service that runs **after Stripe payment succeeds** for business subscription.
2. Extract that into a shared method, e.g. `SubscriptionService::activatePlanForUser($user, $planId, $provider, $externalId)`.
3. Find AI payment success handler that increments `ai_quota`.
4. Extract e.g. `AiQuotaService::grantFromAdditionalService($user, $serviceId, $provider, $transactionId)`.
5. Call these from both Stripe webhooks/intents **and** `IapVerifyController`.

---

## Step 2 — Database migration

### `iap_transactions`

```sql
CREATE TABLE iap_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(32) NOT NULL,
  reference_id BIGINT UNSIGNED NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  original_transaction_id VARCHAR(255) NULL,
  environment VARCHAR(16) NOT NULL DEFAULT 'Production',
  status VARCHAR(32) NOT NULL DEFAULT 'verified',
  raw_payload JSON NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_iap_transaction_id (transaction_id),
  KEY idx_iap_user_id (user_id),
  KEY idx_iap_original_tx (original_transaction_id)
);
```

### Add columns to catalog tables (recommended)

```sql
ALTER TABLE subscription_plans
  ADD COLUMN app_store_product_id VARCHAR(255) NULL AFTER price;

ALTER TABLE additional_services
  ADD COLUMN app_store_product_id VARCHAR(255) NULL AFTER price;
```

Populate `app_store_product_id` to match App Store Connect SKUs (coordinate with mobile/product owner).

---

## Step 3 — Implement `POST /api/iap/verify`

### Route (Laravel example)

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/iap/verify', [IapController::class, 'verify']);
});
```

### Validation rules

```php
[
    'productId' => 'required|string|max:255',
    'transactionId' => 'required|string|max:255',
    'transactionReceipt' => 'required|string',
    'originalTransactionId' => 'nullable|string|max:255',
    'purchaseToken' => 'nullable|string|max:255',
    'kind' => 'required|in:business_subscription,ai_service',
    'referenceId' => 'required|integer|min:1',
]
```

### Controller flow (pseudocode)

```text
1. Validate request
2. user = auth()->user()
3. If iap_transactions exists where transaction_id = input.transactionId:
     - If status = verified → return 200 success + current entitlements (idempotent)
     - If status = failed → return 422 (or retry verify if appropriate)
4. appleResult = AppleReceiptService::verify(
       transactionId, transactionReceipt, productId
   )
5. If appleResult.bundleId != 'com.freshpass' → 422
6. If appleResult.productId != input.productId → 422
7. mapping = resolve productId + kind + referenceId (must match DB)
8. DB::transaction:
     a. Insert iap_transactions (verified)
     b. Switch kind:
        - business_subscription → activatePlanForUser(...)
        - ai_service → grantAiQuota(...)
9. Return JSON success + data (ai_quota / has_subscription / subscription_status)
```

### Response builder examples

**After `ai_service`:**

```php
return response()->json([
    'success' => true,
    'message' => 'Purchase verified',
    'data' => [
        'ai_quota' => $user->fresh()->ai_quota,
    ],
]);
```

**After `business_subscription`:**

```php
$status = $business->subscription_status; // e.g. active
return response()->json([
    'success' => true,
    'message' => 'Purchase verified',
    'data' => [
        'has_subscription' => true,
        'subscription_status' => $status,
    ],
]);
```

---

## Step 4 — Apple verification service

### Recommended: App Store Server API

1. App Store Connect → Users and Access → Integrations → In-App Purchase → generate key.
2. Install a maintained client or use Guzzle with JWT (ES256).
3. Call `GET https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}`  
   Sandbox: `https://api.storekit-sandbox.itunes.apple.com/...`
4. Decode signed transaction; check `bundleId`, `productId`, `expiresDate` (subscriptions).

### Fallback: verifyReceipt

If the client sends a classic app receipt (base64):

1. POST to Apple verifyReceipt URL with `password` = shared secret.
2. Handle status codes `0`, `21007` (sandbox redirect).

Create one class `AppleIapVerifier` with a single public method:

```php
public function verify(string $transactionId, string $receipt, string $expectedProductId): AppleVerificationResult
```

---

## Step 5 — Product ID resolution

Priority order:

1. `subscription_plans.app_store_product_id` where `id = referenceId` and `kind = business_subscription`
2. `additional_services.app_store_product_id` where `id = referenceId` and `kind = ai_service`
3. Optional `iap_product_mappings` table

If `input.productId !== db.app_store_product_id`, return **422** with message `Product does not match selected plan`.

**Prefix fallback (if DB column empty):** Mobile may use env prefixes:

- `com.freshpass.business.plan.{planId}`
- `com.freshpass.ai.service.{serviceId}`

Backend should either store exact SKUs in DB or implement the same prefix rule in config for consistency.

---

## Step 6 — Webhook (P1)

### Route

```php
Route::post('/iap/apple-webhook', [IapWebhookController::class, 'handleApple']);
// No auth middleware — Apple calls this; verify JWS instead
```

### Steps

1. Read raw body; parse `signedPayload` (notification V2).
2. Verify signature chain per Apple documentation.
3. Switch on `notificationType` + `subtype`.
4. Update subscription state for `originalTransactionId` linked in `iap_transactions`.
5. Return HTTP 200 quickly; queue heavy work.

This keeps `has_subscription` accurate when users cancel in iPhone Settings.

---

## Step 7 — Update existing GET APIs

### `GET /api/subscription-plans`

Include in each item:

```php
'app_store_product_id' => $plan->app_store_product_id,
```

### `GET /api/additional-services`

Include:

```php
'app_store_product_id' => $service->app_store_product_id,
```

### `GET /api/user/status`

No change required if verify endpoint already updates the same underlying tables this endpoint reads.

---

## Step 8 — Security checklist

- [ ] Never trust client-only; always verify with Apple servers
- [ ] Unique index on `transaction_id`
- [ ] Authenticated user only; business subscription applies to user’s business
- [ ] Do not log full receipt in production logs (PII / size)
- [ ] Rate limit `POST /api/iap/verify` per user (e.g. 10/min)
- [ ] Webhook endpoint: verify Apple signature, not Bearer token

---

## Step 9 — Staging test plan (with mobile team)

1. Mobile creates Sandbox tester in App Store Connect.
2. Backend staging uses **sandbox** Apple API URLs.
3. Purchase business plan on iOS → confirm:
   - Row in `iap_transactions`
   - `has_subscription = true` on status endpoint
4. Purchase AI pack → confirm `ai_quota` increased once.
5. Replay same `transactionId` → same quota, no duplicate grant.
6. Android purchase still works via Stripe (regression).

---

## Step 10 — Deployment order

1. Deploy migration + `app_store_product_id` columns (nullable OK).
2. Deploy `POST /api/iap/verify` to **staging**.
3. Product owner fills SKUs in DB matching App Store Connect.
4. Mobile QA on TestFlight/staging build.
5. Deploy webhook to production.
6. Deploy API to production before or with iOS build that enables IAP.

---

## Copy-paste message for backend ticket

**Title:** Implement Apple IAP verify API for iOS App Store compliance

**Description:**

iOS app now sends Apple purchases to `POST /api/iap/verify` instead of Stripe. Implement receipt verification with Apple, idempotent `iap_transactions` table, and reuse existing Stripe success logic for:

- `kind=business_subscription` + `referenceId=subscription_plan_id`
- `kind=ai_service` + `referenceId=additional_service_id`

Return `data.ai_quota` or `data.has_subscription` + `data.subscription_status` per spec in `docs/IAP_BACKEND_API_SPEC.md`. Add `app_store_product_id` to subscription plans and additional services APIs. P1: App Store Server Notifications V2 webhook.

**Acceptance criteria:**

- Sandbox purchase activates subscription / AI quota
- Duplicate transaction does not double-grant
- Response matches mobile contract in IAP_BACKEND_API_SPEC.md

---

## Questions for product / mobile (resolve before go-live)

1. Exact App Store product IDs for each plan and AI pack?
2. Are business plan add-ons (featured listing) sold via IAP or removed on iOS?
3. Subscription free trial on iOS — same duration as Stripe trial?
4. Single AI product or multiple credit packs?

---

## File reference (mobile repo)

| File | Role |
|------|------|
| `src/services/iapService.ts` | Calls `POST /api/iap/verify` |
| `src/services/endpoints.ts` | `iapEndpoints.verify` |
| `src/components/businessPlansModal.tsx` | Business IAP on iOS |
| `app/(main)/tryOnPurchase/index.tsx` | AI IAP on iOS |
