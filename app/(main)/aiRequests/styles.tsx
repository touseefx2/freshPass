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
    loadingFooter: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Segmented tabs ──────────────────────────────────────────────
    tabsRow: {
      flexDirection: "row",
      padding: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
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

    // ── Day headers ─────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(10),
    },
    sectionHeaderText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionCountChip: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },
    sectionCountText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },

    // ── Request row ─────────────────────────────────────────────────
    jobCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      marginBottom: moderateHeightScale(12),
      paddingVertical: moderateHeightScale(14),
      paddingLeft: moderateWidthScale(14),
      paddingRight: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    shadow: {
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(12),
      elevation: 3,
    },
    jobCardHighlighted: {
      borderColor: theme.selectCard,
      borderWidth: 2,
    },
    jobCardIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(13),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    jobCardContent: {
      flex: 1,
      gap: moderateHeightScale(6),
    },
    jobCardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
      paddingRight: moderateWidthScale(6),
    },
    jobCardTypeTitle: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    jobCardStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    jobCardStatusBadgeCompleted: {
      backgroundColor: theme.apptMintBg,
    },
    jobCardStatusBadgeFailed: {
      backgroundColor: theme.lightRed,
    },
    jobCardStatusBadgeProcessing: {
      backgroundColor: theme.orangeBrown01,
    },
    jobCardStatusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
    },
    jobCardPromptText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
      paddingRight: moderateWidthScale(6),
    },
    jobCardFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      marginTop: moderateHeightScale(2),
    },
    jobCardMetaValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    jobCardMetaDot: {
      fontSize: fontSize.size12,
      color: theme.lightGreen5,
    },
    jobCardJobIdMuted: {
      flex: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },

    // ── Load error (list already has rows) ──────────────────────────
    errorBanner: {
      marginTop: moderateHeightScale(8),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightRed,
      borderWidth: 1,
      borderColor: theme.lightRed30,
      gap: moderateHeightScale(10),
    },
    errorBannerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    errorBannerText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });
