# Backend update 2: review step, Before / Process / After, 30-second reel

> **Read this after `backend-slot-templates-prompt.md`.** It adds to that doc and changes a few parts of it, based on the client's latest feedback. Where the two docs disagree, **this one wins**. The sections it changes are listed in §1.

---

## 0. The client's feedback (short version)

The Before & After reel "mostly shows haircutting footage, feels rushed in places, and does not clearly show the starting look and finished result." The client asked for:

1. **Removing sections from the middle of a video.** This is frontend only (Reel Studio); no backend work. The client's 4:16 video had to be cut under 3 minutes, and the barber lost the final reveal by trimming the end.
2. **AI that picks meaningful highlights:** Before (starting hairstyle), Process (strongest cutting, fade and detail shots), After (clear views of the finished cut). Not fixed intervals, not sped-up footage.
3. **Protecting the final reveal.** If the source has no clear before or final reveal, **tell the user and let them select or add that footage**. Never call an incomplete sequence a successful Before & After reel.
4. **Pacing for a 30-second reel:** about 4s before, 16s process, 10s after. Before and after at natural speed, clean transitions, no heavy speed-up, hair and face framed properly for vertical. The result screen showed 20s instead of 30s.
5. **A corrected sample:** same source video, with the before, process and after timestamps, plus the corrected reel.

The client also sent screen designs for the frontend: a **Review highlights** screen (Before / Process / Final reveal, each with play + edit), a **"Final reveal not found"** screen (Select from my video / Add final-look clip), and a **result** screen showing Before 4s · Process 16s · After 10s.

## 1. What changes from the first doc

| First doc | Now |
|---|---|
| Daniel's template = Before 4s + After 10s (14s) | **Before 4s + Process 16s + After 10s = 30s** (§2) |
| Slot object has no grouping | New slot field **`section`**: `before` \| `process` \| `after` (§2.2) |
| `moment`: BEFORE / CUTTING / FADE / REVEAL / CUSTOM | New moment **`PROCESS`** (§3) |
| §6.3: a slot Gemini can't fill → reel **fails** with `slot_not_found` | Reel stops at a new **`review`** status. The user fixes the slot, then renders (§4) |
| §6.5: `slot_picks` is info only | `slot_picks` can be **edited** by the user, and has more fields (§4.3) |
| §6.3: render starts right after analysis | Render starts when the user taps **Generate Reel** (`POST …/render`), when the app asked for review (§4) |
| Review step was "phase 2, don't build now" | **Build it now** |
| Framing: `fit: "cover"` only | Plus crop around the head for non-vertical footage (§5) |

Everything else in the first doc stays: the slot model, the §5.4 fill algorithm, template reels, admin panel, backward compatibility and the §11 frontend guide.

## 2. Daniel's template becomes Before / Process / After (30s)

### 2.1 Structure

| Section | Slots | Each slot | Section total | Speed |
|---|---|---|---|---|
| Before | `BEFORE_SRC` | 4s | 4s | 1.0 (natural) |
| Process | `PROCESS_1_SRC` … `PROCESS_4_SRC` | 4s | 16s | ≤ 1.25 |
| After | `AFTER_SRC` | 10s | 10s | 1.0 (natural) |
| | | | **30s** | |

- **Daniel has to add the process part to his Shotstack design.** Ask him for the updated JSON with the process placeholders. Don't design it ourselves. He may choose a different number of process clips (3 × ~5.3s, 5 × 3.2s…). The slot model handles any count, as long as the process slots add up to about 16s.
- **Admin save checks for this template type:**
  - before / after clips must have speed 1.0;
  - process clips must not be faster than 1.25;
  - the total timeline must be 30s (±0.5).
- **`total_seconds` must be 30**, and the rendered reel must be 30s (±0.5). Measure the stored MP4 and log a warning if it's off. The client saw 20s from the old preset timeline.

### 2.2 New slot field: `section`

```json
{ "key": "PROCESS_2_SRC", "label": "Process 2", "section": "process", "moment": "PROCESS", "length_seconds": 4, "hint": "Clipper or fade work", "accepted_types": ["video"], "moment_instruction": null }
```

`section` is `before` | `process` | `after` (or `null` for templates without these sections). The app groups slots by `section` on the review and result screens: one "The process · 16 seconds" card instead of four.

## 3. Gemini: pick meaningful highlights

Change the slot prompt from the first doc (§6.4) like this.

### Section rules

**Before:**
- The **earliest** clear view of the starting hairstyle, before clippers or scissors touch the hair.
- Hair and face visible, camera steady.

