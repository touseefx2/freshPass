import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  StatusBar,
  Dimensions,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { setBusinessData as setBusinessDataAction } from "@/src/state/slices/bsnsSlice";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  PlatformVerifiedStarIcon,
  LeafLogo,
  OpenFullIcon,
  MapPinIcon,
  PhoneIconContact,
  ShareIcon,
  GlobeIcon,
  StarIconBusinessDetail,
  LocationPinIconBusinessDetail,
  PhoneIconBusinessDetail,
  PhoneIconWhite,
  PeopleIcon,
  CloseIconBusinessDetail,
  BackArrowIcon,
  ChevronRightIconBusinessDetail,
} from "@/assets/icons";
import InclusionsModal from "@/src/components/inclusionsModal";
import FullImageModal from "@/src/components/fullImageModal";
import Button from "@/src/components/button";
import { ApiService, checkInternetConnection } from "@/src/services/api";
import { businessEndpoints, reviewsEndpoints } from "@/src/services/endpoints";
import RetryButton from "@/src/components/retryButton";
import ExploreSegmentToggle, {
  type ExploreSegmentValue,
} from "../dashboard/(explore)/ExploreSegmentToggle";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: moderateHeightScale(Platform.OS === "ios" ? 45 : 35),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    backButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(8),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    iconButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    heroImageContainer: {
      width: SCREEN_WIDTH,
      height: heightScale(270),
      position: "relative",
      backgroundColor: theme.darkGreen,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    openFullButton: {
      position: "absolute",
      bottom: moderateHeightScale(16),
      right: moderateWidthScale(16),
      backgroundColor: theme.selectCard,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    openFullButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    thumbnailContainer: {
      paddingVertical: moderateHeightScale(4),
      backgroundColor: theme.darkGreen,
    },
    thumbnailScroll: {
      flexDirection: "row",
      gap: moderateWidthScale(7),
    },
    thumbnail: {
      width: widthScale(52),
      height: heightScale(52),
      backgroundColor: theme.lightGreen2,
      borderWidth: moderateWidthScale(1),
    },
    infoSection: {
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(20),
    },
    badgeRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
    },
    platformVerifiedBadge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    platformVerifiedText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    discountBadge: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
    },
    discountBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    ratingBadge: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
      marginBottom: moderateHeightScale(12),
      borderWidth: 1,
      borderColor: theme.white70,
    },
    ratingText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    businessLogo: {
      width: 40,
      height: 40,
      borderRadius: 40 / 2,
      backgroundColor: theme.lightGreen2,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    businessName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(6),
    },
    addressText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      flex: 1,
    },
    staffRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    staffText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },
    tabsContainer: {
      backgroundColor: "rgba(221, 161, 94, 0.3)",
      flexDirection: "row",
      borderBottomWidth: moderateWidthScale(1),
      borderBottomColor: theme.borderLight,
    },
    tab: {
      flex: 1,
      paddingVertical: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    tabText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    tabTextActive: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tabUnderline: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: moderateHeightScale(2.5),
      backgroundColor: theme.selectCard,
    },
    contentContainer: {
      backgroundColor: theme.background,
      // paddingTop: moderateHeightScale(20),
    },
    sectionContent: {
      paddingHorizontal: moderateWidthScale(20),
    },
    sectionContentFullWidth: {
      paddingHorizontal: moderateWidthScale(20),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    aboutText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(20),
      marginBottom: moderateHeightScale(8),
    },
    readMoreLink: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    sectionDivider: {
      borderTopWidth: moderateWidthScale(1),
      borderTopColor: theme.borderLight,
      marginTop: moderateHeightScale(24),
    },
    divider: {
      borderTopWidth: moderateWidthScale(1),
      borderTopColor: theme.borderLight,
      marginVertical: moderateHeightScale(16),
    },
    shopLocationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(20),
    },
    shopLocationText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      flex: 1,
      maxWidth: "75%",
    },
    mapIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 50 / 2,
      borderWidth: moderateWidthScale(1),
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    phoneIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 50 / 2,
      borderWidth: moderateWidthScale(1),
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    contactPhoneRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flex: 1,
      marginLeft: moderateWidthScale(8),
    },
    phoneText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    callNowButton: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(999),
    },
    callNowButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    businessHoursHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
    },
    viewAllLink: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.orangeBrown,
    },
    hoursCardsContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
    },
    hoursCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      minWidth: widthScale(120),
    },
    hoursDay: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    hoursTime: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    hoursBreak: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(4),
    },
    viewBreaksLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      marginTop: moderateHeightScale(4),
      textDecorationLine: "underline",
    },
    noHoursText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(12),
      marginBottom: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    serviceSection: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      marginBottom: moderateHeightScale(16),
      // paddingVertical: moderateWidthScale(16),
    },
    serviceSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
    },
    serviceSectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    filterContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(16),
      backgroundColor: theme.lightGreen05,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      borderTopRightRadius: moderateWidthScale(12),
      borderTopLeftRadius: moderateWidthScale(12),
    },
    filterButton: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.borderLight,
    },
    filterButtonActive: {
      backgroundColor: theme.lightGreen015,
      borderColor: theme.darkGreen,
    },
    filterButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    filterButtonTextActive: {
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    membershipCard: {
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(12),
      borderBottomWidth: moderateWidthScale(1),
      borderBottomColor: theme.borderLight,
    },
    membershipCardContent: {
      padding: moderateWidthScale(16),
      flexDirection: "row",
      justifyContent: "space-between",
    },
    membershipCardLeft: {
      flex: 1,
    },
    membershipCardRight: {
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    membershipTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
      textTransform: "capitalize",
    },
    membershipVisits: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    membershipInclusions: {
      marginBottom: moderateHeightScale(12),
    },
    inclusionItem: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    moreText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.primary,
      textDecorationLine: "underline",
    },
    membershipPriceLeft: {
      flexDirection: "column",
      alignItems: "flex-end",
      marginBottom: moderateHeightScale(12),
    },
    membershipPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    membershipOriginalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textDecorationLine: "line-through",
    },
    serviceCard: {
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(12),
      borderBottomWidth: moderateWidthScale(1),
      borderBottomColor: theme.borderLight,
    },
    serviceCardContent: {
      padding: moderateWidthScale(16),
      flexDirection: "row",
      justifyContent: "space-between",
    },
    serviceCardLeft: {
      flex: 1,
    },
    serviceLabel: {
      alignSelf: "flex-start",
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      marginBottom: moderateHeightScale(8),
    },
    serviceLabelText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    serviceName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      textTransform: "capitalize",
    },
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    servicePriceContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    servicePrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceOriginalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textDecorationLine: "line-through",
    },
    serviceDuration: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    serviceCardRight: {
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    bookNowButton: {
      backgroundColor: theme.orangeBrown,
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(999),
    },
    bookNowButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    disabledAction: {
      opacity: 0.4,
    },
    inclusionsModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    inclusionsModalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(20),
      width: widthScale(300),
      maxHeight: heightScale(400),
    },
    inclusionsModalTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    inclusionsModalList: {
      gap: moderateHeightScale(8),
    },
    inclusionsModalItem: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    staffSectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    staffGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(12),
    },
    staffCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      width: (SCREEN_WIDTH - moderateWidthScale(52)) / 2,
      gap: moderateWidthScale(12),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    staffImageWrapper: {
      position: "relative",
      width: widthScale(35),
      height: widthScale(35),
      justifyContent: "center",
      alignItems: "center",
    },
    staffProfileImage: {
      width: widthScale(35),
      height: widthScale(35),
      borderRadius: widthScale(35) / 2,
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    staffStatusDot: {
      position: "absolute",
      bottom: moderateHeightScale(-2),
      right: moderateWidthScale(-2),
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10) / 2,
      borderWidth: 1,
      borderColor: theme.white,
    },
    staffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    staffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
    },
    staffInfo: {
      flex: 1,
    },
    staffName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
      textTransform: "capitalize",
    },
    staffExperience: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    loadMoreButton: {
      alignItems: "center",
      marginTop: moderateHeightScale(20),
      paddingVertical: moderateHeightScale(8),
    },
    loadMoreText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
    },
    noServiceContainer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    noServiceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    seeMoreCard: {
      marginHorizontal: moderateWidthScale(12),
      marginBottom: moderateHeightScale(16),
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    seeMorePreviewContainer: {
      opacity: 0.3,
    },
    seeMoreTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    seeMoreBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(4),
      gap: moderateWidthScale(8),
    },
    seeMoreOverlayCard: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
    },
    seeMoreTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "right",
    },
    seeMoreSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "right",
    },
    seeMorePreviewTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      flex: 1,
    },
    seeMorePreviewSubtitle: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    ratingsSectionContent: {
      // No padding here - let scroll be full width
    },
    ratingSummaryContainer: {
      marginBottom: moderateHeightScale(20),
    },
    ratingBadgeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    ratingBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    averageRatingText: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewsHorizontalScroll: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(12),
    },
    reviewCard: {
      borderRadius: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    reviewCardHorizontal: {
      width: widthScale(280),
      minHeight: heightScale(200),
    },
    reviewCardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    reviewAvatar: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
      backgroundColor: theme.lightGreen2,
    },
    reviewAvatarImage: {
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: moderateWidthScale(4),
    },
    reviewUserInfo: {
      flex: 1,
    },
    reviewNameText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewDateText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
    },
    reviewSuggestionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
      marginBottom: moderateHeightScale(8),
    },
    reviewStarsRow: {
      flexDirection: "row",
      marginBottom: moderateHeightScale(12),
    },
    reviewStarIcon: {
      marginRight: moderateWidthScale(4),
    },
    reviewCardTextContainer: {
      justifyContent: "flex-start",
    },
    reviewCardTextContainerHorizontal: {
      minHeight: heightScale(100),
    },
    reviewCardText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(20),
    },
    reviewSeeMoreText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
      marginTop: moderateHeightScale(12),
    },
    writeReviewButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(12),
    },
    showAllReviewsButton: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    showAllReviewsText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    policyItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: moderateWidthScale(1),
      borderColor: theme.borderLight,
    },
    policyItemText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    reviewModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    reviewModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(20),
    },
    reviewModalTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewModalCloseButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
    },
    fullReviewModalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      width: "85%",
      alignSelf: "center",
      maxHeight: heightScale(600),
      padding: moderateWidthScale(20),
    },
    fullReviewModalContent: {
      maxHeight: heightScale(500),
    },
    fullReviewCardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(16),
    },
    fullReviewText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(22),
      marginTop: moderateHeightScale(12),
    },
    writeReviewModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    writeReviewModalContainer: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(20),
      borderTopRightRadius: moderateWidthScale(20),
      maxHeight: SCREEN_HEIGHT * 0.9,
      paddingBottom: moderateHeightScale(20),
    },
    writeReviewModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(16),
      borderBottomWidth: moderateWidthScale(1),
      borderBottomColor: theme.borderLight,
    },
    writeReviewModalTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    writeReviewModalCloseButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
    },
    writeReviewModalContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
    },
    writeReviewBusinessInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
      gap: moderateWidthScale(12),
    },
    writeReviewBusinessLogo: {
      width: widthScale(50),
      height: widthScale(50),
      borderRadius: moderateWidthScale(25),
      backgroundColor: theme.lightGreen2,
      overflow: "hidden",
    },
    writeReviewBusinessLogoImage: {
      width: "100%",
      height: "100%",
    },
    writeReviewBusinessInfoText: {
      flex: 1,
    },
    writeReviewBusinessName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    writeReviewBusinessAddress: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    writeReviewNavigateButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
    },
    writeReviewHeading: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    writeReviewSubheading: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(20),
    },
    writeReviewQuestions: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(20),
      lineHeight: moderateHeightScale(20),
    },
    writeReviewInputContainer: {
      marginBottom: moderateHeightScale(20),
    },
    writeReviewInputLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    writeReviewInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: moderateWidthScale(8),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    writeReviewInput: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      padding: 0,
    },
    writeReviewTextAreaWrapper: {
      borderRadius: moderateWidthScale(8),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      minHeight: heightScale(120),
    },
    writeReviewTextArea: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlignVertical: "top",
      padding: 0,
    },
    writeReviewClearButton: {
      width: widthScale(24),
      height: heightScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: moderateWidthScale(8),
    },
    writeReviewContinueButton: {
      marginTop: moderateHeightScale(20),
    },
    ownerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
      gap: moderateWidthScale(12),
    },
    ownerAvatar: {
      width: widthScale(50),
      height: widthScale(50),
      borderRadius: moderateWidthScale(25),
      backgroundColor: theme.lightGreen2,
      borderWidth: moderateWidthScale(1),
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    ownerAvatarImage: {
      width: "100%",
      height: "100%",
    },
    ownerInfo: {
      flex: 1,
    },
    ownerName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    ownerEmail: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    ownerPhone: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });
