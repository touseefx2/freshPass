import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      height: heightScale(340),
    },
    sectionHeader: {
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    heading: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    subheading: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
  });
