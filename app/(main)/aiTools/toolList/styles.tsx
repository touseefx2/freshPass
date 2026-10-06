import { Theme } from "@/src/theme/colors";
import { StyleSheet } from "react-native";
import {
  moderateHeightScale,
  moderateWidthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

/** Soft, layered card shadow (one elevation level for the whole screen). */
const softShadow = (theme: Theme) => ({
  shadowColor: theme.darkGreen,
  shadowOffset: { width: 0, height: moderateHeightScale(4) },
  shadowOpacity: 0.1,
  shadowRadius: moderateWidthScale(12),
  elevation: 3,
});

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(20),
    },

    // ── Hero ────────────────────────────────────────────────────────
    hero: {
      borderRadius: moderateWidthScale(24),
      overflow: "hidden",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(22),
    },
    heroGlow: {
      position: "absolute",
      top: -moderateWidthScale(60),
      right: -moderateWidthScale(50),
      width: moderateWidthScale(200),
      height: moderateWidthScale(200),
      borderRadius: moderateWidthScale(100),
      backgroundColor: theme.white15,
      opacity: 0.6,
    },
    heroGlowSmall: {
      position: "absolute",
      bottom: -moderateWidthScale(40),
      right: moderateWidthScale(60),
      width: moderateWidthScale(90),
      height: moderateWidthScale(90),
      borderRadius: moderateWidthScale(45),
      backgroundColor: theme.orangeBrown30,
    },
    eyebrow: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white15,
      borderWidth: 1,
      borderColor: theme.white15,
      marginBottom: moderateHeightScale(14),
    },
    eyebrowText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(6),
      maxWidth: "85%",
    },
    heroSubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      lineHeight: fontSize.size20,
      maxWidth: "90%",
    },
    creditChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white,
    },
    creditChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },

    // ── Sections ────────────────────────────────────────────────────
    sectionLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginTop: moderateHeightScale(26),
      marginBottom: moderateHeightScale(12),
    },

    // ── Featured tool ───────────────────────────────────────────────
    featuredShadow: {
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      ...softShadow(theme),
    },
    featuredCard: {
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      padding: moderateWidthScale(16),
      overflow: "hidden",
    },
    featuredTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    featuredIcon: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    featuredTextCol: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    featuredTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    featuredDesc: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    featuredCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(16),
      minHeight: moderateHeightScale(46),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.buttonBack,
    },
    featuredCtaOpen: {
      backgroundColor: theme.darkGreen,
    },
    featuredCtaText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },

    stackGap: {
      height: moderateHeightScale(12),
    },

    // ── Secondary tools (2-up grid) ─────────────────────────────────
    toolGrid: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(12),
    },
    toolShadow: {
      flex: 1,
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      ...softShadow(theme),
    },
    toolCard: {
      flex: 1,
      minHeight: heightScale(150),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(6),
    },
    toolCardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
    },
    toolIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    toolArrow: {
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    toolTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    toolDesc: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size17,
    },

    // ── Library (grouped list) ──────────────────────────────────────
    listShadow: {
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      ...softShadow(theme),
    },
    listCard: {
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(64),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
    },
    listRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    listIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    listTextCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    listTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    listDesc: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },

    // ── Inline tutorial video ───────────────────────────────────────
    tutorialPanel: {
      marginTop: moderateHeightScale(12),
      borderRadius: moderateWidthScale(18),
      overflow: "hidden",
      backgroundColor: theme.black,
      aspectRatio: 16 / 9,
    },
    tutorialVideoRoot: {
      flex: 1,
      width: "100%",
      backgroundColor: theme.black,
    },
    tutorialVideo: {
      width: "100%",
      flex: 1,
    },
    tutorialTimeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      textAlign: "center",
      marginTop: moderateHeightScale(2),
    },
  });
