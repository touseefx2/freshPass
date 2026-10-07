import type { MaterialIcons } from "@expo/vector-icons";
import type React from "react";

/** Which kind of reel a gallery template builds */
export type TemplateGalleryKind = "video" | "photo";

export type TemplateGalleryFeature = {
  /** MaterialIcons name */
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
};

/**
 * A template shown on the "Choose a template" screen.
 * Shape the API is expected to return; mock data lives in
 * src/constants/templateGalleryMock.ts until the endpoint is ready.
 */
export type TemplateGalleryItem = {
  id: string;
  kind: TemplateGalleryKind;
  /** Big overlay title on the preview, one entry per line (2nd line is accented) */
  headline: string[];
  /** Small caps line under the headline */
  tagline: string;
  /** Title of the description card */
  name: string;
  description: string;
  /** Poster shown on the preview card */
  coverUrl: string;
  /** Sample preview; when present the card shows a play button */
  previewVideoUrl?: string | null;
  /** Sample frames / photos shown in the strip under the preview */
  frames: string[];
  features: TemplateGalleryFeature[];
};
