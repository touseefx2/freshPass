import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
      paddingBottom: moderateHeightScale(30),
    },
    scrollContent: {
      flexGrow: 1,
     paddingBottom: moderateHeightScale(15),
    },
    buttonWrapper: {
      marginTop: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(12),
    },
    skipButton: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.darkGreen,
    },
    skipButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    skipButtonDisabled: {
      opacity: 0.5,
    },
  });


