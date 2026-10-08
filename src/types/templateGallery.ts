import type { MaterialIcons } from "@expo/vector-icons";
import type React from "react";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

/**
 * Tab on the "Choose a Template" screen:
 * video = AI auto reel templates, photo = Photo Reel (template reel) templates.
 */
export type TemplateGalleryKind = "video" | "photo";

/** One column in the info row under the cover */
export type TemplateGalleryFeature = {
  icon: IconName;
  label: string;
};

/** A template from either API, in the shape the gallery shows. */
export type TemplateGalleryItem = {
  /** Template id in its own API (/api/reel-templates or auto-reel templates) */
  id: number;
  kind: TemplateGalleryKind;
  /** Cover title, one word each (2nd line on is accented) */
  headline: string[];
  /** Short line on the cover under the title */
  tagline: string;
  taglineIcon: IconName;
  name: string;
  /** From the API only; empty when it sends none */
  description: string;
  /** Poster on the cover; null shows the brand art with `icon` */
  coverUrl: string | null;
  /** Sample preview; when present the cover shows a play button */
  previewVideoUrl: string | null;
  icon: IconName;
  features: TemplateGalleryFeature[];
};
