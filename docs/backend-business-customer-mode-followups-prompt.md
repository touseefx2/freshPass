# Backend task: business ↔ customer mode — fixes and questions after app integration

> **How to use this file:** give it to the backend developer, or paste it into the AI coding assistant working on the backend repo. First read your own guide, `business-customer-mode-app-changes.md`, and the notification, chat, booking, checkout and IAP code. Then go through every numbered item below. For each one, either fix it or reply using the format in section 6. **Section 7 is the last step:** once everything is fixed or answered, write a detailed guide for the frontend developer.

---

## 1. Where the app is now

The app side of mode switching is built and was tested on **dev** on 2026-10-16. The test account was **user 365**, owner of **business 129**.

- Business and staff users switch by tapping the FreshPass logo. The app calls `POST /api/user/mode`, then refreshes `GET /api/user/details`, the notification unread count and the chat inbox.
- While in customer mode the app treats the user exactly like a customer: customer tabs, customer home, Explore, customer chat and customer bookings.
- The app sends `?mode=business|customer` on `GET /api/notifications` and `GET /api/notifications/unread-count`. It sends it **only when `can_switch_mode` is true**; plain customers send nothing.
- When a push notification is tapped and its `data.mode` differs from the active mode, the app calls `POST /api/user/mode` first, then opens the notification.
- On your own business page in customer mode, the app turns off Book, Review, Follow and Membership.

**Already working on dev (no change needed):**

- `GET` and `POST /api/user/mode` return the documented shapes.
- `GET /api/user/details` returns `active_mode`, `can_switch_mode` and `customer_ai_quota`. In customer mode it **still returns `business.id`** (129), which the app relies on for the own-business check. Please keep it.
- `?mode=` is accepted on both notification endpoints.

---

## 2. Bug: business notifications show in customer mode (must fix)

**What happens:** a business owner switches to customer mode and opens Notifications. All their business notifications are listed.

**Evidence from the dev logs (2026-10-16 00:38):**

- Request: `GET /api/notifications?page=1&per_page=16&mode=customer`
- The response had 11 items, all `"type": "auto_reel"` and all `"mode": null`.
- `created_at` ran from `2026-10-15T17:30:07Z` to `2026-10-15T19:24:50Z`, so these are recent rows, not old ones.

Rows with `mode = null` are returned in both modes, as your guide says. So everything untagged shows up in customer mode.

### 2.1 Tag every new notification with `mode`

When the row is created, set `mode` to **the recipient's side in that event**.

- **Do not use the recipient's current `active_mode` when the notification is sent.**
- Example: a new booking at the owner's business while the owner is browsing in customer mode is still `"business"`.
- Example: the owner books at another salon while in business mode; that confirmation is still `"customer"`.

Put the same value in the push payload as `data.mode`.

These are the types the app handles, and the mode we expect for each:

