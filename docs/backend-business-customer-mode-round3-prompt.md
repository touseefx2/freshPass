# Backend task (round 3): business ↔ customer mode — a full customer test pass, and what's still open

> **How to use this file:** give it to the backend developer, or paste it into the AI coding assistant working on the backend repo. It follows your round-2 guide, `business-customer-mode-app-changes-v2.md` (PR #171). Please do two things:
> 1. **Run the full customer test pass in section 3 yourself**, and fix anything that fails.
> 2. Close the open items in section 4.
>
> Section 2 needs only a short confirmation. Then reply using section 5 and update the frontend guide as section 6 describes.

---

## 1. Where things are

The app has integrated everything in your v2 guide. We tested it on dev on 2026-10-16 with **user 357 (Bruclee E)**, owner of **business 128 (Dan Makeup Saloon)**, switched to customer mode, on an Android emulator:

| Check | Result |
|---|---|
| `GET /api/appointments` in customer mode | Returned only the user's own bookings (0). The business's 3 upcoming appointments didn't appear. ✅ |
| Own business page (128) in customer mode | Banner shown. Book, favourite and follow are off. ✅ |
| Another business (144, ViP) in customer mode | Book Now and Follow work like for any customer. ✅ |
| "Pay after visit" at 144 | `POST /api/appointments/card-setup` returned a SetupIntent on 144's connected account, and the Stripe card form loaded. ✅ We stopped before saving a card. |
| Buying a membership at 144 | `POST /api/payment-sheet` returned a PaymentIntent on 144's connected account, and the Stripe sheet loaded (Pay $49.99). ✅ We stopped before paying. |
| **AI Hair Try-On credits, Stripe** | Paid $3.00 in Stripe TEST mode with `POST /api/payment-sheet/ai-tools` `{ service_id: 9, mode: "customer" }`. Afterwards `GET /api/user/mode` returned `customer_ai_quota: 10`, `business_ai_quota: 0`. ✅ Credits went to the customer balance. |
| Mode re-check when the app returns to the foreground (`GET /api/user/mode`) | Works ✅ |

Not tested by us yet: completing a booking or membership payment (we didn't want to create bookings at a real dev business), Apple IAP, tip, review, chat and products. These are in section 3.

## 2. "Card Setup Failed" on Pay after visit — resolved (it was our test device)

We first saw **"Card Setup Failed — Failed to execute GET https://api.stripe.com/v1/elements/sessions"** when a business owner in customer mode tried "Pay after visit" at business 144.

**Cause:** our test emulator's DNS was broken. It couldn't resolve `api.stripe.com`, or even `google.com`. In Stripe's Android SDK, "Failed to execute GET …" only means no response came back. After we fixed the emulator's network, the same flow loaded the Stripe card form without problems.

**What we'd still like you to confirm** (a short yes or no, no change expected):
1. Card setup, membership and products in customer mode all create the SetupIntent or PaymentIntent, the customer and the customer session on the **same connected account**. Our responses showed customer `cus_VS5tD0b2RmkqmC` on `acct_1UQwPXFq3BBX04U8` for both card setup and membership.
2. Customer mode uses the person's **customer-side** Stripe customers, never the owner's platform customer used for business plan billing:
   - AI credits used `cus_VC6C7U83egSRRJ`
   - the business plan payment sheet used `cus_V8HZ3tj8E6C2VF`

   Also confirm that cards saved as a customer don't appear on, or change, the business plan billing.

## 3. Customer mode must do everything a normal customer can — please run this test pass yourself

**Requirement:** when a business owner, or staff, switches to customer mode, they must be able to do **everything a normal customer can**, at any business that isn't their own. Examples: buy AI Hair Try-On credits and use them, buy a membership (subscription) at another business, book and pay, buy products, tip, review, follow and chat. The only exception is their own business, where those actions are blocked.

Please test this yourself on dev, on a real phone or with API calls.

**Use these accounts:**
- a business owner who has finished onboarding, in customer mode
- a staff member in customer mode
- a plain customer, as the baseline. Every row should behave the same as for them.

**Use these businesses:**
- one business that isn't theirs, with Stripe Connect, services, memberships and products
- their own business, where every action must be blocked

| # | Area | What to test | Expected in customer mode |
|---|---|---|---|
| 1 | Switch | `POST /api/user/mode` to customer and back. Repeat with an owner who hasn't finished onboarding. | 200 both ways. `onboarding_incomplete` for the unfinished owner. |
| 2 | Browse | Explore, search, business details, services, staff, reviews | Same data as a plain customer |
| 3 | Book, pay now | `POST /api/appointments/checkout` → pay → poll `checkout/{id}` | Appointment created. Listed under `GET /api/appointments` **only** in customer mode, and **not** in the business's calendar. |
| 4 | Book, pay after visit | `POST /api/appointments/card-setup` → save card → `POST /api/appointments` | Card saved, appointment created (see section 2) |
| 5 | Booking options | "Anyone" staff, a specific staff member, several services | Same as a plain customer |
| 6 | Manage own booking | Reschedule and cancel, inside and outside the cancellation window | Allowed only on their own bookings. Fees follow the policy. |
| 7 | Membership | `POST /api/payment-sheet` with `subscription_plan_id` → pay → book with a membership visit | Active under `GET /api/subscriptions` in customer mode. Visits are used up correctly. |
| 8 | AI Hair Try-On credits | Buy with Stripe (`POST /api/payment-sheet/ai-tools`, `mode: customer`) and with Apple (`POST /api/iap/apple/verify`, `mode: customer`) | **Customer** balance goes up, business balance unchanged. Verify returns `mode: "customer"`. |
| 9 | AI Hair Try-On use | Run a try-on in customer mode | Charged to the **customer** balance. The result shows in customer AI history only. |
| 10 | Other customer AI features | AI chat, memories, my looks, try-on from a reel | Work, are charged to the customer balance, and show in customer history only |
| 11 | Products | Buy another business's product (shipping and pickup), then check `GET /api/orders` | Order created, listed under "My orders" |
| 12 | Tip | Tip staff after a completed appointment | Works |
| 13 | Review | Review after a completed appointment | Works. Shown as the **person**, not their business. |
| 14 | Follow / favourite | Follow, unfollow, favourite, unfavourite | Works. Doesn't change their own business's numbers. |
| 15 | Chat | Find a business in `potential-contacts`, send a message, the business replies | The thread is only in the customer inbox. The business sees it only in business mode. |
| 16 | Notifications | Booking confirmed, reminder, order update and so on | Saved and pushed with `mode: "customer"`, listed under `?mode=customer` only |
| 17 | Reels | Like, save, comment, book from a reel, buy from a product tag | Same as a plain customer |
| 18 | Profile | Edit profile, notification settings, language | Works (shared profile) |
| 19 | Own business | Book, pay now, pay later, membership, product, tip, review, follow, favourite, chat at their **own** business | All blocked: `own_business` (403), or 422 `errors.business_id` for bookings |
| 20 | Back in business mode | Switch back after all of the above | Business data unchanged. Customer bookings, orders, memberships and chats don't appear on the business side. |
| 21 | Second device | The same account is signed in on two phones. Switch modes on phone A. | Phone B receives `.mode.changed` on `private-users.{id}` within a few seconds, with `active_mode`, `ai_quota`, `can_switch` and `changed_at`. |
| 22 | Push from the other side | While in customer mode, trigger a business event for their own business (a new booking or order) | The push arrives with `data.mode: "business"`. It isn't listed under `?mode=customer`. |

For each row (1–22), reply **pass** or **fail**. For a fail, include the request, the response and what you fixed.

---

## 4. Still open from round 2

Your v2 guide didn't cover these. Please build or answer each:

1. **Background jobs [P1-7]:** an AI job created in one mode, such as an auto reel queued in business mode that finishes after the user switched, must be charged to **the mode it was created in**. Is that done? If not, please build it.
2. **Who an action is shown as [P2-3]:** reviews, follows, reel comments and likes made in customer mode must show the **person**, not their business, and must not count toward their own business's numbers. Please confirm, or fix.
3. ~~**Favourite guard [P1-1]**~~ — **Done.** Follow, favourite and review of your own shop now return 403 `own_business` in **both** modes (`FollowService.php`, `StoreReviewRequest.php`, `OwnBusinessGuardService.php`). The app hides these buttons on your own shop in both modes and shows the translated own-business message for any `own_business` refusal.
4. **Endpoints not listed in your v2 table 1.4:** in customer mode, do `GET /api/orders`, `GET /api/following` and `GET /api/favorites` return the person's own data, as for a plain customer?
5. ~~**Booking your own business returns 422**~~ — **Done.** The 422 from `POST /api/appointments` and `/api/appointments/checkout` now includes `data.error_code: "own_business"` (`StoreAppointmentRequest.php`). The app reads it and shows the same own-business message as the 403s.
6. **Notification type → mode table:** do you agree with every row of the round-2 table? Send any corrections.
7. **`hasRole` list:** list every place you changed from a role check to a mode check.
8. **Deployment status:** is PR #171 live on **dev**? On **production**? Please give the dates.
9. **Test accounts on dev:** one onboarded business owner, one business owner still onboarding, one staff member and one plain customer, with emails and passwords.
10. **Estimates** for anything not done yet.
11. **`.mode.changed` event:** we haven't seen it arrive yet. Please confirm it is live on dev and the event name the app should bind is exactly `.mode.changed`, with the leading dot. Row 21 above tests it.
12. **New-customer perks:** do plain customers get anything when they start, such as free AI credits, a welcome offer or a first-booking discount? If yes, does a business account's **customer side** get the same on its first switch to customer mode? If not, should it? Please tell us what happens today.
13. **Notification settings:** are notification preferences (push and email toggles, `GET`/`PUT /api/notification-preferences`) shared by both modes, or separate per mode? For example, can an owner turn off customer marketing pushes and keep business booking pushes on?
14. **Removing an old favourite of your own shop:** favourite is a toggle (`toggleFavorite()`). If an owner or staff member favourited their own shop **before** this change, can they still **remove** it? Or does the new guard block the toggle in both directions? Only **adding** should be blocked; removing should always work, as with unfollow.

---

## 5. Reply format

Reply once, in three parts:

- **Section 2:** yes or no for items 1 and 2.
- **Section 3:** the table with **pass / fail** for every row (1–22), plus details for each fail and what you changed.
- **Section 4:** items 1, 2, 4 and 6–14 (3 and 5 are done), each **Done** (with a sample JSON for anything new or changed), **Will do** (with an estimate) or **Won't do** (with the reason).

---

## 6. Update the frontend guide

When you're done, add a **"Round 3"** section to `business-customer-mode-app-changes-v2.md`, or write `-v3.md`. **Read your latest code, not this prompt.** Include:
- every endpoint, field or error code that changed (with real JSON from dev)
- the section 3 test results
- the answers to section 4
- what is live on dev and on production
