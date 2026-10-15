import { MAX_AUTO_REEL_SOURCE_SECONDS } from "@/src/services/mediaLibraryService";
import {
  isAutoBuildTemplate,
  isDesignTemplate,
  mediaSlots,
  normalizeReelTemplateMediaFields,
  templateClipCount,
  templateSourceMaxMinutes,
  templateSourceMaxSeconds,
  templateSourceMinSeconds,
  textSlots,
  type AutoReelSlot,
  type AutoReelTemplate,
  type ReelTemplate,
  type ReelTemplateMediaField,
} from "@/src/types/reels";
import { formatVideoDuration } from "@/src/utils/videoDuration";
import type {
  TemplateGalleryFeature,
  TemplateGalleryItem,
} from "@/src/types/templateGallery";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Video Reel sample shown when a template's `preview_video_url` is empty */
const FALLBACK_VIDEO_PREVIEW_URL =
  "https://freshpass-media.nyc3.cdn.digitaloceanspaces.com/media/videos/WhatsApp%20Video%202026-10-15%20at%2016.48.53.mp4";

const videoPreviewUrl = (url?: string | null) =>
  url?.trim() || FALLBACK_VIDEO_PREVIEW_URL;

const TEXT_FIELD_LABELS: Record<string, string> = {
  business_name: "businessNameField",
  tagline: "taglineField",
  deal_text: "dealTextField",
  service_name: "serviceNameField",
  product_name: "productNameField",
};

/** Photo Reel text field label ("business_name" → "Business name"). */
export function templateTextFieldLabel(field: string, t: Translate): string {
  const key = TEXT_FIELD_LABELS[field];
  return key ? t(key) : field.replace(/_/g, " ");
}

/** "2 photos needed", "1 video needed"… for a Photo Reel template's slots. */
export function mediaRequirementLabel(
  fields: ReelTemplateMediaField[],
  t: Translate,
): string {
  const count = fields.length;
  if (count === 0) return "";
  const hasImage = fields.some((f) => f.accepted_types.includes("image"));
  const hasVideo = fields.some((f) => f.accepted_types.includes("video"));
  if (hasImage && !hasVideo) {
    return count === 1
      ? t("photosNeededImagesOne")
      : t("photosNeededImages", { count });
  }
  if (hasVideo && !hasImage) {
    return count === 1 ? t("videosNeededOne") : t("videosNeeded", { count });
  }
  return count === 1 ? t("photosNeededOne") : t("photosNeeded", { count });
}

export function formatMusicName(name: string | null): string {
  if (!name?.trim()) return "";
  return name.replace(/\.(mp3|wav|m4a|aac)$/i, "").replace(/-/g, " ");
}

const headlineWords = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean);

/** Photo Reel template (/api/reel-templates) → gallery item. */
export function photoReelGalleryItem(
  tpl: ReelTemplate,
  t: Translate,
): TemplateGalleryItem {
  const fields = normalizeReelTemplateMediaFields(tpl.media_fields);
  const needed = mediaRequirementLabel(fields, t);
  const hasImage = fields.some((f) => f.accepted_types.includes("image"));
  const hasVideo = fields.some((f) => f.accepted_types.includes("video"));
  const mediaIcon: TemplateGalleryFeature["icon"] =
    hasVideo && !hasImage
      ? "video-library"
      : hasImage && !hasVideo
        ? "photo-library"
        : "perm-media";
  // Slot names only when the API named every slot (not the "Slot 1" fallback)
  const slotsNamed = fields.every((f, i) => f.label !== `Slot ${i + 1}`);
  const textLabels = (tpl.text_fields ?? []).map((field) =>
    templateTextFieldLabel(field, t),
  );
  const features: TemplateGalleryFeature[] = [
    ...(needed ? [{ icon: mediaIcon, label: needed }] : []),
    {
      icon: "text-fields",
      label: textLabels.length
        ? textLabels.join(", ")
        : t("templateGalleryNoText"),
    },
    // Music file names are stock ids ("…-music-487929"), not worth showing here
    tpl.has_music
      ? { icon: "music-note", label: t("includesMusic") }
      : { icon: "music-off", label: t("templateGalleryNoMusic") },
  ];
  return {
    id: tpl.id,
    kind: "photo",
    headline: headlineWords(tpl.name),
    tagline: needed,
    taglineIcon: mediaIcon,
    name: tpl.name,
    // The API has no description; the slot names are the next best thing
    description:
      fields.length && slotsNamed
        ? t("templateGalleryYouAdd", {
            items: fields.map((f) => f.label).join(", "),
          })
        : "",
    coverUrl: tpl.thumbnail_url || null,
    previewVideoUrl: tpl.preview_video_url || null,
    icon: mediaIcon,
    features,
    autoBuild: false,
    // The API sends no reel length; each media field is one clip
    lengthSeconds: null,
    clipCount: fields.length || null,
    // `music_name` is a stock id, not a song title
    musicTitle: null,
    musicUrl: null,
  };
}