**Process** (all `PROCESS` slots together):
- The **strongest, different** moments of the work: clipper cutting, fade blending, lineup / edge-up, scissor and detail work.
- Spread them across the haircut, in the order they happen.
- No two process windows less than 8s apart, unless the video is too short for that.
- **Never pick at fixed or even intervals.** Each window must show real, in-focus work on the hair.

**After:**
- The **finished cut**: the client turning the head, a mirror shot, or the barber presenting the result.
- Usually near the **end** of the video. Prefer the latest clear footage.
- The window must not contain cutting.

**Order rule:** before start < every process start < after start. The server checks this. If the AI breaks it, log it and mark the wrong slot `found: false` so the user fixes it.

### Reply per slot

```json
{
  "key": "AFTER_SRC",
  "found": true,
  "start_seconds": 236.5,
  "confidence": 0.86,
  "description": "Finished skin fade, client turns left to right in good light",
  "subject_box": { "x": 0.31, "y": 0.12, "w": 0.38, "h": 0.55 },
  "reason": null
}
```

- **`confidence`** (0–1): the app can show a "check this one" hint below 0.5.
- **`subject_box`**: where the head is, as fractions of the frame. Used for framing (§5).
- **`found: false`** + `reason` when that moment isn't in the video. **Don't guess.**

### Proof for the client

Save the full Gemini reply and the cleaned picks (already in the first doc). They are what we send back as "selected before, process and after timestamps" (§7).

## 4. Review step: the user checks and fixes the picks

### 4.1 Flow

```
POST /api/auto-reels (review: true)
  → pending → analyzing → review          (picks saved, nothing rendered yet)
      app shows "Review highlights"
      user may: change a pick / add a clip for a slot  → PATCH …/slots
      user taps Generate Reel                          → POST  …/render
  → rendering → ready
      result screen: "Review Selected Shots" → PATCH …/slots → POST …/render again
```

- **New request flag `review` (boolean) on `POST /api/auto-reels`.** The new app sends `review: true`. Old app versions don't send it; for them keep the first doc's behaviour (render right after analysis, `slot_not_found` fails the reel). This keeps old apps working.
- **New status `review`.** Picks are saved, waiting for the user. Send a push when it is reached: *"Your highlights are ready — Check them and make your reel."* Same `auto_reel` push type and `auto_reel_id` as today.
- **A slot Gemini couldn't fill does not fail the reel.** It comes back with `found: false` and the app asks the user to fill it.
- **Never render with an empty slot.** Never mark a reel `ready` if a before or after slot is empty.

### 4.2 Endpoints

**`PATCH /api/auto-reels/{id}/slots`**: change one or more picks.

```json
{
  "slots": [
    { "key": "AFTER_SRC", "media_asset_id": 1204, "start_seconds": 0 },
    { "key": "PROCESS_3_SRC", "start_seconds": 118.2 }
  ]
}
```

- `media_asset_id` is optional; it defaults to the auto reel's raw video. The user can add a **new clip** for a slot ("Add final-look clip"). The app uploads it with `POST /api/media`, `purpose=auto_reel_source`, the same as the raw video.
- **Checks:**
  - key exists;
  - the asset belongs to the business (staff: their own);
  - the asset is a video;
  - `start_seconds ≥ 0`;
  - `start_seconds + length_seconds ≤ real asset length + 0.15`.
- **422 field keys:** `slots.{i}.start_seconds` / `slots.{i}.media_asset_id`.
- Allowed when status is `review` or `ready`. Only the owner, or the staff member who started it.
- Returns the full auto reel. The edited slots get `found: true`, `source: "user"`.

**`POST /api/auto-reels/{id}/render`**: start (or redo) the render.

- Allowed when status is `review` or `ready`, and **every slot is filled**. Otherwise 422: *"Add the {label} before making your reel."*
- Status becomes `rendering`, response 202. The rest is the same Shotstack pipeline.
- **A re-render after `ready` replaces the auto reel's video.** If that video was already published, the published reel keeps its old video until the user publishes again. Document this in the frontend guide.
- **Monthly limit:** the first render is counted when the auto reel is created, as today. Re-renders **don't count again**. Cap them (suggest **3 per auto reel**, configurable via `AUTO_REELS_MAX_RERENDERS`); when the cap is reached, return 422 with a clear message.

**Retry** (`POST …/retry`, failed reels) works as before. If picks are saved, it only re-renders.

