import { Theme } from "@/src/theme/colors";
import { StyleSheet, Dimensions } from "react-native";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
      flexGrow: 1,
      paddingBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    fieldContainer: {
      marginTop: moderateHeightScale(24),
    },
    label: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(8),
    },
    required: {
      color: theme.red,
    },
    fileInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      minHeight: moderateHeightScale(48),
    },
    fileInputText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      flex: 1,
    },
    imagePreviewContainer: {
      marginTop: moderateHeightScale(16),
      position: "relative",
      width: "100%",
      aspectRatio: 1,
      // height: moderateHeightScale(200),
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.grey15,
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    deleteButton: {
      position: "absolute",
      top: moderateHeightScale(8),
      right: moderateWidthScale(8),
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    mediaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(16),
    },
    mediaItem: {
      position: "relative",
      width: (SCREEN_WIDTH - moderateWidthScale(40) - moderateWidthScale(24)) / 3,
      aspectRatio: 1,
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.grey15,
    },
    mediaThumbnail: {
      width: "100%",
      height: "100%",
    },
    videoThumbnailContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    videoThumbnail: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.grey15,
      alignItems: "center",
      justifyContent: "center",
    },
    videoPlayIcon: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButtonSmall: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    hintText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      marginTop: moderateHeightScale(8),
    },
    audioFileContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(16),
      backgroundColor: theme.grey15,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
    },
    audioFileName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    buttonContainer: {
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    optionIcon: {
      marginRight: moderateWidthScale(16),
    },
    optionText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
    textArea: {
      borderWidth: 1,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      minHeight: moderateHeightScale(120),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      textAlignVertical: "top",
    },
  });
