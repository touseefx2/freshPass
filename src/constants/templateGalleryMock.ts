import type { TemplateGalleryItem } from "@/src/types/templateGallery";

// Sample templates until the template gallery API is ready (2 video, 2 photo)

const unsplash = (id: string, w = 1080) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const SAMPLE_VIDEO = "https://getfreshpass.com/videos/hair-tryon.MP4";

export const TEMPLATE_GALLERY_MOCK: TemplateGalleryItem[] = [
  {
    id: "video-fresh-cut",
    kind: "video",
    headline: ["Fresh", "Cut"],
    tagline: "Clean & modern",
    name: "Fresh Cut — Clean & Modern",
    description:
      "A clean, professional reel with smooth transitions and modern styling. Perfect for everyday content.",
    coverUrl: unsplash("1503951914875-452162b0f3f1"),
    previewVideoUrl: SAMPLE_VIDEO,
    frames: [
      unsplash("1599351431202-1e0f0137899a"),
      unsplash("1621605815971-fbc98d665033"),
      unsplash("1622286342621-4bd786c2447c"),
      unsplash("1605497788044-5a32c7078486"),
      unsplash("1585747860715-2ba37e788b70"),
      unsplash("1532710093739-9470acff878f"),
      unsplash("1593702295094-aea22597af65"),
      unsplash("1567894340315-735d7c361db0"),
      unsplash("1622287162716-f311baa1a2b8"),
      unsplash("1647140655214-e4a2d914971f"),
    ],
    features: [
      { icon: "auto-awesome-motion", label: "Smooth transitions" },
      { icon: "text-fields", label: "Modern text styles" },
      { icon: "speed", label: "Medium pacing" },
      { icon: "auto-awesome", label: "Great for all services" },
    ],
  },
  {
    id: "video-bold-fade",
    kind: "video",
    headline: ["Bold", "Fade"],
    tagline: "High energy",
    name: "Bold Fade — High Energy",
    description:
      "Fast cuts synced to the beat with punchy captions. Made to grab attention in the first second.",
    coverUrl: unsplash("1621605815971-fbc98d665033"),
    previewVideoUrl: SAMPLE_VIDEO,
    frames: [
      unsplash("1517832606299-7ae9b720a186"),
      unsplash("1596728325488-58c87691e9af"),
      unsplash("1598524374912-6b0b0bab43dd"),
      unsplash("1622287162716-f311baa1a2b8"),
      unsplash("1585747860715-2ba37e788b70"),
      unsplash("1503951914875-452162b0f3f1"),
      unsplash("1567894340315-735d7c361db0"),
      unsplash("1512690459411-b9245aed614b"),
      unsplash("1605497788044-5a32c7078486"),
      unsplash("1532710093739-9470acff878f"),
    ],
    features: [
      { icon: "content-cut", label: "Quick cuts" },
      { icon: "title", label: "Bold captions" },
      { icon: "bolt", label: "Fast pacing" },
      { icon: "graphic-eq", label: "Beat synced" },
    ],
  },
  {
    id: "photo-glow-up",
    kind: "photo",
    headline: ["Glow", "Up"],
    tagline: "Before & after",
    name: "Glow Up — Before & After",
    description:
      "Show the transformation. Side-by-side reveals with a soft zoom on every photo.",
    coverUrl: unsplash("1560066984-138dadb4c035"),
    previewVideoUrl: SAMPLE_VIDEO,
    frames: [
      unsplash("1562322140-8baeececf3df"),
      unsplash("1595476108010-b4d1f102b1b1"),
      unsplash("1634449571010-02389ed0f9b0"),
      unsplash("1516975080664-ed2fc6a32937"),
      unsplash("1487412947147-5cebf100ffc2"),
      unsplash("1580618672591-eb180b1a973f"),
      unsplash("1626383137804-ff908d2753a2"),
      unsplash("1470259078422-826894b933aa"),
      unsplash("1582095133179-bfd08e2fc6b3"),
      unsplash("1559599101-f09722fb4948"),
    ],
    features: [
      { icon: "compare", label: "Before & after reveal" },
      { icon: "zoom-in", label: "Soft zoom" },
      { icon: "slow-motion-video", label: "Slow pacing" },
      { icon: "palette", label: "Great for color & styling" },
    ],
  },
  {
    id: "photo-salon-story",
    kind: "photo",
    headline: ["Salon", "Story"],
    tagline: "Warm & elegant",
    name: "Salon Story — Warm & Elegant",
    description:
      "An elegant photo slideshow with warm tones and gentle fades. Tell the story of your space and team.",
    coverUrl: unsplash("1521590832167-7bcbfaa6381f"),
    previewVideoUrl: SAMPLE_VIDEO,
    frames: [
      unsplash("1600948836101-f9ffda59d250"),
      unsplash("1519699047748-de8e457a634e"),
      unsplash("1560066984-138dadb4c035"),
      unsplash("1633681926022-84c23e8cb2d6"),
      unsplash("1527799820374-dcf8d9d4a388"),
      unsplash("1620331311520-246422fd82f9"),
      unsplash("1521590832167-7bcbfaa6381f"),
      unsplash("1562322140-8baeececf3df"),
      unsplash("1580618672591-eb180b1a973f"),
      unsplash("1595476108010-b4d1f102b1b1"),
    ],
    features: [
      { icon: "gradient", label: "Elegant fades" },
      { icon: "photo-library", label: "Up to 10 photos" },
      { icon: "music-note", label: "Calm music" },
      { icon: "spa", label: "Great for salons & spas" },
    ],
  },
];
