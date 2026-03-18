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
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    mainContent: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(24),
    },
    titleSection: {
      gap: moderateHeightScale(8),
      marginBottom: moderateHeightScale(24),
    },
    title: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size32,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: fontSize.size20,
    },
    content: {
      gap: moderateHeightScale(16),
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      marginTop: moderateHeightScale(-8),
    },
    bottomSection: {
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(32),
      backgroundColor: theme.background,
    },
    buttonWrapper: {
      width: "100%",
    },
  });
