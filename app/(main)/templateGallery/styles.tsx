import { Theme } from "@/src/theme/colors";
import { StyleSheet } from "react-native";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export const GUTTER = moderateWidthScale(16);
/** Space between covers; the neighbours peek in by PEEK on each side */
export const CARD_GAP = moderateWidthScale(10);
export const PEEK = moderateWidthScale(14);
/** Cover height / width */
export const CARD_RATIO = 0.64;
export const CARD_RADIUS = moderateWidthScale(22);
/** Cover title column (share of the cover width) */
export const HEADLINE_WIDTH = 0.62;
/** Neighbour covers while swiping */
export const SIDE_SCALE = 0.92;
export const SIDE_OPACITY = 0.55;
/** Medallion / rings centre (share of the cover width) and medallion size (of its height) */
export const ART_CENTER = 0.81;
export const MEDALLION_RATIO = 0.38;

/**
 * Video Reel tab, CapCut style: full-screen covers from under the header to
 * the bottom of the screen, VIDEO_CARD_GAP apart
 */
export const VIDEO_CARD_GAP = moderateWidthScale(8);
export const VIDEO_HEADLINE_WIDTH = 0.86;
/** Brand art medallion centre (share of the cover height) and size (of its width) */
export const VIDEO_ART_CENTER = 0.4;
export const VIDEO_MEDALLION_RATIO = 0.34;

/** Space around the covers (Photo tab) */
const CAROUSEL_MARGIN = moderateHeightScale(6);
const CAROUSEL_PAD_TOP = moderateHeightScale(12);
const CAROUSEL_PAD_BOTTOM = moderateHeightScale(24);
const PAGE_PAD_BOTTOM = moderateHeightScale(24);

/** Same colors as the app's other skeletons */
export const SKELETON_BG = "#E8DFB8";
export const SKELETON_HIGHLIGHT = "#DCCF9E";

