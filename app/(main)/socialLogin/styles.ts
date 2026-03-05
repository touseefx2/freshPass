import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { Dimensions, StyleSheet } from "react-native";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    backgroundImageContainer: {
      width: "100%",
      height: Dimensions.get("screen").height / 1.85,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    backgroundImage: {
      width: "100%",
      height: "100%",
      resizeMode: "contain",
      backgroundColor: theme.darkGreen,
    },
    topSection: {
      gap: moderateHeightScale(18),
      alignItems: "center",
      justifyContent: "center",
      position: "absolute",
      alignSelf: "center",
      top: Dimensions.get("screen").height * 0.21,
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    logoText: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    taglineContainer: {
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    tagline1: {
      fontSize: fontSize.size46,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
    },
    tagline2: {
      color: theme.orangeBrown,
    },
    paginationDots: {
      flexDirection: "row",
      gap: moderateWidthScale(5),
      alignItems: "center",
    },
    dotActive: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(3),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.white,
    },
    dotAdjacent: {
      width: moderateWidthScale(14),
      height: moderateWidthScale(3),
      borderRadius: moderateWidthScale(2),
      backgroundColor: "rgba(255, 255, 255, 0.5)",
    },
    dotOuter: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(3),
      borderRadius: moderateWidthScale(2),
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    bottomSection: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      padding: moderateWidthScale(25),
      gap: moderateHeightScale(8),
      position: "absolute",
      bottom: 0,
    },
    legalText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size16,
    },
    legalLink: {
      color: theme.link,
      textDecorationLine: "underline",
      fontFamily: fonts.fontMedium,
      textDecorationColor: theme.link,
    },
  });
