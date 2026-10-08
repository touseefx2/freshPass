# Backend task: slot-based Shotstack templates (AI auto reels + template reels)

> **How to use this file:** give it to the backend developer, or paste it into the AI coding assistant working on the backend repo. Read the current auto reel and template reel code first, plus `ai-auto-reel-how-it-works.md`. Then build what is below. Section 11 is the last step: a frontend guide written from your finished code.

---

## 1. Why we are doing this

The client (Daniel) is not happy with how the reels look. His request in Slack:

> Here is the Transformation — Before & After template I created in Shotstack, along with its preview. BEFORE_SRC and AFTER_SRC are already replaceable. The current sample runs 14 seconds: 4 seconds before and 10 seconds after. Its source trim points are fixed at 8 and 14.5 seconds. Please make these dynamic based on the selected footage, or use prepared clips with trim set to zero. Keep the current design and effects.
> Connect this template to our AI shot-selection flow and use the exported video as the template preview users can play before selecting it.

Today there are three problems:

1. **AI auto reels look generic.** The server builds its own timeline from style presets (fade, zoom, flash) and adds no music. A designer's Shotstack template cannot be used, so the result doesn't look designed.
2. **Template reel slots have no length.** The app only knows a slot's key, label and accepted types. The template JSON keeps the trim values from the designer's sample footage (for example 8s and 14.5s). With a barber's own footage those trims land on the wrong part, or past the end of the clip.
3. **No preview video for auto reel templates.** `GET /api/auto-reels/templates` only has `preview_image_url`, so barbers can't see what a template will make before choosing it.

## 2. The idea: how CapCut templates work

A CapCut template is a designed edit (music, transitions, effects, text) with a fixed number of **slots**. **Every slot plays for a fixed length**, for example 3s or 5s. The user puts one clip in each slot. Only a slot-length piece of that clip is used, and the user (or AI) picks which piece.

We do the same with Shotstack. **One designed template = Shotstack template JSON + a list of slots, each with a fixed length.** There are two ways to fill the slots, and both use the same template and the same render:

| | Template reels (manual) | AI auto reels |
|---|---|---|
| Barber gives | One photo or clip **per slot** | **One raw video** (≤ 3 min) |
| Who picks the piece of video | The barber, in the app (fixed-length window) | Gemini |
| What the server gets | Clips already cut to exactly the slot length | Raw video URL + one start time per slot |
| Server sets on each slot clip | `src` = clip URL, `trim` = 0 (+ relative offset, see §5.4) | `src` = raw video URL, `trim` = Gemini's start (+ relative offset) |
| Rendered with | The designer's Shotstack JSON | The designer's Shotstack JSON |

