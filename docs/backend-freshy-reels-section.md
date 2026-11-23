# Freshy reels section (admin only)

The client wants their own reels (ads, news, announcements) in a separate section called **Freshy**, so they don't mix with the pros' reels. The admin posts them from the admin panel.

## What we need

1. **Freshy category in `GET /api/reels/categories`**
   - Always first in the list, even when it has fewer views.
   - Add a flag on it: `is_freshy: true`.
   - Show it only when it has at least one published reel.

2. **Feed**
   - `GET /api/reels/feed?category_id=<freshy id>` returns only Freshy reels.
   - Freshy reels must **not** show in any other category or in For You. Following can include them if the user follows the official account; your call.

3. **Posting**
   - Only the admin (from the panel, or the official business) can post into Freshy. A pro sending that `category_id` gets a 422.
   - Leave Freshy out of the category lists pros can pick from (business signup + reel category picker, `GET /api/categories`). If that's hard, send `is_freshy` there too and the app will hide it.

4. **Move existing admin reels**
   - Move all current reels from the official business into the Freshy category (one-time script, or an option in the panel).

5. **Reel object**
   - Ads and news may not have a service. In the feed response, `service` can be null for Freshy reels; the app will hide Book Now / services for them.

Once this is on dev, send us the Freshy category id and we'll do the app side.
