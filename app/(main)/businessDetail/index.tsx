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
  Modal,
  Pressable,
  StatusBar,
  Dimensions,
  Linking,
  Platform,
  Alert,
  Share,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import AppImage from "@/src/components/AppImage";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { setBusinessData as setBusinessDataAction } from "@/src/state/slices/bsnsSlice";
import {
  getOwnBusinessIds,
  isInCustomerMode,
} from "@/src/state/slices/userSlice";
import {
  setGuestModeModalVisible,
  openFullImageModal,
} from "@/src/state/slices/generalSlice";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  OpenFullIcon,
  MapPinIcon,
  PhoneIconContact,
  ShareIcon,
  GlobeIcon,
  StarIconBusinessDetail,
  PhoneIconBusinessDetail,
  PhoneIconWhite,
  CloseIconBusinessDetail,
  BackArrowIcon,
  ChevronRightIconBusinessDetail,
  ChatIcon,
} from "@/assets/icons";
import InclusionsModal from "@/src/components/inclusionsModal";
import Button from "@/src/components/button";
import { ApiService, checkInternetConnection } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints, reviewsEndpoints } from "@/src/services/endpoints";
import {
  RatingBadge,
  ReviewMediaStrip,
  ReviewServedBy,
} from "@/src/components/reviews/reviewMedia";
import { followBusiness, unfollowBusiness } from "@/src/services/followService";
import { reportReelEvent } from "@/src/services/reelsService";
import RetryButton from "@/src/components/retryButton";
import { formatLeaveRangeDisplay } from "@/src/utils/leaveDateTime";
import { resolveApiImageUrl } from "@/src/utils/media";
import ExploreSegmentToggle, {
  type ExploreSegmentValue,
} from "../dashboard/(explore)/ExploreSegmentToggle";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import type { AffiliatedBusiness } from "@/src/types/affiliation";
import type {
  OwnerWorkImagesPreview,
  StaffWorkImage,
} from "@/src/types/staffWorkImages";
import {
  getDefaultAvatarImage,
  getDefaultBusinessImage,
  getDefaultBusinessLogo,
} from "@/src/services/remoteConfigService";
import { HiringRing } from "@/src/components/jobs/jobBadges";
import { JobListRow, JobRowsCard } from "@/src/components/jobs/jobCards";
import { fetchBusinessJobPosts } from "@/src/services/jobService";
import type { JobPost } from "@/src/types/jobs";
import { hasMoreJobPages } from "@/src/utils/jobHelpers";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIEWER_BANNER_CONTENT_HEIGHT = moderateHeightScale(28);
const HERO_HEIGHT = heightScale(340);
// How far the cream info sheet rides up over the hero photo
const SHEET_OVERLAP = moderateHeightScale(28);
const HEADER_BUTTON_SIZE = moderateWidthScale(40);
const ACTION_BUTTON_SIZE = moderateHeightScale(48);
// Translucent surfaces that sit on the dark-green info sheet
const SHEET_SURFACE = "rgba(255, 255, 255, 0.07)";
const SHEET_BORDER = "rgba(255, 255, 255, 0.12)";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    viewerModeBanner: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      overflow: "hidden",
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(6),
    },
    viewerModeBannerBlur: {
      ...StyleSheet.absoluteFillObject,
    },
    viewerModeBannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.lightGreen5,
    },
    viewerModeBannerContent: {
      minHeight: VIEWER_BANNER_CONTENT_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    viewerModeBannerText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    viewerModeExitText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.green,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: moderateHeightScale(Platform.OS === "ios" ? 50 : 38),
      paddingHorizontal: moderateWidthScale(16),
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
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    iconButton: {
      width: HEADER_BUTTON_SIZE,
      height: HEADER_BUTTON_SIZE,
      borderRadius: HEADER_BUTTON_SIZE / 2,
      backgroundColor: "rgba(254, 250, 224, 0.94)",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.16,
      shadowRadius: 6,
      elevation: 3,
    },
    heroWrapper: {
      width: SCREEN_WIDTH,
      height: HERO_HEIGHT,
      backgroundColor: theme.darkGreen,
    },
    heroImageContainer: {
      width: SCREEN_WIDTH,
      height: HERO_HEIGHT,
    },
    heroImageSlide: {
      width: SCREEN_WIDTH,
      height: HERO_HEIGHT,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroTopScrim: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: heightScale(150),
    },
    heroBottomScrim: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: heightScale(110),
    },
    heroDots: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: SHEET_OVERLAP + moderateHeightScale(18),
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    heroDot: {
      width: moderateWidthScale(6),
      height: moderateWidthScale(6),
      borderRadius: moderateWidthScale(3),
      backgroundColor: theme.white50,
    },
    heroDotActive: {
      width: moderateWidthScale(18),
      backgroundColor: theme.white,
    },
    heroCounter: {
      position: "absolute",
      right: moderateWidthScale(16),
      bottom: SHEET_OVERLAP + moderateHeightScale(10),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      minHeight: moderateHeightScale(30),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: moderateWidthScale(999),
      backgroundColor: "rgba(24, 33, 14, 0.72)",
    },
    heroCounterText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    infoSheet: {
      marginTop: -SHEET_OVERLAP,
      backgroundColor: theme.darkGreen,
      borderTopLeftRadius: moderateWidthScale(28),
      borderTopRightRadius: moderateWidthScale(28),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(22),
      paddingBottom: moderateHeightScale(24),
    },
    identityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    businessLogo: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white15,
      borderWidth: 1,
      borderColor: theme.white15,
      overflow: "hidden",
    },
    identityText: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    businessName: {
      flexShrink: 1,
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
    },
    businessCategory: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: moderateHeightScale(6),
      gap: moderateWidthScale(4),
    },
    metaRatingButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    metaRatingValue: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    metaText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    metaDot: {
      fontSize: fontSize.size13,
      color: theme.white50,
      marginHorizontal: moderateWidthScale(2),
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(16),
    },
    verifiedChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white15,
    },
    verifiedChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    offerChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.orangeBrown,
    },
    offerChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    actionRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(18),
    },
    followCta: {
      flex: 1,
      height: ACTION_BUTTON_SIZE,
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    followCtaActive: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.white50,
    },
    followCtaText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    followCtaTextActive: {
      color: theme.white,
    },
    actionIconButton: {
      width: ACTION_BUTTON_SIZE,
      height: ACTION_BUTTON_SIZE,
      borderRadius: moderateWidthScale(14),
      backgroundColor: SHEET_SURFACE,
      borderWidth: 1,
      borderColor: SHEET_BORDER,
      alignItems: "center",
      justifyContent: "center",
    },
    actionIconButtonWide: {
      flex: 1,
      width: undefined,
    },
    infoCard: {
      marginTop: moderateHeightScale(16),
      backgroundColor: SHEET_SURFACE,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: SHEET_BORDER,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      minHeight: moderateHeightScale(56),
    },
    infoRowDivider: {
      height: 1,
      backgroundColor: SHEET_BORDER,
      marginLeft: moderateWidthScale(14 + 34 + 12),
    },
    infoRowIcon: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(10),
      backgroundColor: "rgba(221, 161, 94, 0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    infoRowBody: {
      flex: 1,
    },
    infoRowText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      lineHeight: moderateHeightScale(18),
    },
    infoRowSubText: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    infoRowStrong: {
      fontFamily: fonts.fontBold,
    },
    avatarStack: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarStackItem: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      borderWidth: 2,
      borderColor: theme.darkGreen,
      backgroundColor: theme.emptyProfileImage,
      overflow: "hidden",
    },
    socialIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    socialIconButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    tabsContainer: {
      flexDirection: "row",
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderNormal,
      paddingHorizontal: moderateWidthScale(8),
    },
    tab: {
      flex: 1,
      paddingVertical: moderateHeightScale(14),
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    tabText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    tabTextActive: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    tabUnderline: {
      position: "absolute",
      bottom: -1,
      left: "18%",
      right: "18%",
      height: moderateHeightScale(3),
      borderTopLeftRadius: moderateWidthScale(3),
      borderTopRightRadius: moderateWidthScale(3),
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
      gap: moderateWidthScale(8),
    },
    shopLocationInfo: {
      flex: 1,
      maxWidth: "75%",
    },
    shopLocationText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    shopLocationAffiliation: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(3),
    },
    shopLocationAffiliationName: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
      width: widthScale(35),
      height: widthScale(35),
      borderRadius: widthScale(35 / 2),
      alignItems: "center",
      justifyContent: "center",
      marginLeft: moderateWidthScale(8),
    },
    contactActionsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    chatIconButton: {
      backgroundColor: theme.darkGreenLight,
      width: widthScale(35),
      height: widthScale(35),
      borderRadius: widthScale(35 / 2),
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
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
    serviceSegment: {
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(14),
    },
    serviceSection: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: moderateHeightScale(16),
    },
    cardShadow: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    filterStripWrapper: {
      marginHorizontal: moderateWidthScale(-20),
      marginBottom: moderateHeightScale(14),
    },
    filterContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    filterButton: {
      minHeight: moderateHeightScale(36),
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    filterButtonActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    filterButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    filterButtonTextActive: {
      color: theme.background,
    },
    serviceCard: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
    },
    serviceRowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(16),
    },
    serviceCardContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    serviceCardLeft: {
      flex: 1,
    },
    serviceCardRight: {
      alignItems: "flex-end",
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
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    serviceMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(6),
    },
    serviceDuration: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    serviceDescription: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(18),
    },
    servicePrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceCurrency: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    serviceOriginalPrice: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textDecorationLine: "line-through",
    },
    serviceOriginalPriceSpaced: {
      marginTop: moderateHeightScale(2),
    },
    bookNowButton: {
      marginTop: moderateHeightScale(12),
      minHeight: moderateHeightScale(36),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    bookNowButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    membershipInclusions: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(4),
    },
    inclusionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(6),
    },
    inclusionItem: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(18),
    },
    moreText: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    disabledAction: {
      opacity: 0.4,
    },
    loadingContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
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
      gap: moderateWidthScale(10),
    },
    staffCard: {
      width: (SCREEN_WIDTH - moderateWidthScale(60)) / 3,
      height: heightScale(132),
      backgroundColor: theme.emptyProfileImage,
      borderRadius: moderateWidthScale(14),
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      position: "relative",
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
    staffProfileImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
      backgroundColor: theme.emptyProfileImage,
    },
    staffStatusDot: {
      position: "absolute",
      top: moderateHeightScale(8),
      right: moderateWidthScale(8),
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10) / 2,
      borderWidth: 2,
      borderColor: theme.white,
      zIndex: 2,
    },
    staffStatusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    staffRatingBadge: {
      position: "absolute",
      top: moderateHeightScale(6),
      left: moderateWidthScale(6),
      zIndex: 2,
    },
    staffStatusDotInactive: {
      backgroundColor: theme.lightGreen5,
    },
    staffInfoStrip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: moderateWidthScale(8),
      paddingTop: moderateHeightScale(36),
      paddingBottom: moderateHeightScale(8),
      justifyContent: "flex-end",
      gap: moderateHeightScale(2),
    },
    staffName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
      textShadowColor: theme.black,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    staffExperience: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      textShadowColor: theme.black,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
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
      paddingVertical: moderateHeightScale(32),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
    },
    noServiceIcon: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(24),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    noServiceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    viewAllRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(4),
      minHeight: moderateHeightScale(50),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    viewAllRowText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    jobsHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(14),
    },
    jobsHeadText: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    jobsTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    jobsTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    jobsHiringPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.tileMint,
    },
    jobsHiringPillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
      letterSpacing: 0.5,
    },
    jobsSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(19),
    },
    jobsManage: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      minHeight: moderateHeightScale(44),
      paddingLeft: moderateWidthScale(8),
    },
    jobsManageText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    jobsRowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(16),
    },
    jobsLoading: {
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
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
    serviceSheetOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    serviceSheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      maxHeight: "85%",
    },
    serviceSheetHandle: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.lightGreen015,
      marginBottom: moderateHeightScale(16),
    },
    serviceSheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(16),
    },
    serviceSheetHeaderText: {
      flex: 1,
    },
    serviceSheetName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    serviceSheetDuration: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(6),
    },
    serviceSheetDurationText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    serviceSheetBody: {
      flexGrow: 0,
      padding: moderateWidthScale(14),
      marginBottom: moderateHeightScale(16),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
    },
    serviceSheetSectionLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: moderateHeightScale(6),
    },
    serviceSheetDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size14 * 1.5,
    },
    serviceSheetFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(16),
      marginHorizontal: -moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(14),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    serviceSheetPriceBlock: {
      flex: 1,
    },
    serviceSheetPrice: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceSheetCurrency: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    serviceSheetDiscountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(2),
    },
    serviceSheetSaveChip: {
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.orangeBrown015,
    },
    serviceSheetSaveText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    serviceSheetBookButton: {
      flex: 1,
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
    ownerWorkPhotosBlock: {
      marginTop: moderateHeightScale(16),
    },
    ownerWorkSectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: 0,
    },
    ownerWorkHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    ownerWorkSeeAllText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
    },
    ownerWorkSeeAllRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
    },
    ownerWorkPhotosScroll: {
      gap: moderateWidthScale(12),
      paddingBottom: moderateHeightScale(4),
    },
    ownerWorkPhotoCardShadow: {
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.background,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 5,
      elevation: 4,
    },
    ownerWorkPhotoCard: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    ownerWorkPhotoImage: {
      width: "100%",
      height: "100%",
    },
  });