/** "0:05" / "1:20" for slot timings. */
function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Icon for a design slot (photo / video / text). */
export function slotIcon(slot: AutoReelSlot): TemplateGalleryFeature["icon"] {
  if (slot.kind === "text") return "text-fields";
  if (slot.kind === "video") return "videocam";
  return "photo-camera";
}

/** What to find / film for a slot (the API's `find`, else its `hint`). */
export function slotWhat(slot: AutoReelSlot): string {
  return slot.find?.trim() || slot.hint?.trim() || "";
}

/** Short facts about a slot: min video length / max text length and when it shows — "16s or longer · 0:06–0:22". */
export function slotMeta(slot: AutoReelSlot, t: Translate): string {
  const parts: string[] = [];
  if (slot.kind === "video" && slot.min_seconds) {
    parts.push(
      t("designSlotMinSeconds", { seconds: Math.ceil(slot.min_seconds) }),
    );
  }
  if (slot.kind === "text" && slot.max_length) {
    parts.push(t("designSlotMaxLength", { count: slot.max_length }));
  }
  const first = slot.appears?.[0];
  if (first && Number.isFinite(first.start) && Number.isFinite(first.end)) {
    parts.push(`${clock(first.start)}–${clock(first.end)}`);
  }
  return parts.join(" · ");
}

/**
 * One line about a slot from the API: what to find / film, how long a video
 * must be and when it shows in the reel — e.g. "Clipper work · 16s+ · 0:04–0:20".
 */
export function slotDetail(slot: AutoReelSlot, t: Translate): string {
  return [slotWhat(slot), slotMeta(slot, t)].filter(Boolean).join(" · ");
}

/** Design template features: built from what the template needs, not fixed copy. */
function designFeatures(
  tpl: AutoReelTemplate,
  t: Translate,
): TemplateGalleryFeature[] {
  const media = mediaSlots(tpl.slots);
  const texts = textSlots(tpl.slots);
  const features: TemplateGalleryFeature[] = [];
  if (tpl.needs === "video") {
    features.push({
      icon: "video-library",
      label: tpl.min_video_seconds
        ? t("designOneVideoMin", { seconds: Math.ceil(tpl.min_video_seconds) })
        : t("videosNeededOne"),
    });
    if (media.length) {
      features.push({
        icon: "auto-awesome",
        label: t("designAiPicksMoments", { count: media.length }),
      });
    }
  } else {
    features.push({
      icon: "photo-library",
      label:
        media.length === 1
          ? t("photosNeededImagesOne")
          : t("photosNeededImages", { count: media.length }),
    });
    features.push({
      icon: "text-fields",
      label: texts.length
        ? texts.map((s) => s.label).join(", ")
        : t("templateGalleryNoText"),
    });
  }
  features.push({
    icon: "timer",
    label: tpl.length_seconds
      ? t("designReelSeconds", { seconds: Math.round(tpl.length_seconds) })
      : t("autoReelReqLength"),
  });
  features.push(
    tpl.has_sound === false
      ? { icon: "library-music", label: t("designPickMusic") }
      : { icon: "music-note", label: t("includesMusic") },
  );
  return features;
}

/**
 * One-video design features: the one upload it takes, what the AI does with
 * it, the reel length and its music (the song's title when it has its own).
 */
