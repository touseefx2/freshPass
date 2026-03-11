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
      borderRadius: moderateWidthScale(24),
      marginBottom: moderateHeightScale(16),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    },
    jobCardInner: {
      flex: 1,
      flexDirection: "row",
    },
    jobCardAccent: {
      width: moderateWidthScale(4),
      backgroundColor: theme.primary,
      borderTopLeftRadius: moderateWidthScale(24),
      borderBottomLeftRadius: moderateWidthScale(24),
    },
    jobCardContent: {
      flex: 1,
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
      paddingLeft: moderateWidthScale(22),
    },
    jobCardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(8),
    },
    jobCardTypeTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.primary,
      flex: 1,
      textTransform: "capitalize",
    },
    jobCardJobIdMuted: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    jobCardPromptBlock: {
      marginBottom: moderateHeightScale(14),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    jobCardPromptText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: fontSize.size18,
    },
    jobCardStatusBadge: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(100),
      alignItems: "center",
      justifyContent: "center",
    },
    jobCardStatusBadgeCompleted: {
      backgroundColor: theme.lightGreen015,
    },
    jobCardStatusBadgeFailed: {
      backgroundColor: theme.appointmentStatus,
    },
    jobCardStatusBadgeProcessing: {
      backgroundColor: theme.grey15,
    },
    jobCardStatusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
    },
    jobCardFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    jobCardMetaLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
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
    listContent: {
      flexGrow: 1,
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(48),
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
