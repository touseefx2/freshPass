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
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  fetchReelFeed,
  likeReel,
  recordReelView,
  saveReel,
  shareReel,
  unlikeReel,
  unsaveReel,
} from "@/src/services/reelsService";
import { followBusiness, unfollowBusiness } from "@/src/services/followService";
import ReelCommentsSheet from "@/src/components/reelCommentsSheet";
import ReelReportSheet, {
  type ReportTarget,
} from "@/src/components/reelReportSheet";
import type { FeedReel } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

/** Fallback only — the server sends `share_url` on every feed item. */
const REEL_SHARE_BASE_URL = "https://getfreshpass.com/r";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatReelTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.black,
    },
    item: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: theme.black,
    },
    video: {
      ...StyleSheet.absoluteFillObject,
    },
    poster: {
      ...StyleSheet.absoluteFillObject,
    },
    tapLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
    },
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
      paddingHorizontal: moderateWidthScale(12),
      zIndex: 5,
    },
    iconBtn: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen4,
    },
    sideActions: {
      position: "absolute",
      right: moderateWidthScale(12),
      alignItems: "center",
      gap: moderateHeightScale(14),
      zIndex: 5,
    },
    sideShade: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: widthScale(96),
      zIndex: 3,
    },
    sideBtn: { alignItems: "center" },
    sideIconWrap: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.black}59`,
    },
    sideCount: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size11,
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
      height: heightScale(250),
      zIndex: 3,
    },
    bottomMeta: {
      position: "absolute",
      left: moderateWidthScale(14),
      right: moderateWidthScale(72),
      zIndex: 5,
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
    seekFill: {
      height: "100%",
      backgroundColor: theme.white,
    },
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
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(8),
    },
    avatar: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.grey15,
    },
    businessName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
      flexShrink: 1,
      textShadowColor: `${theme.black}CC`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
    },
    followBtn: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.buttonBack,
    },
    followText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    location: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
      marginBottom: moderateHeightScale(6),
      textShadowColor: `${theme.black}CC`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
    },
    caption: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      marginBottom: moderateHeightScale(8),
      lineHeight: moderateHeightScale(20),
      textShadowColor: `${theme.black}E6`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(10),
    },
    badge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.selectCard,
    },
    badgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    ctaRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    cta: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.buttonBack,
    },
    ctaSecondary: {
      backgroundColor: theme.lightGreen4,
    },
    ctaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    centerLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    emptyText: {
      color: theme.white,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
  });

type ReelItemProps = {
  reel: FeedReel;
  isActive: boolean;
  isOwnReel: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
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
};

function ReelFeedItemBase({
  reel,
  isActive,
  isOwnReel,
  styles,
  theme,
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
}: ReelItemProps) {
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

  const syncPlayback = useCallback(() => {
    if (!player) return;
    if (isScrubbingRef.current) return;
    if (isActiveRef.current && !isPausedRef.current) {
      try {
        player.play();
      } catch {}
    } else {
      try {
        player.pause();
      } catch {}
    }
  }, [player]);

  useEffect(() => {
    syncPlayback();
  }, [isActive, isPaused, isScrubbing, syncPlayback]);

  useEffect(() => {
    if (!player) return;
    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        if (player.duration > 0) setDuration(player.duration);
        // Android often ignores play() called before the player is ready.
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
    };
  }, [player, syncPlayback]);

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
  const distance =
    reel.distance_km != null
      ? `${reel.distance_km.toFixed(1)} km`
      : null;
  const seekProgress =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <View style={styles.item}>
      {playbackUrl ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          // SurfaceView + overlays often freeze playback on Android.
          {...(Platform.OS === "android"
            ? { surfaceType: "textureView" as const }
            : null)}
          onFirstFrameRender={() => setShowPoster(false)}
        />
      ) : null}
      {showPoster && posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} />
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

      <View style={[styles.topBar, { top: topInset + moderateHeightScale(8) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <MaterialIcons
            name="arrow-back"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        </TouchableOpacity>
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[
          `${theme.black}00`,
          `${theme.black}73`,
          `${theme.black}BF`,
        ]}
        locations={[0, 0.45, 1]}
        style={styles.bottomShade}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[`${theme.black}00`, `${theme.black}66`]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.sideShade}
      />

      <View
        style={[
          styles.sideActions,
          {
            bottom:
              Math.max(bottomInset, moderateHeightScale(6)) +
              heightScale(22) +
              moderateHeightScale(100),
          },
        ]}
      >
        <TouchableOpacity style={styles.sideBtn} onPress={() => onLike(reel)}>
          <View style={styles.sideIconWrap}>
            <MaterialIcons
              name={reel.viewer?.liked ? "favorite" : "favorite-border"}
              size={moderateWidthScale(26)}
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
              size={moderateWidthScale(24)}
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
              size={moderateWidthScale(24)}
              color={theme.white}
            />
          </View>
          <Text style={styles.sideCount}>
            {formatCount(reel.stats?.shares ?? 0)}
          </Text>
        </TouchableOpacity>
        {!isOwnReel ? (
          <TouchableOpacity style={styles.sideBtn} onPress={() => onSave(reel)}>
            <View style={styles.sideIconWrap}>
              <MaterialIcons
                name={reel.viewer?.saved ? "bookmark" : "bookmark-border"}
                size={moderateWidthScale(24)}
                color={reel.viewer?.saved ? theme.orangeBrown : theme.white}
              />
            </View>
            <Text style={styles.sideCount}>
              {formatCount(reel.stats?.saves ?? 0)}
            </Text>
          </TouchableOpacity>
        ) : null}
        {!isOwnReel ? (
          <TouchableOpacity style={styles.sideBtn} onPress={() => onMore(reel)}>
            <View style={styles.sideIconWrap}>
              <MaterialIcons
                name="more-vert"
                size={moderateWidthScale(24)}
                color={theme.white}
              />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={[
          styles.bottomMeta,
          {
            // Keep CTAs / caption clear of the fixed bottom seek strip.
            bottom:
              Math.max(bottomInset, moderateHeightScale(6)) +
              heightScale(22),
          },
        ]}
      >
        <View style={styles.businessRow}>
          {isOwnReel ? (
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
                    size={moderateWidthScale(20)}
                    color={theme.lightGreen}
                  />
                </View>
              )}
              <Text style={styles.businessName} numberOfLines={1}>
                {reel.business?.title || ""}
              </Text>
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
                      size={moderateWidthScale(20)}
                      color={theme.lightGreen}
                    />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexShrink: 1 }}
                onPress={() => onProfile(reel)}
              >
                <Text style={styles.businessName} numberOfLines={1}>
                  {reel.business?.title || ""}
                </Text>
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

        {(cityState || distance) && (
          <Text style={styles.location} numberOfLines={1}>
            {[cityState, distance].filter(Boolean).join(" · ")}
          </Text>
        )}

        {!!reel.caption && (
          <Text style={styles.caption} numberOfLines={3}>
            {reel.caption}
          </Text>
        )}

        <View style={styles.badgesRow}>
          {!!reel.promotion_text && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reel.promotion_text}</Text>
            </View>
          )}
          {reel.available_now && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("availableNow")}</Text>
            </View>
          )}
          {!!reel.category?.name && (
            <View style={[styles.badge, { backgroundColor: theme.lightGreen4 }]}>
              <Text style={styles.badgeText}>{reel.category.name}</Text>
            </View>
          )}
        </View>

        {!isOwnReel ? (
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => onWantLook(reel)}
            >
              <Text style={styles.ctaText}>{t("iWantThisLook")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cta, styles.ctaSecondary]}
              onPress={() => onProfile(reel)}
            >
              <Text style={styles.ctaText}>{t("viewProfile")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);
  const isGuest = user.isGuest;
  const ownerBusinessId = user.business_id ?? null;

  const params = useLocalSearchParams<{
    category_id?: string;
    first_reel_id?: string;
  }>();
  const categoryId = params.category_id;
  const firstReelId = params.first_reel_id;

  const [reels, setReels] = useState<FeedReel[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(
    firstReelId ? Number(firstReelId) : null,
  );
  const [commentsReel, setCommentsReel] = useState<{
    id: number;
    count: number;
  } | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
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
        const { reels: pageReels, meta } = await fetchReelFeed({
          category_id: categoryId,
          first_reel_id: firstReelId,
          cursor: nextCursor || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
        setReels((prev) =>
          append
            ? [
                ...prev,
                ...pageReels.filter((r) => !prev.some((x) => x.id === r.id)),
              ]
            : pageReels,
        );
        setCursor(meta.next_cursor ?? null);
        setHasMore(Boolean(meta.has_more));
        if (!append && pageReels[0] && !activeId) {
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
    [activeId, categoryId, coords, firstReelId, showBanner, t],
  );

  useEffect(() => {
    loadPage(null, false);
  }, []);

  useEffect(() => {
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
  }, [activeId]);

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
    if (!hasMore || !cursor || loading) return;
    loadPage(cursor, true);
  }, [cursor, hasMore, loadPage, loading]);

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
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color={theme.white} />
      </View>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <View style={styles.centerLoader}>
        <TouchableOpacity
          style={[styles.iconBtn, { position: "absolute", top: insets.top + 8, left: 12 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.emptyText}>{t("noReelsInFeed")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={reels}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <ReelFeedItem
            reel={item}
            isActive={item.id === activeId}
            isOwnReel={
              ownerBusinessId != null &&
              item.business?.id != null &&
              Number(item.business.id) === Number(ownerBusinessId)
            }
            styles={styles}
            theme={theme}
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
          />
        )}
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