function autoBuildFeatures(
  tpl: AutoReelTemplate,
  t: Translate,
): TemplateGalleryFeature[] {
  const features: TemplateGalleryFeature[] = [
    {
      icon: "video-library",
      // "1 video, 0:30 – 5:00": shortest (the reel's length) and longest
      label: templateSourceMinSeconds(tpl)
        ? t("autoBuildFeatureVideoRange", {
            min: formatVideoDuration(templateSourceMinSeconds(tpl)),
            max: formatVideoDuration(templateSourceMaxSeconds(tpl)),
          })
        : t("autoBuildFeatureVideo", {
            minutes: templateSourceMaxMinutes(tpl),
          }),
    },
    { icon: "auto-awesome", label: t("autoBuildFeatureAi") },
  ];
  if (tpl.length_seconds) {
    features.push({
      icon: "timer",
      label: t("designReelSeconds", {
        seconds: Math.round(tpl.length_seconds),
      }),
    });
  }
  const song = tpl.music?.title?.trim();
  features.push(
    song
      ? { icon: "music-note", label: song }
      : tpl.has_sound === false
        ? // Silent design with no song: the reel is made without music
          { icon: "library-music", label: t("autoBuildMusicAfter") }
        : { icon: "music-note", label: t("includesMusic") },
  );
  return features;
}

/** AI auto reel template (auto-reel templates API) → gallery item. */
export function autoReelGalleryItem(
  tpl: AutoReelTemplate,
  t: Translate,
): TemplateGalleryItem {
  // Cover facts ("0:30 · 6 clips")
  const lengthSeconds =
    tpl.length_seconds && tpl.length_seconds > 0 ? tpl.length_seconds : null;
  const clipCount = templateClipCount(tpl);
  if (isDesignTemplate(tpl)) {
    const photos = tpl.needs === "photos";
    const autoBuild = isAutoBuildTemplate(tpl);
    return {
      id: tpl.id,
      kind: "video",
      headline: headlineWords(tpl.name),
      tagline: tpl.length_seconds
        ? t("designReelSeconds", { seconds: Math.round(tpl.length_seconds) })
        : photos
          ? t("designPhotoReel")
          : t("autoReelReqLength"),
      taglineIcon: photos ? "photo-library" : "timer",
      name: tpl.name,
      description: tpl.description?.trim() ?? "",
      coverUrl: tpl.preview_image_url || null,
      previewVideoUrl: videoPreviewUrl(tpl.preview_video_url),
      icon: photos
        ? "photo-library"
        : tpl.kind === "haircut"
          ? "content-cut"
          : "movie-filter",
      features: autoBuild ? autoBuildFeatures(tpl, t) : designFeatures(tpl, t),
      // One-video designs: the AI fills every slot, so no "What you'll need"
      slots: autoBuild
        ? undefined
        : (tpl.slots ?? []).map((slot) => ({
            icon: slotIcon(slot),
            label: slot.label,
            detail: slotDetail(slot, t),
          })),
      autoBuild,
      lengthSeconds,
      clipCount,
      musicTitle: tpl.music?.title?.trim() || null,
      musicUrl: tpl.music?.url?.trim() || null,
    };
  }
  return {
    id: tpl.id,
    kind: "video",
    headline: headlineWords(tpl.name),
    tagline: t("autoReelReqLength"),
    taglineIcon: "timer",
    name: tpl.name,
    description: tpl.description?.trim() ?? "",
    coverUrl: tpl.preview_image_url || null,
    previewVideoUrl: videoPreviewUrl(tpl.preview_video_url),
    icon: tpl.kind === "haircut" ? "content-cut" : "movie-filter",
    // Short forms of the step 1 requirements
    features: [
      {
        icon: "video-library",
        label: t("templateGalleryClips", {
          minutes: Math.round(MAX_AUTO_REEL_SOURCE_SECONDS / 60),
        }),
      },
      { icon: "timer", label: t("autoReelReqLength") },
      { icon: "graphic-eq", label: t("autoReelReqAudio") },
    ],
    autoBuild: false,
    lengthSeconds,
    clipCount,
    // The user's own audio is kept, so no template song to name
    musicTitle: null,
    musicUrl: null,
  };
}
