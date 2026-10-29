import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  HIRING_CORNER_OVERHANG,
  HIRING_FRAME_WIDTH,
} from "@/src/components/jobs/jobBadges";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    appCard: {
      height: heightScale(132),
    },
    // Room above the cards for the hiring corner badge (only when needed)
    appCardHiring: {
      height: heightScale(132) + HIRING_CORNER_OVERHANG,
    },
    appointmentsScroll: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    appointmentsScrollHiring: {
      paddingTop: HIRING_CORNER_OVERHANG,
    },
    verifiedSalonCardNew: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      // Transparent frame keeps hiring / non-hiring cards the same size
      borderWidth: HIRING_FRAME_WIDTH,
      borderColor: "transparent",
      paddingHorizontal: moderateWidthScale(10) - HIRING_FRAME_WIDTH,
      paddingVertical: moderateHeightScale(10) - HIRING_FRAME_WIDTH,
      height: heightScale(132),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      width: widthScale(310),
    },
    verifiedSalonCardHiring: {
      borderColor: theme.orangeBrown,
    },
    verifiedSalonImage: {
      width: widthScale(110),
      height: heightScale(110),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    platformVerifiedBadge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
    },
    platformVerifiedText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    verifiedSalonContent: {
      flex: 1,
      height: heightScale(110),
      justifyContent: "space-between",
    },
    verifiedSalonBusinessName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
      includeFontPadding: false,
    },
    verifiedSalonAddress: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      includeFontPadding: false,
    },
    verifiedSalonOwnerName: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textTransform: "capitalize",
      includeFontPadding: false,
    },
    verifiedSalonBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    verifiedSalonRatingButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.white70,
      gap: moderateWidthScale(6),
    },
    verifiedSalonRatingText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    verifiedSalonViewDetail: {},
    verifiedSalonViewDetailText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textDecorationLine: "underline",
      textDecorationColor: theme.orangeBrown,
    },
    loadingContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    errorContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    emptyContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    businessInfoContainer: {
      gap: moderateHeightScale(2),
      flexShrink: 1,
    },
  });
