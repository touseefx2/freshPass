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
    scrollContent: {
      flexGrow: 1,
      paddingVertical: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(40),
    },
    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    loadingText: {
      marginTop: moderateHeightScale(16),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(8),
    },
    retryButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textAlign: "center",
    },
    section: {
      marginBottom: moderateHeightScale(28),
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.text,
      marginBottom: moderateHeightScale(8),
    },
    sectionDescription: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      lineHeight: moderateHeightScale(20),
      marginBottom: moderateHeightScale(12),
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(12),
    },
    imageCard: {
      width: "48%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.lightGreen2,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    imageCardInner: {
      width: "100%",
      aspectRatio: 1,
      position: "relative",
    },
    resultImage: {
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    imageLabel: {
      position: "absolute",
      top: moderateHeightScale(8),
      left: moderateWidthScale(8),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(4),
    },
    imageLabelText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    downloadButton: {
      position: "absolute",
      bottom: moderateHeightScale(8),
      right: moderateWidthScale(8),
      backgroundColor: theme.primary,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    downloadButtonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });
