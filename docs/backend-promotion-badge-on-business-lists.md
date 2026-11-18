# Backend Request: Promotion flag on business list cards

Client wants a small static "% off" pill on every business card when the business has an active public promotion. The app only needs a yes/no.

## Endpoints (each business row)

- `GET /api/businesses`: Home "Recommended" (`sort=completed_appointments`), Home + Explore "FreshPass Deals" (`type=featured`), Explore list (`category_ids`, etc.)
- `GET /api/available-now`: Home "Available Now" + See all
- `GET /api/following`: Home "Favorite Businesses" + the top business strip
- `GET /api/service-business-list?search=…`: Explore search results (businesses)

## Field to add on each business row

```json
"has_promotion": true
```

## Rules

- `true` only when the business has at least one public offer that is active right now: status `active`, inside the booking window, not over the limit.
- Private / email-only offers do not count.
- Same for every customer (no eligibility check).
