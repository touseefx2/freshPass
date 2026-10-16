import { Dimensions, StyleSheet } from "react-native";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const PAGE_PAD = moderateWidthScale(20);

/** One appointment fills the row; several scroll with the next one peeking. */
export const SINGLE_CARD_WIDTH = Dimensions.get("window").width - PAGE_PAD * 2;
const CARD_WIDTH = Math.min(widthScale(310), SINGLE_CARD_WIDTH);

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    appointmentsScroll: {
      paddingHorizontal: PAGE_PAD,
      paddingTop: moderateHeightScale(6),
      paddingBottom: moderateHeightScale(16),
      gap: moderateWidthScale(12),
    },
    // Clear edge + soft lift so the white card reads on the cream page
    // (the shadow lives on this view, which must not clip, for iOS).
    card: {
      width: CARD_WIDTH,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.14,
      shadowRadius: moderateWidthScale(14),
      elevation: 5,
    },
    topRow: {
      flexDirection: "row",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(14),
      paddingBottom: moderateHeightScale(12),
    },
    dateTile: {
      width: widthScale(62),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    dateMonth: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
      letterSpacing: 1,
    },
    dateDay: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
      lineHeight: fontSize.size28,
    },
    dateWeekday: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    mainText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(4),
    },
    pillRow: {
      flexDirection: "row",
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
    },
    pillSoon: {
      backgroundColor: theme.upcomingCard,
    },
    pillDot: {
      width: widthScale(6),
      height: widthScale(6),
      borderRadius: widthScale(3),
      backgroundColor: theme.buttonBack,
    },
    pillDotSoon: {
      backgroundColor: theme.selectCard,
    },
    pillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    pillTextSoon: {
      color: theme.orangeBrownText,
    },
    serviceName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    metaText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(12),
      marginHorizontal: moderateWidthScale(14),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    staffImage: {
      width: widthScale(28),
      height: widthScale(28),
      borderRadius: widthScale(14),
      backgroundColor: theme.emptyProfileImage,
    },
    staffName: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    footerMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      maxWidth: "45%",
    },
  });