| `type` (`sub_type`) | `mode` |
|---|---|
| `auto_reel`, `reel_generation` | business |
| `business_reel` (comment / booking / likes), `business_follower` | business |
| `business_order` (`business_order_paid`, `business_order_refunded`), `business_product` (`product_low_stock`, `product_out_of_stock`) | business |
| `customer_subscription` (a customer bought the owner's membership), `manageSubscriptionList` | business |
| `appointment_outcomes` (`appointment_outcome_needed`, `appointment_outcome_summary`, …) | business |
| `availability`, `business_availability_sync`, `affiliation` (all sub types), `update_location`, `plan_upgraded`, `solo_switch` | business |
| `subscription` | business if it is about the business plan; customer if it is about a membership the user bought |
| `appointment` (scheduled, rescheduled, cancelled, reminder, completed, no_show, …) | **business** if the recipient is the business or staff on that appointment; **customer** if the recipient is the person who booked |
| `appointment_checkout` (`appointment_checkout_failed`), `payment_request`, `review_request`, `tip_request`, `subscription_usage`, `membership_visit_restored` | customer |
| `order` (`order_shipped`, `order_ready_for_pickup`, `order_picked_up`, `order_cancelled`, …) | customer |
| `follow` (`follow_new_reel`, `follow_new_service`, `follow_new_membership`), `business`, `service` | customer |
| `message` (chat) | the recipient's side in that conversation (the same side `GET /api/chat/contacts` would list it under) |
| `airequest`, `ai_memory` | the side whose AI balance paid for it |

If a type isn't in this table, apply the same rule: whose side of the event is the recipient on?

### 2.2 Backfill old rows

Before this feature, Business and Staff accounts had **no customer side**. So every notification they already have is a business notification.

```sql
-- illustrative only; adjust table/column names
UPDATE notifications n
JOIN users u ON u.id = n.user_id
SET n.mode = 'business'
WHERE n.mode IS NULL
  AND u.role IN ('Business', 'Staff');
```

Customer accounts can stay `null` or be set to `'customer'`. The app doesn't send `?mode=` for them, so either works.

### 2.3 Keep `unread-count` consistent

`GET /api/notifications/unread-count?mode=X` must count exactly the rows that `GET /api/notifications?mode=X` returns. Otherwise the badge won't match the list.

**Acceptance check:** for user 365 in customer mode, `GET /api/notifications?mode=customer` returns no business-type rows (no `auto_reel`, `business_*`, and so on) and `unread-count?mode=customer` matches.

---

## 3. Own-business blocking: put the 403 on the endpoints the app actually calls (must check)

Your guide lists `POST /api/appointments`, `POST /api/reviews`, `POST /api/follows`, "checkout endpoints" and "tip payment endpoint". The app calls the endpoints below. Each one must return `403 "This action is not available for your own business."` for a Business/Staff user in customer mode when the target is their own business.

| Flow in the app | Endpoint the app calls |
|---|---|
| Book (pay later) | `POST /api/appointments` |
| Book (pay now). This creates the Stripe payment sheet **before** the appointment exists | `POST /api/appointments/checkout` |
| Save a card for booking | `POST /api/appointments/card-setup` (if it is tied to a business) |
| Buy a membership | `POST /api/payment-sheet` with `subscription_plan_id` |
| Buy a product | `POST /api/payment-sheet/product-checkout` |
| Tip | `POST /api/appointments/{id}/tip/payment-sheet` |
| Review | `POST /api/reviews` |
| Follow / favourite | `POST` / `DELETE /api/businesses/{id}/follow` and `/api/businesses/{id}/favorite` |

**Important:** the 403 must happen **before any Stripe PaymentIntent or SetupIntent is created**. The user must never be charged and then have the booking rejected later in the webhook.

"Own business" means:
- **Owner:** their `business_id`.
- **Staff:** the business they work at.

Please also confirm whether an owner who is **affiliated** with a host business (`working_with_business_id`) may book that host business in customer mode. Right now the app only blocks the owner's own `business_id`.

---

## 4. Changes we need (so the app can do this properly)

**4.1 Mode fields on login responses.** Please add `active_mode`, `can_switch_mode` and `customer_ai_quota` to the `user` object returned by:
- email login
- social login (Google, Apple and Facebook)
- registration

The app already reads these fields if they are there. **Why:** today, a user who logged out in customer mode logs back in to the business home for a moment. The app only moves to customer mode after `/api/user/status` comes back.

**4.2 Business id on products (needed) and `is_own_business` (nice to have).**

- **Needed:** please add `business_id` to every **product** object: the reels feed product tags, `GET` product by id, and product lists. Products carry no business id today. Without it, the app can't stop an owner from opening "Buy" on their own product; only your 403 catches it.
- **Nice to have:** `is_own_business: true|false` (for the logged-in user) on business objects: `GET /api/business/details`, `GET /api/businesses` (all list types), explore / deals lists, and the business inside `GET /api/reels/feed`. For bookings and memberships, the app already blocks your own business by comparing ids, so this flag would only make that simpler.

**4.3 `mark-all-read` by mode (needed).**

Today the app calls `POST /api/notifications/mark-all-read` with no mode. In customer mode that marks the business notifications as read too, even though the user never saw them.

Contract:

```
POST /api/notifications/mark-all-read?mode=customer
```

| `mode` | Rows to mark `is_read = true` |
|---|---|
| `business` | `mode = 'business'` or `mode IS NULL` |
| `customer` | `mode = 'customer'` or `mode IS NULL` |
| not sent | all rows (older app versions and plain customers, same as today) |

The response stays the same. An optional `updated_count` is welcome. Afterwards, `GET /api/notifications/unread-count?mode=X` must return 0 for that mode.

The app will send `?mode=` only for users with `can_switch_mode = true`, the same rule it uses for the list and the unread count.

**4.4 Chat unread count by mode.** Is `GET /api/chat/unread-count` scoped to the active mode the way `/api/chat/contacts` is? If not, please scope it. Otherwise the chat badge counts the other mode's conversations.

Please also confirm that sending a message and fetching a conversation's messages are scoped to the right side.

**Old conversations** (created before this feature) have the same problem as old notifications. If they have no mode or side, they may show in customer mode, or disappear from business mode. For Business/Staff users, every conversation from before this feature is a business conversation. Please treat or backfill them that way, and tell us how they are stored.

**4.5 Block chat with your own business.** In customer mode, starting a chat with your own business should be blocked (403). It should also not appear in `potential-contacts`. The app will hide Chat and Call on your own business page as well.

**4.6 Tell the user's other devices when the mode changes (needed).**

The mode is per user, so switching on phone A also switches phone B on the server. Phone B doesn't find out until it next loads user details. Until then it shows the old mode's screens, while the server answers chat, notifications and bookings for the new mode.

Contract — broadcast on the private channel the app already listens to for chat (`users.{id}`, where `.message.sent` arrives today):

| | |
|---|---|
| Channel | `private-users.{user_id}` |
| Event name | `mode.changed` (the app listens for `.mode.changed`) |
| When | Right after `POST /api/user/mode` succeeds, including from the same device. The app ignores it if it is already in that mode. |
| Payload | see below |

```json
{
  "active_mode": "customer",
  "ai_quota": 0,
  "can_switch": true,
  "changed_at": "2026-10-16T00:38:27Z"
}
```

`ai_quota` is the balance of the new mode, exactly as in the `POST /api/user/mode` response. When the event arrives, the app switches mode, refreshes user details, the notification badge and the chat inbox, and shows a short "Switched to … mode" banner.

**4.7 AI credits go to the mode the purchase started in (needed).**

Credits are added later than the moment the user pays, so the "current active mode" at crediting time can be the wrong one:

- **Stripe:** credits are added by your webhook, which can run after the user has already switched.
- **Apple IAP:** when the app is closed mid-purchase, the app's recovery handler calls verify on a **later launch**, possibly in the other mode.

Today the app sends no mode:

| Purchase | Endpoint | Body today |
|---|---|---|
| AI credits, Stripe | `POST /api/payment-sheet/ai-tools` | `{ "service_id": 12 }` |
| AI credits, Apple IAP | `POST /api/iap/apple/verify` | `{ "transaction_id": "2000000…" }` |

Contract — add an optional `mode` to both:

```json
{ "service_id": 12, "mode": "customer" }
```

```json
{ "transaction_id": "2000000…", "mode": "customer" }
```

- **Stripe:** save `mode` on the PaymentIntent (metadata) or on your payment record when the payment sheet is created. The webhook credits **that** mode's balance, never the mode active when the webhook runs.
- **Apple:** credit the `mode` in the body. The app records the mode when the purchase starts and sends that same value on a later recovery verify. If the same `transaction_id` is verified twice, credit it once (we assume this already holds).
- **`mode` missing** (older app versions, plain customers): use the active mode, as today.
- Keep the current response fields, and add the credited `mode` next to the **new balance of that mode**, so the app shows the right number.

Business plan purchases (`POST /api/iap/apple/verify/business-subscription`) are business-only and need no `mode`.

**4.8 Which balance AI usage is charged to.** Please confirm:
- A normal AI request is charged to the **active mode at request time**.
- A background job, such as an auto reel queued in business mode that finishes after the user switched, is charged to the **mode it was created in**.
- Business-only AI features (auto reels, template reels) return 403 in customer mode. The app hides them.

---

## 5. Questions — please reply to each

1. **Push notifications while in customer mode.** Business push notifications (new booking, new order, low stock, reel ready) will still arrive on the phone. The app shows them as normal; tapping one switches to business mode and opens it.
   - Please confirm the backend **sends them no matter what the active mode is.**
   - We recommend never suppressing them, so an owner can't miss a booking.
   - If the product owner wants them muted in customer mode, tell us; that would be a backend change.
2. **Role-based endpoints follow the active mode.** For a Business/Staff user in customer mode, does each of these return the **customer** version?
   - `GET /api/appointments` (my bookings, not my business's appointments)
   - `GET /api/orders` (my orders)
   - `GET /api/following`, `GET /api/favorites`
   - `GET /api/additional-services?type=customer`
   - AI requests and AI transactions
   - memories, my looks, try-on history

   On dev, `GET /api/appointments?status=scheduled…` in customer mode returned 0 rows. That's correct for this account either way, so it doesn't prove the scope.
3. **Editing the profile in customer mode.** Does `PUT /api/user` update the shared user (name, photo, date of birth) or a separate customer profile (`user_customer_profiles`)? Does the customer side need any field filled in (for example date of birth or "discover") before the first booking?
4. **Staff in customer mode.**
   - Is the staff member still bookable and "on duty" for their business?
   - Does `/api/user/status` return the slim customer shape for staff too?
   - Is `working_with_business_id` the right "own business" id for staff? The app currently uses the business returned by `/api/user/status`.
5. **Unfinished onboarding or no subscription.** May a business that hasn't finished onboarding, or has no plan, switch to customer mode? Your guide says customer mode skips those gates. In the app today, the onboarding popup covers the screen, so they can't reach the switch.
6. **Mode scope.** Is the mode **per user** (all devices) and not per device or token? We assume per user.
7. **Same-mode POST.** Does `POST /api/user/mode` with the mode the user is already in return 200?
8. **Account deletion.** Deleting the account in customer mode deletes the whole account, business included. Please confirm. The app will add a warning.
9. **Business while the owner is in customer mode.** Does the business stay exactly as it was (still bookable, same active / inactive status) while the owner is in customer mode?
10. **Who the action is shown as.** When an owner in customer mode reviews another business, comments on or likes a reel, or follows a business: is it shown as the **person** (their name and photo), not as their business? Does any of it count toward their own business's numbers (followers, ratings)? And in business mode, are the same actions shown as the business?

---

## 6. Reply format

Reply once, numbered the same as this file. For each item:

- **Done**: what changed. If a response field was added or changed, include a sample JSON.
- **Will do**: with an estimate.
- **Not needed / works differently**: explain why.
- For section 5: a direct answer.

For the bug in section 2, please also say when the backfill was run on dev and on production, so we can check it in the app.

The app will be built against the exact contracts in **4.3, 4.6 and 4.7** (endpoint, query or body field, event name and payload). If you need a different name or shape, put the final JSON in your reply before building, so both sides match.

---

## 7. When it's done: write the frontend guide

When every item above is fixed or answered, **read your latest code (not this prompt)** and write `docs/business-customer-mode-app-changes-v2.md` for the React Native developer. Use the same style as `business-customer-mode-app-changes.md`. It must include:

1. **Status of every item:** go through this file's numbers (2.1, 2.2, 2.3, 3, 4.1 … 4.8, and the section 5 questions) and mark each **Done**, **Not done** or **Won't do**, with one line on what changed.
2. **Every endpoint touched:** method, path, auth, query and body, and a full request and response example. Use real JSON from dev, not made-up values. List each field with its type, whether it can be null, and what it means. At least:
   - `GET /api/notifications`, `GET /api/notifications/unread-count` and `POST /api/notifications/mark-all-read`, with `mode`
   - the `user` object from email login, social login and registration
   - product and business objects with `business_id` / `is_own_business`
   - `GET /api/chat/unread-count`
   - `POST /api/payment-sheet/ai-tools` and `POST /api/iap/apple/verify`, with `mode`
   - `GET` and `POST /api/user/mode`
3. **Notification modes:** the final type → mode table as built, one push payload example for a business notification and one for a customer notification, and when the backfill ran on dev and on production.
4. **The socket event:** the channel, the exact event name the app must listen for (with or without the leading dot), a payload example, and when it fires.
5. **Own-business 403:** the final list of endpoints that return it, with the status, exact message and any `error_code`. Also confirm it happens before any Stripe intent is created.
6. **AI credits:** which balance each purchase and each AI feature uses, and the response fields after crediting.
7. **Answers to every question in section 5:** a direct answer each.
8. **Every error:** HTTP status, exact message and `error_code` for each new or changed behaviour. That includes own business (403), a plain customer trying to switch (403), and an invalid `mode` (422).
9. **Backward compatibility:** what older app versions get when they send no `mode` anywhere.
10. **How to test on dev:** test accounts (one business, one staff, one plain customer); how to create a business notification and a customer notification; how to trigger the socket event; Apple sandbox steps for a credit purchase.
11. **Deployment status and known limits:** what is live on dev and on production, and anything left for later.

