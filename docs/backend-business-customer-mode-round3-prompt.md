# Backend: business ↔ customer mode — 3 last questions

Thanks for the round-2 work and the latest fixes (`own_business` on the booking 422; follow, favourite and review blocked in both modes). The app has integrated all of it. We tested customer mode on dev (booking, Pay after visit, membership checkout, AI Hair Try-On purchase), and it works. Credits went to the customer balance.

We'll keep testing on our side and send you only real failures, with request and response logs. These are the only open questions:

1. **Production deploy.** Is PR #171, plus today's `own_business` changes, live on **production**? If not, when will it be? The new app build needs these APIs, so we'll release only after they're live.

2. **Background AI jobs.** A job that spends AI credits might be created in one mode and finish after the user has switched, for example an auto reel queued in business mode. Is it charged to **the mode it was created in**? If it's charged to the mode the user is in when it finishes, credits come off the wrong balance.

3. **Removing an old favourite of your own shop.** Favourite is a toggle (`toggleFavorite()`). If an owner or staff member favourited their own shop before this change, can they still **remove** it? Only **adding** should be blocked; removing should always work, as with unfollow.

A short reply to each is enough.
