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
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      marginBottom: moderateHeightScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(6),
      elevation: 2,
    },
    jobCardInner: {
      flex: 1,
      flexDirection: "row",
    },
    jobCardAccent: {
      width: moderateWidthScale(4),
      backgroundColor: theme.darkGreen,
      borderTopLeftRadius: moderateWidthScale(14),
      borderBottomLeftRadius: moderateWidthScale(14),
    },
    jobCardContent: {
      flex: 1,
      paddingVertical: moderateHeightScale(18),
      paddingHorizontal: moderateWidthScale(18),
      paddingRight: moderateWidthScale(20),
      justifyContent: "center",
    },
    jobCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
      gap: moderateWidthScale(10),
    },
    jobCardId: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      flex: 1,
      lineHeight: 20,
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
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(8),
      minWidth: moderateWidthScale(64),
      alignItems: "center",
    },
    jobCardStatusBadgeCompleted: {
      backgroundColor: theme.lightGreen1,
    },
    jobCardStatusBadgeFailed: {
      backgroundColor: theme.orangeBrown015,
    },
    jobCardStatusBadgeProcessing: {
      backgroundColor: theme.grey15,
    },
    jobCardStatusText: {
      fontSize: fontSize.size12,
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
      gap: moderateWidthScale(20),
      marginTop: moderateHeightScale(2),
    },
    jobCardMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    jobCardMetaLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      marginRight: moderateWidthScale(4),
    },
    jobCardMetaValue: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.text,
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
  });
