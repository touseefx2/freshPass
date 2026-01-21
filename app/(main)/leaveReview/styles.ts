import { StyleSheet, Dimensions } from "react-native";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(24),
    },
    businessInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
      gap: moderateWidthScale(12),
      // paddingHorizontal: moderateWidthScale(20),
      // paddingTop: moderateHeightScale(20),
    },
    businessLogo: {
      width: widthScale(50),
      height: widthScale(50),
      borderRadius: moderateWidthScale(25),
      backgroundColor: theme.lightGreen2,
      overflow: "hidden",
    },
    businessInfoText: {
      flex: 1,
      maxWidth:"60%"
    },
    businessName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    businessAddress: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      
    },
    navigateButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40/2),
      backgroundColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
    },
    heading: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    subheading: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(20),
    },
    questions: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(20),
      lineHeight: moderateHeightScale(20),
    },
    inputContainer: {
      marginBottom: moderateHeightScale(20),
    },
    textInputContainer: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      minHeight: moderateHeightScale(100),
      marginBottom: moderateHeightScale(8),
      position: "relative",
    },
    textInput: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlignVertical: "top",
      minHeight: moderateHeightScale(100),
    },
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    clearButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
    },
    dropdownArrowButton: {
      padding: moderateWidthScale(4),
      alignItems: "center",
      justifyContent: "center",
    },
    line: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginBottom: moderateHeightScale(12),
    },
    ratingScreenContainer: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(40),
      alignItems: "center",
    },
    ratingScreenTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(20),
    },
    starsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(16),
      marginBottom: moderateHeightScale(32),
    },
    starButton: {
      padding: moderateWidthScale(4),
    },
    rateServiceTitle: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(24),
    },
    ratingScreenDescription: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(20),
    },
    sendFeedbackButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    successContainer: {
      paddingTop: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(20),
    },
    successTitle: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(32),
    },
    successDescription: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(20),
    },
  });

