import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
  type AppStateStatus,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";
import * as SystemUI from "expo-system-ui";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { LeafLogo } from "@/assets/icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  setGuestModeModalVisible,
  setHasSeenReelsSwipeGuide,
} from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  fetchReelCategories,
  fetchReelFeed,
  getMyReel,
  likeReel,
  publishReel,
  recordReelView,
  saveReel,
  shareReel,
  unlikeReel,
  unsaveReel,
} from "@/src/services/reelsService";
import { followBusiness, unfollowBusiness } from "@/src/services/followService";
import ReelCommentsSheet from "@/src/components/reelCommentsSheet";
import TextWithEmoji from "@/src/components/textWithEmoji";
import ReelsSwipeGuide from "@/src/components/reelsSwipeGuide";
import ReelReportSheet, {
  type ReportTarget,
} from "@/src/components/reelReportSheet";
import type { FeedReel, OwnerReel, ReelCategoryCard } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const INITIAL_SCREEN_HEIGHT = Dimensions.get("screen").height;

/** Fallback only — the server sends `share_url` on every feed item. */
const REEL_SHARE_BASE_URL = "https://getfreshpass.com/r";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function mapOwnerReelToFeedReel(
  owner: OwnerReel,
  business: { id: number; title: string; image_url?: string | null },
): FeedReel {
  const video: any = owner.video || {};
  return {
    id: owner.id,
    caption: owner.caption,
    look_tag: owner.look_tag,
    promotion_text: owner.promotion_text,
    product_tag: owner.product_tag,
    available_now: owner.available_now,
    published_at: owner.published_at,
    video: {
      playback_url: video.playback_url || video.url || "",
      thumbnail_url: video.thumbnail_url ?? null,
      duration_seconds: video.duration_seconds ?? null,
      width: video.width ?? null,
      height: video.height ?? null,
    },
    category: owner.category,
    service: owner.service,
    business: {
      id: business.id,
      title: business.title,
      image_url: business.image_url ?? null,
    },
    stats: owner.stats ?? {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    },
    viewer: { liked: false, saved: false, following: false },
  };
}


function formatReelTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}


function parseProductTag(tag: string | null | undefined): {
  title: string;
  url: string | null;
} | null {
  const trimmed = tag?.trim();
  if (!trimmed) return null;
  const isUrl = /^https?:\/\//i.test(trimmed);
  if (!isUrl) return { title: trimmed, url: null };
  try {
    const host = new URL(trimmed).hostname.replace(/^www\./i, "");
    return { title: host || trimmed, url: trimmed };
  } catch {
    return { title: trimmed, url: trimmed };
  }
}

