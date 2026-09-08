import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(14),
    },
    card: {
      width: widthScale(168),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
    },
    imageWrap: {
      width: "100%",
      height: heightScale(148),
      backgroundColor: theme.emptyProfileImage,
      position: "relative",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    heartBadge: {
      position: "absolute",
      top: moderateHeightScale(10),
      right: moderateWidthScale(10),
      width: widthScale(30),
      height: heightScale(30),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryBadge: {
      position: "absolute",
      left: moderateWidthScale(10),
      bottom: moderateHeightScale(10),
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      maxWidth: "78%",
    },
    categoryText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      includeFontPadding: false,
    },
    content: {
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(14),
      gap: moderateHeightScale(6),
    },
    businessName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
      includeFontPadding: false,
    },
    address: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      includeFontPadding: false,
    },
    ownerName: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textTransform: "capitalize",
      includeFontPadding: false,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      marginTop: moderateHeightScale(2),
    },
    ratingText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      includeFontPadding: false,
    },
  });
