import { Theme } from "@/src/theme/colors";
import { StyleSheet } from "react-native";
import {
  moderateHeightScale,
  moderateWidthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    headerContainer: {
      alignItems: "center",
    },
    headerButton: {
      width: "100%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    headerGradient: {
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
    },
    featuresContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(16),
    },
    featureBox: {
      width: "45%",
      height: heightScale(140),
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
    },
    gradientContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(12),
      gap: moderateHeightScale(12),
    },
    iconContainer: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    featureTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
    },
    jobCard: {
      flexDirection: "row",
      backgroundColor: theme.white80,
      borderRadius: moderateWidthScale(16),
      marginBottom: moderateHeightScale(24),
      minHeight: heightScale(120),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    jobCardInner: {
      flex: 1,
      flexDirection: "row",
    },
    jobCardAccent: {
      width: moderateWidthScale(4),
      backgroundColor: theme.primary,
      borderTopLeftRadius: moderateWidthScale(16),
      borderBottomLeftRadius: moderateWidthScale(16),
    },
    jobCardContent: {
      flex: 1,
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingRight: moderateWidthScale(20),
      justifyContent: "space-between",
    },
    jobCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
      gap: moderateWidthScale(8),
    },
    jobCardId: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.text,
      flex: 1,
    },
    jobCardTypeTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.primary,
      textTransform: "capitalize",
      flex: 1,
    },
    jobCardJobIdMuted: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
    },
    jobCardStatusBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(20),
      minWidth: moderateWidthScale(72),
      alignItems: "center",
    },
    jobCardStatusBadgeCompleted: {
      backgroundColor: theme.secondary,
    },
    jobCardStatusBadgeFailed: {
      backgroundColor: theme.appointmentStatus,
    },
    jobCardStatusBadgeProcessing: {
      backgroundColor: theme.grey15,
    },
    jobCardStatusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
    },
    jobCardTypeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    jobCardLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.borderMedium,
      marginRight: moderateWidthScale(4),
    },
    jobCardTypeValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.primary,
    },
    jobCardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(4),
      gap: moderateWidthScale(16),
    },
    jobCardMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    jobCardMetaLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    jobCardMetaValue: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginLeft: moderateWidthScale(4),
    },
    jobCardFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: moderateHeightScale(12),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderNormal,
    },
    jobCardSeeResult: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.primary,
      textDecorationLine: "underline",
      textDecorationColor: theme.primary,
    },
    jobCardImageWrap: {
      width: heightScale(72),
      height: heightScale(72),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      backgroundColor: theme.lightGreen2,
    },
    jobCardImage: {
      width: "100%",
      height: "100%",
    },
    jobCardPrompt: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
    listContent: {
      flexGrow: 1,
      paddingVertical: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(40),
    },
    loadingFooter: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateContainer: {
      flexGrow: 1,
      paddingVertical: moderateHeightScale(48),
      paddingHorizontal: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
    jobCardSeeResult: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
      alignSelf: "flex-end",
    },
  });
