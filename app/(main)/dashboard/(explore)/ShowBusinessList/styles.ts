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
      flex: 1,
    },
    appointmentsScroll: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    verifiedSalonCardNew: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(10),
      height: heightScale(124),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      width: widthScale(310),
      alignSelf: "center",
    },
    verifiedSalonImage: {
      width: widthScale(110),
      height: heightScale(110),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    platformVerifiedBadge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
    },
    platformVerifiedText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    verifiedSalonContent: {
      gap: moderateHeightScale(14),
      width: "60%",
    },
    verifiedSalonBusinessName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    verifiedSalonAddress: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },
    verifiedSalonBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    verifiedSalonRatingButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.white70,
      gap: moderateWidthScale(6),
    },
    verifiedSalonRatingText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    verifiedSalonViewDetail: {},
    verifiedSalonViewDetailText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      textDecorationLine: "underline",
      textDecorationColor: theme.orangeBrown,
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
    businessInfoContainer: {
      gap: moderateHeightScale(6),
    },
    // Services / Subscriptions horizontal scroll
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    servicesScroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(16),
      gap: moderateWidthScale(12),
    },
    serviceCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateWidthScale(12),
      width: widthScale(225),
      minHeight: heightScale(120),
      justifyContent: "space-between",
    },
    serviceTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    servicePrice: {
      alignItems: "flex-end",
      gap: moderateWidthScale(4),
    },
    priceCurrent: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    priceOriginal: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    line: {
      height: 0.5,
      width: "100%",
      backgroundColor: theme.borderLight,
    },
    serviceBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
    },
    serviceDuration: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      maxWidth: "65%",
    },
    serviceButtonContainer: {
      alignSelf: "flex-end",
    },
    subscriptionCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      width: widthScale(200),
      minHeight: heightScale(180),
      overflow: "hidden",
    },
    offerBadgesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(4),
    },
    offerBadge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      alignSelf: "flex-start",
    },
    offerBadgeOrange: {
      backgroundColor: theme.selectCard,
    },
    offerBadgeGreen: {
      borderWidth: 1,
      borderColor: theme.lightGreen,
      borderRadius: moderateWidthScale(999),
    },
    offerText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    subscriptionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginVertical: moderateHeightScale(8),
    },
    inclusionItem: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    moreText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.primary,
      textDecorationLine: "underline",
      textDecorationColor: theme.primary,
    },
    subscriptionPrice: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    subscriptionPriceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      maxWidth: "55%",
    },
    subscriptionButtonContainer: {
      alignSelf: "flex-end",
    },
    button: {
      backgroundColor: theme.bookNowButton,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      height: moderateHeightScale(28),
      borderRadius: moderateWidthScale(999),
    },
    buttonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
    },
    sectionSubTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      maxWidth: "75%",
      textTransform: "capitalize",
    },
    noListFoundContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
      justifyContent: "center",
    },
    noListFoundText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });
