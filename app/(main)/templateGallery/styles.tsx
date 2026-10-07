import { Theme } from "@/src/theme/colors";
import { StyleSheet } from "react-native";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export const GUTTER = moderateWidthScale(16);
export const CARD_GAP = moderateWidthScale(12);
/** Preview card height / width */
export const CARD_RATIO = 0.59;
export const FRAME_GAP = moderateWidthScale(6);
/** About 5¼ frames fit across, so the strip reads as scrollable */
export const FRAMES_VISIBLE = 5.25;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(16),
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
    title: {
      marginTop: moderateHeightScale(14),
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },

    // ── Preview carousel ────────────────────────────────────────────
    carousel: {
      marginTop: moderateHeightScale(14),
    },
    carouselContent: {
      paddingHorizontal: GUTTER,
    },
    card: {
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      borderWidth: 2,
      borderColor: theme.borderNormal,
      backgroundColor: theme.darkGreen,
    },
    cardActive: {
      borderColor: theme.orangeBrown,
    },
    counterBadge: {
      position: "absolute",
      top: moderateHeightScale(12),
      left: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: "rgba(40, 54, 24, 0.7)",
    },
    counterText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    headlineWrap: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: moderateWidthScale(18),
      maxWidth: "48%",
      justifyContent: "center",
      paddingTop: moderateHeightScale(24),
    },
    headlineLine: {
      fontSize: fontSize.size38,
      lineHeight: fontSize.size38,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      textTransform: "uppercase",
      letterSpacing: -0.5,
    },
    headlineAccent: {
      color: theme.orangeBrown,
    },
    tagline: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    taglineBar: {
      marginTop: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
    },
    taglineBarLine: {
      width: moderateWidthScale(46),
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.orangeBrown,
    },
    taglineBarTick: {
      width: 3,
      height: 6,
      marginLeft: -3,
      marginTop: 3,
      borderRadius: 1,
      backgroundColor: theme.orangeBrown,
    },
    playLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    playButton: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(26),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(40, 54, 24, 0.5)",
      borderWidth: 1.5,
      borderColor: theme.white80,
    },
    expandButton: {
      position: "absolute",
      right: moderateWidthScale(6),
      bottom: moderateHeightScale(6),
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Frames strip ────────────────────────────────────────────────
    frames: {
      marginTop: moderateHeightScale(10),
    },
    framesContent: {
      paddingHorizontal: GUTTER,
      gap: FRAME_GAP,
    },
    frame: {
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.lightGreen1,
    },
    frameImage: {
      width: "100%",
      height: "100%",
    },

    // ── Features ────────────────────────────────────────────────────
    features: {
      marginTop: moderateHeightScale(16),
      flexDirection: "row",
    },
    feature: {
      flex: 1,
      alignItems: "center",
      gap: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(2),
    },
    featureLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size17,
    },

    // ── Description ─────────────────────────────────────────────────
    infoCard: {
      marginTop: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    infoTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    infoDesc: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },

    // ── Page dots ───────────────────────────────────────────────────
    dots: {
      marginTop: moderateHeightScale(6),
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    dotHit: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
    },
    dot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.borderMedium,
    },
    dotActive: {
      backgroundColor: theme.darkGreen,
    },

    // ── Empty state ─────────────────────────────────────────────────
    empty: {
      marginTop: moderateHeightScale(40),
      alignItems: "center",
      gap: moderateHeightScale(8),
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },

    // ── Bottom CTA ──────────────────────────────────────────────────
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: moderateHeightScale(8),
      backgroundColor: theme.background,
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
