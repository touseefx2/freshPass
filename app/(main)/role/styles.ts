import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { StyleSheet } from "react-native";
import { moderateWidthScale, moderateHeightScale } from "@/src/theme/dimensions";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(30),
    },
    mainContent: {
      flex: 1,
    },
    logoContainer: {
      marginBottom: moderateHeightScale(5),
    },
    titleContainer: {
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(7),
    },
    titleText: {
      fontSize: fontSize.size40,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    titlePart2: {
      color: theme.orangeBrown,
    },
    subtitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    mainContent2: {
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: moderateHeightScale(45),
    },
    optionsContainer: {
      gap: moderateHeightScale(14),
    },
    privacyText: {
      marginTop: moderateHeightScale(30),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
  });
