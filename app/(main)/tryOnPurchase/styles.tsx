import { Theme } from "@/src/theme/colors";
import { StyleSheet } from "react-native";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    backgroundImage: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      justifyContent: "flex-end",
      gap: moderateHeightScale(40),
      paddingBottom: moderateHeightScale(22),
    },
    skipButton: {
      position: "absolute",
      top: 0,
      right: moderateWidthScale(20),
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      zIndex: 1,
    },
    skipButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    topSection: {
      alignItems: "center",
      paddingTop: moderateHeightScale(48),
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(5),
    },
    logoText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    title: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(42),
      marginBottom: moderateHeightScale(15),
    },
    titleHighlight: {
      fontFamily: fonts.fontExtraBold,
    },
    description1: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(15),
      paddingHorizontal: moderateWidthScale(8),
    },
    description2: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(8),
    },
    bottomSection: {
      alignItems: "center",
      paddingBottom: moderateHeightScale(32),
    },
    unlockButton: {
      width: "100%",
      maxWidth: widthScale(340),
      marginBottom: moderateHeightScale(16),
    },
    pricingText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      textAlign: "center",
    },
    loaderModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    loaderContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      minWidth: moderateWidthScale(120),
    },
    loaderTitleText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(16),
      textAlign: "center",
    },
  });
