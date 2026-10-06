import { Theme } from "@/src/theme/colors";
import { StyleSheet } from "react-native";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      flexGrow: 1,
      paddingTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(48),
    },
    loadingWithTabs: {
      flex: 1,
      paddingTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    loadingSpinnerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingFooter: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Segmented tabs ──────────────────────────────────────────────
    tabsRow: {
      flexDirection: "row",
      padding: moderateWidthScale(4),
      marginBottom: moderateHeightScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tabButton: {
      flex: 1,
      minHeight: moderateHeightScale(40),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
    },
    tabButtonActive: {
      backgroundColor: theme.buttonBack,
    },
    tabButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    tabButtonTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },

    // ── How cards are grouped ───────────────────────────────────────
    listHintRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      marginBottom: moderateHeightScale(18),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    listHint: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },

    // ── Week card ───────────────────────────────────────────────────
    sectionCardShadow: {
      marginBottom: moderateHeightScale(18),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(14),
      elevation: 4,
    },
    sectionCard: {
      borderRadius: moderateWidthScale(22),
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    sectionCardImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      backgroundColor: theme.lightGreen07,
    },
    sectionCardImageInner: {
      ...StyleSheet.absoluteFillObject,
    },
    sectionCardIconPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionCardIconCircle: {
      width: moderateWidthScale(68),
      height: moderateWidthScale(68),
      borderRadius: moderateWidthScale(34),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionCardScrim: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "55%",
    },
    sectionCardCount: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(9),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    sectionCardCountText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sectionCardOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(16),
    },
    sectionCardTextCol: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    sectionCardTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    sectionCardDateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    sectionCardDate: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    sectionCardArrow: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
  });