function formatServicePrice(
  price: string | number | null | undefined,
): string | null {
  if (price == null || price === "") return null;
  const n = typeof price === "number" ? price : Number(price);
  if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
  return String(price);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.black,
    },
    item: {
      width: SCREEN_WIDTH,
      backgroundColor: theme.black,
      overflow: "hidden",
    },
    video: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    poster: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    tapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
    centerPlayPause: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    centerPlayPauseCircle: {
      width: moderateWidthScale(72),
      height: moderateWidthScale(72),
      borderRadius: moderateWidthScale(36),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen,
    },
    topBar: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(12),
      zIndex: 5,
    },
    topShade: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: heightScale(140),
      zIndex: 4,
    },
    brandLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginLeft: moderateWidthScale(8),
      marginRight: moderateWidthScale(8),
    },
    brandTextCol: {
      flexShrink: 1,
      justifyContent: "center",
    },
    brandTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      letterSpacing: 0.4,
      textShadowColor: `${theme.black}AA`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    brandTagline: {
      marginTop: moderateHeightScale(1),
      fontSize: fontSize.size9,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      textShadowColor: `${theme.black}AA`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    officialBadge: {
      width: moderateWidthScale(16),
      height: moderateWidthScale(16),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: moderateWidthScale(4),
    },
    emptyWrap: {
      flex: 1,
      backgroundColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },
    emptySubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      textAlign: "center",
      marginBottom: moderateHeightScale(20),
    },
    emptyCta: {
      backgroundColor: theme.buttonBack,
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
    },
    emptyCtaText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    iconBtn: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.black}66`,
    },
    sideActions: {
      position: "absolute",
      right: moderateWidthScale(10),
      alignItems: "center",
      gap: moderateHeightScale(18),
      zIndex: 5,
    },
    sideShade: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: widthScale(88),
      zIndex: 3,
    },
    sideBtn: { alignItems: "center" },
    sideIconWrap: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
    },
    sideCount: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textShadowColor: theme.black,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    bottomShade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: heightScale(420),
      zIndex: 3,
    },
    bottomMeta: {
      position: "absolute",
      left: moderateWidthScale(12),
      right: moderateWidthScale(12),
      zIndex: 5,
    },
    metaHeaderRow: {
      marginBottom: moderateHeightScale(8),
      paddingRight: moderateWidthScale(52),
    },
    metaHeaderLeft: {
      flex: 1,
      minWidth: 0,
    },
    seekBarWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 6,
    },
    seekTimeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      marginBottom: moderateHeightScale(4),
    },
    seekTimeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    seekHitArea: {
      width: "100%",
      height: heightScale(18),
      justifyContent: "flex-end",
      paddingBottom: moderateHeightScale(2),
    },
    seekTrack: {
      width: "100%",
      height: moderateHeightScale(2),
      backgroundColor: theme.white15,
      overflow: "visible",
    },
    seekFill: { height: "100%", backgroundColor: theme.white },
    seekThumb: {
      position: "absolute",
      top: -moderateHeightScale(5),
      width: moderateWidthScale(12),
      height: moderateWidthScale(12),
      marginLeft: -moderateWidthScale(6),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.white,
    },
    businessRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(6),
    },
    avatar: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.white50,
    },
    businessName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      flexShrink: 1,
      textTransform: "capitalize",
      textShadowColor: `${theme.black}CC`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
    },
    followBtn: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.buttonBack,
    },
    followText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(6),
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      flexShrink: 1,
      maxWidth: "100%",
    },
    metaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
      flexShrink: 1,
      textShadowColor: `${theme.black}CC`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    metaCategoryText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
      flexShrink: 1,
      textTransform: "uppercase",
      textShadowColor: `${theme.black}CC`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    caption: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(18),
      textShadowColor: `${theme.black}E6`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    productCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      backgroundColor: `${theme.black}CC`,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(12),
      marginBottom: moderateHeightScale(10),
      borderWidth: 1,
      borderColor: theme.white15,
    },
    productThumb: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    productBody: { flex: 1, gap: moderateHeightScale(3), minWidth: 0 },
    productTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    productDesc: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      lineHeight: moderateHeightScale(15),
    },
    productPrice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginTop: moderateHeightScale(2),
    },
    shopBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(5),
      backgroundColor: theme.selectCard,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      alignSelf: "center",
    },
    shopBtnText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    ctaRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(10),
    },
    ctaPrimary: {
      flex: 1.7,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(46),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.buttonBack,
    },
    ctaSecondary: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: moderateHeightScale(46),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: moderateWidthScale(14),
      backgroundColor: `${theme.black}B3`,
      borderWidth: 1,
      borderColor: theme.white50,
    },
    ctaPrimaryText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    ctaSecondaryText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    pillsRow: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      minWidth: 0,
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(16),
      backgroundColor: `${theme.black}B3`,
      borderWidth: 1,
      borderColor: theme.white15,
    },
    pillLiveDot: {
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.green,
    },
    pillText: {
      flexShrink: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    pillCategoryText: {
      flexShrink: 1,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textTransform: "uppercase",
    },
    centerLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    categoryToast: {
      position: "absolute",
      alignSelf: "center",
      zIndex: 30,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: `${theme.black}B3`,
      borderWidth: 1,
      borderColor: theme.white15,
    },
    categoryToastText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "uppercase",
    },
    emptyText: {
      color: theme.white,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    viewModeBanner: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 8,
      overflow: "hidden",
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(6),
    },
    viewModeBannerBlur: { ...StyleSheet.absoluteFillObject },
    viewModeBannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.lightGreen5,
    },
    viewModeBannerContent: {
      minHeight: moderateHeightScale(28),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    viewModeBannerText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    viewModeExitText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    previewPublishBtn: {
      minWidth: moderateWidthScale(72),
      height: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    previewPublishBtnDisabled: { opacity: 0.6 },
    previewPublishText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });


type ReelItemProps = {
  reel: FeedReel;
  isActive: boolean;
  isOwnReel: boolean;
  isPreview?: boolean;
  canPublish?: boolean;
  publishing?: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  itemHeight: number;
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onLike: (reel: FeedReel) => void;
  onSave: (reel: FeedReel) => void;
  onComment: (reel: FeedReel) => void;
  onShare: (reel: FeedReel) => void;
  onMore: (reel: FeedReel) => void;
  onFollow: (reel: FeedReel) => void;
  onProfile: (reel: FeedReel) => void;
  onWantLook: (reel: FeedReel) => void;
  onPublish?: () => void;
};

function ReelFeedItemBase({
  reel,
  isActive,
  isOwnReel,
  isPreview = false,
  canPublish = false,
  publishing = false,
  styles,
  theme,
  itemHeight,
  topInset,
  bottomInset,
  onBack,
  onLike,
  onSave,
  onComment,
  onShare,
  onMore,
  onFollow,
  onProfile,
  onWantLook,
  onPublish,
}: ReelItemProps) {
  // Preview looks like customer feed, but social actions are display-only.
  const showAsOwner = isOwnReel && !isPreview;
  const showAsCustomer = !showAsOwner;
  const socialLocked = isPreview;
  const { t } = useTranslation();
  const playbackUrl = resolveApiImageUrl(reel.video?.playback_url) || "";
  const posterUrl = resolveApiImageUrl(reel.video?.thumbnail_url);
  const [showPoster, setShowPoster] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    Math.max(0, reel.video?.duration_seconds ?? 0),
  );
  const [centerIcon, setCenterIcon] = useState<"play-arrow" | "pause" | null>(
    null,
  );
  const centerIconOpacity = useRef(new Animated.Value(0)).current;
  const hideCenterIconTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const wasPlayingBeforeScrubRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const seekTrackWidthRef = useRef(0);
  const seekTrackPageXRef = useRef(0);
  const lastSeekXRef = useRef(0);
  const seekHitRef = useRef<View>(null);
  const durationRef = useRef(duration);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const player = useVideoPlayer(playbackUrl, (p) => {
    p.loop = true;
    p.muted = true; // unmute only while this reel is the active page
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    if (!isActive) {
      setIsPaused(false);
      setIsScrubbing(false);
      isScrubbingRef.current = false;
      setCurrentTime(0);
      setCenterIcon(null);
      centerIconOpacity.setValue(0);
      if (hideCenterIconTimer.current) {
        clearTimeout(hideCenterIconTimer.current);
        hideCenterIconTimer.current = null;
      }
    }
  }, [centerIconOpacity, isActive]);

  /** Stop audio from off-screen reels (client: previous music keeps playing). */
  const silencePlayer = useCallback(() => {
    if (!player) return;
    try {
      player.muted = true;
    } catch {}
    try {
      player.pause();
    } catch {}
  }, [player]);

  const syncPlayback = useCallback(() => {
    if (!player) return;
    if (isScrubbingRef.current) return;
    if (isActiveRef.current && !isPausedRef.current) {
      try {
        player.muted = false;
      } catch {}
      try {
        player.play();
      } catch {}
    } else {
      silencePlayer();
    }
  }, [player, silencePlayer]);

  useEffect(() => {
    syncPlayback();
  }, [isActive, isPaused, isScrubbing, syncPlayback]);

  // Hard-stop as soon as the page is no longer active (before status races).
  useEffect(() => {
    if (!player) return;
    if (!isActive) {
      silencePlayer();
    }
  }, [isActive, player, silencePlayer]);

  useEffect(() => {
    if (!player) return;
    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        if (player.duration > 0) setDuration(player.duration);
        // Android often ignores play() called before the player is ready.
        // Re-check active so a late readyToPlay never restarts off-screen audio.
        syncPlayback();
      }
    });
    const timeSub = player.addListener("timeUpdate", ({ currentTime: tSec }) => {
      if (isScrubbingRef.current) return;
      setCurrentTime(tSec);
      if (player.duration > 0) {
        setDuration((prev) =>
          prev > 0 && Math.abs(prev - player.duration) < 0.05
            ? prev
            : player.duration,
        );
      }
    });
    return () => {
      statusSub.remove();
      timeSub.remove();
      silencePlayer();
    };
  }, [player, silencePlayer, syncPlayback]);

  useEffect(() => {
    return () => {
      if (hideCenterIconTimer.current) {
        clearTimeout(hideCenterIconTimer.current);
      }
    };
  }, []);

  const flashCenterIcon = useCallback(
    (icon: "play-arrow" | "pause", keepVisible: boolean) => {
      if (hideCenterIconTimer.current) {
        clearTimeout(hideCenterIconTimer.current);
        hideCenterIconTimer.current = null;
      }
      setCenterIcon(icon);
      centerIconOpacity.setValue(1);
      if (keepVisible) return;
      hideCenterIconTimer.current = setTimeout(() => {
        Animated.timing(centerIconOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setCenterIcon(null);
        });
      }, 450);
    },
    [centerIconOpacity],
  );

  const handleTogglePlayPause = useCallback(() => {
    if (!playbackUrl || !isActive || isScrubbing) return;
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (nextPaused) {
      try {
        player.pause();
      } catch {}
      // Brief pause flash, then keep play icon while paused (Reels-style)
      if (hideCenterIconTimer.current) {
        clearTimeout(hideCenterIconTimer.current);
        hideCenterIconTimer.current = null;
      }
      setCenterIcon("pause");
      centerIconOpacity.setValue(1);
      hideCenterIconTimer.current = setTimeout(() => {
        setCenterIcon("play-arrow");
        centerIconOpacity.setValue(1);
      }, 450);
    } else {
      try {
        player.muted = false;
      } catch {}
      try {
        player.play();
      } catch {}
      flashCenterIcon("play-arrow", false);
    }
  }, [
    centerIconOpacity,
    flashCenterIcon,
    isActive,
    isPaused,
    isScrubbing,
    playbackUrl,
    player,
  ]);

  const timeFromSeekX = useCallback((x: number) => {
    const width = seekTrackWidthRef.current;
    const dur = durationRef.current;
    if (width <= 0 || dur <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, x / width));
    return ratio * dur;
  }, []);

  const seekXFromPageX = useCallback((pageX: number) => {
    return pageX - seekTrackPageXRef.current;
  }, []);

  const measureSeekTrack = useCallback(() => {
    seekHitRef.current?.measureInWindow((x, _y, width) => {
      if (width > 0) {
        seekTrackPageXRef.current = x;
        seekTrackWidthRef.current = width;
      }
    });
  }, []);

  const beginSeek = useCallback(
    (x: number) => {
      if (!playbackUrl || durationRef.current <= 0) return;
      measureSeekTrack();
      const clampedX = Math.max(0, Math.min(x, seekTrackWidthRef.current || x));
      lastSeekXRef.current = clampedX;
      wasPlayingBeforeScrubRef.current =
        isActiveRef.current && !isPausedRef.current;
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      try {
        player.pause();
      } catch {}
      setCurrentTime(timeFromSeekX(clampedX));
    },
    [measureSeekTrack, playbackUrl, player, timeFromSeekX],
  );

  const moveSeek = useCallback(
    (x: number) => {
      if (!isScrubbingRef.current) return;
      const clampedX = Math.max(0, Math.min(x, seekTrackWidthRef.current || x));
      lastSeekXRef.current = clampedX;
      setCurrentTime(timeFromSeekX(clampedX));
    },
    [timeFromSeekX],
  );

  const endSeek = useCallback(
    (x: number) => {
      if (!isScrubbingRef.current) return;
      const width = seekTrackWidthRef.current;
      // Android can report a bad locationX (often 0) on release — keep last good x.
      const safeX =
        width > 0 && x >= 0 && x <= width + 1 ? x : lastSeekXRef.current;
      const clamped = timeFromSeekX(safeX);
      try {
        player.currentTime = clamped;
      } catch {}
      setCurrentTime(clamped);
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      if (wasPlayingBeforeScrubRef.current) {
        setIsPaused(false);
        try {
          player.muted = false;
        } catch {}
        try {
          player.play();
        } catch {}
      }
    },
    [player, timeFromSeekX],
  );

  const onSeekTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      seekTrackWidthRef.current = e.nativeEvent.layout.width;
      measureSeekTrack();
    },
    [measureSeekTrack],
  );

  const seekPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !!playbackUrl && durationRef.current > 0,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          measureSeekTrack();
          beginSeek(seekXFromPageX(evt.nativeEvent.pageX));
        },
        onPanResponderMove: (evt) => {
          moveSeek(seekXFromPageX(evt.nativeEvent.pageX));
        },
        onPanResponderRelease: (evt) => {
          endSeek(seekXFromPageX(evt.nativeEvent.pageX));
        },
        onPanResponderTerminate: (evt) => {
          endSeek(seekXFromPageX(evt.nativeEvent.pageX));
        },
      }),
    [beginSeek, endSeek, measureSeekTrack, moveSeek, playbackUrl, seekXFromPageX],
  );

  const cityState = [reel.business?.city, reel.business?.state]
    .filter(Boolean)
    .join(", ");
  const categoryName = reel.category?.name?.trim() || "";
  const product = parseProductTag(reel.product_tag);
  const productPrice = formatServicePrice(reel.service?.price);

  const distance =
    reel.distance_km != null
      ? `${reel.distance_km.toFixed(1)} km`
      : null;
  const seekProgress =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const videoW = reel.video?.width ?? 0;
  const videoH = reel.video?.height ?? 0;
  // Portrait / 9:16 always cover the phone. Only letterbox true landscape.
  const contentFit =
    videoW > 0 && videoH > 0 && videoW / videoH >= 1.2 ? "contain" : "cover";

  return (
    <View style={[styles.item, { height: itemHeight }]}>
      {playbackUrl ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit={contentFit}
          nativeControls={false}
          // SurfaceView + overlays often freeze playback on Android.
          {...(Platform.OS === "android"
            ? { surfaceType: "textureView" as const }
            : null)}
          onFirstFrameRender={() => setShowPoster(false)}
        />
      ) : null}
      {showPoster && posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.poster}
          resizeMode={contentFit}
        />
      ) : null}

      <Pressable
        style={styles.tapLayer}
        onPress={handleTogglePlayPause}
        accessibilityRole="button"
        accessibilityLabel={isPaused ? "Play" : "Pause"}
      />

      {centerIcon ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.centerPlayPause, { opacity: centerIconOpacity }]}
        >
          <View style={styles.centerPlayPauseCircle}>
            <MaterialIcons
              name={centerIcon}
              size={moderateWidthScale(40)}
              color={theme.white}
            />
          </View>
        </Animated.View>
      ) : null}

      {isPreview ? (
        <View
          style={[
            styles.viewModeBanner,
            { paddingTop: topInset + moderateHeightScale(2) },
          ]}
          pointerEvents="box-none"
        >
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={18}
              tint="dark"
              style={styles.viewModeBannerBlur}
            />
          ) : null}
          <View style={styles.viewModeBannerOverlay} />
          <View style={styles.viewModeBannerContent}>
            <Text style={styles.viewModeBannerText} numberOfLines={1}>
              {t("viewingAsViewer")}
            </Text>
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewModeExitText}>{t("exitViewAs")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={[`${theme.black}55`, `${theme.black}00`]}
        locations={[0, 1]}
        style={styles.topShade}
      />

      <View
        style={[
          styles.topBar,
          {
            top:
              topInset +
              moderateHeightScale(6) +
              (isPreview ? moderateHeightScale(28) : 0),
          },
        ]}
      >
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <MaterialIcons
            name="arrow-back"
            size={moderateWidthScale(20)}
            color={theme.white}
          />
        </TouchableOpacity>

        <View style={styles.brandLeft}>
          <LeafLogo
            width={moderateWidthScale(22)}
            height={moderateWidthScale(22)}
            color1={theme.orangeBrown}
            color2={theme.white}
          />
          <View style={styles.brandTextCol}>
            <Text style={styles.brandTitle}>FRESHPASS</Text>
            <Text style={styles.brandTagline} numberOfLines={1}>
              {t("alwaysReadyAlwaysYou")}
            </Text>
          </View>
        </View>

        {canPublish && onPublish ? (
          <TouchableOpacity
            style={[
              styles.previewPublishBtn,
              publishing && styles.previewPublishBtnDisabled,
            ]}
            onPress={onPublish}
            disabled={publishing}
            activeOpacity={0.85}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <Text style={styles.previewPublishText}>{t("publish")}</Text>
            )}
          </TouchableOpacity>
        ) : showAsCustomer ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onMore(reel)}
            disabled={socialLocked}
          >
            <MaterialIcons
              name="more-vert"
              size={moderateWidthScale(20)}
              color={theme.white}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[
          `${theme.black}00`,
          `${theme.black}73`,
          `${theme.black}D9`,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.bottomShade}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[`${theme.black}00`, `${theme.black}55`]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.sideShade}
      />

      <View
        style={[
          styles.sideActions,
          {
            // Mid-right stack, well above bottom profile/product area
            top: itemHeight * 0.40,
          },
        ]}
        pointerEvents={socialLocked ? "none" : "auto"}
      >
        <TouchableOpacity style={styles.sideBtn} onPress={() => onLike(reel)}>
          <View style={styles.sideIconWrap}>
            <MaterialIcons
              name={reel.viewer?.liked ? "favorite" : "favorite-border"}
              size={moderateWidthScale(30)}
              color={reel.viewer?.liked ? theme.red : theme.white}
            />
          </View>
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.likes ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => onComment(reel)}
        >
          <View style={styles.sideIconWrap}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={moderateWidthScale(28)}
              color={theme.white}
            />
          </View>
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.comments ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={() => onShare(reel)}>
          <View style={styles.sideIconWrap}>
            <MaterialIcons
              name="share"
              size={moderateWidthScale(26)}
              color={theme.white}
            />
          </View>
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.shares ?? 0)}
          </Text>
        </TouchableOpacity>
        {showAsCustomer ? (
          <TouchableOpacity style={styles.sideBtn} onPress={() => onSave(reel)}>
            <View style={styles.sideIconWrap}>
              <MaterialIcons
                name={reel.viewer?.saved ? "bookmark" : "bookmark-border"}
                size={moderateWidthScale(28)}
                color={reel.viewer?.saved ? theme.orangeBrown : theme.white}
              />
            </View>
            <Text style={styles.sideCount}>
              {formatCount(reel.stats?.saves ?? 0)}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={[
          styles.bottomMeta,
          {
            bottom:
              Math.max(bottomInset, moderateHeightScale(6)) +
              heightScale(22),
          },
        ]}
        pointerEvents={socialLocked ? "none" : "auto"}
      >
        <View style={styles.metaHeaderRow}>
          <View style={styles.metaHeaderLeft}>
            <View style={styles.businessRow}>
              {showAsOwner ? (
                <>
                  {resolveApiImageUrl(reel.business?.image_url) ? (
                    <Image
                      source={{
                        uri: resolveApiImageUrl(reel.business?.image_url)!,
                      }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        { alignItems: "center", justifyContent: "center" },
                      ]}
                    >
                      <MaterialIcons
                        name="storefront"
                        size={moderateWidthScale(18)}
                        color={theme.lightGreen}
                      />
                    </View>
                  )}
                  <Text style={styles.businessName} numberOfLines={1}>
                    {reel.business?.title || ""}
                  </Text>
                  <View style={styles.officialBadge}>
                    <MaterialIcons
                      name="check"
                      size={moderateWidthScale(11)}
                      color={theme.white}
                    />
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => onProfile(reel)}>
                    {resolveApiImageUrl(reel.business?.image_url) ? (
                      <Image
                        source={{
                          uri: resolveApiImageUrl(reel.business?.image_url)!,
                        }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatar,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
                        <MaterialIcons
                          name="storefront"
                          size={moderateWidthScale(18)}
                          color={theme.lightGreen}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexShrink: 1,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    onPress={() => onProfile(reel)}
                  >
                    <Text style={styles.businessName} numberOfLines={1}>
                      {reel.business?.title || ""}
                    </Text>
                    <View style={styles.officialBadge}>
                      <MaterialIcons
                        name="check"
                        size={moderateWidthScale(11)}
                        color={theme.white}
                      />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.followBtn}
                    onPress={() => onFollow(reel)}
                  >
                    <Text style={styles.followText}>
                      {reel.viewer?.following ? t("following") : t("follow")}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {(cityState || !!categoryName) && (
              <View style={styles.metaRow}>
                {!!cityState && (
                  <View style={styles.metaItem}>
                    <MaterialIcons
                      name="place"
                      size={moderateWidthScale(13)}
                      color={theme.white85}
                    />
                    <Text
                      style={styles.metaText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {cityState}
                    </Text>
                  </View>
                )}
                {!!categoryName && (
                  <Text
                    style={styles.metaCategoryText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {categoryName}
                  </Text>
                )}
              </View>
            )}

            {!!reel.caption && (
              <TextWithEmoji style={styles.caption} numberOfLines={3}>
                {reel.caption}
              </TextWithEmoji>
            )}
          </View>
        </View>

        {showAsCustomer && product ? (
          <View style={styles.productCard}>
            <View style={styles.productThumb}>
              <MaterialIcons
                name="shopping-bag"
                size={moderateWidthScale(24)}
                color={theme.black}
              />
            </View>
            <View style={styles.productBody}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {product.title}
              </Text>
              {!!(reel.look_tag || reel.promotion_text) && (
                <Text style={styles.productDesc} numberOfLines={2}>
                  {reel.look_tag || reel.promotion_text}
                </Text>
              )}
              {!!productPrice && (
                <Text style={styles.productPrice}>{productPrice}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.shopBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (product.url) {
                  Linking.openURL(product.url).catch(() => {});
                } else {
                  onProfile(reel);
                }
              }}
            >
              <MaterialIcons
                name="shopping-cart"
                size={moderateWidthScale(14)}
                color={theme.white}
              />
              <Text style={styles.shopBtnText}>{t("shopNow")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showAsCustomer ? (
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => onWantLook(reel)}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="auto-awesome"
                size={moderateWidthScale(16)}
                color={theme.buttonText}
              />
              <Text style={styles.ctaPrimaryText}>{t("iWantThisLook")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => onProfile(reel)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaSecondaryText}>{t("viewProfile")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.pillsRow}>
          {reel.available_now ? (
            <View style={styles.pill}>
              <View style={styles.pillLiveDot} />
              <Text
                style={styles.pillText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t("availableNow")}
              </Text>
            </View>
          ) : null}
          {!!categoryName && (
            <View style={styles.pill}>
              <MaterialIcons
                name="content-cut"
                size={moderateWidthScale(12)}
                color={theme.white}
              />
              <Text
                style={styles.pillCategoryText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {categoryName}
              </Text>
            </View>
          )}
          {!!cityState && (
            <View style={styles.pill}>
              <MaterialIcons
                name="place"
                size={moderateWidthScale(12)}
                color={theme.white}
              />
              <Text
                style={styles.pillText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cityState}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        style={[
          styles.seekBarWrap,
          {
            paddingBottom: Math.max(bottomInset, moderateHeightScale(4)),
          },
        ]}
      >
        {isScrubbing ? (
          <View style={styles.seekTimeRow}>
            <Text style={styles.seekTimeText}>
              {formatReelTime(currentTime)}
            </Text>
            <Text style={styles.seekTimeText}>
              {formatReelTime(duration)}
            </Text>
          </View>
        ) : null}
        <View
          ref={seekHitRef}
          style={styles.seekHitArea}
          onLayout={onSeekTrackLayout}
          {...seekPanResponder.panHandlers}
        >
          <View style={styles.seekTrack} pointerEvents="none">
            <View
              pointerEvents="none"
              style={[styles.seekFill, { width: `${seekProgress * 100}%` }]}
            />
            {isScrubbing ? (
              <View
                pointerEvents="none"
                style={[styles.seekThumb, { left: `${seekProgress * 100}%` }]}
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Memoised so opening a sheet or updating one reel's counters doesn't
 * re-render (and re-buffer) every other video in the pager.
 */
const ReelFeedItem = React.memo(ReelFeedItemBase);

export default function ReelsFeedScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);
  const hasSeenReelsSwipeGuide = useAppSelector(
    (s) => s.general.hasSeenReelsSwipeGuide,
  );
  const isGuest = user.isGuest;
  const ownerBusinessId = user.business_id ?? null;
  const [viewportHeight, setViewportHeight] = useState(INITIAL_SCREEN_HEIGHT);
  const [edgeOffset, setEdgeOffset] = useState({ top: 0, bottom: 0 });
  const rootRef = useRef<View>(null);
  const edgeOffsetRef = useRef({ top: 0, bottom: 0 });

  const pageHeight = viewportHeight + edgeOffset.top + edgeOffset.bottom;

  const syncEdgeToEdge = useCallback(() => {
    requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((_x, y, _w, h) => {
        if (!h) return;
        const screenH = Dimensions.get("screen").height;
        const topGap = Math.max(0, Math.round(y));
        const bottomGap = Math.max(0, Math.round(screenH - (y + h)));
        const nextH = Math.round(h);

        // Accumulate only while still inset; once pulled under the system bars
        // measure y≈0 and we keep the locked offset (avoids oscillation).
        if (topGap > 1 || bottomGap > 1) {
          const next = {
            top: edgeOffsetRef.current.top + topGap,
            bottom: edgeOffsetRef.current.bottom + bottomGap,
          };
          edgeOffsetRef.current = next;
          setEdgeOffset(next);
          if (nextH > 0) {
            setViewportHeight((prev) => (prev === nextH ? prev : nextH));
          }
          return;
        }

        // Already edge-to-edge (no parent inset) — use measured height as page size.
        if (
          edgeOffsetRef.current.top === 0 &&
          edgeOffsetRef.current.bottom === 0 &&
          nextH > 0
        ) {
          setViewportHeight((prev) => (prev === nextH ? prev : nextH));
        }
      });
    });
  }, []);

  const onRootLayout = useCallback(() => {
    syncEdgeToEdge();
  }, [syncEdgeToEdge]);

  /** Pause audio when leaving this screen or backgrounding the app. */
  const [isFeedFocused, setIsFeedFocused] = useState(true);
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );

  useFocusEffect(
    useCallback(() => {
      setIsFeedFocused(true);
      // Reset so a fresh measure runs each time this screen focuses.
      edgeOffsetRef.current = { top: 0, bottom: 0 };
      setEdgeOffset({ top: 0, bottom: 0 });

      navigation.setOptions({
        contentStyle: { flex: 1, backgroundColor: theme.black },
        ...(Platform.OS === "android"
          ? {
              statusBarTranslucent: true,
              statusBarStyle: "light",
              statusBarBackgroundColor: "transparent",
              navigationBarColor: theme.black,
            }
          : null),
      } as any);
      // iOS: only touch StatusBar when Info.plist has
      // UIViewControllerBasedStatusBarAppearance=NO (app uses RN StatusBar).
      if (Platform.OS === "android") {
        StatusBar.setBarStyle("light-content", true);
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor("transparent", true);
      } else {
        StatusBar.setBarStyle("light-content");
      }
      void SystemUI.setBackgroundColorAsync(theme.black);
      const t1 = setTimeout(syncEdgeToEdge, 16);
      const t2 = setTimeout(syncEdgeToEdge, 100);
      return () => {
        setIsFeedFocused(false);
        clearTimeout(t1);
        clearTimeout(t2);
        void SystemUI.setBackgroundColorAsync(theme.background);
      };
    }, [navigation, syncEdgeToEdge, theme.background, theme.black]),
  );

  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      setIsAppActive(next === "active");
    };
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  const params = useLocalSearchParams<{
    category_id?: string;
    first_reel_id?: string;
    mode?: string;
    open_comments?: string;
    tab?: string;
  }>();
  const isPreviewMode = params.mode === "preview";
  const shouldOpenComments = params.open_comments === "1";
  const initialTab: "for_you" | "following" =
    params.tab === "following" ? "following" : "for_you";

  const [feedCategoryId, setFeedCategoryId] = useState<string | undefined>(
    params.category_id ? String(params.category_id) : undefined,
  );
  const [feedFirstReelId, setFeedFirstReelId] = useState<string | undefined>(
    params.first_reel_id ? String(params.first_reel_id) : undefined,
  );
  const categoryId = feedCategoryId;
  const firstReelId = feedFirstReelId;

  const [feedTab, setFeedTab] = useState<"for_you" | "following">(initialTab);
  const [reels, setReels] = useState<FeedReel[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(
    firstReelId ? Number(firstReelId) : null,
  );
  const [categoryCards, setCategoryCards] = useState<ReelCategoryCard[]>([]);
  const [categoryToast, setCategoryToast] = useState<string | null>(null);
  const [showSwipeGuide, setShowSwipeGuide] = useState(false);
  const categorySwitchLockRef = useRef(false);
  const categoryToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [commentsReel, setCommentsReel] = useState<{
    id: number;
    count: number;
  } | null>(null);
  const openedCommentsFromParamRef = useRef(false);
  const firstReelUsedRef = useRef(false);
  /** R-17: keep a separate cursor/page per tab so switching doesn't lose place. */
  const tabCacheRef = useRef<{
    for_you: {
      reels: FeedReel[];
      cursor: string | null;
      hasMore: boolean;
      followingCount: number;
      requiresLogin: boolean;
      activeId: number | null;
      loaded: boolean;
    };
    following: {
      reels: FeedReel[];
      cursor: string | null;
      hasMore: boolean;
      followingCount: number;
      requiresLogin: boolean;
      activeId: number | null;
      loaded: boolean;
    };
  }>({
    for_you: {
      reels: [],
      cursor: null,
      hasMore: false,
      followingCount: 0,
      requiresLogin: false,
      activeId: null,
      loaded: false,
    },
    following: {
      reels: [],
      cursor: null,
      hasMore: false,
      followingCount: 0,
      requiresLogin: false,
      activeId: null,
      loaded: false,
    },
  });
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);
  const viewedIdsRef = useRef<Set<number>>(new Set());
  const likeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLikeRef = useRef<{
    id: number;
    liked: boolean;
  } | null>(null);

  const coords = useMemo(() => {
    const lat = user.location?.lat;
    const lng = user.location?.long;
    if (lat == null || lng == null) return undefined;
    return { latitude: lat, longitude: lng };
  }, [user.location?.lat, user.location?.long]);

  const loadPage = useCallback(
    async (nextCursor?: string | null, append = false) => {
      if (!append) setLoading(true);
      try {
        if (isPreviewMode && firstReelId && !append) {
          const owner = await getMyReel(firstReelId);
          const mapped = mapOwnerReelToFeedReel(owner, {
            id: Number(owner.business_id || ownerBusinessId || 0),
            title: user.business_name || "",
            image_url: user.profile_image_url,
          });
          setReels([mapped]);
          setCursor(null);
          setHasMore(false);
          setPreviewStatus(owner.status);
          setActiveId(mapped.id);
          return;
        }
        const useFirstReel =
          !append && !firstReelUsedRef.current && !!firstReelId;
        const { reels: pageReels, meta } = await fetchReelFeed({
          category_id: feedTab === "for_you" ? categoryId : undefined,
          first_reel_id: useFirstReel ? firstReelId : undefined,
          cursor: nextCursor || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          tab: feedTab,
        });
        if (!append) {
          firstReelUsedRef.current = true;
        }
        setReels((prev) => {
          const merged = append
            ? [
                ...prev,
                ...pageReels.filter((r) => !prev.some((x) => x.id === r.id)),
              ]
            : pageReels;
          const nextActiveId = !append
            ? pageReels[0]?.id ?? null
            : activeId;
          tabCacheRef.current[feedTab] = {
            reels: merged,
            cursor: meta.next_cursor ?? null,
            hasMore: Boolean(meta.has_more),
            followingCount: meta.following_count ?? 0,
            requiresLogin: Boolean(meta.requires_login),
            activeId: nextActiveId,
            loaded: true,
          };
          return merged;
        });
        setCursor(meta.next_cursor ?? null);
        setHasMore(Boolean(meta.has_more));
        setFollowingCount(meta.following_count ?? 0);
        setRequiresLogin(Boolean(meta.requires_login));
        setPreviewStatus(null);
        if (!append && pageReels[0]) {
          setActiveId(pageReels[0].id);
        }
      } catch (error: any) {
        Logger.error("Failed to load reels feed:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToLoadReels"),
          "error",
          3000,
        );
      } finally {
        setLoading(false);
      }
    },
    [
      categoryId,
      coords,
      feedTab,
      firstReelId,
      isPreviewMode,
      ownerBusinessId,
      showBanner,
      t,
      user.business_name,
      user.profile_image_url,
    ],
  );

  useEffect(() => {
    if (isPreviewMode) {
      loadPage(null, false);
      return;
    }
    const cached = tabCacheRef.current[feedTab];
    if (cached.loaded) return;
    loadPage(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTab, categoryId]);

  useEffect(() => {
    if (isPreviewMode) return;
    let cancelled = false;
    (async () => {
      try {
        const cards = await fetchReelCategories();
        if (!cancelled) setCategoryCards(cards);
      } catch (error) {
        Logger.error("Failed to load reel categories for swipe:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPreviewMode]);

  useEffect(() => {
    if (isPreviewMode || hasSeenReelsSwipeGuide) {
      setShowSwipeGuide(false);
      return;
    }
    if (!loading && reels.length > 0) {
      setShowSwipeGuide(true);
    }
  }, [hasSeenReelsSwipeGuide, isPreviewMode, loading, reels.length]);

  const showCategoryToast = useCallback((name: string) => {
    setCategoryToast(name);
    if (categoryToastTimerRef.current) {
      clearTimeout(categoryToastTimerRef.current);
    }
    categoryToastTimerRef.current = setTimeout(() => {
      setCategoryToast(null);
    }, 1400);
  }, []);

  const switchCategoryByOffset = useCallback(
    (offset: number) => {
      if (
        isPreviewMode ||
        showSwipeGuide ||
        categorySwitchLockRef.current ||
        categoryCards.length < 2
      ) {
        return;
      }
      const currentIdx = categoryCards.findIndex(
        (c) => String(c.id) === String(categoryId),
      );
      const baseIdx = currentIdx >= 0 ? currentIdx : 0;
      const nextIdx =
        (baseIdx + offset + categoryCards.length) % categoryCards.length;
      const next = categoryCards[nextIdx];
      if (!next || String(next.id) === String(categoryId)) return;

      categorySwitchLockRef.current = true;
      firstReelUsedRef.current = false;
      tabCacheRef.current.for_you = {
        reels: [],
        cursor: null,
        hasMore: false,
        followingCount: 0,
        requiresLogin: false,
        activeId: null,
        loaded: false,
      };
      setLoading(true);
      setReels([]);
      setCursor(null);
      setHasMore(false);
      setActiveId(next.cover_reel?.id ? Number(next.cover_reel.id) : null);
      setFeedFirstReelId(
        next.cover_reel?.id ? String(next.cover_reel.id) : undefined,
      );
      setFeedCategoryId(String(next.id));
      showCategoryToast(next.name);
      setTimeout(() => {
        categorySwitchLockRef.current = false;
      }, 450);
    },
    [
      categoryCards,
      categoryId,
      isPreviewMode,
      showCategoryToast,
      showSwipeGuide,
    ],
  );

  const categoryPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isPreviewMode && !showSwipeGuide && categoryCards.length > 1)
        .activeOffsetX([-28, 28])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          if (Math.abs(e.translationX) < 56) return;
          if (e.translationX < 0) {
            runOnJS(switchCategoryByOffset)(1);
          } else {
            runOnJS(switchCategoryByOffset)(-1);
          }
        }),
    [
      categoryCards.length,
      isPreviewMode,
      showSwipeGuide,
      switchCategoryByOffset,
    ],
  );

  const dismissSwipeGuide = useCallback(() => {
    setShowSwipeGuide(false);
    dispatch(setHasSeenReelsSwipeGuide(true));
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (categoryToastTimerRef.current) {
        clearTimeout(categoryToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPreviewMode) return;
    if (!tabCacheRef.current[feedTab].loaded && reels.length === 0) return;
    tabCacheRef.current[feedTab] = {
      reels,
      cursor,
      hasMore,
      followingCount,
      requiresLogin,
      activeId,
      loaded: true,
    };
  }, [
    activeId,
    cursor,
    feedTab,
    followingCount,
    hasMore,
    isPreviewMode,
    reels,
    requiresLogin,
  ]);

  useEffect(() => {
    if (!shouldOpenComments || openedCommentsFromParamRef.current) return;
    if (!firstReelId || reels.length === 0) return;
    const target = reels.find((r) => r.id === Number(firstReelId)) ?? reels[0];
    if (!target) return;
    openedCommentsFromParamRef.current = true;
    setCommentsReel({ id: target.id, count: target.stats?.comments ?? 0 });
  }, [firstReelId, reels, shouldOpenComments]);

  useEffect(() => {
    if (isPreviewMode) return;
    if (activeId == null) return;
    if (viewedIdsRef.current.has(activeId)) return;
    viewedIdsRef.current.add(activeId);
    recordReelView(activeId).then((views) => {
      if (views == null) return;
      setReels((prev) =>
        prev.map((r) =>
          r.id === activeId
            ? { ...r, stats: { ...r.stats, views } }
            : r,
        ),
      );
    });
  }, [activeId, isPreviewMode]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.item?.id) {
        setActiveId(first.item.id);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const handleEndReached = useCallback(() => {
    if (isPreviewMode) return;
    if (!hasMore || !cursor || loading) return;
    loadPage(cursor, true);
  }, [cursor, hasMore, isPreviewMode, loadPage, loading]);

  const flushLike = useCallback(async () => {
    const pending = pendingLikeRef.current;
    pendingLikeRef.current = null;
    if (!pending) return;
    try {
      const result = pending.liked
        ? await likeReel(pending.id)
        : await unlikeReel(pending.id);
      setReels((prev) =>
        prev.map((r) =>
          r.id === pending.id
            ? {
                ...r,
                viewer: { ...r.viewer, liked: result.liked },
                stats: { ...r.stats, likes: result.likes },
              }
            : r,
        ),
      );
    } catch (error: any) {
      const status = error?.response?.status || error?.status;
      setReels((prev) =>
        prev.map((r) => {
          if (r.id !== pending.id) return r;
          const revertLiked = !pending.liked;
          const delta = revertLiked ? 1 : -1;
          return {
            ...r,
            viewer: { ...r.viewer, liked: revertLiked },
            stats: {
              ...r.stats,
              likes: Math.max(0, (r.stats?.likes ?? 0) + delta),
            },
          };
        }),
      );
      if (status === 401) {
        dispatch(setGuestModeModalVisible(true));
      } else {
        showBanner(t("error"), error?.message || t("failedToLikeReel"), "error", 2500);
      }
    }
  }, [dispatch, showBanner, t]);

  const handleLike = useCallback(
    (reel: FeedReel) => {
      if (isGuest || !user.accessToken) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const nextLiked = !reel.viewer?.liked;
      setReels((prev) =>
        prev.map((r) => {
          if (r.id !== reel.id) return r;
          const delta = nextLiked ? 1 : -1;
          return {
            ...r,
            viewer: { ...r.viewer, liked: nextLiked },
            stats: {
              ...r.stats,
              likes: Math.max(0, (r.stats?.likes ?? 0) + delta),
            },
          };
        }),
      );
      pendingLikeRef.current = { id: reel.id, liked: nextLiked };
      if (likeTimerRef.current) clearTimeout(likeTimerRef.current);
      likeTimerRef.current = setTimeout(flushLike, 350);
    },
    [dispatch, flushLike, isGuest, user.accessToken],
  );

  /** Follow state belongs to the business, so every reel of it must move together. */
  const applyFollowState = useCallback(
    (businessId: number, following: boolean, followers?: number | null) => {
      setReels((list) =>
        list.map((r) =>
          r.business?.id === businessId
            ? {
                ...r,
                viewer: { ...r.viewer, following },
                business: {
                  ...r.business,
                  ...(followers != null
                    ? { followers_count: followers }
                    : {}),
                },
              }
            : r,
        ),
      );
    },
    [],
  );

  const handleFollow = useCallback(
    async (reel: FeedReel) => {
      if (isGuest || !user.accessToken) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const businessId = reel.business?.id;
      if (!businessId) return;
      const prev = !!reel.viewer?.following;
      const prevCount = reel.business?.followers_count;
      applyFollowState(
        businessId,
        !prev,
        prevCount != null ? Math.max(0, prevCount + (prev ? -1 : 1)) : null,
      );
      try {
        const result = prev
          ? await unfollowBusiness(businessId)
          : await followBusiness(businessId);
        applyFollowState(businessId, result.following, result.followers);
      } catch (error: any) {
        applyFollowState(businessId, prev, prevCount ?? null);
        const status = error?.response?.status ?? error?.status;
        if (status === 401) {
          dispatch(setGuestModeModalVisible(true));
          return;
        }
        showBanner(
          t("error"),
          error?.message || (prev ? t("failedToUnfollow") : t("failedToFollow")),
          "error",
          2500,
        );
      }
    },
    [applyFollowState, dispatch, isGuest, showBanner, t, user.accessToken],
  );

  const handleSave = useCallback(
    async (reel: FeedReel) => {
      if (isGuest || !user.accessToken) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const prevSaved = !!reel.viewer?.saved;
      const prevCount = reel.stats?.saves ?? 0;
      setReels((list) =>
        list.map((r) =>
          r.id === reel.id
            ? {
                ...r,
                viewer: { ...r.viewer, saved: !prevSaved },
                stats: {
                  ...r.stats,
                  saves: Math.max(0, prevCount + (prevSaved ? -1 : 1)),
                },
              }
            : r,
        ),
      );
      try {
        const result = prevSaved
          ? await unsaveReel(reel.id)
          : await saveReel(reel.id);
        setReels((list) =>
          list.map((r) =>
            r.id === reel.id
              ? {
                  ...r,
                  viewer: { ...r.viewer, saved: result.saved },
                  stats: { ...r.stats, saves: result.saves },
                }
              : r,
          ),
        );
      } catch (error: any) {
        setReels((list) =>
          list.map((r) =>
            r.id === reel.id
              ? {
                  ...r,
                  viewer: { ...r.viewer, saved: prevSaved },
                  stats: { ...r.stats, saves: prevCount },
                }
              : r,
          ),
        );
        const status = error?.response?.status ?? error?.status;
        if (status === 401) {
          dispatch(setGuestModeModalVisible(true));
          return;
        }
        showBanner(
          t("error"),
          error?.message || t("failedToSaveLook"),
          "error",
          2500,
        );
      }
    },
    [dispatch, isGuest, showBanner, t, user.accessToken],
  );

  const handleComment = useCallback((reel: FeedReel) => {
    setCommentsReel({ id: reel.id, count: reel.stats?.comments ?? 0 });
  }, []);

  const handleCommentCountChange = useCallback(
    (reelId: number, total: number) => {
      setReels((list) =>
        list.map((r) =>
          r.id === reelId ? { ...r, stats: { ...r.stats, comments: total } } : r,
        ),
      );
    },
    [],
  );

  const handleShare = useCallback(
    async (reel: FeedReel) => {
      const url = reel.share_url || `${REEL_SHARE_BASE_URL}/${reel.id}`;
      try {
        const result = await Share.share({
          message: reel.caption ? `${reel.caption}\n${url}` : url,
          url,
        });
        if (result.action === Share.dismissedAction) return;
      } catch (error) {
        Logger.error(`Failed to open share sheet for reel ${reel.id}:`, error);
        showBanner(t("error"), t("failedToShareReel"), "error", 2500);
        return;
      }
      // Counting is best-effort and must not block the share itself.
      const { shares } = await shareReel(reel.id);
      if (shares == null) return;
      setReels((list) =>
        list.map((r) =>
          r.id === reel.id ? { ...r, stats: { ...r.stats, shares } } : r,
        ),
      );
    },
    [showBanner, t],
  );

  const handleMore = useCallback(
    (reel: FeedReel) => {
      Alert.alert(t("reelOptions"), undefined, [
        {
          text: t("report"),
          style: "destructive",
          onPress: () => {
            if (isGuest || !user.accessToken) {
              dispatch(setGuestModeModalVisible(true));
              return;
            }
            setReportTarget({ kind: "reel", reelId: reel.id });
          },
        },
        { text: t("cancel"), style: "cancel" },
      ]);
    },
    [dispatch, isGuest, t, user.accessToken],
  );

  const handleReportComment = useCallback(
    (commentId: number) => {
      if (!commentsReel) return;
      const reelId = commentsReel.id;
      // Close the comments sheet first — two Modalize sheets must not stack.
      setCommentsReel(null);
      setReportTarget({ kind: "comment", reelId, commentId });
    },
    [commentsReel],
  );

  const goBack = useCallback(() => router.back(), [router]);

  const handlePublishPreview = useCallback(async () => {
    if (!firstReelId || publishing) return;
    setPublishing(true);
    try {
      await publishReel(firstReelId);
      setPreviewStatus("published");
      showBanner(t("success"), t("reelPublished"), "success", 2500);
      router.back();
    } catch (error: any) {
      Logger.error("Failed to publish reel from preview:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToUpdateReel"),
        "error",
        3000,
      );
    } finally {
      setPublishing(false);
    }
  }, [firstReelId, publishing, router, showBanner, t]);

  const openProfile = useCallback(
    (reel: FeedReel) => {
      router.push({
        pathname: "/(main)/businessDetail",
        params: {
          business_id: String(reel.business.id),
          reel_id: String(reel.id),
        },
      });
    },
    [router],
  );

  const wantLook = useCallback(
    (reel: FeedReel) => {
      if (reel.service?.id) {
        router.push({
          pathname: "/(main)/bookingNow",
          params: {
            business_id: String(reel.business.id),
            service_id: String(reel.service.id),
            reel_id: String(reel.id),
          },
        });
      } else {
        openProfile(reel);
      }
    },
    [openProfile, router],
  );

  if (loading && reels.length === 0) {
    return (
      <View
        ref={rootRef}
        style={[
          styles.centerLoader,
          {
            marginTop: -edgeOffset.top,
            marginBottom: -edgeOffset.bottom,
            height: pageHeight,
          },
        ]}
        onLayout={onRootLayout}
      >
        <StatusBar
          translucent={true}
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              position: "absolute",
              top: insets.top + moderateHeightScale(8),
              left: moderateWidthScale(12),
              zIndex: 2,
            },
          ]}
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t("back")}
        >
          <MaterialIcons
            name="arrow-back"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        </TouchableOpacity>
        <ActivityIndicator size="large" color={theme.white} />
      </View>
    );
  }

  if (!loading && reels.length === 0) {
    const emptyMessage =
      feedTab === "following"
        ? requiresLogin || isGuest
          ? t("signInToSeeFollowingReels")
          : followingCount === 0
            ? t("followBusinessesForReels")
            : t("nothingNewFromFollowing")
        : t("noReelsInFeed");
    const showSignIn =
      feedTab === "following" && (requiresLogin || isGuest);

    return (
      <View
        ref={rootRef}
        style={[
          styles.emptyWrap,
          {
            marginTop: -edgeOffset.top,
            marginBottom: -edgeOffset.bottom,
            height: pageHeight,
          },
        ]}
        onLayout={onRootLayout}
      >
        <StatusBar
          translucent={true}
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              position: "absolute",
              top: insets.top + moderateHeightScale(8),
              left: moderateWidthScale(12),
            },
          ]}
          onPress={() => router.back()}
        >
          <MaterialIcons
            name="arrow-back"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        </TouchableOpacity>
        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
        {showSignIn ? (
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => dispatch(setGuestModeModalVisible(true))}
          >
            <Text style={styles.emptyCtaText}>{t("signIn")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View
      ref={rootRef}
      style={[
        styles.root,
        {
          marginTop: -edgeOffset.top,
          marginBottom: -edgeOffset.bottom,
          height: pageHeight,
        },
      ]}
      onLayout={onRootLayout}
    >
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <GestureDetector gesture={categoryPanGesture}>
        <View style={{ flex: 1 }}>
          <FlatList
            key={categoryId || "all"}
            data={reels}
            keyExtractor={(item) => String(item.id)}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={pageHeight}
            decelerationRate="fast"
            windowSize={3}
            maxToRenderPerBatch={2}
            initialNumToRender={1}
            removeClippedSubviews={false}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            automaticallyAdjustsScrollIndicatorInsets={false}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) => (
              <ReelFeedItem
                reel={item}
                isActive={
                  item.id === activeId && isFeedFocused && isAppActive
                }
                isOwnReel={
                  ownerBusinessId != null &&
                  item.business?.id != null &&
                  Number(item.business.id) === Number(ownerBusinessId)
                }
                isPreview={isPreviewMode}
                canPublish={isPreviewMode && previewStatus === "draft"}
                publishing={publishing}
                styles={styles}
                theme={theme}
                itemHeight={pageHeight}
                topInset={insets.top}
                bottomInset={insets.bottom}
                onBack={goBack}
                onLike={handleLike}
                onSave={handleSave}
                onComment={handleComment}
                onShare={handleShare}
                onMore={handleMore}
                onFollow={handleFollow}
                onProfile={openProfile}
                onWantLook={wantLook}
                onPublish={handlePublishPreview}
              />
            )}
          />
        </View>
      </GestureDetector>

      {categoryToast ? (
        <View
          pointerEvents="none"
          style={[
            styles.categoryToast,
            { top: insets.top + moderateHeightScale(58) },
          ]}
        >
          <Text style={styles.categoryToastText}>{categoryToast}</Text>
        </View>
      ) : null}

      <ReelsSwipeGuide
        visible={showSwipeGuide}
        onDismiss={dismissSwipeGuide}
      />

      <ReelCommentsSheet
        visible={!!commentsReel}
        reelId={commentsReel?.id ?? null}
        initialCount={commentsReel?.count ?? 0}
        onClose={() => setCommentsReel(null)}
        onCountChange={handleCommentCountChange}
        onReportComment={handleReportComment}
      />

      <ReelReportSheet
        visible={!!reportTarget}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </View>
  );
}
