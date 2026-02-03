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
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      overflow: "hidden",
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
    jobCardContent: {
      flex: 1,
      marginLeft: moderateWidthScale(12),
      justifyContent: "center",
    },
    jobCardLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      marginBottom: moderateHeightScale(2),
    },
    jobCardValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.text,
      marginBottom: moderateHeightScale(4),
    },
    jobCardPrompt: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
  });