export default function BusinessDetailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    business_id?: string;
    reel_id?: string;
    /** From a reel's Available Now badge: Book preselects this pro */
    staff_id?: string;
    scroll_to?: string;
    viewMode?: string;
  }>();
  const isViewMode = params.viewMode === "true";
  const attributionReelId = params.reel_id
    ? Number(params.reel_id)
    : null;
  const scrollToTarget = params.scroll_to;
  const profileTapSentRef = useRef(false);
  const scrolledToMembershipsRef = useRef(false);

  useEffect(() => {
    if (!attributionReelId || profileTapSentRef.current) return;
    profileTapSentRef.current = true;
    reportReelEvent(attributionReelId, "profile_tap");
  }, [attributionReelId]);

  const [activeTab, setActiveTab] = useState<
    "Details" | "Service" | "Ratings" | "Staff" | "Jobs"
  >("Service");
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
  const [selectedServiceFilter, setSelectedServiceFilter] =
    useState<string>("All");
  const [inclusionsModalVisible, setInclusionsModalVisible] = useState(false);
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [breaksModalVisible, setBreaksModalVisible] = useState(false);
  const [selectedBreaks, setSelectedBreaks] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [fullReviewModalVisible, setFullReviewModalVisible] = useState(false);
  const [serviceDetails, setServiceDetails] = useState<any | null>(null);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;
  const isOwnerPreviewMode =
    user.userRole === "business" &&
    !!user.business_id &&
    !!params.business_id &&
    user.business_id.toString() === params.business_id.toString();
  // Customer mode at the business this account owns / works at: the server
  // 403s booking, reviews, follows and purchases there, so turn them off up front.
  const isOwnBusinessInCustomerMode =
    !isGuest &&
    isInCustomerMode(user) &&
    !!params.business_id &&
    getOwnBusinessIds(user).some(
      (id) => id.toString() === params.business_id!.toString(),
    );
  const isBusinessOwnerView =
    isOwnerPreviewMode ||
    user.userRole === "staff" ||
    isOwnBusinessInCustomerMode;
  const showViewerBanner = isOwnerPreviewMode || isOwnBusinessInCustomerMode;
  // Messaging your own business from customer mode is refused by the server
  const isChatBlocked = isOwnerPreviewMode || isOwnBusinessInCustomerMode;
  const viewerBannerOffset = showViewerBanner
    ? insets.top + VIEWER_BANNER_CONTENT_HEIGHT + moderateHeightScale(6)
    : 0;

  // Refs for scroll positions
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const detailsSectionRef = useRef<View>(null);
  const serviceSectionRef = useRef<View>(null);
  const ratingsSectionRef = useRef<View>(null);
  const staffSectionRef = useRef<View>(null);
  const heroScrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<{ [key: string]: number }>({});
  const heroScrollStartX = useRef(0);
  const heroScrollStartTime = useRef(0);
  const heroDragStarted = useRef(false);

  // Default portfolio images
  const DEFAULT_PORTFOLIO_IMAGES = [
    getDefaultBusinessImage(),
  ];

  // API state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  const [ownerWorkImages, setOwnerWorkImages] =
    useState<OwnerWorkImagesPreview | null>(null);
  const [subscriptionPlanType, setSubscriptionPlanType] = useState<
    "Solo" | "Business" | null
  >(null);
  const isSoloPlan =
    typeof subscriptionPlanType === "string" &&
    subscriptionPlanType.toLowerCase() === "solo";
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "active" | "inactive"
  >("inactive");
  const [workingWithBusiness, setWorkingWithBusiness] =
    useState<AffiliatedBusiness | null>(null);

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

  // Heart = favourite (POST /favorite); Follow button = follow (separate API).
  const [isFavorited, setIsFavorited] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  // Hiring: open positions while the business has `is_hiring`
  const jobsSectionRef = useRef<View>(null);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostsLoading, setJobPostsLoading] = useState(false);
  const [jobPostsMore, setJobPostsMore] = useState(false);
  const [jobPostsPage, setJobPostsPage] = useState(1);
  const [jobPostsTotal, setJobPostsTotal] = useState<number | null>(null);
  const [showAllJobs, setShowAllJobs] = useState(false);
  // Bumped on every details load, so the jobs list refreshes with the flag
  const [detailsVersion, setDetailsVersion] = useState(0);
  const scrolledToJobsRef = useRef(false);

  // Deep link / notification: open memberships segment (R-16 follow_new_membership)
  useEffect(() => {
    if (scrollToTarget !== "memberships") return;
    if (scrolledToMembershipsRef.current) return;
    if (loading || !businessData) return;
    scrolledToMembershipsRef.current = true;
    setActiveTab("Service");
    setServiceSegment("subscriptions");
    const timer = setTimeout(() => {
      const position = sectionPositions.current.service;
      if (position !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: Math.max(0, position - moderateHeightScale(80)),
          animated: true,
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [scrollToTarget, loading, businessData]);

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
          subscription_plan_type?: "Solo" | "Business" | null;
          subscription_status?: "active" | "inactive";
          working_with_business_id?: number | null;
          working_with_business?: AffiliatedBusiness | null;
          owner_work_images?: OwnerWorkImagesPreview | null;
        };
      }>(businessEndpoints.businessDetails(params.business_id));

      if (response.success && response.data?.business) {
        setBusinessData(response.data.business);
        setDetailsVersion((v) => v + 1);
        const ownerWork =
          response.data.owner_work_images ??
          response.data.business?.owner_work_images ??
          null;
        setOwnerWorkImages(
          ownerWork && Array.isArray(ownerWork.data)
            ? {
                data: ownerWork.data,
                total:
                  typeof ownerWork.total === "number"
                    ? ownerWork.total
                    : ownerWork.data.length,
              }
            : { data: [], total: 0 },
        );
        const planType = response.data.subscription_plan_type ?? null;
        setSubscriptionPlanType(
          planType === "Solo" || planType === "Business" ? planType : null,
        );
        setSubscriptionStatus(
          response.data.subscription_status === "active"
            ? "active"
            : "inactive",
        );
        setWorkingWithBusiness(
          response.data.working_with_business ??
            response.data.business.working_with_business ??
            null,
        );
        const business = response.data.business;
        setIsFollowing(
          typeof business.is_following === "boolean"
            ? business.is_following
            : false,
        );
        setIsFavorited(
          typeof business.is_favorited === "boolean"
            ? business.is_favorited
            : false,
        );
        setFollowersCount(
          typeof business.followers_count === "number"
            ? business.followers_count
            : null,
        );
      } else {
        setError("Failed to load business details");
        setOwnerWorkImages(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load business details");
      setOwnerWorkImages(null);
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

  const isHiring = businessData?.is_hiring === true;

  const loadJobPosts = useCallback(
    async (page: number) => {
      if (!params.business_id) return;
      setJobPostsLoading(true);
      try {
        const { posts, meta } = await fetchBusinessJobPosts(params.business_id, {
          page,
          per_page: 20,
        });
        setJobPosts((prev) => {
          if (page === 1) return posts;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...posts.filter((p) => !seen.has(p.id))];
        });
        setJobPostsPage(page);
        setJobPostsMore(hasMoreJobPages(meta));
        setJobPostsTotal(typeof meta?.total === "number" ? meta.total : null);
      } catch (err) {
        Logger.error("Failed to load job posts:", err);
      } finally {
        setJobPostsLoading(false);
      }
    },
    [params.business_id],
  );

  // `is_hiring` is recalculated on every details load (owner closed / posted)
  useEffect(() => {
    if (isHiring) {
      void loadJobPosts(1);
    } else {
      setJobPosts([]);
      setJobPostsTotal(null);
      setJobPostsMore(false);
      setActiveTab((tab) => (tab === "Jobs" ? "Service" : tab));
    }
  }, [isHiring, detailsVersion, loadJobPosts]);

  // Deep link / list card HIRING tag: open the Jobs section
  useEffect(() => {
    if (scrollToTarget !== "jobs") return;
    if (scrolledToJobsRef.current) return;
    if (!isHiring || jobPosts.length === 0) return;
    scrolledToJobsRef.current = true;
    setActiveTab("Jobs");
    const timer = setTimeout(() => {
      const position = sectionPositions.current.jobs;
      if (position !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: Math.max(0, position - moderateHeightScale(80)),
          animated: true,
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [scrollToTarget, isHiring, jobPosts.length]);

  const applyFollowState = (following: boolean, followers: number | null) => {
    setIsFollowing(following);
    setFollowersCount(followers);
    setBusinessData((prev: any) =>
      prev
        ? {
            ...prev,
            is_following: following,
            ...(followers != null ? { followers_count: followers } : {}),
          }
        : prev,
    );
  };

  const handleToggleFollow = async () => {
    const isInternetConnected = await checkInternetConnection();
    if (!isInternetConnected) {
      Alert.alert(t("error"), t("noInternetConnection"));
      return;
    }

    if (!params.business_id || isFollowing === null || followLoading) {
      return;
    }

    const previousFollowing = isFollowing;
    const previousCount = followersCount;
    const nextFollowing = !previousFollowing;

    // Optimistic UI update
    setFollowLoading(true);
    applyFollowState(
      nextFollowing,
      previousCount != null
        ? Math.max(0, previousCount + (nextFollowing ? 1 : -1))
        : null,
    );

    try {
      const result = nextFollowing
        ? await followBusiness(params.business_id)
        : await unfollowBusiness(params.business_id);
      applyFollowState(result.following, result.followers ?? previousCount);
    } catch (error: any) {
      applyFollowState(previousFollowing, previousCount);
      Alert.alert(
        t("error"),
        error?.message ||
          (nextFollowing ? t("failedToFollow") : t("failedToUnfollow")),
      );
    } finally {
      setFollowLoading(false);
    }
  };

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
    const applyFavorite = (value: boolean) => {
      setIsFavorited(value);
      setBusinessData((prev: any) =>
        prev ? { ...prev, is_favorited: value } : prev,
      );
    };

    // Optimistic UI update
    applyFavorite(nextValue);

    try {
      const response = await ApiService.post<{
        success: boolean;
        favorited?: boolean;
      }>(businessEndpoints.favorite(params.business_id));

      if (!response?.success) {
        applyFavorite(previousValue);
        return;
      }
      if (typeof response.favorited === "boolean") {
        applyFavorite(response.favorited);
      }
    } catch (error: any) {
      applyFavorite(previousValue);
      Alert.alert(t("error"), error?.message || t("somethingWentWrong"));
    }
  };

  const handleShareBusiness = async () => {
    try {
      const shareUrl = `https://getfreshpass.com/businesses/${businessData?.slug ?? ""}`;
      const message = `Discover ${businessName} on FreshPass.\n\nAddress: ${businessAddress}\n\nView details & book here:\n${shareUrl}\n\nImage preview:\n${currentHeroImage}`;

      await Share.share({
        message,
        url: shareUrl,
      });
    } catch (_error) {
      // Silently ignore share errors for now
    }
  };

  // Fetch service templates for this business category
  useEffect(() => {
    const categoryId = businessData?.category?.id;

    if (!categoryId) {
      setServiceTemplates([]);
      // Reset filter to show all services
      setSelectedServiceFilter("All");
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
        Logger.error("Failed to fetch service templates:", e);
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

  const businessName = businessData?.title || "----";
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
  const handleChatPress = useCallback(() => {
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }

    const ownerId = businessData?.owner?.id;
    if (!ownerId) return;
    router.push({
      pathname: "/(main)/chatBox",
      params: {
        id: String(ownerId),
        chatItem: JSON.stringify({
          id: String(ownerId),
          name: businessData?.owner?.name ?? "",
          image: businessData?.owner?.avatar ?? "",
        }),
      },
    });
  }, [
    businessData?.owner?.id,
    businessData?.owner?.name,
    businessData?.owner?.avatar,
    dispatch,
    isGuest,
    router,
  ]);

  const ownerWorkPreview = useMemo(() => {
    const photos = ownerWorkImages?.data ?? [];
    const total = ownerWorkImages?.total ?? 0;
    if (!photos.length || total === 0) {
      return null;
    }
    return { photos, total };
  }, [ownerWorkImages]);

  const handleOpenOwnerWorkImage = useCallback(
    (index: number) => {
      const urls = (ownerWorkPreview?.photos ?? [])
        .map((img: StaffWorkImage) => img.url)
        .filter(Boolean);
      if (!urls.length) return;
      dispatch(
        openFullImageModal({
          images: urls,
          initialIndex: index,
        }),
      );
    },
    [dispatch, ownerWorkPreview],
  );

  const handleSeeAllOwnerWorkImages = useCallback(() => {
    const businessId = params.business_id ?? businessData?.id;
    if (!businessId) return;
    router.push({
      pathname: "/(main)/staffWorkImagesGallery",
      params: {
        businessId: String(businessId),
        name: businessData?.owner?.name || "",
      },
    } as any);
  }, [businessData?.id, businessData?.owner?.name, params.business_id, router]);

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

  const handlePrivacyPolicyPress = useCallback(async () => {
    const url = process.env.EXPO_PUBLIC_PRIVACY_URL;
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (_error) {
      // Silently ignore if URL cannot be opened
    }
  }, []);

  // Get business logo URL
  const getBusinessLogoUrl = () => {
    return (
      resolveApiImageUrl(businessData?.logo_url) ??
      getDefaultBusinessLogo()
    );
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
  const heroIndex = Math.max(0, thumbnails.indexOf(currentHeroImage));

  const rawCategoryName: string =
    typeof businessData?.category?.name === "string"
      ? businessData.category.name
      : typeof businessData?.category === "string"
        ? businessData.category
        : "";
  // API sends names like "MAKEUP"; show them as "Makeup"
  const businessCategoryName = rawCategoryName
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

  const socialLinks = (
    [
      ["facebook", businessData?.social_media_links?.facebook],
      ["instagram", businessData?.social_media_links?.instagram],
      ["tiktok", businessData?.social_media_links?.tiktok],
    ] as const
  )
    .filter(([, url]) => typeof url === "string" && url.length > 0)
    .map(([icon, url]) => ({ icon, url: url as string }));

  const extendedHeroImages =
    thumbnails.length > 1
      ? [thumbnails[thumbnails.length - 1], ...thumbnails, thumbnails[0]]
      : thumbnails.length === 1
        ? thumbnails
        : currentHeroImage
          ? [currentHeroImage]
          : [];

  useEffect(() => {
    if (extendedHeroImages.length > 2 && heroScrollRef.current) {
      heroScrollRef.current.scrollTo({
        x: SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [extendedHeroImages.length]);

  const handleOpenFullImage = () => {
    if (thumbnails.length) {
      const idx = thumbnails.indexOf(currentHeroImage);
      dispatch(
        openFullImageModal({
          images: thumbnails,
          initialIndex: idx >= 0 ? idx : 0,
        }),
      );
    }
  };

  const handleThumbnailSelect = (image: string) => {
    setCurrentHeroImage(image);
    const idx = thumbnails.indexOf(image);
    if (idx < 0) return;
    const isExtended = thumbnails.length > 1;
    const targetX = isExtended ? (idx + 1) * SCREEN_WIDTH : idx * SCREEN_WIDTH;
    heroScrollRef.current?.scrollTo({ x: targetX, animated: true });
  };

  const handleHeroScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const x = e.nativeEvent.contentOffset.x;
      const pageIndex = Math.round(x / SCREEN_WIDTH);
      if (thumbnails.length > 1 && extendedHeroImages.length > 2) {
        if (pageIndex === 0) {
          setCurrentHeroImage(thumbnails[thumbnails.length - 1]);
          setTimeout(() => {
            heroScrollRef.current?.scrollTo({
              x: thumbnails.length * SCREEN_WIDTH,
              animated: false,
            });
          }, 50);
        } else if (pageIndex === extendedHeroImages.length - 1) {
          setCurrentHeroImage(thumbnails[0]);
          setTimeout(() => {
            heroScrollRef.current?.scrollTo({
              x: SCREEN_WIDTH,
              animated: false,
            });
          }, 50);
        } else {
          setCurrentHeroImage(thumbnails[pageIndex - 1]);
        }
      } else {
        const idx = Math.min(Math.max(0, pageIndex), thumbnails.length - 1);
        if (thumbnails[idx]) setCurrentHeroImage(thumbnails[idx]);
      }
    },
    [thumbnails, extendedHeroImages.length],
  );

  const handleHeroScrollBeginDrag = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      heroDragStarted.current = true;
      heroScrollStartX.current = e.nativeEvent.contentOffset.x;
      heroScrollStartTime.current = Date.now();
    },
    [],
  );

  const handleHeroScrollEndDrag = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (!heroDragStarted.current) {
        handleOpenFullImage();
      } else {
        const dx = Math.abs(
          e.nativeEvent.contentOffset.x - heroScrollStartX.current,
        );
        const dt = Date.now() - heroScrollStartTime.current;
        if (dx < 25 && dt < 500) {
          handleOpenFullImage();
        }
      }
      heroDragStarted.current = false;
    },
    [handleOpenFullImage],
  );

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

  // Customers only see times the whole business is closed. `business_leaves`
  // also holds owner time off while the team keeps working; it is the
  // fallback only for backends that don't send `business_closures` yet.
  const businessLeaves = useMemo(() => {
    const leaves =
      businessData?.business_closures !== undefined
        ? businessData.business_closures
        : businessData?.business_leaves;
    if (!Array.isArray(leaves) || leaves.length === 0) return [];
    return leaves;
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
      // Original/striked price should be higher than current price.
      originalPrice: parseFloat(plan.price) * 1.1,
      inclusions:
        plan.services?.map(
          (service: any, index: number) =>
            `${index + 1}. ${service.name} x ${service.quantity ?? 1}`,
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
        description: (service.description ?? "").toString().trim(),
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


  // Map staff from API
  const staffMembers = useMemo(() => {
    if (!businessData?.staff) return [];

    return businessData.staff
      .filter((staff: any) => staff.invitation_status === "accepted")
      .map((staff: any) => {
        let image = getDefaultAvatarImage();

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
          is_owner: staff.is_owner === true,
          average_rating: staff.average_rating ?? 0,
          ratings_count: staff.ratings_count ?? 0,
        };
      });
  }, [businessData]);
  const averageRating = businessData?.average_rating || 0;
  const totalReviews = businessData?.ratings_count || reviewsTotal || 0;
  const textWrapLength = 115;

  const handleTabPress = (
    tab: "Details" | "Service" | "Ratings" | "Staff" | "Jobs",
  ) => {
    if (isSoloPlan && tab === "Staff") return;
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

  useEffect(() => {
    if (isSoloPlan && activeTab === "Staff") {
      setActiveTab("Service");
    }
  }, [isSoloPlan, activeTab]);

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
    return getDefaultAvatarImage();
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

    return getDefaultAvatarImage();
  };

  // Format owner phone with country code

  const renderReviewCard = (review: any, isHorizontal = false, index = 0) => {
    const reviewText = review.comment || "";
    const shouldShowSeeMore = reviewText.length > textWrapLength;
    const suggestionTitle = review.review_suggestion?.title || null;
    const hasMedia = !!(review.image_url || review.video_url);

    return (
      <View
        style={[styles.reviewCard, isHorizontal && styles.reviewCardHorizontal]}
      >
        <View style={styles.reviewCardHeaderRow}>
          <View style={styles.reviewAvatar}>
            <AppImage
              uri={getProfileImageUrl(review.user?.avatar || null)}
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

        {reviewText ? (
          <View
            style={[
              styles.reviewCardTextContainer,
              isHorizontal &&
                !hasMedia &&
                styles.reviewCardTextContainerHorizontal,
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
        ) : null}

        <ReviewMediaStrip
          imageUrl={review.image_url}
          videoUrl={review.video_url}
          size={widthScale(56)}
          style={{ marginTop: moderateHeightScale(10) }}
        />

        {review.staff?.name ? (
          <ReviewServedBy
            name={review.staff.name}
            image={review.staff.profile_image_url}
            style={{ marginTop: moderateHeightScale(10) }}
          />
        ) : null}
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
            <View style={styles.shopLocationInfo}>
              <Text style={styles.shopLocationText}>{businessAddress}</Text>
              {!!workingWithBusiness?.title && (
                <Text style={styles.shopLocationAffiliation} numberOfLines={1}>
                  {t("affiliatedWith")}{" "}
                  <Text style={styles.shopLocationAffiliationName}>
                    {workingWithBusiness.title}
                  </Text>
                </Text>
              )}
            </View>
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
                  <View style={styles.contactActionsRow}>
                    {businessData?.owner?.id != null && (
                      <TouchableOpacity
                        style={[
                          styles.chatIconButton,
                          isChatBlocked && styles.disabledAction,
                        ]}
                        onPress={isChatBlocked ? undefined : handleChatPress}
                        disabled={isChatBlocked}
                      >
                        <ChatIcon
                          width={widthScale(17)}
                          height={heightScale(17)}
                          color={theme.white}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.callNowButton,
                        isOwnerPreviewMode && styles.disabledAction,
                      ]}
                      onPress={
                        isOwnerPreviewMode ? undefined : handleCallNow
                      }
                      disabled={isOwnerPreviewMode}
                    >
                      <Ionicons
                        name="call"
                        size={widthScale(18)}
                        color={theme.white}
                      />
                    </TouchableOpacity>
                  </View>
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
                  <AppImage
                    uri={getOwnerAvatarUrl()}
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
                      style={[
                        styles.callNowButton,
                        isOwnerPreviewMode && styles.disabledAction,
                      ]}
                      onPress={
                        isOwnerPreviewMode ? undefined : handleCallNow
                      }
                      disabled={isOwnerPreviewMode}
                    >
                      <Ionicons
                        name="call"
                        size={widthScale(18)}
                        color={theme.white}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {ownerWorkPreview ? (
                <View style={styles.ownerWorkPhotosBlock}>
                  <View style={styles.ownerWorkHeaderRow}>
                    <Text style={styles.ownerWorkSectionTitle}>
                      {t("workPhotosTitle")}
                    </Text>
                    {ownerWorkPreview.total > ownerWorkPreview.photos.length ? (
                      <TouchableOpacity
                        onPress={handleSeeAllOwnerWorkImages}
                        activeOpacity={0.7}
                        style={styles.ownerWorkSeeAllRow}
                      >
                        <Text style={styles.ownerWorkSeeAllText}>
                          {t("seeAll")}
                        </Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={moderateWidthScale(18)}
                          color={theme.buttonBack}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.ownerWorkPhotosScroll}
                  >
                    {ownerWorkPreview.photos.map(
                      (image: StaffWorkImage, index: number) => (
                        <TouchableOpacity
                          key={image.id}
                          activeOpacity={0.85}
                          onPress={() => handleOpenOwnerWorkImage(index)}
                          style={styles.ownerWorkPhotoCardShadow}
                        >
                          <View style={styles.ownerWorkPhotoCard}>
                            <AppImage
                              uri={image.url}
                              style={styles.ownerWorkPhotoImage}
                            />
                          </View>
                        </TouchableOpacity>
                      ),
                    )}
                  </ScrollView>
                </View>
              ) : null}
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

        {/* Business Leaves */}
        {(businessLeaves?.length ?? 0) > 0 ? (
          <>
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
                <Text style={styles.sectionTitle}>
                  {t("closeBreak") || "Close/Break"}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hoursCardsContainer}
              >
                {businessLeaves.map((leave: any) => (
                  <View
                    key={leave.id}
                    style={[styles.hoursCard, styles.shadow]}
                  >
                    <Text style={styles.hoursDay}>
                      {leave.type === "break"
                        ? t("break") || "Break"
                        : t("close") || "Close"}
                    </Text>
                    <Text style={styles.hoursTime}>
                      {formatLeaveRangeDisplay(leave)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
    );
  };

  /** Book Now for one service (card or service details) — forwards reel attribution. */
  const handleBookService = (service: any) => {
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
        let image = getDefaultAvatarImage();
        if (staff.avatar) {
          const isAbsoluteUrl =
            typeof staff.avatar === "string" &&
            (staff.avatar.startsWith("http://") ||
              staff.avatar.startsWith(
                "https://",
              ));

          if (isAbsoluteUrl) {
            image = staff.avatar;
          } else {
            image = `${process.env.EXPO_PUBLIC_API_BASE_URL}${staff.avatar}`;
          }
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
          active: staff.active,
          is_owner: staff.is_owner === true,
          average_rating: staff.average_rating ?? 0,
          ratings_count: staff.ratings_count ?? 0,
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
      subscriptionPlanType,
      subscriptionStatus,
    };
    dispatch(
      setBusinessDataAction(businessPayload),
    );
    // Navigate to bookingNow; forward reel attribution and the badge's pro when present
    const bookParams: Record<string, string> = {};
    if (attributionReelId) bookParams.reel_id = String(attributionReelId);
    if (params.staff_id) bookParams.staff_id = params.staff_id;
    router.push({
      pathname: "/(main)/bookingNow",
      params: Object.keys(bookParams).length > 0 ? bookParams : undefined,
    });
  };

  /** Tap a service card → details sheet. From a reel, counts one `service_view` per open. */
  const openServiceDetails = (service: any) => {
    setServiceDetails(service);
    if (attributionReelId) {
      reportReelEvent(attributionReelId, "service_view");
    }
  };

  const bookFromServiceDetails = () => {
    const service = serviceDetails;
    if (!service) return;
    setServiceDetails(null);
    handleBookService(service);
  };

  const renderServiceContent = () => {
    const hasMemberships = membershipSubscriptions.length > 0;
    const hasAnyIndividualServices = individualServices.length > 0;
    const hasFilteredIndividualServices = filteredIndividualServices.length > 0;

    const canCollapseMemberships = membershipSubscriptions.length > 3;
    const canCollapseIndividual = filteredIndividualServices.length > 3;

    const displayedMembershipSubscriptions =
      canCollapseMemberships && !showAllMembershipSubscriptions
        ? membershipSubscriptions.slice(0, 3)
        : membershipSubscriptions;

    const displayedIndividualServices =
      canCollapseIndividual && !showAllIndividualServices
        ? filteredIndividualServices.slice(0, 3)
        : filteredIndividualServices;

    const renderFilterChips = (
      filters: string[],
      selected: string,
      onSelect: (filter: string) => void,
    ) => (
      <View style={styles.filterStripWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((filter) => {
            const active = selected === filter;
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                style={[styles.filterButton, active && styles.filterButtonActive]}
                onPress={() => onSelect(filter)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    active && styles.filterButtonTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );

    const renderViewAllRow = (
      expanded: boolean,
      label: string,
      onPress: () => void,
    ) => (
      <TouchableOpacity
        style={styles.viewAllRow}
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.viewAllRowText}>
          {expanded ? t("showLess") : label}
        </Text>
        <MaterialIcons
          name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={moderateWidthScale(20)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>
    );

    const renderEmpty = (message: string) => (
      <View style={styles.noServiceContainer}>
        <View style={styles.noServiceIcon}>
          <MaterialIcons
            name="content-cut"
            size={moderateWidthScale(22)}
            color={theme.lightGreen}
          />
        </View>
        <Text style={styles.noServiceText}>{message}</Text>
      </View>
    );

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
          variant="light"
          style={styles.serviceSegment}
        />

        {/* Membership Subscriptions Section */}
        <View style={serviceSegment !== "subscriptions" && { display: "none" }}>
          {hasMemberships &&
            renderFilterChips(
              membershipFilters,
              selectedMembershipFilter,
              setSelectedMembershipFilter,
            )}
          <View style={[styles.serviceSection, styles.cardShadow]}>
            {hasMemberships ? (
              <>
                {displayedMembershipSubscriptions.map(
                  (subscription: any, index: number) => {
                    const inclusions: string[] = subscription.inclusions;
                    const visibleInclusions = inclusions.slice(0, 2);
                    const hiddenCount = inclusions.length - 2;
                    return (
                      <View key={subscription.id}>
                        {index > 0 && <View style={styles.serviceRowDivider} />}
                        <View style={styles.serviceCard}>
                          <View style={styles.serviceCardContent}>
                            <View style={styles.serviceCardLeft}>
                              <Text style={styles.serviceName}>
                                {subscription.title}
                              </Text>
                              {inclusions.length > 0 && (
                                <View style={styles.membershipInclusions}>
                                  {visibleInclusions.map(
                                    (inclusion: string, inclusionIndex: number) => (
                                      <View
                                        key={inclusionIndex}
                                        style={styles.inclusionRow}
                                      >
                                        <MaterialIcons
                                          name="check"
                                          size={moderateWidthScale(15)}
                                          color={theme.buttonBack}
                                          style={{
                                            marginTop: moderateHeightScale(2),
                                          }}
                                        />
                                        <Text style={styles.inclusionItem}>
                                          {inclusion.replace(/^\d+\.\s*/, "")}
                                        </Text>
                                      </View>
                                    ),
                                  )}
                                  {hiddenCount > 0 && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        setSelectedInclusions(inclusions);
                                        setInclusionsModalVisible(true);
                                      }}
                                      hitSlop={{ top: 8, bottom: 8 }}
                                    >
                                      <Text style={styles.moreText}>
                                        {t("moreCount", { count: hiddenCount })}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                            </View>
                            <View style={styles.serviceCardRight}>
                              <Text style={styles.servicePrice}>
                                ${subscription.price.toFixed(2)}
                                <Text style={styles.serviceCurrency}> USD</Text>
                              </Text>
                              <Text
                                style={[
                                  styles.serviceOriginalPrice,
                                  styles.serviceOriginalPriceSpaced,
                                ]}
                              >
                                ${subscription.originalPrice.toFixed(2)}
                              </Text>
                              <TouchableOpacity
                                style={[
                                  styles.bookNowButton,
                                  isBusinessOwnerView && styles.disabledAction,
                                ]}
                                activeOpacity={0.8}
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
                                      subscriptionInclusions: JSON.stringify(
                                        subscription.inclusions,
                                      ),
                                      businessId:
                                        businessData?.id?.toString() ||
                                        params.business_id ||
                                        "",
                                      businessName: businessData?.title || "",
                                      businessLogo: businessData?.logo_url || "",
                                      screenName: "businessDetail",
                                      ...(attributionReelId
                                        ? { reel_id: String(attributionReelId) }
                                        : {}),
                                    },
                                  });
                                }}
                              >
                                <Text style={styles.bookNowButtonText}>
                                  {t("joinNow")}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  },
                )}

                {canCollapseMemberships &&
                  renderViewAllRow(
                    showAllMembershipSubscriptions,
                    t("viewAllPlansCount", {
                      count: membershipSubscriptions.length,
                    }),
                    () =>
                      setShowAllMembershipSubscriptions(
                        !showAllMembershipSubscriptions,
                      ),
                  )}
              </>
            ) : (
              renderEmpty(t("noSubscriptionListFound"))
            )}
          </View>
        </View>

        {/* Individual Services Section */}
        <View style={serviceSegment !== "individual" && { display: "none" }}>
          {hasAnyIndividualServices &&
            renderFilterChips(
              serviceFilters,
              selectedServiceFilter,
              setSelectedServiceFilter,
            )}
          <View style={[styles.serviceSection, styles.cardShadow]}>
            {hasFilteredIndividualServices ? (
              <>
                {displayedIndividualServices.map(
                  (service: any, index: number) => (
                    <View key={service.id}>
                      {index > 0 && <View style={styles.serviceRowDivider} />}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={service.name}
                        onPress={() => openServiceDetails(service)}
                        style={styles.serviceCard}
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
                            <Text style={styles.serviceName} numberOfLines={2}>
                              {service.name}
                            </Text>
                            <View style={styles.serviceMetaRow}>
                              <MaterialIcons
                                name="schedule"
                                size={moderateWidthScale(14)}
                                color={theme.lightGreen}
                              />
                              <Text style={styles.serviceDuration}>
                                {service.duration}
                              </Text>
                            </View>
                            {!!service.description && (
                              <Text
                                style={styles.serviceDescription}
                                numberOfLines={2}
                              >
                                {service.description.charAt(0).toUpperCase() +
                                  service.description.slice(1)}
                              </Text>
                            )}
                          </View>
                          <View style={styles.serviceCardRight}>
                            <Text style={styles.servicePrice}>
                              ${service.price.toFixed(2)}
                              <Text style={styles.serviceCurrency}> USD</Text>
                            </Text>
                            <Text
                              style={[
                                styles.serviceOriginalPrice,
                                styles.serviceOriginalPriceSpaced,
                              ]}
                            >
                              ${service.originalPrice.toFixed(2)}
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.bookNowButton,
                                isBusinessOwnerView && styles.disabledAction,
                              ]}
                              activeOpacity={0.8}
                              disabled={isBusinessOwnerView}
                              onPress={() => handleBookService(service)}
                            >
                              <Text style={styles.bookNowButtonText}>
                                {t("bookNow")}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ),
                )}

                {canCollapseIndividual &&
                  renderViewAllRow(
                    showAllIndividualServices,
                    t("viewAllServicesCount", {
                      count: filteredIndividualServices.length,
                    }),
                    () => setShowAllIndividualServices(!showAllIndividualServices),
                  )}
              </>
            ) : (
              renderEmpty(t("noServicesFound"))
            )}
          </View>
        </View>
      </View>
    );
  };

  const JOBS_PREVIEW_COUNT = 3;

  const renderJobsContent = () => {
    const total = jobPostsTotal ?? jobPosts.length;
    const canCollapse = jobPosts.length > JOBS_PREVIEW_COUNT;
    const shown =
      canCollapse && !showAllJobs
        ? jobPosts.slice(0, JOBS_PREVIEW_COUNT)
        : jobPosts;
    return (
      <View
        ref={jobsSectionRef}
        onLayout={() => {
          measureSectionPosition(jobsSectionRef, "jobs");
        }}
        style={styles.contentContainer}
      >
        <View style={styles.sectionContentFullWidth}>
          <View style={styles.jobsHead}>
            <View style={styles.jobsHeadText}>
              <View style={styles.jobsTitleRow}>
                <Text style={styles.jobsTitle} accessibilityRole="header">
                  {t("jobOpenPositionsCount", { count: total })}
                </Text>
                <View style={styles.jobsHiringPill}>
                  <MaterialIcons
                    name="work"
                    size={moderateWidthScale(11)}
                    color={theme.successGreen}
                  />
                  <Text style={styles.jobsHiringPillText}>
                    {t("jobHiringBadge")}
                  </Text>
                </View>
              </View>
              <Text style={styles.jobsSubtitle}>
                {t("jobJoinTeam", { name: businessName })}
              </Text>
            </View>
            {isOwnerPreviewMode ? (
              <TouchableOpacity
                style={styles.jobsManage}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(
                    "/(main)/dashboard/(account)/(businessProfileSettings)/jobPosts" as any,
                  )
                }
                accessibilityRole="button"
              >
                <Text style={styles.jobsManageText}>{t("jobManage")}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(20)}
                  color={theme.buttonBack}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <JobRowsCard style={styles.cardShadow}>
            {jobPosts.length === 0 ? (
              <View style={styles.jobsLoading}>
                {jobPostsLoading ? (
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                ) : (
                  <Text style={styles.jobsSubtitle}>{t("jobNoOpenPositions")}</Text>
                )}
              </View>
            ) : (
              shown.map((post, index) => (
                <View key={post.id}>
                  {index > 0 && <View style={styles.jobsRowDivider} />}
                  <JobListRow
                    post={post}
                    onPress={() =>
                      router.push({
                        pathname: "/(main)/jobs/detail" as any,
                        params: { id: String(post.id) },
                      })
                    }
                  />
                </View>
              ))
            )}
            {canCollapse ? (
              <TouchableOpacity
                style={styles.viewAllRow}
                activeOpacity={0.7}
                onPress={() => setShowAllJobs((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showAllJobs }}
              >
                <Text style={styles.viewAllRowText}>
                  {showAllJobs
                    ? t("showLess")
                    : t("jobViewAllPositions", { count: total })}
                </Text>
                <MaterialIcons
                  name={showAllJobs ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={moderateWidthScale(20)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            ) : null}
            {showAllJobs && jobPostsMore ? (
              <TouchableOpacity
                style={styles.viewAllRow}
                activeOpacity={0.7}
                disabled={jobPostsLoading}
                onPress={() => void loadJobPosts(jobPostsPage + 1)}
                accessibilityRole="button"
              >
                {jobPostsLoading ? (
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                ) : (
                  <Text style={styles.viewAllRowText}>{t("jobLoadMore")}</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </JobRowsCard>
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
                style={styles.staffCard}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/staffDetail",
                    params: { id: String(staff.id) },
                  })
                }
              >
                <AppImage
                  uri={staff.image}
                  style={styles.staffProfileImage}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.staffStatusDot,
                    staff.active
                      ? styles.staffStatusDotActive
                      : styles.staffStatusDotInactive,
                  ]}
                />
                <RatingBadge
                  overlay
                  showCount={false}
                  average={staff.average_rating}
                  count={staff.ratings_count}
                  style={styles.staffRatingBadge}
                />
                <LinearGradient
                  colors={[
                    "transparent",
                    theme.lightGreen5,
                    theme.lightGreen,
                    theme.black,
                  ]}
                  locations={[0, 0.35, 0.7, 1]}
                  style={styles.staffInfoStrip}
                  pointerEvents="none"
                >
                  <Text style={styles.staffName} numberOfLines={1}>
                    {staff.is_owner
                      ? `${staff.name} · ${t("owner")}`
                      : staff.name}
                  </Text>
                  {staff.experience ? (
                    <Text numberOfLines={1} style={styles.staffExperience}>
                      {staff.experience}
                    </Text>
                  ) : null}
                </LinearGradient>
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
                {t("reviewsCount", {
                  rating: `${averageRatingToShow.toFixed(1)}/5`,
                  count: totalReviewsToShow,
                })}
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
          {/* {canWriteReview && (
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
          )} */}

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
              isOwnerPreviewMode && styles.disabledAction,
            ]}
            onPress={
              isOwnerPreviewMode ? undefined : handlePrivacyPolicyPress
            }
            disabled={isOwnerPreviewMode}
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
          <TouchableOpacity
            onPress={
              isOwnerPreviewMode ? undefined : handlePrivacyPolicyPress
            }
            disabled={isOwnerPreviewMode}
            style={[
              styles.policyItem,
              isOwnerPreviewMode && styles.disabledAction,
            ]}
          >
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

  const renderViewerModeBanner = () => {
    if (!showViewerBanner) {
      return null;
    }

    return (
      <View
        style={[
          styles.viewerModeBanner,
          { paddingTop: insets.top + moderateHeightScale(2) },
        ]}
        pointerEvents="box-none"
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={18}
            tint="dark"
            style={styles.viewerModeBannerBlur}
          />
        ) : null}
        <View style={styles.viewerModeBannerOverlay} />
        <View style={styles.viewerModeBannerContent}>
          <Text style={styles.viewerModeBannerText} numberOfLines={1}>
            {isOwnBusinessInCustomerMode
              ? t("ownBusinessCustomerModeBanner")
              : t("viewingAsViewer")}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.viewerModeExitText}>{t("exitViewAs")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTopHeader = (actionsEnabled: boolean) => (
    <View
      style={[
        styles.header,
        showViewerBanner && {
          top: viewerBannerOffset,
          paddingTop: moderateHeightScale(10),
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
        >
          <BackArrowIcon
            width={widthScale(18)}
            height={heightScale(18)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.iconButton,
            !actionsEnabled && styles.disabledAction,
          ]}
          onPress={actionsEnabled ? handleShareBusiness : undefined}
          disabled={!actionsEnabled}
          accessibilityRole="button"
          accessibilityLabel={t("share")}
        >
          <ShareIcon
            width={widthScale(17)}
            height={heightScale(17)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.iconButton,
            (!actionsEnabled || isBusinessOwnerView) && styles.disabledAction,
          ]}
          onPress={
            !actionsEnabled || isBusinessOwnerView
              ? undefined
              : isGuest
                ? () => dispatch(setGuestModeModalVisible(true))
                : handleToggleFavorite
          }
          disabled={!actionsEnabled || isBusinessOwnerView}
          accessibilityRole="button"
          accessibilityState={{ selected: !!isFavorited }}
          accessibilityLabel={t("favorites")}
        >
          <MaterialIcons
            name={isFavorited ? "favorite" : "favorite-border"}
            size={moderateWidthScale(20)}
            color={isFavorited ? theme.selectCard : theme.darkGreen}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (loading && businessData == null) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderViewerModeBanner()}
        {renderTopHeader(false)}
        <View style={styles.loadingContent}>
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
        {renderViewerModeBanner()}
        {renderTopHeader(false)}
        <View style={styles.errorContent}>
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
      {renderViewerModeBanner()}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: moderateHeightScale(40) }}
      >
        <View ref={scrollContentRef}>
          {renderTopHeader(true)}

          {/* Hero Image - horizontally scrollable with wrap-around */}
          <View style={styles.heroWrapper}>
            <ScrollView
              ref={heroScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleHeroScrollEnd}
              onScrollBeginDrag={handleHeroScrollBeginDrag}
              onScrollEndDrag={handleHeroScrollEndDrag}
              style={styles.heroImageContainer}
              contentContainerStyle={
                extendedHeroImages.length
                  ? { width: SCREEN_WIDTH * extendedHeroImages.length }
                  : undefined
              }
              scrollEventThrottle={16}
            >
              {extendedHeroImages.map((uri: string, index: number) => (
                <TouchableOpacity
                  key={`${uri}-${index}`}
                  style={styles.heroImageSlide}
                  activeOpacity={1}
                  onPress={handleOpenFullImage}
                >
                  <AppImage
                    uri={uri}
                    style={styles.heroImage}
                    resizeMode="cover"
                    iconSize={widthScale(48)}
                    iconColor={theme.white50}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]}
              style={styles.heroTopScrim}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.35)"]}
              style={styles.heroBottomScrim}
            />
            {thumbnails.length > 1 && thumbnails.length <= 8 && (
              <View style={styles.heroDots}>
                {thumbnails.map((thumbnail: string, index: number) => (
                  <TouchableOpacity
                    key={`dot-${index}`}
                    onPress={() => handleThumbnailSelect(thumbnail)}
                    hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1} / ${thumbnails.length}`}
                  >
                    <View
                      style={[
                        styles.heroDot,
                        index === heroIndex && styles.heroDotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {thumbnails.length > 0 && (
              <TouchableOpacity
                style={styles.heroCounter}
                activeOpacity={0.8}
                onPress={handleOpenFullImage}
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="photo-library"
                  size={moderateWidthScale(14)}
                  color={theme.white}
                />
                <Text style={styles.heroCounterText}>
                  {heroIndex + 1}/{thumbnails.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Business Info Sheet */}
          <LinearGradient
            colors={[theme.darkGreen, theme.darkGreenDeep]}
            style={styles.infoSheet}
          >
            <View style={styles.identityRow}>
              {isHiring ? (
                <HiringRing onPress={() => handleTabPress("Jobs")}>
                  <AppImage
                    uri={getBusinessLogoUrl()}
                    style={styles.businessLogo}
                    resizeMode="cover"
                  />
                </HiringRing>
              ) : (
                <AppImage
                  uri={getBusinessLogoUrl()}
                  style={styles.businessLogo}
                  resizeMode="cover"
                />
              )}
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text style={styles.businessName} numberOfLines={2}>
                    {businessName}
                  </Text>
                  {businessData?.is_official ? (
                    <MaterialIcons
                      name="verified"
                      size={moderateWidthScale(18)}
                      color={theme.orangeBrown}
                    />
                  ) : null}
                </View>
                {!!businessCategoryName && (
                  <Text style={styles.businessCategory} numberOfLines={1}>
                    {businessCategoryName}
                  </Text>
                )}
                <View style={styles.metaRow}>
                  <TouchableOpacity
                    style={styles.metaRatingButton}
                    activeOpacity={0.7}
                    onPress={() => handleTabPress("Ratings")}
                    hitSlop={{ top: 8, bottom: 8 }}
                  >
                    <MaterialIcons
                      name="star"
                      size={moderateWidthScale(16)}
                      color={theme.orangeBrown}
                    />
                    <Text style={styles.metaRatingValue}>
                      {averageRating.toFixed(1)}
                    </Text>
                    <Text style={styles.metaText}>
                      ({t("reviewsCountShort", { count: totalReviews })})
                    </Text>
                  </TouchableOpacity>
                  {followersCount != null && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaText}>
                        {t("followersCount", { count: followersCount })}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.verifiedChip}>
                <MaterialIcons
                  name="verified-user"
                  size={moderateWidthScale(14)}
                  color={theme.white}
                />
                <Text style={styles.verifiedChipText}>
                  {t("platformVerified")}
                </Text>
              </View>
              <View style={styles.offerChip}>
                <MaterialIcons
                  name="local-offer"
                  size={moderateWidthScale(14)}
                  color={theme.darkGreen}
                />
                <Text style={styles.offerChipText}>
                  {t("discountBadgeText")}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {!isBusinessOwnerView && (
                <TouchableOpacity
                  style={[styles.followCta, isFollowing && styles.followCtaActive]}
                  activeOpacity={0.85}
                  disabled={followLoading || (!isGuest && isFollowing === null)}
                  onPress={
                    isGuest
                      ? () => dispatch(setGuestModeModalVisible(true))
                      : handleToggleFollow
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!isFollowing }}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? theme.white : theme.darkGreen}
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name={isFollowing ? "check" : "add"}
                        size={moderateWidthScale(18)}
                        color={isFollowing ? theme.white : theme.darkGreen}
                      />
                      <Text
                        style={[
                          styles.followCtaText,
                          isFollowing && styles.followCtaTextActive,
                        ]}
                      >
                        {isFollowing ? t("following") : t("follow")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {businessData?.owner?.id != null && (
                <TouchableOpacity
                  style={[
                    styles.actionIconButton,
                    isBusinessOwnerView && styles.actionIconButtonWide,
                    isChatBlocked && styles.disabledAction,
                  ]}
                  activeOpacity={0.7}
                  onPress={isChatBlocked ? undefined : handleChatPress}
                  disabled={isChatBlocked}
                  accessibilityRole="button"
                  accessibilityLabel={t("chat")}
                >
                  <ChatIcon
                    width={widthScale(20)}
                    height={heightScale(20)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              )}
              {!!businessPhone && (
                <TouchableOpacity
                  style={[
                    styles.actionIconButton,
                    isBusinessOwnerView && styles.actionIconButtonWide,
                    isOwnerPreviewMode && styles.disabledAction,
                  ]}
                  activeOpacity={0.7}
                  onPress={isOwnerPreviewMode ? undefined : handleCallNow}
                  disabled={isOwnerPreviewMode}
                  accessibilityRole="button"
                  accessibilityLabel={t("call")}
                >
                  <Ionicons
                    name="call-outline"
                    size={moderateWidthScale(20)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              )}
              {businessLatitude != null && businessLongitude != null && (
                <TouchableOpacity
                  style={[
                    styles.actionIconButton,
                    isBusinessOwnerView && styles.actionIconButtonWide,
                  ]}
                  activeOpacity={0.7}
                  onPress={handleLocationPress}
                  accessibilityRole="button"
                  accessibilityLabel={t("getDirections")}
                >
                  <Ionicons
                    name="navigate-outline"
                    size={moderateWidthScale(20)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoCard}>
              <TouchableOpacity
                style={styles.infoRow}
                activeOpacity={0.7}
                onPress={handleLocationPress}
                accessibilityRole="button"
              >
                <View style={styles.infoRowIcon}>
                  <Ionicons
                    name="location-outline"
                    size={moderateWidthScale(18)}
                    color={theme.orangeBrown}
                  />
                </View>
                <View style={styles.infoRowBody}>
                  <Text style={styles.infoRowText} numberOfLines={2}>
                    {businessAddress}
                  </Text>
                  {calculateTravelTime !== null && (
                    <Text style={styles.infoRowSubText}>
                      {formatTravelTime(calculateTravelTime)}
                    </Text>
                  )}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(20)}
                  color={theme.white50}
                />
              </TouchableOpacity>

              {!isSoloPlan && (
                <>
                  <View style={styles.infoRowDivider} />
                  <TouchableOpacity
                    style={styles.infoRow}
                    activeOpacity={0.7}
                    onPress={() => handleTabPress("Staff")}
                    accessibilityRole="button"
                  >
                    <View style={styles.infoRowIcon}>
                      <Ionicons
                        name="people-outline"
                        size={moderateWidthScale(18)}
                        color={theme.orangeBrown}
                      />
                    </View>
                    <Text style={[styles.infoRowText, styles.infoRowBody]}>
                      {t("staffMembersCount", {
                        count: businessData?.staffCount || staffMembers.length,
                      })}
                    </Text>
                    {staffMembers.length > 0 && (
                      <View style={styles.avatarStack}>
                        {staffMembers
                          .slice(0, 3)
                          .map((member: any, index: number) => (
                            <AppImage
                              key={`${member.id}-${index}`}
                              uri={member.image}
                              style={[
                                styles.avatarStackItem,
                                index > 0 && {
                                  marginLeft: moderateWidthScale(-10),
                                },
                              ]}
                              resizeMode="cover"
                            />
                          ))}
                      </View>
                    )}
                    <MaterialIcons
                      name="chevron-right"
                      size={moderateWidthScale(20)}
                      color={theme.white50}
                    />
                  </TouchableOpacity>
                </>
              )}

              {!!workingWithBusiness?.id && !!workingWithBusiness.title && (
                <>
                  <View style={styles.infoRowDivider} />
                  <TouchableOpacity
                    style={styles.infoRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/(main)/businessDetail",
                        params: {
                          business_id: workingWithBusiness.id.toString(),
                        },
                      })
                    }
                    accessibilityRole="button"
                  >
                    <View style={styles.infoRowIcon}>
                      <Ionicons
                        name="storefront-outline"
                        size={moderateWidthScale(18)}
                        color={theme.orangeBrown}
                      />
                    </View>
                    <Text
                      style={[styles.infoRowText, styles.infoRowBody]}
                      numberOfLines={1}
                    >
                      {t("affiliatedWith")}{" "}
                      <Text style={styles.infoRowStrong}>
                        {workingWithBusiness.title}
                      </Text>
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={moderateWidthScale(20)}
                      color={theme.white50}
                    />
                  </TouchableOpacity>
                </>
              )}

              {socialLinks.length > 0 && (
                <>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoRowIcon}>
                      <Ionicons
                        name="globe-outline"
                        size={moderateWidthScale(18)}
                        color={theme.orangeBrown}
                      />
                    </View>
                    <Text style={[styles.infoRowText, styles.infoRowBody]}>
                      {t("socialLinks")}
                    </Text>
                    <View style={styles.socialIcons}>
                      {socialLinks.map((link) => (
                        <TouchableOpacity
                          key={link.icon}
                          style={styles.socialIconButton}
                          activeOpacity={0.7}
                          onPress={() =>
                            Linking.openURL(link.url).catch(() => {})
                          }
                          accessibilityRole="link"
                          accessibilityLabel={link.icon}
                        >
                          <FontAwesome5
                            name={link.icon}
                            size={moderateWidthScale(16)}
                            color={theme.white}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {(
              [
                ["Service", t("tabService")],
                ["Jobs", t("tabJobs")],
                ["Details", t("tabDetails")],
                ["Staff", t("tabStaff")],
                ["Ratings", t("tabRatings")],
              ] as const
            )
              .filter(([tab]) => !(isSoloPlan && tab === "Staff"))
              // Jobs only while the business has an open position
              .filter(([tab]) => tab !== "Jobs" || isHiring)
              .map(([tab, label]) => (
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
          {isHiring && (
            <>
              {renderJobsContent()}
              <View style={styles.divider} />
            </>
          )}
          {renderDetailsContent()}
          <View style={styles.divider} />
          {!isSoloPlan && (
            <>
              {renderStaffContent()}
              <View style={styles.divider} />
            </>
          )}
          {renderRatingsContent()}
        </View>
      </ScrollView>

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

      {/* Service Details Sheet */}
      <Modal
        visible={serviceDetails != null}
        transparent
        animationType="slide"
        onRequestClose={() => setServiceDetails(null)}
      >
        <Pressable
          style={styles.serviceSheetOverlay}
          onPress={() => setServiceDetails(null)}
        >
          <Pressable
            style={styles.serviceSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.serviceSheetHandle} />
            {serviceDetails &&
              (() => {
                const price = Number(serviceDetails.price ?? 0);
                const originalPrice = Number(serviceDetails.originalPrice ?? 0);
                const hasDiscount = originalPrice > price;
                const description = String(
                  serviceDetails.description ?? "",
                ).trim();
                return (
                  <>
                    <View style={styles.serviceSheetHeader}>
                      <View style={styles.serviceSheetHeaderText}>
                        {!!serviceDetails.label && (
                          <View style={styles.serviceLabel}>
                            <Text style={styles.serviceLabelText}>
                              {serviceDetails.label}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.serviceSheetName}>
                          {serviceDetails.name}
                        </Text>
                        {!!serviceDetails.duration && (
                          <View style={styles.serviceSheetDuration}>
                            <MaterialIcons
                              name="schedule"
                              size={moderateWidthScale(15)}
                              color={theme.lightGreen}
                            />
                            <Text style={styles.serviceSheetDurationText}>
                              {serviceDetails.duration}
                            </Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.reviewModalCloseButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={t("close")}
                        onPress={() => setServiceDetails(null)}
                      >
                        <CloseIconBusinessDetail
                          width={widthScale(20)}
                          height={heightScale(20)}
                        />
                      </TouchableOpacity>
                    </View>

                    {!!description && (
                      <ScrollView
                        style={styles.serviceSheetBody}
                        showsVerticalScrollIndicator={false}
                      >
                        <Text style={styles.serviceSheetSectionLabel}>
                          {t("aboutThisService")}
                        </Text>
                        <Text style={styles.serviceSheetDescription}>
                          {description.charAt(0).toUpperCase() +
                            description.slice(1)}
                        </Text>
                      </ScrollView>
                    )}

                    <View
                      style={[
                        styles.serviceSheetFooter,
                        {
                          paddingBottom:
                            Math.max(insets.bottom, moderateHeightScale(12)) +
                            moderateHeightScale(8),
                        },
                      ]}
                    >
                      <View style={styles.serviceSheetPriceBlock}>
                        <Text style={styles.serviceSheetPrice}>
                          ${price.toFixed(2)}
                          <Text style={styles.serviceSheetCurrency}> USD</Text>
                        </Text>
                        {hasDiscount && (
                          <View style={styles.serviceSheetDiscountRow}>
                            <Text style={styles.serviceOriginalPrice}>
                              ${originalPrice.toFixed(2)}
                            </Text>
                            <View style={styles.serviceSheetSaveChip}>
                              <Text style={styles.serviceSheetSaveText}>
                                {t("saveAmount", {
                                  amount: `$${(originalPrice - price).toFixed(2)}`,
                                })}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <Button
                        title={t("bookNow")}
                        onPress={bookFromServiceDetails}
                        disabled={isBusinessOwnerView}
                        containerStyle={styles.serviceSheetBookButton}
                      />
                    </View>
                  </>
                );
              })()}
          </Pressable>
        </Pressable>
      </Modal>

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
                    <AppImage
                      uri={getProfileImageUrl(
                        selectedReview.user?.avatar || null,
                      )}
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
