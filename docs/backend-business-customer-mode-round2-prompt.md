# Backend task (round 2): business ↔ customer mode — fix everything from your audit

> **How to use this file:** give it to the backend developer, or paste it into the AI coding assistant working on the backend repo. It follows your audit of `backend-business-customer-mode-followups-prompt.md`, and it is **self-contained**: every contract and table you need is in this file.
>
> **This round is for building, not auditing.** Build every item in sections 3, 4 and 5. P0 → P1 → P2 is only the order of work, not a list of optional items. Also answer every question in section 6. Then reply using section 8, and write the frontend guide in section 9.

---

## 1. Where things are

The app side is built and was tested on **dev** on 2026-10-16. The test account was **user 365**, owner of **business 129**.

- Business and staff users switch by tapping the FreshPass logo, which calls `POST /api/user/mode`.
- In customer mode the app shows only customer screens: customer home, Explore, Appointments, Chat and Profile.
- The app sends `?mode=business|customer` on the notification list and unread count, **only for users with `can_switch_mode = true`**.
- When a push is tapped and its `data.mode` differs from the active mode, the app switches first, then opens it.

Your audit confirmed what the app sees:
1. **Notifications:** none of the 20+ `NotificationService::create()` call sites pass `mode`, so every row is `mode = null`. `scopeForMode` returns `null` rows in both modes, so **business notifications show in customer mode**. This is the bug the client is seeing.
2. **Data:** endpoints scope by `hasRole(...)`, not by mode. In customer mode, "My appointments" returns the **business's** appointments.
3. **Chat:** there's no way to separate business chats from customer chats.

---

## 2. Decisions (please build to these)

| Topic | Decision |
|---|---|
| **Who may switch to customer mode** | **Business owners must have finished onboarding** (`onboarding_completed = true`). A business **without a plan or without Stripe Connect may still switch**; those don't matter. Staff may always switch. Switching **back** to business is always allowed. Build it in P0-4. |
| Push while in customer mode | Keep sending every push whatever the active mode, as you do today. Each push carries `data.mode` (P0-1). Tapping it switches the app to that mode. |
| Affiliated owner booking the host business | Allowed. Keep `isOwnBusiness()` as it is. |
| Unfollow your own business | No guard needed. Letting someone unfollow is harmless. |
| Favourite | Follow and favourite are the same thing in the app, so **adding** a favourite needs the follow guard (P1-1). |
| Same-mode `POST /api/user/mode` | 200 is fine. |
| Profile | Shared across both modes. Fine as it is. |
| Staff | `staff->business_id` is their own business. Fine. |
| Account deletion | No backend change. The app adds a warning in customer mode. |

---

## 3. P0 — must ship before release

### P0-1 Notifications: tag every notification with `mode`, then backfill

**1. Tag at creation.** Pass `mode` at **every** `NotificationService::create()` call site. Use **the recipient's side in that event**, never their current `active_mode`.
- A new booking at the owner's business while the owner is browsing in customer mode is still `"business"`.
- The owner's own booking at another salon, made while they're in business mode, is still `"customer"`.