export default function BusinessDetailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ business_id?: string }>();
  const [activeTab, setActiveTab] = useState<
    "Details" | "Service" | "Ratings" | "Staff"
  >("Service");
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentHeroImage, setCurrentHeroImage] = useState<string>(
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80",
  );
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [serviceSegment, setServiceSegment] =
    useState<ExploreSegmentValue>("individual");
  const [showAllIndividualServices, setShowAllIndividualServices] =
    useState(false);
  const [showAllMembershipSubscriptions, setShowAllMembershipSubscriptions] =
    useState(false);
  const [selectedMembershipFilter, setSelectedMembershipFilter] =
    useState("All");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<
    string | null
  >(null);
  const [inclusionsModalVisible, setInclusionsModalVisible] = useState(false);
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [breaksModalVisible, setBreaksModalVisible] = useState(false);
  const [selectedBreaks, setSelectedBreaks] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [fullReviewModalVisible, setFullReviewModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;
  const isBusinessOwnerView =
    user.userRole === "business" &&
    user.business_id &&
    params.business_id &&
    user.business_id?.toString() === params.business_id?.toString();

  // Refs for scroll positions
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const detailsSectionRef = useRef<View>(null);
  const serviceSectionRef = useRef<View>(null);
  const ratingsSectionRef = useRef<View>(null);
  const staffSectionRef = useRef<View>(null);
  const sectionPositions = useRef<{ [key: string]: number }>({});

  // Default portfolio images
  const DEFAULT_PORTFOLIO_IMAGES = [
    process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE ?? "",
  ];

  // API state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const [serviceTemplates, setServiceTemplates] = useState<
    Array<{
      id: number;
      name: string;
      category_id: number;
      category: string;
      base_price: number;
      duration_hours: number;
      duration_minutes: number;
      active: boolean;
      createdAt: string;
    }>
  >([]);

  // Reviews API state
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsAverageRating, setReviewsAverageRating] = useState(0);

  const [isFavorited, setIsFavorited] = useState<boolean | null>(null);

  // Fetch business details
  const fetchBusinessDetails = async () => {
    if (!params.business_id) {
      setError("Business ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: any;
        };
      }>(businessEndpoints.businessDetails(params.business_id));

      if (response.success && response.data?.business) {
        setBusinessData(response.data.business);
        setIsFavorited(
          typeof response.data.business.is_favorited === "boolean"
            ? response.data.business.is_favorited
            : false,
        );
      } else {
        setError("Failed to load business details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load business details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBusinessDetails();
      fetchReviews();
    }, []),
  );

  const handleToggleFavorite = async () => {
    const isInternetConnected = await checkInternetConnection();
    if (!isInternetConnected) {
      Alert.alert(t("error"), t("noInternetConnection"));
      return;
    }

    if (!params.business_id || isFavorited === null) {
      return;
    }

    const previousValue = isFavorited;
    const nextValue = !previousValue;

    // Optimistic UI update
    setIsFavorited(nextValue);
    setBusinessData((prev: any) =>
      prev ? { ...prev, is_favorited: nextValue } : prev,
    );

    try {
      const response = await ApiService.post<{
        success: boolean;
        favorited?: boolean;
      }>(businessEndpoints.favorite(params.business_id));

      if (!response?.success) {
        // Revert on failure
        setIsFavorited(previousValue);
        setBusinessData((prev: any) =>
          prev ? { ...prev, is_favorited: previousValue } : prev,
        );
        return;
      }

      if (typeof response.favorited === "boolean") {
        setIsFavorited(response.favorited);
        setBusinessData((prev: any) =>
          prev ? { ...prev, is_favorited: response.favorited } : prev,
        );
      }
    } catch (error) {
      // Revert on error
      setIsFavorited(previousValue);
      setBusinessData((prev: any) =>
        prev ? { ...prev, is_favorited: previousValue } : prev,
      );
    }
  };

  // Fetch service templates for this business category
  useEffect(() => {
    const categoryId = businessData?.category?.id;

    if (!categoryId) {
      setServiceTemplates([]);
      // Reset filter to show all services
      setSelectedServiceFilter(null);
      return;
    }

    let isCancelled = false;

    const fetchServiceTemplates = async () => {
      try {
        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: Array<{
            id: number;
            name: string;
            category_id: number;
            category: string;
            base_price: number;
            duration_hours: number;
            duration_minutes: number;
            active: boolean;
            createdAt: string;
          }>;
        }>(businessEndpoints.serviceTemplates(categoryId));

        if (!isCancelled && response.success && response.data) {
          setServiceTemplates(response.data);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch service templates:", e);
      }
    };

    fetchServiceTemplates();

    return () => {
      isCancelled = true;
    };
  }, [businessData?.category?.id]);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    if (!params.business_id) {
      return;
    }

    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: any[];
        meta: {
          current_page: number;
          per_page: number;
          total: number;
          last_page: number;
          from: number;
          to: number;
        };
        averages: {
          overall_average_rating: number;
        };
      }>(
        reviewsEndpoints.list({
          business_id: params.business_id,
          page: 1,
          per_page: 10,
        }),
      );

      if (response.success && response.data) {
        setReviewsData(response.data);
        setReviewsTotal(response.meta?.total || 0);
        setReviewsAverageRating(response.averages?.overall_average_rating || 0);
      } else {
        setReviewsError("Failed to load reviews");
      }
    } catch (err: any) {
      setReviewsError(err.message || "Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  }, [params.business_id]);

  // Get user location from Redux
  const userLocation = useAppSelector((state) => state.user.location);
  // Get current user ID from Redux
  const currentUserId = useAppSelector((state) => state.user.id);

  // Map API data to component data
  // Combine country_code and phone if both are available
  const businessPhone = useMemo(() => {
    const phone = businessData?.phone;
    const countryCode = businessData?.country_code;

    if (phone && countryCode) {
      // Combine country code and phone number
      return `${countryCode}${phone}`;
    } else if (phone) {
      return phone;
    }
    return ""; // Return empty string if no phone
  }, [businessData?.phone, businessData?.country_code]);

  const ownerPhone = useMemo(() => {
    const phone = businessData?.owner?.phone;
    const countryCode = businessData?.owner?.country_code;

    if (phone && countryCode) {
      return `${countryCode}${phone}`;
    } else if (phone) {
      return phone;
    }
    return null;
  }, [businessData?.owner?.phone, businessData?.owner?.country_code]);

  const businessName = businessData?.title || "Ra Benjamin Styles LLC";
  const businessLatitude = businessData?.latitude
    ? parseFloat(businessData.latitude)
    : null;
  const businessLongitude = businessData?.longitude
    ? parseFloat(businessData.longitude)
    : null;
  const businessAddress =
    businessData?.address ||
    "240 E Exchange Blvd, Columbia, SC 29209, United States";

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Format travel time to readable format (days, hours, minutes)
  const formatTravelTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min away`;
    }

    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days} day${days > 1 ? "s" : ""}`);
    }
    if (hours > 0) {
      parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    }
    if (mins > 0 && days === 0) {
      // Only show minutes if less than a day
      parts.push(`${mins} min${mins > 1 ? "s" : ""}`);
    }

    return parts.join(" ") + " away";
  };

  // Calculate travel time in minutes
  const calculateTravelTime = useMemo(() => {
    // Check if user location is valid (not null)
    if (
      userLocation?.lat === null ||
      userLocation?.lat === undefined ||
      userLocation?.long === null ||
      userLocation?.long === undefined
    ) {
      return null;
    }

    // Check if business location is valid (not null)
    if (
      businessLatitude === null ||
      businessLatitude === undefined ||
      businessLongitude === null ||
      businessLongitude === undefined
    ) {
      return null;
    }

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.long,
      businessLatitude,
      businessLongitude,
    );

    // Average speed: 30 km/h for city driving (0.5 km/min)
    const averageSpeedKmPerMin = 0.5;
    const travelTimeMinutes = Math.round(distance / averageSpeedKmPerMin);

    return travelTimeMinutes;
  }, [
    userLocation?.lat,
    userLocation?.long,
    businessLatitude,
    businessLongitude,
  ]);

  // Handle phone call
  const handleCallNow = async () => {
    const phoneNumber = businessPhone.replace(/[^\d+]/g, ""); // Remove non-digit characters except +
    const phoneUrl = `tel:${phoneNumber}`;

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(t("error"), t("unableToMakePhoneCall"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToMakePhoneCall"));
    }
  };

  // Handle location navigation to Google Maps
  const handleLocationPress = async () => {
    const encodedName = encodeURIComponent(businessName);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${businessLatitude},${businessLongitude}&query_place_id=${encodedName}`;

    try {
      const canOpen = await Linking.canOpenURL(googleMapsUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback to Apple Maps on iOS if Google Maps not available
        if (Platform.OS === "ios") {
          const appleMapsUrl = `http://maps.apple.com/?ll=${businessLatitude},${businessLongitude}&q=${encodedName}`;
          await Linking.openURL(appleMapsUrl);
        } else {
          Alert.alert(t("error"), t("unableToOpenMaps"));
        }
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToOpenMaps"));
    }
  };

  // Handle navigation to Google Maps from review modal
  const handleReviewModalNavigate = async () => {
    if (!businessLatitude || !businessLongitude) {
      Alert.alert(t("error"), t("locationNotAvailable"));
      return;
    }
    const encodedName = encodeURIComponent(businessName);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${businessLatitude},${businessLongitude}&query_place_id=${encodedName}`;

    try {
      const canOpen = await Linking.canOpenURL(googleMapsUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback to Apple Maps on iOS if Google Maps not available
        if (Platform.OS === "ios") {
          const appleMapsUrl = `http://maps.apple.com/?ll=${businessLatitude},${businessLongitude}&q=${encodedName}`;
          await Linking.openURL(appleMapsUrl);
        } else {
          Alert.alert(t("error"), t("unableToOpenMaps"));
        }
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToOpenMaps"));
    }
  };

  // Get business logo URL
  const getBusinessLogoUrl = () => {
    if (businessData?.logo_url) {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
      return `${baseUrl}${businessData.logo_url}`;
    }
    return process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ?? "";
  };

  // Map portfolio photos from API or use defaults
  const portfolioPhotos = useMemo(() => {
    if (
      businessData?.portfolio_photos &&
      businessData.portfolio_photos.length > 0
    ) {
      return businessData.portfolio_photos.map((photo: any) => {
        if (photo.url) return photo.url;
        if (photo.path) {
          return photo.path.startsWith("http")
            ? photo.path
            : `${process.env.EXPO_PUBLIC_API_BASE_URL}${photo.path}`;
        }
        return DEFAULT_PORTFOLIO_IMAGES[0];
      });
    }
    return DEFAULT_PORTFOLIO_IMAGES;
  }, [businessData]);

  // Update hero image when portfolio photos change
  useEffect(() => {
    if (portfolioPhotos.length > 0) {
      setCurrentHeroImage(portfolioPhotos[0]);
    }
  }, [portfolioPhotos]);

  const thumbnails = portfolioPhotos;

  const handleOpenFullImage = () => {
    setSelectedImage(currentHeroImage);
    setImageModalVisible(true);
  };

  const handleThumbnailSelect = (image: string) => {
    setCurrentHeroImage(image);
  };

  // Map business hours from API
  const formatTime = (time: string | null) => {
    if (!time) return "Closed";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const businessHours = useMemo(() => {
    if (
      !businessData?.hours ||
      (Array.isArray(businessData.hours) && businessData.hours.length === 0)
    ) {
      return [];
    }

    const dayNames: { [key: string]: string } = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    };

    return businessData.hours.map((hour: any) => {
      const dayName = dayNames[hour.day.toLowerCase()] || hour.day;
      if (hour.closed) {
        return { day: dayName, time: "Holiday/Closed", breakHours: [] };
      }
      const openingTime = formatTime(hour.opening_time);
      const closingTime = formatTime(hour.closing_time);
      const breakHours = hour.break_hours || [];
      return {
        day: dayName,
        time: `${openingTime} - ${closingTime}`,
        breakHours: breakHours.map((breakHour: any) => ({
          start: formatTime(breakHour.start),
          end: formatTime(breakHour.end),
        })),
      };
    });
  }, [businessData]);

  // Get current day name
  const getCurrentDayName = () => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date().getDay()];
  };

  // Map subscription plans from API
  const membershipSubscriptions = useMemo(() => {
    if (!businessData?.subscription_plans) return [];
    return businessData.subscription_plans.map((plan: any) => ({
      id: plan.id,
      title: plan.name,
      visits: `${plan.visits} visit${plan.visits !== 1 ? "s" : ""} per month`,
      price: parseFloat(plan.price),
      originalPrice: parseFloat(plan.price) * 0.8, // Estimate original price
      inclusions:
        plan.services?.map(
          (service: any, index: number) => `${index + 1}. ${service.name}`,
        ) || [],
    }));
  }, [businessData]);

  // Map services from API
  const individualServices = useMemo(() => {
    if (!businessData?.services) return [];
    return businessData.services.map((service: any) => {
      const hours = service.duration_hours || 0;
      const minutes = service.duration_minutes || 0;
      let duration = "";
      if (hours > 0 && minutes > 0) {
        duration = `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        duration = `${hours}h`;
      } else if (minutes > 0) {
        duration = `${minutes} Mins`;
      } else {
        duration = "45 Mins";
      }

      return {
        id: service.id,
        name: service.name,
        description: service.description || "No description",
        price: parseFloat(service.price),
        originalPrice: parseFloat(service.price) * 1.1, // Estimate original price
        duration: duration,
        label: null,
      };
    });
  }, [businessData]);

  const filteredIndividualServices = useMemo(() => {
    if (!individualServices || individualServices.length === 0) {
      return [];
    }

    if (!selectedServiceFilter || selectedServiceFilter === "All") {
      return individualServices;
    }

    const targetName = selectedServiceFilter.trim().toLowerCase();

    return individualServices.filter((service: any) => {
      const name = (service.name ?? "").toString().trim().toLowerCase();
      return name === targetName;
    });
  }, [individualServices, selectedServiceFilter]);

  const membershipFilters = [
    "All",
    "Classic Care",
    "Gold Glam",
    "VIP Elite",
    "Platinum",
  ];
  const serviceFilters = useMemo(() => {
    if (!serviceTemplates || serviceTemplates.length === 0) {
      return ["All"];
    }

    const uniqueNames = Array.from(
      new Set(
        serviceTemplates
          .map((template) => template.name)
          .filter(
            (name): name is string =>
              typeof name === "string" && name.trim().length > 0,
          ),
      ),
    );

    return ["All", ...uniqueNames];
  }, [serviceTemplates]);

  const DEFAULT_AVATAR_URL = process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";

  // Map staff from API
  const staffMembers = useMemo(() => {
    if (!businessData?.staff) return [];

    return businessData.staff
      .filter((staff: any) => staff.invitation_status === "accepted")
      .map((staff: any) => {
        let image = DEFAULT_AVATAR_URL;

        if (staff.avatar) {
          const isAbsoluteUrl =
            typeof staff.avatar === "string" &&
            (staff.avatar.startsWith("http://") ||
              staff.avatar.startsWith("https://"));

          if (isAbsoluteUrl) {
            image = staff.avatar;
          } else {
            image = `${process.env.EXPO_PUBLIC_API_BASE_URL}${staff.avatar}`;
          }
        }

        return {
          id: staff.id || staff.user_id || 0,
          name: staff.name || "Staff Member",
          experience: staff?.description || null,
          image: image,
          active: staff.active,
        };
      });
  }, [businessData]);
  const averageRating = businessData?.average_rating || 0;
  const totalReviews = businessData?.ratings_count || reviewsTotal || 0;
  const textWrapLength = 115;

  const handleTabPress = (tab: "Details" | "Service" | "Ratings" | "Staff") => {
    setActiveTab(tab);
    const sectionKey = tab.toLowerCase();
    const position = sectionPositions.current[sectionKey];
    if (position !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, position - moderateHeightScale(80)), // Offset for tabs and header
        animated: true,
      });
    }
  };

  const measureSectionPosition = (
    sectionRef: React.RefObject<View | null>,
    key: string,
  ) => {
    if (sectionRef.current && scrollContentRef.current) {
      sectionRef.current.measureLayout(
        scrollContentRef.current,
        (x, y) => {
          sectionPositions.current[key] = y;
        },
        () => {
          // Fallback - use onLayout position if measureLayout fails
        },
      );
    }
  };

  const getStars = (rating: number) => {
    const stars: ("star" | "star-half" | "star-border")[] = [];
    const ratingNum = parseFloat(rating.toString());
    for (let i = 1; i <= 5; i += 1) {
      if (ratingNum >= i) {
        stars.push("star");
      } else if (ratingNum >= i - 0.5) {
        stars.push("star-half");
      } else {
        stars.push("star-border");
      }
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("MMMM D, YYYY");
  };

  const getProfileImageUrl = (avatar: string | null) => {
    if (avatar) {
      const isAbsoluteUrl =
        avatar.startsWith("http://") || avatar.startsWith("https://");

      if (isAbsoluteUrl) {
        return avatar;
      }

      return `${process.env.EXPO_PUBLIC_API_BASE_URL}${avatar}`;
    }
    return DEFAULT_AVATAR_URL;
  };

  // Get owner avatar URL
  const getOwnerAvatarUrl = () => {
    const avatar = businessData?.owner?.avatar ?? null;

    if (avatar) {
      const isAbsoluteUrl =
        avatar.startsWith("http://") || avatar.startsWith("https://");

      if (isAbsoluteUrl) {
        return avatar;
      }

      return `${process.env.EXPO_PUBLIC_API_BASE_URL}${avatar}`;
    }

    return DEFAULT_AVATAR_URL;
  };

  // Format owner phone with country code

  const renderReviewCard = (review: any, isHorizontal = false, index = 0) => {
    const reviewText = review.comment || "";
    const shouldShowSeeMore = reviewText.length > textWrapLength;
    const suggestionTitle = review.review_suggestion?.title || null;

    return (
      <View
        style={[styles.reviewCard, isHorizontal && styles.reviewCardHorizontal]}
      >
        <View style={styles.reviewCardHeaderRow}>
          <View style={styles.reviewAvatar}>
            <Image
              source={{
                uri: getProfileImageUrl(review.user?.avatar || null),
              }}
              style={styles.reviewAvatarImage}
            />
          </View>
          <View style={styles.reviewUserInfo}>
            <Text style={styles.reviewNameText}>
              {review.user?.name || "User"}
            </Text>
            <Text style={styles.reviewDateText}>{review.created_at}</Text>
          </View>
        </View>

        <View style={styles.reviewStarsRow}>
          {getStars(parseFloat(review.overall_rating || 0)).map(
            (icon, index) => (
              <MaterialIcons
                key={`${review.id}-star-${index}`}
                name={icon}
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
                style={styles.reviewStarIcon}
              />
            ),
          )}
        </View>

        {suggestionTitle && (
          <Text style={styles.reviewSuggestionTitle}>{suggestionTitle}</Text>
        )}

        {reviewText && (
          <View
            style={[
              styles.reviewCardTextContainer,
              isHorizontal && styles.reviewCardTextContainerHorizontal,
            ]}
          >
            <Text
              style={styles.reviewCardText}
              numberOfLines={isHorizontal ? 4 : undefined}
            >
              {shouldShowSeeMore
                ? `${reviewText.slice(0, textWrapLength).trim()}...`
                : reviewText}
            </Text>

            {shouldShowSeeMore && (
              <Text
                style={styles.reviewSeeMoreText}
                onPress={() => {
                  setSelectedReview(review);
                  setFullReviewModalVisible(true);
                }}
              >
                See more
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDetailsContent = () => {
    const aboutText = businessData?.description ?? "No description found";
    const shouldShowReadMore = aboutText.length > 220;
    const displayText = isAboutExpanded
      ? aboutText
      : shouldShowReadMore
        ? aboutText.substring(0, 220) + "..."
        : aboutText;

    // Sort business hours so current day appears first
    const currentDay = getCurrentDayName();
    const sortedBusinessHours = [...businessHours].sort((a, b) => {
      if (a.day === currentDay) return -1;
      if (b.day === currentDay) return 1;
      return 0;
    });

    return (
      <View
        ref={detailsSectionRef}
        onLayout={() => {
          measureSectionPosition(detailsSectionRef, "details");
        }}
        style={[
          styles.contentContainer,
          { paddingTop: moderateHeightScale(20) },
        ]}
      >
        {/* About me */}
        <View style={styles.sectionContentFullWidth}>
          <Text style={styles.sectionTitle}>{t("aboutMe")}</Text>
          <Text style={styles.aboutText}>
            {displayText}
            {shouldShowReadMore && !isAboutExpanded && (
              <Text
                style={styles.readMoreLink}
                onPress={() => setIsAboutExpanded(true)}
              >
                {" "}
                {t("readMoreSalon")}
              </Text>
            )}
          </Text>
        </View>

        {/* Shop location */}
        <View style={styles.sectionDivider} />
        <View style={styles.sectionContentFullWidth}>
          <Text
            style={[
              styles.sectionTitle,
              { marginTop: moderateHeightScale(24) },
            ]}
          >
            {t("shopLocation")}
          </Text>
          <View style={styles.shopLocationRow}>
            <Text style={styles.shopLocationText}>{businessAddress}</Text>
            <TouchableOpacity
              style={styles.mapIconContainer}
              onPress={handleLocationPress}
            >
              <MapPinIcon
                width={widthScale(15)}
                height={heightScale(15)}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact */}
        {businessPhone && (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.sectionContentFullWidth}>
              <Text
                style={[
                  styles.sectionTitle,
                  { marginTop: moderateHeightScale(24) },
                ]}
              >
                {t("contact")}
              </Text>
              <View style={styles.contactRow}>
                <View style={styles.phoneIconContainer}>
                  <PhoneIconContact
                    width={widthScale(18)}
                    height={heightScale(18)}
                    color={theme.darkGreen}
                  />
                </View>
                <View style={styles.contactPhoneRow}>
                  <Text style={styles.phoneText}>{businessPhone}</Text>
                  <TouchableOpacity
                    style={styles.callNowButton}
                    onPress={handleCallNow}
                  >
                    <Text style={styles.callNowButtonText}>{t("callNow")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Owner */}
        {businessData?.owner && (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.sectionContentFullWidth}>
              <Text
                style={[
                  styles.sectionTitle,
                  { marginTop: moderateHeightScale(24) },
                ]}
              >
                {t("owner")}
              </Text>
              <View style={styles.ownerRow}>
                <View style={styles.ownerAvatar}>
                  <Image
                    source={{ uri: getOwnerAvatarUrl() }}
                    style={styles.ownerAvatarImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>
                    {businessData.owner.name || t("owner")}
                  </Text>
                  {businessData.owner.email && (
                    <Text style={styles.ownerEmail}>
                      {businessData.owner.email}
                    </Text>
                  )}
                </View>
              </View>
              {ownerPhone && (
                <View style={styles.contactRow}>
                  <View style={styles.phoneIconContainer}>
                    <PhoneIconContact
                      width={widthScale(18)}
                      height={heightScale(18)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <View style={styles.contactPhoneRow}>
                    <Text style={styles.phoneText}>{ownerPhone}</Text>
                    <TouchableOpacity
                      style={styles.callNowButton}
                      onPress={handleCallNow}
                    >
                      <Text style={styles.callNowButtonText}>
                        {t("callNow")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* Business hours */}
        <View style={styles.sectionDivider} />
        <View
          style={[styles.sectionContentFullWidth, { paddingHorizontal: 0 }]}
        >
          <View
            style={[
              styles.businessHoursHeader,
              { marginTop: moderateHeightScale(24) },
            ]}
          >
            <Text style={styles.sectionTitle}>{t("businessHours")}</Text>
          </View>
          {businessHours.length === 0 ? (
            <Text style={styles.noHoursText}>{t("noAnyHoursAdded")}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hoursCardsContainer}
            >
              {sortedBusinessHours.map((item: any, index: number) => {
                const displayDay =
                  item.day === currentDay ? t("today") : item.day;
                const breakHours = item.breakHours || [];
                const hasBreaks = breakHours.length > 0;
                const hasMultipleBreaks = breakHours.length > 1;
                const isClosed = item.time === "Holiday/Closed";

                return (
                  <View key={index} style={[styles.hoursCard, styles.shadow]}>
                    <Text style={styles.hoursDay}>{displayDay}</Text>
                    <Text style={styles.hoursTime}>{item.time}</Text>
                    {!isClosed && hasBreaks && !hasMultipleBreaks && (
                      <Text style={styles.hoursBreak}>
                        {t("breakLabel")} {breakHours[0].start} -{" "}
                        {breakHours[0].end}
                      </Text>
                    )}
                    {!isClosed && hasMultipleBreaks && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedBreaks(breakHours);
                          setBreaksModalVisible(true);
                        }}
                      >
                        <Text style={styles.viewBreaksLink}>
                          {t("viewBreaks")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  const renderServiceContent = () => {
    const hasMemberships = membershipSubscriptions.length > 0;
    const hasAnyIndividualServices = individualServices.length > 0;
    const hasFilteredIndividualServices = filteredIndividualServices.length > 0;

    const shouldShowMembershipMoreCard =
      !showAllMembershipSubscriptions && membershipSubscriptions.length > 3;
    const shouldShowIndividualMoreCard =
      !showAllIndividualServices && filteredIndividualServices.length > 3;

    const displayedMembershipSubscriptions = showAllMembershipSubscriptions
      ? membershipSubscriptions
      : shouldShowMembershipMoreCard
        ? membershipSubscriptions.slice(0, 3)
        : membershipSubscriptions;

    const displayedIndividualServices = showAllIndividualServices
      ? filteredIndividualServices
      : shouldShowIndividualMoreCard
        ? filteredIndividualServices.slice(0, 3)
        : filteredIndividualServices;

    const membershipPreview =
      !showAllMembershipSubscriptions && membershipSubscriptions.length > 3
        ? membershipSubscriptions[3]
        : null;

    const individualPreview =
      !showAllIndividualServices && filteredIndividualServices.length > 3
        ? filteredIndividualServices[3]
        : null;

    return (
      <View
        ref={serviceSectionRef}
        onLayout={() => {
          measureSectionPosition(serviceSectionRef, "service");
        }}
        style={[
          styles.contentContainer,
          { paddingHorizontal: moderateWidthScale(20) },
        ]}
      >
        <ExploreSegmentToggle
          value={serviceSegment}
          onSelect={setServiceSegment}
        />

        {/* Membership Subscriptions Section */}
        <View
          style={[
            styles.serviceSection,
            styles.shadow,
            serviceSegment !== "subscriptions" && { display: "none" },
          ]}
        >
          <>
            {hasMemberships ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterContainer}
                >
                  {membershipFilters.map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterButton,
                        selectedMembershipFilter === filter &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() => setSelectedMembershipFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          selectedMembershipFilter === filter &&
                            styles.filterButtonTextActive,
                        ]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {displayedMembershipSubscriptions.map(
                  (subscription: any, index: number) => (
                    <View
                      key={subscription.id}
                      style={[
                        styles.membershipCard,
                        index ===
                          displayedMembershipSubscriptions.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View style={styles.membershipCardContent}>
                        <View style={styles.membershipCardLeft}>
                          <Text style={styles.membershipTitle}>
                            {subscription.title}
                          </Text>
                          <Text style={styles.membershipVisits}>
                            {subscription.visits}
                          </Text>
                          <View style={styles.membershipInclusions}>
                            {subscription.inclusions.length > 2 ? (
                              <>
                                {subscription.inclusions
                                  .slice(0, 2)
                                  .map(
                                    (
                                      inclusion: string,
                                      inclusionIndex: number,
                                    ) => (
                                      <Text
                                        key={inclusionIndex}
                                        style={styles.inclusionItem}
                                      >
                                        {inclusion}
                                      </Text>
                                    ),
                                  )}
                                <TouchableOpacity
                                  onPress={() => {
                                    setSelectedInclusions(
                                      subscription.inclusions,
                                    );
                                    setInclusionsModalVisible(true);
                                  }}
                                >
                                  <Text style={styles.moreText}>
                                    and +{subscription.inclusions.length - 2}{" "}
                                    more
                                  </Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              subscription.inclusions.map(
                                (inclusion: string, inclusionIndex: number) => (
                                  <Text
                                    key={inclusionIndex}
                                    style={styles.inclusionItem}
                                  >
                                    {inclusion}
                                  </Text>
                                ),
                              )
                            )}
                          </View>
                        </View>
                        <View style={styles.membershipCardRight}>
                          <View style={styles.membershipPriceLeft}>
                            <Text style={styles.membershipPrice}>
                              ${subscription.price.toFixed(2)} USD
                            </Text>
                            <Text style={styles.membershipOriginalPrice}>
                              ${subscription.originalPrice.toFixed(2)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.bookNowButton,
                              isBusinessOwnerView && styles.disabledAction,
                            ]}
                            disabled={isBusinessOwnerView}
                            onPress={() => {
                              if (isBusinessOwnerView) return;
                              router.push({
                                pathname:
                                  "/(main)/bookingNow/checkoutSubscription",
                                params: {
                                  subscriptionId: subscription.id.toString(),
                                  subscriptionName: subscription.title,
                                  subscriptionPrice:
                                    subscription.price.toString(),
                                  subscriptionOriginalPrice:
                                    subscription.originalPrice.toString(),
                                  subscriptionVisits: subscription.visits,
                                  subscriptionInclusions: JSON.stringify(
                                    subscription.inclusions,
                                  ),
                                  businessId:
                                    businessData?.id?.toString() ||
                                    params.business_id ||
                                    "",
                                  businessName: businessData?.name || "",
                                  businessLogo: businessData?.logo_url || "",
                                  screenName: "businessDetail",
                                },
                              });
                            }}
                          >
                            <Text style={styles.bookNowButtonText}>
                              {t("bookNow")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ),
                )}

                {shouldShowMembershipMoreCard && membershipPreview && (
                  <TouchableOpacity
                    style={[styles.seeMoreCard, styles.shadow]}
                    onPress={() => setShowAllMembershipSubscriptions(true)}
                  >
                    <View
                      style={[
                        styles.membershipCardContent,
                        styles.seeMorePreviewContainer,
                      ]}
                    >
                      <View style={styles.membershipCardLeft}>
                        <Text style={styles.membershipTitle}>
                          {membershipPreview.title}
                        </Text>
                        <Text style={styles.membershipVisits}>
                          {membershipPreview.visits}
                        </Text>
                      </View>
                      <View style={styles.membershipCardRight}>
                        <View style={styles.membershipPriceLeft}>
                          <Text style={styles.membershipPrice}>
                            ${membershipPreview.price.toFixed(2)} USD
                          </Text>
                          <Text style={styles.membershipOriginalPrice}>
                            ${membershipPreview.originalPrice.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.seeMoreOverlayCard}>
                      <Text style={styles.seeMoreTitle}>
                        {t("exploreMore")}
                      </Text>
                      <Text style={styles.seeMoreSubtitle}>
                        {t("resultsCount_other", {
                          count: membershipSubscriptions.length,
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noServiceContainer}>
                <Text style={styles.noServiceText}>
                  {t("noSubscriptionListFound")}
                </Text>
              </View>
            )}
          </>
        </View>

        {/* Individual Services Section */}
        <View
          style={[
            styles.serviceSection,
            styles.shadow,
            serviceSegment !== "individual" && { display: "none" },
          ]}
        >
          <>
            {hasAnyIndividualServices ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterContainer}
                >
                  {serviceFilters.map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterButton,
                        selectedServiceFilter === filter &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() => setSelectedServiceFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          selectedServiceFilter === filter &&
                            styles.filterButtonTextActive,
                        ]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {hasFilteredIndividualServices ? (
                  <>
                    {displayedIndividualServices.map(
                      (service: any, index: number) => (
                        <View
                          key={service.id}
                          style={[
                            styles.serviceCard,
                            index ===
                              displayedIndividualServices.length - 1 && {
                              borderBottomWidth: 0,
                            },
                          ]}
                        >
                          <View style={styles.serviceCardContent}>
                            <View style={styles.serviceCardLeft}>
                              {service.label && (
                                <View style={styles.serviceLabel}>
                                  <Text style={styles.serviceLabelText}>
                                    {service.label}
                                  </Text>
                                </View>
                              )}
                              <Text style={styles.serviceName}>
                                {service.name}
                              </Text>
                              <Text style={styles.serviceDescription}>
                                {service.description}
                              </Text>
                            </View>
                            <View style={styles.serviceCardRight}>
                              <View style={styles.servicePriceContainer}>
                                <Text style={styles.serviceOriginalPrice}>
                                  ${service.originalPrice.toFixed(2)}
                                </Text>
                                <Text style={styles.servicePrice}>
                                  ${service.price.toFixed(2)} USD
                                </Text>
                              </View>
                              <Text style={styles.serviceDuration}>
                                {service.duration}
                              </Text>
                              <TouchableOpacity
                                style={[
                                  styles.bookNowButton,
                                  isBusinessOwnerView && styles.disabledAction,
                                ]}
                                disabled={isBusinessOwnerView}
                                onPress={() => {
                                  if (isBusinessOwnerView) return;
                                  // Set business data in Redux
                                  const serviceData = {
                                    id: service.id,
                                    name: service.name,
                                    description: service.description,
                                    price: service.price,
                                    originalPrice: service.originalPrice,
                                    duration: service.duration,
                                    label: service.label || null,
                                  };
                                  const allServicesData =
                                    individualServices.map((s: any) => ({
                                      id: s.id,
                                      name: s.name,
                                      description: s.description,
                                      price: s.price,
                                      originalPrice: s.originalPrice,
                                      duration: s.duration,
                                      label: s.label || null,
                                    }));
                                  // Parse business hours from API format to Redux format
                                  const parseTimeToHoursMinutes = (
                                    timeString: string | null | undefined,
                                  ): { hours: number; minutes: number } => {
                                    if (
                                      !timeString ||
                                      typeof timeString !== "string"
                                    ) {
                                      return { hours: 0, minutes: 0 };
                                    }
                                    const [hours, minutes] = timeString
                                      .split(":")
                                      .map(Number);
                                    return {
                                      hours: hours || 0,
                                      minutes: minutes || 0,
                                    };
                                  };

                                  const getDayDisplayFormat = (
                                    day: string,
                                  ): string => {
                                    if (!day) return day;
                                    const dayLower = day.toLowerCase();
                                    const dayMap: { [key: string]: string } = {
                                      monday: "Monday",
                                      tuesday: "Tuesday",
                                      wednesday: "Wednesday",
                                      thursday: "Thursday",
                                      friday: "Friday",
                                      saturday: "Saturday",
                                      sunday: "Sunday",
                                    };
                                    return dayMap[dayLower] || day;
                                  };

                                  const parseBusinessHours = (
                                    hoursArray: any[] | null | undefined,
                                  ) => {
                                    if (
                                      !hoursArray ||
                                      !Array.isArray(hoursArray) ||
                                      hoursArray.length === 0
                                    ) {
                                      return null;
                                    }

                                    const businessHours: {
                                      [key: string]: any;
                                    } = {};

                                    // Initialize all days with default closed state
                                    const DAYS = [
                                      "Monday",
                                      "Tuesday",
                                      "Wednesday",
                                      "Thursday",
                                      "Friday",
                                      "Saturday",
                                      "Sunday",
                                    ];
                                    DAYS.forEach((day) => {
                                      businessHours[day] = {
                                        isOpen: false,
                                        fromHours: 0,
                                        fromMinutes: 0,
                                        tillHours: 0,
                                        tillMinutes: 0,
                                        breaks: [],
                                      };
                                    });

                                    // Parse API hours
                                    hoursArray.forEach((dayData: any) => {
                                      const dayName = getDayDisplayFormat(
                                        dayData.day,
                                      );
                                      if (!DAYS.includes(dayName)) return;

                                      let fromHours = 0;
                                      let fromMinutes = 0;
                                      let tillHours = 0;
                                      let tillMinutes = 0;

                                      if (dayData.opening_time) {
                                        const parsed = parseTimeToHoursMinutes(
                                          dayData.opening_time,
                                        );
                                        fromHours = parsed.hours;
                                        fromMinutes = parsed.minutes;
                                      }

                                      if (dayData.closing_time) {
                                        const parsed = parseTimeToHoursMinutes(
                                          dayData.closing_time,
                                        );
                                        tillHours = parsed.hours;
                                        tillMinutes = parsed.minutes;
                                      }

                                      const breaks = (
                                        dayData.break_hours || []
                                      ).map((breakTime: any) => {
                                        const {
                                          hours: breakFromHours,
                                          minutes: breakFromMinutes,
                                        } = parseTimeToHoursMinutes(
                                          breakTime.start || "00:00",
                                        );
                                        const {
                                          hours: breakTillHours,
                                          minutes: breakTillMinutes,
                                        } = parseTimeToHoursMinutes(
                                          breakTime.end || "00:00",
                                        );
                                        return {
                                          fromHours: breakFromHours,
                                          fromMinutes: breakFromMinutes,
                                          tillHours: breakTillHours,
                                          tillMinutes: breakTillMinutes,
                                        };
                                      });

                                      businessHours[dayName] = {
                                        isOpen: !dayData.closed,
                                        fromHours,
                                        fromMinutes,
                                        tillHours,
                                        tillMinutes,
                                        breaks,
                                      };
                                    });

                                    return businessHours;
                                  };

                                  // Map staff members with working_hours
                                  const staffMembersData = (
                                    businessData?.staff || []
                                  )
                                    .filter(
                                      (staff: any) =>
                                        staff.invitation_status === "accepted",
                                    )
                                    .map((staff: any) => {
                                      // Construct image URL from API response
                                      let image = DEFAULT_AVATAR_URL;
                                      if (staff.avatar) {
                                        image = `${process.env.EXPO_PUBLIC_API_BASE_URL}${staff.avatar}`;
                                      }

                                      // Parse working_hours if available (even if empty array)
                                      const staffWorkingHours =
                                        parseBusinessHours(staff.working_hours);

                                      return {
                                        id: staff.id || staff.user_id || 0,
                                        name:
                                          staff.name ||
                                          t("staffMemberFallback"),
                                        experience: staff?.description ?? null,
                                        image: image,
                                        working_hours: staffWorkingHours,
                                      };
                                    });

                                  const businessHoursData = parseBusinessHours(
                                    businessData?.hours,
                                  );

                                  const businessPayload = {
                                    selectedService: serviceData,
                                    allServices: allServicesData,
                                    staffMembers: staffMembersData,
                                    businessId: params.business_id || "",
                                    businessHours: businessHoursData,
                                  };
                                  dispatch(
                                    setBusinessDataAction(businessPayload),
                                  );
                                  // Navigate to bookingNow without params
                                  router.push({
                                    pathname: "/(main)/bookingNow",
                                  });
                                }}
                              >
                                <Text style={styles.bookNowButtonText}>
                                  {t("bookNow")}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ),
                    )}

                    {shouldShowIndividualMoreCard && individualPreview && (
                      <TouchableOpacity
                        style={[styles.seeMoreCard, styles.shadow]}
                        onPress={() => setShowAllIndividualServices(true)}
                      >
                        <View
                          style={[
                            styles.serviceCardContent,
                            styles.seeMorePreviewContainer,
                          ]}
                        >
                          <View style={styles.serviceCardLeft}>
                            {individualPreview.label && (
                              <View style={styles.serviceLabel}>
                                <Text style={styles.serviceLabelText}>
                                  {individualPreview.label}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.serviceName}>
                              {individualPreview.name}
                            </Text>
                            <Text style={styles.serviceDescription}>
                              {individualPreview.description}
                            </Text>
                          </View>
                          <View style={styles.serviceCardRight}>
                            <View style={styles.servicePriceContainer}>
                              <Text style={styles.serviceOriginalPrice}>
                                ${individualPreview.originalPrice.toFixed(2)}
                              </Text>
                              <Text style={styles.servicePrice}>
                                ${individualPreview.price.toFixed(2)} USD
                              </Text>
                            </View>
                            <Text style={styles.serviceDuration}>
                              {individualPreview.duration}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.seeMoreOverlayCard}>
                          <Text style={styles.seeMoreTitle}>
                            {t("exploreMore")}
                          </Text>
                          <Text style={styles.seeMoreSubtitle}>
                            {t("resultsCount_other", {
                              count: individualServices.length,
                            })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.noServiceContainer}>
                    <Text style={styles.noServiceText}>
                      {t("noServicesFound")}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noServiceContainer}>
                <Text style={styles.noServiceText}>{t("noServicesFound")}</Text>
              </View>
            )}
          </>
        </View>
      </View>
    );
  };

  const renderStaffContent = () => {
    if (staffMembers.length === 0) {
      return (
        <View
          ref={staffSectionRef}
          onLayout={() => {
            measureSectionPosition(staffSectionRef, "staff");
          }}
          style={styles.contentContainer}
        >
          <View style={styles.sectionContentFullWidth}>
            <Text style={styles.staffSectionTitle}>{t("staffMembers")}</Text>
            <Text style={styles.noHoursText}>{t("noStaffFound")}</Text>
          </View>
        </View>
      );
    }

    const displayedStaff = showAllStaff
      ? staffMembers
      : staffMembers.slice(0, 6);
    const hasMoreStaff = staffMembers.length > 6;

    return (
      <View
        ref={staffSectionRef}
        onLayout={() => {
          measureSectionPosition(staffSectionRef, "staff");
        }}
        style={styles.contentContainer}
      >
        <View style={styles.sectionContentFullWidth}>
          <Text style={styles.staffSectionTitle}>
            {t("staffMembersCount", { count: staffMembers.length })}
          </Text>
          <View style={styles.staffGrid}>
            {displayedStaff.map((staff: any) => (
              <TouchableOpacity
                key={staff.id}
                style={[styles.staffCard, styles.shadow]}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/staffDetail",
                    params: { id: String(staff.id) },
                  })
                }
              >
                <View style={styles.staffImageWrapper}>
                  <Image
                    source={{ uri: staff.image }}
                    style={styles.staffProfileImage}
                  />
                  <View
                    style={[
                      styles.staffStatusDot,
                      staff.active
                        ? styles.staffStatusDotActive
                        : styles.staffStatusDotInactive,
                    ]}
                  />
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName} numberOfLines={1}>
                    {staff.name}
                  </Text>
                  {staff.experience && (
                    <Text numberOfLines={1} style={styles.staffExperience}>
                      {staff.experience}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {hasMoreStaff && !showAllStaff && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setShowAllStaff(true)}
            >
              <Text style={styles.loadMoreText}>
                {t("loadMoreStaffMembers")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderRatingsContent = () => {
    // Sort reviews so current user's review appears first (index 0)
    const displayedReviews = (() => {
      if (!currentUserId || reviewsData.length === 0) {
        return reviewsData;
      }
      return [...reviewsData].sort((a: any, b: any) => {
        // If current user's review, put it first
        if (a.user_id === currentUserId && b.user_id !== currentUserId) {
          return -1;
        }
        if (a.user_id !== currentUserId && b.user_id === currentUserId) {
          return 1;
        }
        // Otherwise maintain original order
        return 0;
      });
    })();

    const hasMoreReviews = reviewsTotal > 0;
    const averageRatingToShow =
      reviewsAverageRating > 0 ? reviewsAverageRating : averageRating;
    const totalReviewsToShow = reviewsTotal > 0 ? reviewsTotal : totalReviews;

    // Check if current user has already reviewed this business
    const hasUserReviewed = currentUserId
      ? reviewsData.some((review: any) => review.user_id === currentUserId)
      : false;
    const canWriteReview = !hasUserReviewed && !isGuest;
    const isWriteReviewDisabled = isBusinessOwnerView;

    return (
      <View
        ref={ratingsSectionRef}
        onLayout={() => {
          measureSectionPosition(ratingsSectionRef, "ratings");
        }}
        style={styles.contentContainer}
      >
        <View style={styles.ratingsSectionContent}>
          <View style={styles.sectionContentFullWidth}>
            <Text style={styles.sectionTitle}>{t("whatOthersSay")}</Text>
          </View>
          {/* Rating Summary */}
          <View
            style={[
              styles.ratingSummaryContainer,
              styles.sectionContentFullWidth,
            ]}
          >
            <View style={styles.ratingBadgeContainer}>
              <StarIconBusinessDetail
                width={widthScale(12)}
                height={heightScale(12)}
                color={theme.selectCard}
              />
              <Text style={styles.ratingBadgeText}>
                {averageRatingToShow.toFixed(1)}/{" "}
                {t("reviewsCount", { count: totalReviewsToShow })}
              </Text>
            </View>
            <Text style={styles.averageRatingText}>
              {averageRatingToShow > 0 ? averageRatingToShow.toFixed(1) : "0"}{" "}
              {t("average")}
            </Text>
          </View>

          {/* Error State */}
          {reviewsError && (
            <View style={styles.sectionContentFullWidth}>
              <Text
                style={[
                  styles.aboutText,
                  {
                    color: theme.orangeBrown,
                    marginBottom: moderateHeightScale(16),
                  },
                ]}
              >
                {reviewsError}
              </Text>
            </View>
          )}

          {/* Loading State */}
          {reviewsLoading && !reviewsError && (
            <View
              style={[
                styles.sectionContentFullWidth,
                {
                  alignItems: "center",
                  paddingVertical: moderateHeightScale(20),
                },
              ]}
            >
              <ActivityIndicator size="small" color={theme.buttonBack} />
            </View>
          )}

          {/* Horizontal Scroll Reviews */}
          {!reviewsError && !reviewsLoading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewsHorizontalScroll}
            >
              {displayedReviews.map((review: any) => (
                <View key={review.id}>{renderReviewCard(review, true)}</View>
              ))}
            </ScrollView>
          )}

          {/* Write a Review Button */}
          {canWriteReview && (
            <View style={styles.writeReviewButtonContainer}>
              <Button
                backgroundColor={theme.darkGreen}
                title={t("writeAReview")}
                disabled={isWriteReviewDisabled}
                containerStyle={
                  isWriteReviewDisabled ? styles.disabledAction : undefined
                }
                onPress={() => {
                  const logoUrl = getBusinessLogoUrl();
                  router.push({
                    pathname: "/(main)/leaveReview",
                    params: {
                      business_id: params.business_id || "",
                      business_name: businessName,
                      business_address: businessAddress,
                      business_logo_url: logoUrl,
                      business_latitude: businessLatitude?.toString() || "",
                      business_longitude: businessLongitude?.toString() || "",
                    },
                  });
                }}
              />
            </View>
          )}

          {/* Show All Reviews Button */}
          {hasMoreReviews && !reviewsError && (
            <TouchableOpacity
              style={[
                styles.showAllReviewsButton,
                { marginTop: moderateHeightScale(12) },
              ]}
              onPress={() => {
                router.push({
                  pathname: "/(main)/userReviews",
                  params: { business_id: params.business_id || "" },
                } as any);
              }}
            >
              <Text style={styles.showAllReviewsText}>
                {t("showAllReviews", { count: totalReviewsToShow })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Payment & Cancelation Policy */}
          <TouchableOpacity
            style={[
              styles.policyItem,
              {
                borderTopWidth: moderateWidthScale(1),
                marginTop: moderateHeightScale(24),
              },
            ]}
          >
            <Text style={styles.policyItemText}>
              {t("paymentCancelationPolicy")}
            </Text>
            <ChevronRightIconBusinessDetail
              width={widthScale(6)}
              height={heightScale(10)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>

          {/* Report */}
          <TouchableOpacity style={styles.policyItem}>
            <Text style={styles.policyItemText}>{t("report")}</Text>
            <ChevronRightIconBusinessDetail
              width={widthScale(6)}
              height={heightScale(10)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading && businessData == null) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.buttonBack} />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: moderateWidthScale(20),
          }}
        >
          <Text
            style={{
              fontSize: fontSize.size16,
              fontFamily: fonts.fontRegular,
              color: theme.text,
              textAlign: "center",
              marginBottom: moderateHeightScale(16),
            }}
          >
            {error}
          </Text>
          <RetryButton onPress={fetchBusinessDetails} loading={loading} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StatusBar
        backgroundColor={"transparent"}
        barStyle={"light-content"}
        translucent={true}
      />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: moderateHeightScale(40) }}
      >
        <View ref={scrollContentRef}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.back()}
              >
                <BackArrowIcon
                  width={widthScale(16)}
                  height={heightScale(16)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <LeafLogo
                  width={widthScale(22)}
                  height={heightScale(22)}
                  color1={theme.darkGreen}
                  color2={theme.darkGreen}
                />
                <Text style={styles.logoText}>{t("freshPass")}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity activeOpacity={0.8} style={styles.iconButton}>
                <ShareIcon
                  width={widthScale(16)}
                  height={heightScale(16)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.iconButton,
                  isBusinessOwnerView && styles.disabledAction,
                ]}
                onPress={isBusinessOwnerView ? undefined : handleToggleFavorite}
                disabled={isBusinessOwnerView}
              >
                <MaterialIcons
                  name={isFavorited ? "favorite" : "favorite-border"}
                  size={widthScale(16)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Image */}
          <TouchableOpacity
            style={styles.heroImageContainer}
            onPress={handleOpenFullImage}
            activeOpacity={1}
          >
            <Image
              source={{ uri: currentHeroImage }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Thumbnail Carousel */}
          <View style={styles.thumbnailContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailScroll}
            >
              {thumbnails.map((thumbnail: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleThumbnailSelect(thumbnail)}
                >
                  <Image
                    source={{ uri: thumbnail }}
                    style={[
                      styles.thumbnail,
                      currentHeroImage !== thumbnail && {
                        borderColor: theme.borderLight,
                      },
                      currentHeroImage === thumbnail && {
                        borderColor: theme.selectCard,
                      },
                    ]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Business Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.badgeRow}>
              <View style={styles.platformVerifiedBadge}>
                <PlatformVerifiedStarIcon
                  width={widthScale(12)}
                  height={heightScale(12)}
                />
                <Text style={styles.platformVerifiedText}>
                  Platform verified
                </Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  {t("discountBadgeText")}
                </Text>
              </View>
            </View>
            <View style={styles.ratingBadge}>
              <StarIconBusinessDetail
                width={widthScale(12)}
                height={heightScale(12)}
                color={theme.selectCard}
              />
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)}/{" "}
                {t("reviewsCount", { count: totalReviews })}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: moderateWidthScale(8),
                marginBottom: moderateHeightScale(8),
              }}
            >
              <Image
                source={{ uri: getBusinessLogoUrl() }}
                style={styles.businessLogo}
                resizeMode="cover"
              />
              <Text style={styles.businessName}>{businessName}</Text>
            </View>
            <View style={styles.addressRow}>
              <LocationPinIconBusinessDetail
                width={widthScale(12)}
                height={heightScale(12)}
                color={theme.selectCard}
              />
              <Text style={styles.addressText}>
                {businessAddress}
                {calculateTravelTime !== null && (
                  <Text style={{ fontFamily: fonts.fontBold }}>
                    {" "}
                    • {formatTravelTime(calculateTravelTime)}
                  </Text>
                )}
              </Text>
            </View>
            <View style={styles.staffRow}>
              <PeopleIcon
                width={widthScale(12)}
                height={heightScale(12)}
                color={theme.selectCard}
              />
              <Text style={styles.staffText}>
                {t("staffMembersCount", {
                  count: businessData?.staffCount || staffMembers.length,
                })}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {(
              [
                ["Service", t("tabService")],
                ["Details", t("tabDetails")],
                ["Staff", t("tabStaff")],
                ["Ratings", t("tabRatings")],
              ] as const
            ).map(([tab, label]) => (
              <TouchableOpacity
                key={tab}
                style={styles.tab}
                onPress={() => handleTabPress(tab)}
              >
                <Text
                  style={
                    activeTab === tab ? styles.tabTextActive : styles.tabText
                  }
                >
                  {label}
                </Text>
                {activeTab === tab && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content - All sections in one scroll */}

          {renderServiceContent()}
          <View style={styles.divider} />
          {renderDetailsContent()}
          <View style={styles.divider} />
          {renderStaffContent()}
          <View style={styles.divider} />
          {renderRatingsContent()}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <FullImageModal
        visible={imageModalVisible}
        onClose={() => setImageModalVisible(false)}
        imageUri={selectedImage}
      />

      {/* Inclusions Modal */}
      <InclusionsModal
        visible={inclusionsModalVisible}
        onClose={() => setInclusionsModalVisible(false)}
        inclusions={selectedInclusions}
      />

      {/* Breaks Modal */}
      <InclusionsModal
        visible={breaksModalVisible}
        onClose={() => setBreaksModalVisible(false)}
        inclusions={selectedBreaks.map(
          (breakHour, index) =>
            `${index + 1}. Break: ${breakHour.start} - ${breakHour.end}`,
        )}
        title={t("breakHours")}
      />

      {/* Full Review Modal */}
      <Modal
        visible={fullReviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullReviewModalVisible(false)}
      >
        <Pressable
          style={styles.reviewModalOverlay}
          onPress={() => setFullReviewModalVisible(false)}
        >
          <Pressable
            style={styles.fullReviewModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.reviewModalHeader, { paddingHorizontal: 0 }]}>
              <Text style={styles.reviewModalTitle}>
                {t("reviewModalTitle")}
              </Text>
              <TouchableOpacity
                style={styles.reviewModalCloseButton}
                onPress={() => setFullReviewModalVisible(false)}
              >
                <CloseIconBusinessDetail
                  width={widthScale(20)}
                  height={heightScale(20)}
                />
              </TouchableOpacity>
            </View>
            {selectedReview && (
              <ScrollView
                style={styles.fullReviewModalContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.fullReviewCardHeaderRow}>
                  <View style={styles.reviewAvatar}>
                    <Image
                      source={{
                        uri: getProfileImageUrl(
                          selectedReview.user?.avatar || null,
                        ),
                      }}
                      style={styles.reviewAvatarImage}
                    />
                  </View>
                  <View style={styles.reviewUserInfo}>
                    <Text style={styles.reviewNameText}>
                      {selectedReview.user?.name || "User"}
                    </Text>
                    <Text style={styles.reviewDateText}>
                      {formatDate(selectedReview.created_at)}
                    </Text>
                  </View>
                </View>

                {selectedReview.review_suggestion?.title && (
                  <Text style={styles.reviewSuggestionTitle}>
                    {selectedReview.review_suggestion.title}
                  </Text>
                )}

                <View style={styles.reviewStarsRow}>
                  {getStars(parseFloat(selectedReview.overall_rating || 0)).map(
                    (icon, index) => (
                      <MaterialIcons
                        key={`${selectedReview.id}-star-${index}`}
                        name={icon}
                        size={moderateWidthScale(18)}
                        color={theme.darkGreen}
                        style={styles.reviewStarIcon}
                      />
                    ),
                  )}
                </View>

                {selectedReview.comment && (
                  <Text style={styles.fullReviewText}>
                    {selectedReview.comment}
                  </Text>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