/** Glass surfaces on the dark green cover */
const GLASS = "rgba(255, 255, 255, 0.12)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.28)";
const DEEP_SCRIM = "rgba(24, 33, 14, 0.45)";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: PAGE_PAD_BOTTOM,
    },
    // Swipe target: fills the space under the tabs even when content is short
    swipeArea: {
      flex: 1,
    },
    // Full-width tabs straight under the header, on its green: the
    // selected one in bold white with an orange underline
    segmentBar: {
      backgroundColor: theme.darkGreen,
    },
    padded: {
      paddingHorizontal: GUTTER,
    },
    segment: {
      flexDirection: "row",
    },
    segmentTab: {
      flex: 1,
      minHeight: moderateHeightScale(48),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
    },
    segmentTabActive: {
      borderBottomColor: theme.orangeBrown,
    },
    segmentText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    segmentTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // ── Heading ─────────────────────────────────────────────────────
    headingBlock: {
      paddingHorizontal: moderateWidthScale(6),
    },
    headingRow: {
      marginTop: moderateHeightScale(14),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    title: {
      flexShrink: 1,
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    counterPill: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },
    counterNow: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    counterTotal: {
      fontFamily: fonts.fontMedium,
      color: theme.darkGreenLight,
    },
    subtitle: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },

    // ── Cover carousel ──────────────────────────────────────────────
    carousel: {
      marginTop: CAROUSEL_MARGIN,
    },
    // Room above / below so the list doesn't clip the cover shadow
    carouselContent: {
      paddingTop: CAROUSEL_PAD_TOP,
      paddingBottom: CAROUSEL_PAD_BOTTOM,
    },
    // Rows that slide as one: covers (peek spacing) and info pages (full width)
    coverRow: {
      flexDirection: "row",
      gap: CARD_GAP,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    infoPage: {
      paddingHorizontal: GUTTER,
    },
    cardShadow: {
      borderRadius: CARD_RADIUS,
      backgroundColor: theme.darkGreen,
      shadowColor: theme.darkGreenDeep,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.28,
      shadowRadius: moderateWidthScale(12),
      elevation: 8,
    },
    card: {
      flex: 1,
      borderRadius: CARD_RADIUS,
      overflow: "hidden",
    },
    cardInner: {
      ...StyleSheet.absoluteFillObject,
      padding: moderateWidthScale(16),
      justifyContent: "space-between",
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    // Keeps the chip clear of the sound button (32 + 8 gap)
    cardTopSound: {
      paddingRight: moderateWidthScale(40),
    },
    // Long labels shrink with an ellipsis instead of running under a button
    shrink: {
      flexShrink: 1,
    },
    // Poster under a sample that's showing frames
    posterHidden: {
      opacity: 0,
    },
    kindChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: GLASS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: GLASS_BORDER,
    },
    kindChipText: {
      flexShrink: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    titleBlock: {
      maxWidth: `${HEADLINE_WIDTH * 100}%`,
    },
    coverTitle: {
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      textTransform: "uppercase",
      letterSpacing: -0.3,
    },
    coverTitleAccent: {
      color: theme.orangeBrown,
    },
    // Under the title: "⏱ 0:30  ▦ 6", then the template's song. Ends 64 from
    // the cover's right edge (48 + the 16 padding), clear of the expand button
    coverFacts: {
      marginTop: moderateHeightScale(10),
      marginRight: moderateWidthScale(48),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    coverFact: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    coverFactText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    coverMusic: {
      marginTop: moderateHeightScale(6),
      marginRight: moderateWidthScale(48),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    metaText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    // Right side of the cover: medallion / play button, centred on the rings
    artSide: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    medallion: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: GLASS,
      borderWidth: 1,
      borderColor: GLASS_BORDER,
    },
    expandButton: {
      position: "absolute",
      right: moderateWidthScale(10),
      bottom: moderateWidthScale(10),
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: DEEP_SCRIM,
    },
    // Sound on / off, level with the kind chip; centred over the expand button
    soundButton: {
      position: "absolute",
      top: moderateWidthScale(12),
      right: moderateWidthScale(16),
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: DEEP_SCRIM,
    },

    // ── Video Reel cover (CapCut style) ─────────────────────────────
    // No drop shadow: it was cut off in a grey band just above the dots
    videoCardFlat: {
      shadowOpacity: 0,
      elevation: 0,
      borderRadius: 0,
    },
    // Everything under the tabs; the footer is laid over its bottom
    videoStage: {
      flex: 1,
      overflow: "hidden",
    },
    // Dark between covers mid-swipe instead of cream
    videoStageDark: {
      backgroundColor: theme.darkGreenDeep,
    },
    videoSwipeArea: {
      flex: 1,
    },
    // Full screen: no rounded corners
    videoCardShape: {
      borderRadius: 0,
    },
    // Tabs over the top of the cover (cream bar while nothing is playing)
    videoTabs: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    // Over the video: the header's green, see-through so the video shows
    videoTabsOverlay: {
      backgroundColor: "rgba(40, 54, 24, 0.55)",
    },
    videoTopFade: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    // A soft shadow keeps the white labels readable on any video frame
    videoSegmentText: {
      textShadowColor: "rgba(0, 0, 0, 0.45)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    videoFooter: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    },
    // Over a playing cover: no cream band, the cover's dark fade shows through
    videoFooterOverlay: {
      backgroundColor: "transparent",
    },
    videoDot: {
      backgroundColor: "rgba(255, 255, 255, 0.45)",
    },
    videoDotActive: {
      backgroundColor: theme.white,
    },
    videoCredits: {
      backgroundColor: GLASS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: GLASS_BORDER,
    },
    videoCreditsText: {
      color: theme.white,
    },
    videoCta: {
      backgroundColor: theme.white,
    },
    // Title, facts and song sit at the bottom; nothing at the top
    videoCardInner: {
      paddingBottom: moderateWidthScale(20),
      justifyContent: "flex-end",
    },
    // Paused by a tap: play sign in the middle of the cover
    videoPausedCentre: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    videoPlayBadge: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: DEEP_SCRIM,
      borderWidth: 1,
      borderColor: GLASS_BORDER,
    },
    // Dark fade under the title, facts and song at the bottom
    // Covers the title, facts and song and the footer laid over them
    videoBottomFade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "62%",
    },
    videoTitleBlock: {
      maxWidth: `${VIDEO_HEADLINE_WIDTH * 100}%`,
    },
    // No expand button on this cover, so the facts can run to the edge
    videoMeta: {
      marginRight: 0,
    },
    // Brand art medallion, centred on the rings (VIDEO_ART_CENTER of the height)
    videoArtCentre: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: `${VIDEO_ART_CENTER * 200}%`,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Info row + name card (cross-fade per template) ──────────────
    featuresCard: {
      flexDirection: "row",
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(6),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.borderNormal,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(14),
      elevation: 3,
    },
    feature: {
      flex: 1,
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(4),
    },
    featureLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size17,
    },
    infoCard: {
      marginTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(16),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.borderNormal,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(14),
      elevation: 3,
    },
    infoTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    infoDesc: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreenLight,
      lineHeight: fontSize.size21,
    },
    // What goes in each slot (design templates)
    slotList: {
      marginTop: moderateHeightScale(12),
      gap: moderateHeightScale(10),
    },
    slotListTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    slotRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    slotIcon: {
      width: moderateWidthScale(30),
      height: moderateWidthScale(30),
      borderRadius: moderateWidthScale(15),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    slotText: { flex: 1, minWidth: 0 },
    slotLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    slotDetail: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreenLight,
      lineHeight: fontSize.size18,
    },

    // ── Page dots (in the footer, just above the button) ────────────
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(4),
    },
    dotHit: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(28),
      alignItems: "center",
      justifyContent: "center",
    },
    dot: {
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.borderMedium,
    },
    dotActive: {
      width: moderateWidthScale(22),
      backgroundColor: theme.darkGreen,
    },

    // ── Loading skeleton (same layout as the content) ───────────────
    skeletonCards: {
      flexDirection: "row",
      alignItems: "center",
      gap: CARD_GAP,
    },
    flex: {
      flex: 1,
    },
    skeletonFeatures: {
      flexDirection: "row",
    },
    skeletonFeatureIcon: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
    },
    skeletonFeatureLine: {
      width: "80%",
      height: moderateHeightScale(11),
      borderRadius: moderateWidthScale(4),
    },
    skeletonFeatureLineShort: {
      marginTop: -moderateHeightScale(3),
      width: "50%",
      height: moderateHeightScale(11),
      borderRadius: moderateWidthScale(4),
    },
    skeletonCounter: {
      width: moderateWidthScale(42),
      height: moderateHeightScale(29),
      borderRadius: moderateWidthScale(999),
    },
    skeletonDot: {
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(4),
    },
    skeletonDotActive: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(4),
    },
    skeletonTitle: {
      width: "60%",
      height: moderateHeightScale(18),
      borderRadius: moderateWidthScale(4),
    },
    skeletonLine: {
      marginTop: moderateHeightScale(12),
      width: "92%",
      height: moderateHeightScale(12),
      borderRadius: moderateWidthScale(4),
    },
    skeletonLineShort: {
      marginTop: moderateHeightScale(8),
      width: "64%",
      height: moderateHeightScale(12),
      borderRadius: moderateWidthScale(4),
    },

    // ── Empty / error state ─────────────────────────────────────────
    empty: {
      marginTop: moderateHeightScale(36),
      alignItems: "center",
      gap: moderateHeightScale(8),
    },
    emptyIcon: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
      backgroundColor: theme.lightGreen07,
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size20,
    },
    retry: {
      marginTop: moderateHeightScale(6),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(24),
      borderRadius: heightScale(22),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    retryText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // ── Bottom CTA ──────────────────────────────────────────────────
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: moderateHeightScale(6),
      backgroundColor: theme.background,
    },
    footerFade: {
      position: "absolute",
      left: 0,
      right: 0,
      top: -moderateHeightScale(24),
      height: moderateHeightScale(24),
    },
    // Reel credits left this month (Video tab), just above the button
    credits: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },
    // None left for this template: error tone
    creditsEmpty: {
      backgroundColor: theme.lightRed,
    },
    creditsText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    creditsTextEmpty: {
      color: theme.red,
    },
    ctaButton: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(14),
      height: moderateHeightScale(52),
    },
    ctaText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
    },

    // ── Full screen preview ─────────────────────────────────────────
    fullRoot: {
      flex: 1,
      backgroundColor: theme.black,
      justifyContent: "center",
    },
    fullMedia: {
      width: "100%",
      height: "100%",
    },
    fullClose: {
      position: "absolute",
      right: moderateWidthScale(16),
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white15,
    },
  });
