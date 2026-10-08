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
      paddingBottom: moderateHeightScale(24),
    },
    // Swipe target: fills the space under the tabs even when content is short
    swipeArea: {
      flex: 1,
    },
    segmentBar: {
      paddingHorizontal: moderateWidthScale(8),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(4),
      backgroundColor: theme.background,
    },
    padded: {
      paddingHorizontal: GUTTER,
    },

    // ── Video / Photo segmented control ─────────────────────────────
    segment: {
      flexDirection: "row",
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      overflow: "hidden",
    },
    segmentTab: {
      flex: 1,
      minHeight: moderateHeightScale(42),
      borderRadius: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(10),
    },
    segmentTabActive: {
      backgroundColor: theme.darkGreen,
    },
    segmentText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
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
      marginTop: moderateHeightScale(6),
    },
    // Room above / below so the list doesn't clip the cover shadow
    carouselContent: {
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(24),
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
    accentBar: {
      marginTop: moderateHeightScale(10),
      width: moderateWidthScale(32),
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.orangeBrown,
    },
    metaRow: {
      marginTop: moderateHeightScale(10),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
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