| `type` (`sub_type`) | `mode` |
|---|---|
| `auto_reel`, `reel_generation` | business |
| `business_reel` (comment / booking / likes), `business_follower` | business |
| `business_order` (`business_order_paid`, `business_order_refunded`), `business_product` (`product_low_stock`, `product_out_of_stock`) | business |
| `customer_subscription` (a customer bought the owner's membership), `manageSubscriptionList` | business |
| `appointment_outcomes` (`appointment_outcome_needed`, `appointment_outcome_summary`, …) | business |
| `availability`, `business_availability_sync`, `affiliation` (all sub types), `update_location`, `plan_upgraded`, `solo_switch` | business |
| `subscription` | business if it is about the business plan; customer if it is about a membership the user bought |
| `appointment` (scheduled, rescheduled, cancelled, reminder, completed, no_show, …) | **business** if the recipient is the business or staff on it; **customer** if the recipient is the person who booked |
| `appointment_checkout` (`appointment_checkout_failed`), `payment_request`, `review_request`, `tip_request`, `subscription_usage`, `membership_visit_restored` | customer |
| `order` (`order_shipped`, `order_ready_for_pickup`, `order_picked_up`, `order_cancelled`, …) | customer |
| `follow` (`follow_new_reel`, `follow_new_service`, `follow_new_membership`), `business`, `service` | customer |
| `message` (chat) | the recipient's side in that conversation (see P0-3) |
| `airequest`, `ai_memory` | the side whose AI balance paid for it |

For any type not in the table, use the same rule: which side of the event is the recipient on?

**2. Make it hard to forget.** Either make `mode` a required argument, or keep one `type/sub_type → mode` map inside `NotificationService` as the default. Then pass it explicitly only where it depends on the recipient (`appointment`, `message`, `subscription`, `airequest`, `ai_memory`).

**3. Push payload:** `data.mode` must always be the same value as the row.

**4. Backfill old rows.** Before this feature, Business and Staff accounts had no customer side, so every notification they already have is a business notification.

```sql
-- illustrative only; adjust names
UPDATE notifications n
JOIN users u ON u.id = n.user_id
SET n.mode = 'business'
WHERE n.mode IS NULL
  AND u.role IN ('Business', 'Staff');
```

**5. Unread count:** it already shares `scopeForMode` with the list, so no change is needed.

**Acceptance:** for user 365 in customer mode, `GET /api/notifications?mode=customer` returns no business types (no `auto_reel`, `business_*`, …), and `GET /api/notifications/unread-count?mode=customer` matches the list.

### P0-2 Data endpoints must follow the active mode, not the role

**Fix:**
- Add one place that answers "which side is this user acting as right now", for example `$user->actsAsCustomer()`. It is true for plain customers, and for Business/Staff when `isInCustomerMode()`.
- Use it instead of `hasRole(...)` **everywhere the role decides which data is returned or which action is allowed**.
- Search the whole codebase for `hasRole(UserRole::Business)`, `hasRole(UserRole::Staff)` and `hasRole(UserRole::Customer)`, plus role checks in policies, scopes and resources. List every place you change.

The app calls these in customer mode. Each must return the **customer** version for a Business/Staff user in customer mode, and keep returning the business version in business mode:

| App screen (customer mode) | Endpoint |
|---|---|
| Customer home "upcoming" card, Appointments tab | `GET /api/appointments` (every filter: `status`, `from_date`, `to_date`, `page`, …) |
| Appointment detail, cancel, reschedule, tip | `GET /api/appointments/{id}` and the customer actions on it. Allowed when the user is the **booking customer**. |
| My memberships | `GET /api/subscriptions` |
| Following / favourites | `GET /api/following`, `GET /api/favorites` |
| My orders | `GET /api/orders` (owners use `/api/orders/business`, which is separate and fine) |
| AI requests / AI transactions | `GET /api/ai-requests`, `GET /api/ai/transactions` |
| AI memories | `GET /api/memories` |

**Acceptance:** an owner books at another business while in customer mode.
- `GET /api/appointments` in customer mode returns **only that booking**.
- The same call in business mode returns **only their business's appointments**.
- The same holds for every row above.

### P0-3 Separate chat by mode

Your audit found:
- there's no conversations table (a conversation is an implicit user pair)
- `sender_mode` is written but never used or returned
- `GET /api/chat/unread-count` isn't scoped
- `potential-contacts` doesn't remove the user's own business.

Proposed design, which fits the user-pair model:

1. **Add `receiver_mode`** (nullable) to `chat_messages`, next to `sender_mode`.
2. **On send:**
   - `sender_mode` = the sender's acting side (plain customer → `customer`; Business/Staff → their `active_mode`, or `business` if it is null).
   - `receiver_mode` = the opposite side (`customer` → `business`, `business` → `customer`).
   - Chat between two people of the **same business** (owner ↔ staff), if it exists: both `business`.
3. **Which side a message belongs to:** for user U, a message is on side S if (`sender_id = U` and `sender_mode = S`) or (`receiver_id = U` and `receiver_mode = S`). A conversation is the pair **(the other user, the viewer's side)**.
4. **Filter by the viewer's current side** on `GET /api/chat/contacts`, the messages of a conversation, `GET /api/chat/unread-count`, mark as read, and `GET /api/chat/potential-contacts`.
5. **Old rows** (both modes null) — backfill them by role:
   - sender is Business/Staff → `sender_mode = 'business'`; sender is a customer → `'customer'`
   - the same rule for `receiver_mode` by the receiver's role.
6. **Own business:** in customer mode, sending a message to your own business's owner or staff returns 403, with the same message as the other own-business 403s. Remove your own business from `potential-contacts`.
7. **Return both fields** (`sender_mode`, `receiver_mode`) on message resources and in the `.message.sent` socket payload.

A real conversations table with a `mode` column is fine too. Either way, **put the final message fields and socket payload in your reply before you build**.

**Acceptance:** owner A (business X) messages business B in customer mode. That conversation appears in A's chat list **only in customer mode**, and in B's list **only in business mode**. Each side's unread count only counts its own side.

### P0-4 Onboarding gate for switching to customer mode (new)

This builds the decision in section 2:

- For a **Business** whose onboarding isn't complete: `can_switch_mode = false` on `GET /api/user/details` and `can_switch = false` on `GET /api/user/mode`.
- `POST /api/user/mode` with `mode = customer` returns **403** with a clear message, for example `"Finish setting up your business to use customer mode."`, and an `error_code` such as `onboarding_incomplete`.
- As soon as onboarding completes, `can_switch_mode` becomes `true`.
- A missing **plan** or **Stripe Connect** must **not** block it.
- `POST /api/user/mode` with `mode = business` is **always** allowed, so nobody is stuck in customer mode.
- **Staff:** no change.

The app already hides the switch until onboarding is complete. This is the server-side guarantee.

---

## 4. P1 — build right after P0

**P1-1 Own-business guards.** Add the guard to:
- `createAppointmentCardSetup()` (`POST /api/appointments/card-setup`)
- **adding** a favourite (`toggleFavorite()` when it adds).

Unfollow stays unguarded. On every guarded endpoint, the 403 must stay **before** any Stripe PaymentIntent or SetupIntent is created, as it is today.

**P1-2 Mode fields on email login and registration.** `POST /api/login` and `POST /api/register` must return `active_mode`, `can_switch_mode` and `customer_ai_quota` on `user`. Social login already does this through `UserResource`; use the same resource.

**P1-3 `mark-all-read` by mode.**

```
POST /api/notifications/mark-all-read?mode=customer
```

| `mode` | Rows to mark `is_read = true` |
|---|---|
| `business` | `mode = 'business'` or `mode IS NULL` |
| `customer` | `mode = 'customer'` or `mode IS NULL` |
| not sent | all rows (older app versions and plain customers, same as today) |

The response stays the same. An optional `updated_count` is welcome. Afterwards, `unread-count?mode=X` returns 0 for that mode.

**P1-4 `business_id` on products.** Add `business_id` to `ProductResource`, everywhere products appear: reels feed product tags, product by id, and product lists. Without it, the app can't stop an owner from opening "Buy" on their own product.

**P1-5 `mode.changed` socket event.** Broadcast it from `switchMode()` on the channel chat already uses.

| | |
|---|---|
| Channel | `private-users.{user_id}` (where `.message.sent` and `messages.read` already go) |
| Event name | `mode.changed` (the app listens for `.mode.changed`) |
| When | Right after every successful `POST /api/user/mode`, including from the same device |

```json
{
  "active_mode": "customer",
  "ai_quota": 0,
  "can_switch": true,
  "changed_at": "2026-10-16T00:38:27Z"
}
```

`ai_quota` is the balance of the new mode, the same as in the `POST /api/user/mode` response.

**P1-6 AI credits go to the mode the purchase started in.** Today credits go to the mode active **when they are granted**. A Stripe webhook that runs after a switch, or an Apple recovery verify on a later launch, therefore credits the wrong balance.

Add an optional `mode` to both purchase calls:

| Purchase | Endpoint | New body |
|---|---|---|
| AI credits, Stripe | `POST /api/payment-sheet/ai-tools` | `{ "service_id": 12, "mode": "customer" }` |
| AI credits, Apple IAP | `POST /api/iap/apple/verify` | `{ "transaction_id": "2000000…", "mode": "customer" }` |

- **Stripe:** save `mode` on the PaymentIntent metadata or the payment record when the payment sheet is created. The webhook credits **that** mode.
- **Apple:** credit the `mode` in the body. The app sends the mode the purchase started in, including on a recovery verify. A `transaction_id` that is verified twice is credited once.
- **`mode` missing** (older app versions, plain customers): use the active mode, as today.
- Keep the current response fields, and add the credited `mode` next to the **new balance of that mode**.
- Business plan purchases (`POST /api/iap/apple/verify/business-subscription`) are business-only and need no `mode`.

**P1-7 Background jobs charge the mode they were created in.** When a job that spends AI credits is created (auto reels, template reels, AI requests), store the mode on it. When it runs, charge that mode, not whatever mode the user is in at that moment.

---

## 5. P2 — build after P1

**P2-1 `is_own_business`.** Add `is_own_business: true|false` for the logged-in user on business resources:
- `GET /api/business/details`
- `GET /api/businesses` (all list types)
- the explore and deals lists
- the business inside `GET /api/reels/feed`.

**P2-2 Business-only actions in customer mode.** The RBAC middleware skips every role check in customer mode, so business-only endpoints still work there. Return 403 in customer mode for business-only **write** actions: creating reels or auto reels, managing staff, services, plans and products, and business orders. Otherwise a business AI feature could charge the **customer** balance. The app already hides these screens in customer mode.

**P2-3 Who an action is shown as.** Reviews, follows, reel comments and reel likes made in customer mode must show the **person** (their name and photo), not their business. They must not count toward their own business's numbers (followers, ratings).

---

## 6. Unanswered or unclear in your audit — answer each, and fix where it applies

1. **Notification backfill:** your audit didn't mention it. Will you run it, and when on dev and on production?
2. **Type → mode table (P0-1):** do you agree with every row? Send corrections for any type that should go to the other side or is missing.
3. **Push payload `mode`:** where does `data.mode` in a push come from today? If it's read from the row, it is `null` everywhere right now. Confirm it will match the row after P0-1.
4. **Full `hasRole` list (P0-2):** you wrote "the same applies to other endpoints". List every endpoint whose data or permission depends on the role, so we know P0-2 covers all of them, not only the ones in the table.
5. **Business-only endpoints reachable in customer mode (P2-2):** you wrote "needs verification". List which ones work in customer mode today, and fix them as P2-2.
6. **Who an action is shown as in business mode (P2-3):** you wrote "needs verification". Today, when the owner reviews, comments or likes in **business** mode, is it shown as the person or as the business?
7. **Contracts (P1-3, P1-5, P1-6):** confirm you'll build them exactly as written. If not, send the final JSON before building.
8. **`business.id` on `/api/user/details` in customer mode:** confirm it stays. The app's own-business check depends on it.
9. **Chat socket payload:** does `.message.sent` carry any mode today? After P0-3 it must carry `sender_mode` and `receiver_mode`.
10. **Onboarding gate (P0-4):** confirm the exact 403 message and `error_code`.
11. **Estimates:** your audit had no Will do / ETA. Give an estimate for each item in sections 3, 4 and 5.

---

## 7. Already right — please keep

- `GET /api/user/details` returns `business.id` in customer mode.
- On every guarded endpoint, the own-business 403 runs **before** any PaymentIntent or SetupIntent is created.
- `/api/user/status` returns the slim shape in customer mode, for owners and staff.
- The notification list and unread count share `scopeForMode`.
- Push notifications are sent whatever the active mode.

---

## 8. Reply format

Reply once, numbered like this file (P0-1 … P2-3, then 1–11 from section 6). For each item:

- **Done**: what changed. Include a sample JSON for any new or changed field, endpoint or event.
- **Blocked / needs a decision**: what you need from us.
- **Won't do**: why.

For **P0-3**, send the final message fields and socket payload **before** building.

---

## 9. When it's done: write the frontend guide

When everything above is built, **read your latest code (not this prompt)** and write `docs/business-customer-mode-app-changes-v2.md` for the React Native developer. Use the same style as your first guide, `business-customer-mode-app-changes.md`. It must include:

1. **Status of every item:** P0-1 … P2-3 and the 11 questions, each marked **Done**, **Not done** or **Won't do**, with one line on what changed.
2. **Every endpoint touched:** method, path, auth, query and body, and a full request and response example. Use real JSON from dev, not made-up values. List each field with its type, whether it can be null, and what it means. At least:
   - `GET /api/notifications`, `GET /api/notifications/unread-count` and `POST /api/notifications/mark-all-read`, with `mode`
   - the `user` object from email login, social login and registration
   - `GET` and `POST /api/user/mode`, including the onboarding 403
   - the role-scoped endpoints from P0-2, in customer mode and in business mode
   - chat contacts, messages, unread count and potential contacts
   - product and business objects with `business_id` / `is_own_business`
   - `POST /api/payment-sheet/ai-tools` and `POST /api/iap/apple/verify`, with `mode`
3. **Notification modes:** the final type → mode table as built, one push payload example for a business notification and one for a customer notification, and when the backfill ran on dev and on production.
4. **Chat:** the final message fields, how a conversation's side is decided, and the `.message.sent` payload.
5. **The socket event:** the channel, the exact event name the app must listen for (with or without the leading dot), a payload example, and when it fires.
6. **Own-business 403:** the final list of endpoints, with the status, exact message and `error_code` for each.
7. **AI credits:** which balance each purchase, each AI feature and each background job uses, and the response fields after crediting.
8. **Every error:** HTTP status, exact message and `error_code` for each new or changed behaviour. That includes own business (403), the onboarding gate (403), a plain customer trying to switch (403), and an invalid `mode` (422).
9. **Every `hasRole` place changed for P0-2.**
10. **Backward compatibility:** what older app versions get when they send no `mode` anywhere.
11. **How to test on dev:** test accounts (one onboarded business, one business still onboarding, one staff, one plain customer); how to create a business notification and a customer notification; how to trigger the socket event; Apple sandbox steps for a credit purchase.
12. **Deployment status and known limits:** what is live on dev and on production, and anything left for later.
