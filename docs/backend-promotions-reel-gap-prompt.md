# Backend Request: Reel ↔ Promotion Link + Missing Pieces

## Context

Client reported three issues with the Promotions feature:

1. **Reel does not show its linked promotion** — Owner created a promotion with `reel_id`, but the reel (in feed, business profile, reel detail) has no indication an offer is attached. The customer can't discover the offer from the reel.
2. **Business profile not showing the promotion chip/list** — After publishing a promotion, nothing appears on the business profile (chip label like "15% Off Services" or offer list).
3. **Navigation/UX** — This is app-side only (a Marketing hub screen), no backend work needed.

---

## 1. Reel → Promotion link (the confirmed gap)

### What's needed

When a promotion has a `reel_id`, the **reel API responses** should include the linked promotion data so the app can show an offer badge/button on the reel.

### Where it should appear

Every endpoint that returns a reel object — at minimum:

| Endpoint | Use |
|---|---|
| `GET /api/reels` (feed / home reels) | Reel feed cards |
| `GET /api/reels/{id}` | Single reel detail |
| `GET /api/businesses/{id}/reels` | Business profile reels tab |
| Reel search / explore results | If applicable |

### Suggested `promotion` field on the reel object

When the reel is linked to an **active, open** promotion (not draft, paused, suspended, or expired):

```jsonc
{
  "id": 42,
  "video_url": "...",
  // ... existing reel fields ...
  "promotion": {
    "id": 12,
    "title": "First Visit Offer",
    "savings_label": "15% off",        // ready-to-show label
    "chip_label": "15% Off Services",
    "audience_label": "New customers only",  // or null
    "booking_ends_at": "2026-11-25 18:00",
    "business": {
      "id": 5,
      "title": "The Daniel's"
    }
  }
}
```

When the reel is **not** linked to any promotion, or the promotion is not currently open: `"promotion": null`.

This keeps the payload small — just enough for the app to show a badge and navigate to the offer detail (`GET /api/promotions/{id}?source=reel`).

### View counting

When a customer taps "View offer" on the reel (opening `GET /api/promotions/{id}?source=reel`), the view is already counted by that endpoint. No extra counting needed from the reel side — just pass `source=reel` as documented.

---

## 2. Business profile promotions — verification needed

The app guide documents `GET /api/businesses/{businessId}/promotions?source=profile` which should return:

```jsonc
{
  "chip_label": "15% Off Services",
  "promotions": [...]
}
```

### Questions

1. **Is this endpoint live and returning data?** Client says nothing shows on the profile after publishing. We need to confirm the endpoint works with an active promotion.
2. **Does a just-published promotion appear immediately**, or is there a delay/cache?
3. **Guest vs signed-in** — The docs say it works with both. Can we confirm?

If the endpoint is working correctly, the issue is app-side only and we'll handle it.

---

## 3. Email offer link / universal links (mentioned in docs, not yet live)

The app guides mention these are **not claimed as universal links yet**:

- `/offers/{id}` (shared offer link)
- `/o/{token}` (email offer claim link)

This is a known pending item — just confirming it's tracked. No urgency from the current client complaint, but it will matter once "Bring Customers Back" emails go out.

---

## Summary of what we need from backend

| # | Item | Priority |
|---|---|---|
| 1 | Add `promotion` field to reel API responses (all reel endpoints) | **High** — client-reported, confirmed gap |
| 2 | Confirm `GET /api/businesses/{businessId}/promotions?source=profile` is live and returning data for active promotions | **High** — client-reported |
| 3 | Universal links for `/offers/*` and `/o/*` (future) | Low — tracked |