The current preset-based auto reels (haircut / custom with style presets) keep working as they are. A template either uses the **preset** design (today's server-built timeline) or the new **shotstack** design.

## 3. What the app does today (so the API stays compatible)

- **Uploads:** `POST /api/media`, multipart field `file` + `source_type` + `duration_seconds` (integer, max 30; max 180 when `purpose=auto_reel_source`) + `width` / `height`. Videos are compressed on the phone to about 1080p at 4.5 Mbps. `duration_seconds` is rounded, so **always use the real length measured on the server**, never this field.
- **Template reels:** `GET /api/reel-templates` then `POST /api/reels/generate` with `template_id`, `media_asset_ids` (one id per slot, **in the order of `media_fields`**), `texts` (`{ KEY: value }`, only non-empty values), `category_id`, `caption`, `music_asset_id`.
- **`media_fields`:** the app accepts the legacy form (`string[]` of keys) and the object form (`{ key, label, accepted_types }`). **New fields go on the object form.**
- **Auto reels:** `GET /api/auto-reels/templates`, then `POST /api/auto-reels` with `media_asset_id` (uploaded with `purpose=auto_reel_source`), `template_id`, `category_id`, optional `service_id`, `caption`. The app polls `GET /api/auto-reels/{id}` every 5s and shows `status` and `render_status`.
- **Requirements card:** the "what it needs" card in the app is hard-coded right now. After this change the app builds it from the template's slots.

## 4. The slot object (same shape for both features)

```json
{
  "key": "BEFORE_SRC",
  "label": "Before look",
  "hint": "The client's hair before the cut. Face clearly visible.",
  "accepted_types": ["video"],
  "length_seconds": 4,
  "moment": "BEFORE",
  "moment_instruction": null
}
```

| Field | Type | Meaning |
|---|---|---|
| `key` | string | The placeholder in the Shotstack JSON (`{{ BEFORE_SRC }}`). Unique per template. |
| `label` | string | Short name shown on the slot in the app. |
| `hint` | string \| null | One line telling the barber what to film or pick for this slot. |
| `accepted_types` | `("video" \| "image")[]` | Same as today. |
| `length_seconds` | number | **How long this slot plays in the final reel.** For video slots it is also the shortest clip accepted. For image slots it is how long the photo shows. Decimals allowed (e.g. 2.5). |
| `moment` | `"BEFORE" \| "CUTTING" \| "FADE" \| "REVEAL" \| "CUSTOM" \| null` | **Auto reels only:** what Gemini looks for to fill this slot. `null` on template reels. |
| `moment_instruction` | string \| null | Only when `moment` is `CUSTOM`: the text Gemini gets, e.g. "the barber spraying water on the client". |

`length_seconds` is **not typed in by hand**. Compute it from the template JSON when the template is saved (see §5.4), so it always matches the design.

## 5. Template reels (`/api/reel-templates`, `/api/reels/generate`)

### 5.1 `GET /api/reel-templates`: add to each template

Keep every current field. Add:

- `total_seconds`: length of the whole timeline.
- On each `media_fields` object: `length_seconds` and `hint` (`moment` / `moment_instruction` are `null` here).
- Make sure `preview_video_url` is filled: the exported sample MP4, stored on **our** CDN.

```json
{
  "id": 12,
  "name": "Transformation — Before & After",
  "slug": "transformation-before-after",
  "category": "haircut",
  "preview_video_url": "https://cdn.freshpass…/templates/12/preview.mp4",
  "thumbnail_url": "https://cdn.freshpass…/templates/12/poster.jpg",
  "total_seconds": 14,
  "merge_fields": ["BEFORE_SRC", "AFTER_SRC"],
  "text_fields": [],
  "media_fields": [
    { "key": "BEFORE_SRC", "label": "Before look", "hint": "Hair before the cut, face visible", "accepted_types": ["video"], "length_seconds": 4, "moment": null, "moment_instruction": null },
    { "key": "AFTER_SRC", "label": "Finished look", "hint": "Final cut, turn the head slowly", "accepted_types": ["video"], "length_seconds": 10, "moment": null, "moment_instruction": null }
  ],
  "media_count": 2,
  "has_music": true,
  "music_name": "…",
  "is_active": true,
  "created_at": "…"
}
```

The existing photo templates (Before & After, Salon Showcase) also get `length_seconds` on each slot: how long each photo shows.

### 5.2 `POST /api/reels/generate`: server rules

The payload doesn't change. The new app cuts every slot video to exactly `length_seconds` before upload. For each slot:

1. Measure the uploaded clip's real length (ffprobe or the existing media metadata). Don't use the rounded `duration_seconds`.
2. If a **video** slot's clip is shorter than `length_seconds − 0.15`, return **422** on `media_asset_ids.{index}` with: *"This slot needs at least {length}s of video."* The rounding tolerance matters: a 4.0s cut can come back as 3.97s.
3. Fill the template with the algorithm in §5.4, using `start = 0` for every slot.
4. **Older app versions** may still send a longer clip (up to 30s). That's fine: `start = 0` uses its first `length_seconds`. Never fall back to the designer's sample trims.
5. If a slot accepts both image and video, keep today's logic for switching the Shotstack asset type.

### 5.3 What stays the same

Statuses, `generation-status`, the callback, storing the MP4, the monthly limit and notifications don't change.

### 5.4 Filling a Shotstack template (shared by both features)

A slot key can be used by **more than one clip** (for example the after footage shown twice with different zooms). Keep the designer's relative offsets:

```
when the template is SAVED (admin):
  for each slot key K:
    clips_K = every clip whose asset.src is "{{ K }}" (allow spaces inside the braces)
    base_K  = min(clip.asset.trim ?? 0) over clips_K
    span_K  = max((clip.asset.trim ?? 0) - base_K + clip.length × (clip.asset.speed ?? 1)) over clips_K
    slot.length_seconds = round(span_K, 2)

when RENDERING (start_K = 0 for template reels, Gemini's start for auto reels):
  for each clip in clips_K:
    clip.asset.src  = media URL (raw video for auto reels, uploaded clip for template reels)
    clip.asset.trim = start_K + ((clip.asset.trim ?? 0) - base_K)
```

- **Set `src` and `trim` directly in the JSON on the server.** Don't depend on Shotstack merge fields for numbers. Text placeholders can keep using merge.
- **Don't change** any clip's `length`, `start`, transitions, effects, filters, soundtrack or output settings. That is the design Daniel wants kept.
- Image slots: set `src` only.
- If a clip has no numeric `length` (`"auto"` / `"end"`), the template can't be used for slots. Reject it at save time (§7).

## 6. AI auto reels

### 6.1 `GET /api/auto-reels/templates`: add to each template

Keep `id`, `name`, `description`, `preview_image_url`, `kind`. Add:

| Field | Type | Meaning |
|---|---|---|
| `design` | `"preset" \| "shotstack"` | `preset` = today's server-built timeline. `shotstack` = the designer's template filled by Gemini. |
| `preview_video_url` | string \| null | The exported sample MP4, on our CDN. **Required for `shotstack`.** It would help to add it to preset templates too. |
| `total_seconds` | number \| null | Length of the finished reel (`shotstack`). `null` for `preset` (varies). |
| `min_source_seconds` | number | Shortest raw video accepted. `shotstack`: the sum of the video slots' `length_seconds` (no footage plays twice). `preset`: today's rule. |
| `has_music` / `music_name` | boolean / string \| null | Same meaning as on template reels. |
| `slots` | slot[] | The slots (§4) with `moment` set. `[]` for `preset`. |

```json
{
  "id": 7,
  "name": "Transformation — Before & After",
  "description": "The before look, then a dramatic reveal of the finished cut.",
  "kind": "haircut",
  "design": "shotstack",
  "preview_image_url": "https://cdn.freshpass…/auto-templates/7/poster.jpg",
  "preview_video_url": "https://cdn.freshpass…/auto-templates/7/preview.mp4",
  "total_seconds": 14,
  "min_source_seconds": 14,
  "has_music": true,
  "music_name": "…",
  "slots": [
    { "key": "BEFORE_SRC", "label": "Before look", "hint": "Film the client's hair before you start", "accepted_types": ["video"], "length_seconds": 4, "moment": "BEFORE", "moment_instruction": null },
    { "key": "AFTER_SRC", "label": "Finished look", "hint": "Film the finished cut for at least 10 seconds, turning the head slowly", "accepted_types": ["video"], "length_seconds": 10, "moment": "REVEAL", "moment_instruction": null }
  ]
}
```

Keep `kind` (the app uses it for the haircut tip). For `shotstack` templates the **slots** decide what Gemini looks for, not `kind`.

### 6.2 `POST /api/auto-reels`

The payload doesn't change. Validate `min_source_seconds` early: if the measured raw video is shorter, fail with `source_too_short` (§6.6) **before** calling Gemini.

### 6.3 Pipeline for `design = "shotstack"`

1. **Check the video** (existing step 2): real length must be ≤ 180s and ≥ `min_source_seconds`.
2. **Ask Gemini (new prompt, §6.4)** for one start time per slot.
3. **Clean up the picks on the server:**
   - Clamp each start into `[0, video_length − length_seconds]`.
   - If two video slots overlap by more than 0.5s, move the later one to start where the earlier one ends, if it still fits. Otherwise keep it and log it.
   - A slot Gemini couldn't fill fails the reel with `slot_not_found` (§6.6). Don't render a reel with an empty slot.
4. **Fill the template** with §5.4 (`src` = raw video's public CDN URL, `start` = the cleaned pick).
5. **Render, callback, store, thumbnail, notify, publish:** reuse the existing steps 5–7 unchanged. Status goes `pending → analyzing → rendering → ready / failed` as today.
6. **Audio:** use whatever the template JSON says (soundtrack, per-clip volume). Do **not** force the barber's own sound on for `shotstack` templates. The "always keep the barber's sound" rule only applies to `preset`.
7. **Output size:** use the template's output settings (the design is 9:16). Video slot clips should use `fit: "cover"` so landscape footage fills the frame. Set this in the template, not in code.

### 6.4 Gemini prompt for slot templates

Send the video plus:

- The video's real length in seconds.
- The slots in timeline order: `key`, `label`, `moment` (or `moment_instruction` for `CUSTOM`), `hint`, `length_seconds`.
- Rules:
  - For each slot, return a `start_seconds` so that **the whole window `[start, start + length_seconds]`** shows that moment, is sharp, steady, well lit and not blocked. The window must fit inside the video.
  - `BEFORE`: hair clearly before any cutting. `REVEAL`: the finished cut; prefer the client turning or the barber showing the result.
  - Different slots should not use the same footage.
  - Ignore audio, logo screens and text screens.
  - If a slot's moment isn't in the video, return `found: false` with a short `reason`. Don't guess.
  - Keep the existing warning about times written as `412` instead of `252` (4:12).
- Structured reply:

```json
{
  "slots": [
    { "key": "BEFORE_SRC", "found": true, "start_seconds": 12.4, "description": "Client seated, long hair, before the cut", "reason": null },
    { "key": "AFTER_SRC", "found": true, "start_seconds": 141.0, "description": "Finished skin fade, client turns left to right", "reason": null }
  ]
}
```

Keep the existing model fallback list, retries, file upload and delete steps.

### 6.5 Add to the AutoReel resource (`GET /api/auto-reels/{id}`)

Keep every current field. Add:

```json
"design": "shotstack",
"slot_picks": [
  { "key": "BEFORE_SRC", "label": "Before look", "start_seconds": 12.4, "length_seconds": 4, "description": "Client seated, long hair, before the cut" },
  { "key": "AFTER_SRC", "label": "Finished look", "start_seconds": 141.0, "length_seconds": 10, "description": "Finished skin fade, client turns left to right" }
]
```

`slot_picks` is `null` until analysis is done, and `null` for `preset`. Also save it with the AI analysis record (§7 of the existing doc) for debugging.

### 6.6 New error codes

| `error_code` | When | Message the barber sees |
|---|---|---|
| `source_too_short` | Raw video shorter than `min_source_seconds` | This template needs at least {N} seconds of video. Please add a longer video. |
| `slot_not_found` | Gemini couldn't find a slot's moment | We couldn't find the "{label}" in your video. Try another video or template. |

All existing codes stay. Push notifications on `failed` work as today.

### 6.7 Retry

If `slot_picks` is saved, a retry only re-renders (no second Gemini call), the same as the current "timeline saved" rule.

### 6.8 Limits

- `AUTO_REELS_MAX_BEFORE_SECONDS`, `AUTO_REELS_MAX_REVEAL_SECONDS`, `AUTO_REELS_MAX_WORK_CLIP_SECONDS` and `AUTO_REELS_MIN_CLIP_SECONDS` apply to **`preset` only**. Daniel's after slot is 10s, more than the 8s reveal limit.
- `AUTO_REELS_MAX_OUTPUT_SECONDS` (30) applies to both. A `shotstack` template longer than 30s can't be saved.

## 7. Admin panel (both template types)

- **Template JSON:** paste the Shotstack JSON, or enter a Shotstack template ID and fetch it.
- **Auto-detect slots:** find every `{{ KEY }}` used as an asset `src` and turn each into a slot. `accepted_types` comes from the asset type. `length_seconds` is computed (§5.4) and shown read-only. Text placeholders (title / html / text assets) become text fields, as today.
- **Per slot the admin fills in:** `label`, `hint`, and for auto reel templates `moment` (+ `moment_instruction` for `CUSTOM`).
- **Preview video:** upload the exported sample MP4. Store it on our CDN and make a poster image from it if none is uploaded.
- **Checks on save:**
  - every slot clip has a numeric `length`;
  - total timeline ≤ 30s;
  - slot keys are unique;
  - auto reel `shotstack` templates have a `moment` on every video slot;
  - a preview video is set.
- Existing preset auto reel templates become `design: "preset"` with no other change. The built-in haircut template can't be deleted, as today.

## 8. First template to ship: Daniel's "Transformation — Before & After"

1. Take the JSON Daniel shared in the Slack thread.
2. Create it as an **auto reel template**, `design: "shotstack"`:
   - `BEFORE_SRC` → moment `BEFORE`, 4s
   - `AFTER_SRC` → moment `REVEAL`, 10s
   - `min_source_seconds` = 14
3. Upload his exported sample video as `preview_video_url`.
4. Optional: create the same JSON as a **template reel** too (two video slots), so barbers can also fill it by hand.
5. Ask Daniel these before shipping:
   - The sample shows text ("From 45 To 25"). Is it fixed, or should the barber type it? If the barber types it, expose it as a text field and accept optional `texts` on `POST /api/auto-reels`, same shape as template reels.
   - Should the barber's own sound play under the template music, and at what volume?
   - Is the template's music licensed for use in published reels?

## 9. Don't break the current app

- Every new field is **added**. Nothing is renamed or removed. `media_fields` legacy string form still works.
- Preset auto reels behave exactly as today.
- Old app versions:
  - **Auto reels:** sending one video + `template_id` already works for `shotstack` templates.
  - **Template reels:** may send longer clips. `start = 0` handles them (§5.2).

## 10. Test checklist

**Auto reel, Daniel's template:**
- [ ] 20s video with a clear before and after → ready, 14s reel, design intact
- [ ] 3-minute video → ready; picks are on the right moments
- [ ] 10s video → `source_too_short` before any Gemini call
- [ ] Video with no before shot → `slot_not_found` with the slot label
- [ ] Landscape video → fills 9:16 (cover)
- [ ] Fail the render on purpose, then retry → no second Gemini call
- [ ] Publish works; the monthly limit is counted once

**Template reel:**
- [ ] Clips of exactly 4.0s / 10.0s → ready
- [ ] 3.9s clip in a 4s slot → ready (tolerance)
- [ ] 3s clip in a 4s slot → 422 on `media_asset_ids.0`
- [ ] Old app: 30s clip → uses the first 4s, never the 8s sample trim
- [ ] Photo templates still work, now with `length_seconds`

**API:**
- [ ] `GET /api/auto-reels/templates` and `GET /api/reel-templates` return the new fields for both designs

## 11. When it's done: write the frontend guide

When everything above works, **read your latest code (not this prompt)** and write `docs/slot-templates-app-guide.md` for the React Native developer. Use the same style as `ai-reel-auto-generation-app-guide.md`. It must include:

1. **What changed:** a short list.
2. **Every endpoint touched:** method, path, auth, a full request example and a full response example. Use real JSON from your code with Daniel's template, not made-up values. List each field with its type, whether it can be null, and what it means.
3. **The slot object:** what the app should do with each field (`length_seconds`, `hint`, `accepted_types`, `moment`).
4. **Auto reels:** all `status` and `render_status` values, plus the new resource fields (`design`, `slot_picks`) and when they are null.
5. **Every error:** each 422 field key and message, and each `error_code` with its exact message text and HTTP status.
6. **Upload rules:** max lengths, how the real length is measured, the slot clip tolerance.
7. **Backward compatibility:** what old app versions get.
8. **Test data:** template IDs on staging, links to sample videos that should pass and fail.
9. **Not done yet / known limits:** anything left for later, for example a review step where the barber adjusts AI picks before render.
