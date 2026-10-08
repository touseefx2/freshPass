import { MAX_AUTO_REEL_SOURCE_SECONDS } from "@/src/services/mediaLibraryService";
import {
  normalizeReelTemplateMediaFields,
  type AutoReelTemplate,
  type ReelTemplate,
  type ReelTemplateMediaField,
} from "@/src/types/reels";
import type {
  TemplateGalleryFeature,
  TemplateGalleryItem,
} from "@/src/types/templateGallery";

type Translate = (key: string, options?: Record<string, unknown>) => string;

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
    return count === 1
      ? t("videosNeededOne")
      : t("videosNeeded", { count });
  }
  return count === 1
    ? t("photosNeededOne")
    : t("photosNeeded", { count });
}

export function formatMusicName(name: string | null): string {
  if (!name?.trim()) return "";
  return name.replace(/\.(mp3|wav|m4a|aac)$/i, "").replace(/-/g, " ");
}

const headlineWords = (name: string) => name.trim().split(/\s+/).filter(Boolean);

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
  };
}

/** AI auto reel template (auto-reel templates API) → gallery item. */
export function autoReelGalleryItem(
  tpl: AutoReelTemplate,
  t: Translate,
): TemplateGalleryItem {
  return {
    id: tpl.id,
    kind: "video",
    headline: headlineWords(tpl.name),
    tagline: t("autoReelReqLength"),
    taglineIcon: "timer",
    name: tpl.name,
    description: tpl.description?.trim() ?? "",
    coverUrl: tpl.preview_image_url || null,
    previewVideoUrl: null,
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
      { icon: "toll", label: t("autoReelReqNoCredits") },
    ],
  };
}