### 4.3 `slot_picks`, the new shape (replaces the first doc's §6.5)

```json
"slot_picks": [
  {
    "key": "BEFORE_SRC",
    "label": "Before look",
    "section": "before",
    "length_seconds": 4,
    "found": true,
    "media_asset_id": 1180,
    "media_url": "https://cdn.freshpass…/raw/1180.mp4",
    "start_seconds": 6.2,
    "confidence": 0.91,
    "description": "Client seated, curly hair before the cut",
    "reason": null,
    "source": "ai"
  },
  {
    "key": "AFTER_SRC",
    "label": "Finished look",
    "section": "after",
    "length_seconds": 10,
    "found": false,
    "media_asset_id": null,
    "media_url": null,
    "start_seconds": null,
    "confidence": null,
    "description": null,
    "reason": "The video ends during the cut; the finished haircut is never shown clearly.",
    "source": "ai"
  }
]
```

- **`media_url`** is what the app plays in the review screen: it seeks to `start_seconds` and plays `length_seconds`.
- **Raw videos must be stored as MP4 with the index at the start ("faststart").** Otherwise seeking over the network is slow. Check our upload or transcode step does this.
- `slot_picks` is set from `review` onwards, kept through `rendering` / `ready`, and `null` before analysis and for `preset` templates.

### 4.4 Statuses (updated)

| Status | Meaning |
|---|---|
| `pending` | Queued |
| `analyzing` | Length check + Gemini |
| **`review`** | **Picks ready; waiting for the user (only when `review: true`)** |
| `rendering` | Shotstack is working |
| `ready` | Finished video saved |
| `failed` | Stopped; `error_code` says why |

`slot_not_found` stays only for requests without `review: true`.

## 5. Framing for a vertical reel

- Portrait 9:16 footage: `fit: "cover"`, nothing else needed.
- **Other shapes (landscape, 4:3, 1:1):** use the slot's `subject_box` and set `asset.crop` (top / bottom / left / right fractions) so the remaining area is 9:16 and centred on the head. Clamp it inside the frame.
- No `subject_box` (user-picked slot): centre crop.
- Don't zoom in more than needed for 9:16. Daniel's own motion effects still apply on top.

## 6. Source length (3 minutes)

The client's video was 4:16. The frontend is adding "remove a section from the middle", so barbers can keep the start and the ending. On top of that, **consider raising `AUTO_REELS_SOURCE_MAX_SECONDS` to 300 (5 min)**:

- Our phone compression is about 4.5 Mbps, so 5 minutes ≈ 170 MB, still under the 200 MB upload limit.
- Gemini handles 5 minutes fine; the cost is somewhat higher per reel.

If you raise it, **send the value to the app** instead of hard-coding it: add `auto_reel_source_max_seconds` to `GET /api/media/limits`. The app currently hard-codes 180.

## 7. Corrected sample for the client (point 5)

1. Use the client's same source video. Run it after the app's middle-section edit, or as-is if you raise the limit to 5 minutes.
2. Send back:
   - the `slot_picks` (section, start–end time, description, confidence);
   - the rendered 30s reel;
   - the Gemini model used.
3. The frontend sends a screen recording of removing a middle section while keeping the beginning and the final reveal.

## 8. Extra tests

- [ ] `review: true` → stops at `review` with all 6 picks; nothing rendered; push sent
- [ ] Source with no finished look → `review` with `AFTER_SRC.found = false`; `POST …/render` → 422 until it's filled
- [ ] `PATCH …/slots` with a new uploaded clip for `AFTER_SRC` → render → ready, 30s
- [ ] `PATCH …/slots` with a window past the end of the video → 422 on `slots.0.start_seconds`
- [ ] Re-render after `ready` → new video; the monthly limit is not counted again; the 4th re-render → 422
- [ ] Old app (no `review` flag) → old behaviour unchanged
- [ ] Process picks are in order, at least 8s apart, not evenly spaced; before is before all of them, after is after
- [ ] Landscape source → head stays in frame (crop)
- [ ] Rendered MP4 is 30s (±0.5); before and after play at natural speed

## 9. Frontend guide (updates the first doc's §11)

When you write `docs/slot-templates-app-guide.md` from your finished code, also cover:

- the `review` flag;
- the `review` status and its push;
- the `slot_picks` shape and when each field is null;
- `PATCH …/slots` and `POST …/render` with full examples and every 422 message;
- re-render rules (limit, cap, what happens to an already published reel);
- the `section` field;
- `auto_reel_source_max_seconds`, if added.
