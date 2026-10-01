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
    appCard: {
      height: heightScale(165),
    },
    appointmentsScroll: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    verifiedSalonCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      height: heightScale(160),
      width: widthScale(310),
      justifyContent: "center",
      gap: moderateHeightScale(10),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    verifiedCardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    verifiedBadge: {
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    verifiedBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
    },
    dateTimeBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    verifiedCardImage: {
      width: widthScale(28),
      height: widthScale(28),
      borderRadius: widthScale(14),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    salonName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    verifiedCardInfoRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    verifiedCardInfoText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginLeft: moderateWidthScale(6),
      flex: 1,
    },
    loadingContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    errorContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    emptyContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });
