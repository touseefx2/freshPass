import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import {
  getReelCredits,
  listAutoReelTemplates,
  listReelTemplates,
} from "@/src/services/reelsService";
import { Theme } from "@/src/theme/colors";
import { iconScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fontSize } from "@/src/theme/fonts";
import type { ReelCredits } from "@/src/types/reels";
import type {
  TemplateGalleryItem,
  TemplateGalleryKind,
} from "@/src/types/templateGallery";
import {
  autoReelGalleryItem,
  photoReelGalleryItem,
} from "@/src/utils/templateGallery";
import { formatVideoDuration } from "@/src/utils/videoDuration";
import {
  ART_CENTER,
  CARD_GAP,
  CARD_RADIUS,
  CARD_RATIO,
  HEADLINE_WIDTH,
  MEDALLION_RATIO,
  PEEK,
  SIDE_OPACITY,
  SIDE_SCALE,
  SKELETON_BG,
  SKELETON_HIGHLIGHT,
  VIDEO_CAROUSEL_SPACE,
  VIDEO_ART_CENTER,
  VIDEO_CARD_MAX_RATIO,
  VIDEO_CARD_MIN_RATIO,
  VIDEO_HEADLINE_WIDTH,
  VIDEO_MEDALLION_RATIO,
  createStyles,
} from "./styles";

/**
 * Create a reel → Photo Reel / AI Auto Reel land here first: every template
 * from both APIs (Video Reel tab = AI auto reel, Photo Reel tab = template
 * reel). "Use This Template" opens step 1 of that flow with it picked.
 */

type Styles = ReturnType<typeof createStyles>;
type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const KINDS: {
  kind: TemplateGalleryKind;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
  headerKey: string;
  /** Chip on the cover */
  chipKey: string;
  chipIcon: IconName;
}[] = [
  {
    kind: "video",
    icon: "videocam",
    labelKey: "templateGalleryVideoTab",
    headerKey: "templateGalleryHeaderVideo",
    chipKey: "reelTypeAutoTitle",
    chipIcon: "auto-awesome",
  },
  {
    kind: "photo",
    icon: "image-outline",
    labelKey: "templateGalleryPhotoTab",
    headerKey: "templateGalleryHeaderPhoto",
    chipKey: "reelTypeTemplateTitle",
    chipIcon: "photo-library",
  },
];

/**
 * Rings around the cover medallion: radius (share of cover height; of its
 * width on a Video Reel cover) + opacity
 */
const RINGS = [
  { r: 0.29, opacity: 0.16 },
  { r: 0.43, opacity: 0.1 },
  { r: 0.6, opacity: 0.06 },
];

/**
 * Swipe stagger: each part of a template drifts STAGGER of the page width
 * further per step than its page, and fades in FADE_STEP later, so the next
 * template's parts come in one after another, left to right.
 */
const STAGGER = 0.06;
const FADE_STEP = 0.12;

type TabState = {
  items: TemplateGalleryItem[];
  loading: boolean;
  error: string | null;
};

const LOADING_TAB: TabState = { items: [], loading: true, error: null };

/**
 * Largest cover title size where the longest word still fits on one line —
 * uppercase extra bold is about 0.68em a letter.
 */
function coverTitleSize(words: string[], maxWidth: number): number {
  const longest = Math.max(1, ...words.map((w) => w.length));
  const total = words.join(" ").length;
  const base =
    total > 16
      ? fontSize.size24
      : total > 10
        ? fontSize.size28
        : fontSize.size34;
  return Math.floor(Math.min(base, maxWidth / (longest * 0.68)));
}

type CoverFact = {
  key: string;
  icon: IconName;
  text: string;
  /** Read out instead of the bare number */
  a11y?: string;
};

/**
 * Facts row under the cover title, CapCut style: reel length (m:ss) and clip
 * count. With no set length the tagline stands in (how long / what kind) —
 * except on Photo Reels, where it would repeat the clip count.
 */
function coverFacts(
  item: TemplateGalleryItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): CoverFact[] {
  const facts: CoverFact[] = [];
  if (item.lengthSeconds) {
    const time = formatVideoDuration(item.lengthSeconds);
    facts.push({
      key: "length",
      icon: "timer",
      text: time,
      a11y: t("templateGalleryLengthA11y", { time }),
    });
  } else if (item.tagline && (item.kind === "video" || !item.clipCount)) {
    facts.push({ key: "tagline", icon: item.taglineIcon, text: item.tagline });
  }
  if (item.clipCount) {
    facts.push({
      key: "clips",
      icon: "view-carousel",
      text: String(item.clipCount),
      a11y: t("templateGalleryClipsA11y", { count: item.clipCount }),
    });
  }
  return facts;
}

/** Full screen sample: loops with sound */
function useLoopingPlayer(uri: string) {
  return useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
}

/**
 * Sample on the centred cover: loops, muted unless the viewer turned the
 * sound on. Mounted only while its template is centred and this screen is in
 * front; a pause keeps the frame.
 */
function PreviewVideo({
  uri,
  playing,
  muted,
  onFirstFrame,
}: {
  uri: string;
  playing: boolean;
  muted: boolean;
  onFirstFrame: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (!playing) {
      player.pause();
      return;
    }
    player.play();
    // The OS pauses players in the background; carry on once the app is back
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") player.play();
    });
    return () => sub.remove();
  }, [player, playing]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      // SurfaceView under overlays (and a scaling cover) freezes on Android
      {...(Platform.OS === "android"
        ? { surfaceType: "textureView" as const }
        : null)}
      onFirstFrameRender={onFirstFrame}
    />
  );
}

function FullPreviewVideo({ uri, style }: { uri: string; style: object }) {
  const player = useLoopingPlayer(uri);
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls
    />
  );
}

/** Full screen look at the selected template (sample video, else its cover) */
function FullPreview({
  item,
  onClose,
}: {
  item: TemplateGalleryItem | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal
      visible={item != null}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
      statusBarTranslucent
    >
      <View style={styles.fullRoot}>
        {item?.previewVideoUrl ? (
          <FullPreviewVideo
            uri={item.previewVideoUrl}
            style={styles.fullMedia}
          />
        ) : item?.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.fullMedia}
            contentFit="contain"
            accessibilityLabel={item.name}
          />
        ) : null}
        <TouchableOpacity
          style={[
            styles.fullClose,
            { top: insets.top + moderateWidthScale(8) },
          ]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          hitSlop={8}
        >
          <MaterialIcons
            name="close"
            size={moderateWidthScale(24)}
            color={theme.white}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/**
 * Brand art for a cover while the API sends no preview: layered greens,
 * a soft light from the top corner, a warm glow and rings behind the medallion.
 */
function CoverArt({
  id,
  width,
  height,
  theme,
  portrait = false,
}: {
  id: string;
  width: number;
  height: number;
  theme: Theme;
  /** Tall Video Reel cover: glow and rings centred, sized by the width */
  portrait?: boolean;
}) {
  const cx = portrait ? width / 2 : width * ART_CENTER;
  const cy = portrait ? height * VIDEO_ART_CENTER : height / 2;
  const base = portrait ? width : height;
  const glowR = base * 0.62;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id={`base-${id}`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={theme.darkGreenDeep} />
          <Stop offset="0.55" stopColor={theme.darkGreen} />
          <Stop offset="1" stopColor={theme.buttonBack} />
        </SvgLinearGradient>
        <RadialGradient
          id={`sheen-${id}`}
          cx={0}
          cy={0}
          r={width * 0.75}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={theme.white} stopOpacity={0.09} />
          <Stop offset="1" stopColor={theme.white} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id={`glow-${id}`}
          cx={cx}
          cy={cy}
          r={glowR}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={theme.orangeBrown} stopOpacity={0.42} />
          <Stop offset="1" stopColor={theme.orangeBrown} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#base-${id})`} />
      <Rect width={width} height={height} fill={`url(#sheen-${id})`} />
      <Circle cx={cx} cy={cy} r={glowR} fill={`url(#glow-${id})`} />
      {RINGS.map((ring) => (
        <Circle
          key={ring.r}
          cx={cx}
          cy={cy}
          r={base * ring.r}
          fill="none"
          stroke={theme.white}
          strokeOpacity={ring.opacity}
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
}

/**
 * One part of a template that lags its page while swiping (see STAGGER).
 * Driven by the swipe itself on the UI thread, so it follows the finger.
 */
function SwipeLayer({
  progress,
  index,
  order,
  distance,
  reduceMotion,
  style,
  children,
}: {
  progress: SharedValue<number>;
  /** Template this part belongs to */
  index: number;
  /** 0 comes in first */
  order: number;
  /** Page width the template moves by */
  distance: number;
  reduceMotion: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  const motion = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    // -1 = next template (to the right), 1 = the one before
    const d = Math.min(1, Math.max(-1, progress.value - index));
    const opacity = interpolate(
      Math.abs(d),
      [0, Math.max(0.3, 0.9 - order * FADE_STEP)],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateX = -d * distance * STAGGER * (order + 1);
    return { opacity, transform: [{ translateX }] };
  }, [index, order, distance, reduceMotion]);

  return <Animated.View style={[style, motion]}>{children}</Animated.View>;
}

/** One cover in the row; neighbours shrink and fade while swiping */
function TemplateCover({
  item,
  index,
  width,
  height,
  progress,
  reduceMotion,
  chip,
  videoOn,
  playing,
  muted,
  onTogglePlay,
  onToggleSound,
  onExpand,
  styles,
  theme,
}: {
  item: TemplateGalleryItem;
  index: number;
  width: number;
  height: number;
  /** Swipe position in templates (0 = first) */
  progress: SharedValue<number>;
  reduceMotion: boolean;
  chip: { label: string; icon: IconName };
  /** Its sample is loaded: the centred template, with this screen in front */
  videoOn: boolean;
  /** …and playing: not paused by the viewer or under the full screen preview */
  playing: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onToggleSound: () => void;
  onExpand: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useTranslation();
  // The poster stays under the sample until its first frame is on screen
  const [frameShown, setFrameShown] = useState(false);
  useEffect(() => {
    if (!videoOn) setFrameShown(false);
  }, [videoOn]);
  const showFrame = useCallback(() => setFrameShown(true), []);

  const motion = useAnimatedStyle(() => {
    const range = [index - 1, index, index + 1];
    const opacity = interpolate(
      progress.value,
      range,
      [SIDE_OPACITY, 1, SIDE_OPACITY],
      Extrapolation.CLAMP,
    );
    if (reduceMotion) return { opacity };
    const scale = interpolate(
      progress.value,
      range,
      [SIDE_SCALE, 1, SIDE_SCALE],
      Extrapolation.CLAMP,
    );
    // Shrinking pulls the near edge away; shift it back so the peek stays
    const shift = ((1 - SIDE_SCALE) * width) / 2;
    const translateX = interpolate(
      progress.value,
      range,
      [-shift, 0, shift],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [index, width, reduceMotion]);

  const hasMedia = !!item.coverUrl || !!item.previewVideoUrl;
  const [first, ...rest] = item.headline;
  const size = coverTitleSize(
    item.headline,
    (width - moderateWidthScale(32)) * HEADLINE_WIDTH,
  );
  const titleSize = { fontSize: size, lineHeight: Math.round(size * 1.04) };
  const medallion = Math.round(height * MEDALLION_RATIO);
  const medallionStyle = {
    width: medallion,
    height: medallion,
    borderRadius: medallion / 2,
  };
  const artSide = { width: width * (1 - ART_CENTER) * 2 };
  const facts = coverFacts(item, t);
  const layer = (order: number, children: React.ReactNode, style?: object) => (
    <SwipeLayer
      progress={progress}
      index={index}
      order={order}
      distance={width}
      reduceMotion={reduceMotion}
      style={style}
    >
      {children}
    </SwipeLayer>
  );

  return (
    <Animated.View style={[styles.cardShadow, { width, height }, motion]}>
      <View style={styles.card}>
        {/* Poster (photo, else brand art) under the sample until its first frame */}
        <View
          style={[
            StyleSheet.absoluteFill,
            videoOn && frameShown && styles.posterHidden,
          ]}
          pointerEvents="none"
        >
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <CoverArt
              id={`${item.kind}-${item.id}`}
              width={width}
              height={height}
              theme={theme}
            />
          )}
        </View>
        {videoOn ? (
          <PreviewVideo
            uri={item.previewVideoUrl!}
            playing={playing}
            muted={muted}
            onFirstFrame={showFrame}
          />
        ) : null}
        {item.coverUrl || (videoOn && frameShown) ? (
          // Keeps the title and facts readable on any photo or video frame
          <LinearGradient
            colors={[
              "rgba(24, 33, 14, 0.92)",
              "rgba(24, 33, 14, 0.5)",
              "transparent",
            ]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0.9, y: 0.1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        <View style={styles.cardInner} pointerEvents="none">
          {/* Room on the right for the sound button */}
          <View
            style={[
              styles.cardTop,
              item.previewVideoUrl ? styles.cardTopSound : null,
            ]}
          >
            {layer(
              0,
              <View style={styles.kindChip}>
                <MaterialIcons
                  name={chip.icon}
                  size={moderateWidthScale(13)}
                  color={theme.orangeBrown}
                />
                <Text style={styles.kindChipText} numberOfLines={1}>
                  {chip.label}
                </Text>
              </View>,
              styles.shrink,
            )}
          </View>
          <View>
            <View style={styles.titleBlock}>
              {first
                ? layer(
                    1,
                    <Text
                      style={[styles.coverTitle, titleSize]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {first}
                    </Text>,
                  )
                : null}
              {rest.length
                ? layer(
                    2,
                    <Text
                      style={[
                        styles.coverTitle,
                        styles.coverTitleAccent,
                        titleSize,
                      ]}
                      numberOfLines={2}
                    >
                      {rest.join(" ")}
                    </Text>,
                  )
                : null}
            </View>
            {facts.length
              ? layer(
                  4,
                  <View style={styles.coverFacts}>
                    {facts.map((fact) => (
                      <View
                        key={fact.key}
                        style={[
                          styles.coverFact,
                          fact.key === "tagline" && styles.shrink,
                        ]}
                        accessible
                        accessibilityLabel={fact.a11y ?? fact.text}
                      >
                        <MaterialIcons
                          name={fact.icon}
                          size={moderateWidthScale(15)}
                          color={theme.orangeBrown}
                        />
                        <Text
                          style={
                            fact.key === "tagline"
                              ? styles.metaText
                              : styles.coverFactText
                          }
                          numberOfLines={1}
                        >
                          {fact.text}
                        </Text>
                      </View>
                    ))}
                  </View>,
                )
              : null}
            {item.musicTitle
              ? layer(
                  5,
                  <View
                    style={styles.coverMusic}
                    accessible
                    accessibilityLabel={t("includesMusicNamed", {
                      name: item.musicTitle,
                    })}
                  >
                    <MaterialIcons
                      name="music-note"
                      size={moderateWidthScale(15)}
                      color={theme.orangeBrown}
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.musicTitle}
                    </Text>
                  </View>,
                )
              : null}
          </View>
        </View>

        {/* Play button (sample video) or medallion, centred on the rings */}
        {item.previewVideoUrl ? (
          <View style={[styles.artSide, artSide]} pointerEvents="box-none">
            {layer(
              2,
              <TouchableOpacity
                style={[styles.medallion, medallionStyle]}
                onPress={onTogglePlay}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  playing ? t("templateGalleryPause") : t("templateGalleryPlay")
                }
              >
                <MaterialIcons
                  name={playing ? "pause" : "play-arrow"}
                  size={Math.round(medallion * 0.46)}
                  color={theme.white}
                />
              </TouchableOpacity>,
            )}
          </View>
        ) : !item.coverUrl ? (
          <View
            style={[styles.artSide, artSide]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {layer(
              2,
              <View style={[styles.medallion, medallionStyle]}>
                <MaterialIcons
                  name={item.icon}
                  size={Math.round(medallion * 0.46)}
                  color={theme.white}
                />
              </View>,
            )}
          </View>
        ) : null}

        {/* Sound on / off; the choice holds for every sample while swiping */}
        {item.previewVideoUrl ? (
          <TouchableOpacity
            style={styles.soundButton}
            onPress={onToggleSound}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              muted ? t("templateGallerySoundOn") : t("templateGallerySoundOff")
            }
          >
            <MaterialIcons
              name={muted ? "volume-off" : "volume-up"}
              size={moderateWidthScale(18)}
              color={theme.white}
            />
          </TouchableOpacity>
        ) : null}

        {hasMedia ? (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={onExpand}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("templateGalleryFullScreen")}
          >
            <MaterialIcons
              name="fullscreen"
              size={moderateWidthScale(24)}
              color={theme.white}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

/**
 * The template's own song under its Video Reel sample: loops while `playing`,
 * pauses with it and stops when the cover is left (unmount / new url).
 */
function useTemplateMusic(url: string | null, playing: boolean) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    if (!url) return;
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { isLooping: true, shouldPlay: playingRef.current },
        );
        if (!alive) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch (error) {
        Logger.warn("Template music preview failed:", error);
      }
    })();
    return () => {
      alive = false;
      const sound = soundRef.current;
      soundRef.current = null;
      void sound?.unloadAsync().catch(() => {});
    };
  }, [url]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;
    (playing ? sound.playAsync() : sound.pauseAsync()).catch(() => {});
  }, [playing]);

  // The OS stops audio in the background; carry on once the app is back
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && playingRef.current) {
        soundRef.current?.playAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);
}

/**
 * Template name for a Video Reel cover without the "Template" word, the
 * number and the brackets: "Template #1 - ( Before & After)" → "Before &
 * After". The full name when nothing is left.
 */
function videoCoverTitle(name: string): string {
  const title = name
    .trim()
    .replace(/^templates?\b\s*/i, "")
    .replace(/^#?\d+\s*[-–—:.)]?\s*/, "")
    .replace(/^\(\s*(.*?)\s*\)$/, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return title || name.trim();
}

/**
 * Video Reel cover, CapCut style: the sample fills the tall card and plays on
 * its own, with the template's song when it has one (else the video's own
 * sound); tapping it pauses / plays. Title, facts and song sit over a dark
 * fade at the bottom. Neighbours shrink and fade while swiping; tapping one
 * brings it to the centre.
 */
function VideoTemplateCover({
  item,
  index,
  width,
  height,
  progress,
  reduceMotion,
  videoOn,
  centred,
  onSelect,
  styles,
  theme,
}: {
  item: TemplateGalleryItem;
  index: number;
  width: number;
  height: number;
  /** Swipe position in templates (0 = first) */
  progress: SharedValue<number>;
  reduceMotion: boolean;
  /** Its sample is loaded: the centred template, with this screen in front */
  videoOn: boolean;
  /** The template in the middle (tap = pause / play; side covers come to the centre) */
  centred: boolean;
  onSelect: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useTranslation();
  // The poster stays under the sample until its first frame is on screen
  const [frameShown, setFrameShown] = useState(false);
  useEffect(() => {
    if (!videoOn) setFrameShown(false);
  }, [videoOn]);
  const showFrame = useCallback(() => setFrameShown(true), []);
  // Paused by a tap; each time the sample comes back it plays again
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!videoOn) setPaused(false);
  }, [videoOn]);
  const playing = videoOn && !paused;
  // The template's song starts with the first frame, in place of the video's sound
  useTemplateMusic(videoOn ? item.musicUrl : null, playing && frameShown);

  const motion = useAnimatedStyle(() => {
    const range = [index - 1, index, index + 1];
    const opacity = interpolate(
      progress.value,
      range,
      [SIDE_OPACITY, 1, SIDE_OPACITY],
      Extrapolation.CLAMP,
    );
    if (reduceMotion) return { opacity };
    const scale = interpolate(
      progress.value,
      range,
      [SIDE_SCALE, 1, SIDE_SCALE],
      Extrapolation.CLAMP,
    );
    // Shrinking pulls the near edge away; shift it back so the peek stays
    const shift = ((1 - SIDE_SCALE) * width) / 2;
    const translateX = interpolate(
      progress.value,
      range,
      [-shift, 0, shift],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [index, width, reduceMotion]);

  const hasMedia = !!item.coverUrl || !!item.previewVideoUrl;
  // "Template #1 - (Before & After)" → "Before & After": the word
  // "Template" and the number say nothing on the card
  const words = videoCoverTitle(item.headline.join(" ")).split(" ");
  const size = coverTitleSize(
    words,
    (width - moderateWidthScale(32)) * VIDEO_HEADLINE_WIDTH,
  );
  const titleSize = { fontSize: size, lineHeight: Math.round(size * 1.04) };
  const medallion = Math.round(width * VIDEO_MEDALLION_RATIO);
  const medallionStyle = {
    width: medallion,
    height: medallion,
    borderRadius: medallion / 2,
  };
  const facts = coverFacts(item, t);
  const layer = (order: number, children: React.ReactNode, style?: object) => (
    <SwipeLayer
      progress={progress}
      index={index}
      order={order}
      distance={width}
      reduceMotion={reduceMotion}
      style={style}
    >
      {children}
    </SwipeLayer>
  );

  return (
    <Animated.View
      style={[
        styles.cardShadow,
        styles.videoCardFlat,
        { width, height },
        motion,
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (!centred) {
            onSelect();
            return;
          }
          if (item.previewVideoUrl) setPaused((p) => !p);
        }}
        disabled={centred && !item.previewVideoUrl}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={
          !centred
            ? item.name
            : paused
              ? t("templateGalleryPlay")
              : t("templateGalleryPause")
        }
      >
        {/* Poster (photo, else brand art) under the sample until its first frame */}
        <View
          style={[
            StyleSheet.absoluteFill,
            videoOn && frameShown && styles.posterHidden,
          ]}
          pointerEvents="none"
        >
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <CoverArt
              id={`${item.kind}-${item.id}`}
              width={width}
              height={height}
              theme={theme}
              portrait
            />
          )}
          {/* Brand art with nothing to play: the template's icon on the rings */}
          {!hasMedia ? (
            <View
              style={styles.videoArtCentre}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {layer(
                2,
                <View style={[styles.medallion, medallionStyle]}>
                  <MaterialIcons
                    name={item.icon}
                    size={Math.round(medallion * 0.46)}
                    color={theme.white}
                  />
                </View>,
              )}
            </View>
          ) : null}
        </View>
        {videoOn ? (
          <PreviewVideo
            uri={item.previewVideoUrl!}
            playing={playing}
            muted={!!item.musicUrl}
            onFirstFrame={showFrame}
          />
        ) : null}

        {/* Paused by a tap: a play sign in the middle */}
        {videoOn && paused ? (
          <View style={styles.videoPausedCentre} pointerEvents="none">
            <View style={styles.videoPlayBadge}>
              <MaterialIcons
                name="play-arrow"
                size={moderateWidthScale(40)}
                color={theme.white}
              />
            </View>
          </View>
        ) : null}

        {/* Keeps the title, facts and song readable on any frame */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(24, 33, 14, 0.55)",
            "rgba(24, 33, 14, 0.94)",
          ]}
          locations={[0, 0.45, 1]}
          style={styles.videoBottomFade}
          pointerEvents="none"
        />

        <View
          style={[styles.cardInner, styles.videoCardInner]}
          pointerEvents="none"
        >
          <View>
            <View style={styles.videoTitleBlock}>
              {words.length
                ? layer(
                    1,
                    <Text
                      style={[
                        styles.coverTitle,
                        styles.coverTitleAccent,
                        titleSize,
                      ]}
                      numberOfLines={2}
                    >
                      {words.join(" ")}
                    </Text>,
                  )
                : null}
            </View>
            {facts.length
              ? layer(
                  4,
                  <View style={[styles.coverFacts, styles.videoMeta]}>
                    {facts.map((fact) => (
                      <View
                        key={fact.key}
                        style={[
                          styles.coverFact,
                          fact.key === "tagline" && styles.shrink,
                        ]}
                        accessible
                        accessibilityLabel={fact.a11y ?? fact.text}
                      >
                        <MaterialIcons
                          name={fact.icon}
                          size={moderateWidthScale(15)}
                          color={theme.orangeBrown}
                        />
                        <Text
                          style={
                            fact.key === "tagline"
                              ? styles.metaText
                              : styles.coverFactText
                          }
                          numberOfLines={1}
                        >
                          {fact.text}
                        </Text>
                      </View>
                    ))}
                  </View>,
                )
              : null}
            {item.musicTitle
              ? layer(
                  5,
                  <View
                    style={[styles.coverMusic, styles.videoMeta]}
                    accessible
                    accessibilityLabel={t("includesMusicNamed", {
                      name: item.musicTitle,
                    })}
                  >
                    <MaterialIcons
                      name="music-note"
                      size={moderateWidthScale(15)}
                      color={theme.orangeBrown}
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.musicTitle}
                    </Text>
                  </View>,
                )
              : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Loading placeholder in the shape of the covers, info row and info card.
 * Leaf shapes take one style object — SkeletonPlaceholder reads width /
 * height / borderRadius straight off it (a style array loses them).
 */
function GallerySkeleton({
  cardWidth,
  cardHeight,
  sideInset,
  withInfo,
  styles,
}: {
  cardWidth: number;
  cardHeight: number;
  sideInset: number;
  /** Photo tab: the info row and name card under the covers */
  withInfo: boolean;
  styles: Styles;
}) {
  return (
    <View>
      <SkeletonPlaceholder
        backgroundColor={SKELETON_BG}
        highlightColor={SKELETON_HIGHLIGHT}
      >
        <View>
          <View
            style={[
              styles.carousel,
              styles.carouselContent,
              styles.skeletonCards,
              { paddingHorizontal: sideInset },
            ]}
          >
            <View
              style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: CARD_RADIUS,
              }}
            />
            <View
              style={{
                width: cardWidth,
                height: Math.round(cardHeight * SIDE_SCALE),
                borderRadius: CARD_RADIUS,
              }}
            />
          </View>
        </View>
      </SkeletonPlaceholder>
      {withInfo ? (
        <View style={styles.padded}>
          <View style={styles.featuresCard}>
            {/* The card is a row — without flex the skeleton collapses to nothing */}
            <View style={styles.flex}>
              <SkeletonPlaceholder
                backgroundColor={SKELETON_BG}
                highlightColor={SKELETON_HIGHLIGHT}
              >
                <View style={styles.skeletonFeatures}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.feature}>
                      <View style={styles.skeletonFeatureIcon} />
                      <View style={styles.skeletonFeatureLine} />
                      <View style={styles.skeletonFeatureLineShort} />
                    </View>
                  ))}
                </View>
              </SkeletonPlaceholder>
            </View>
          </View>
          <View style={styles.infoCard}>
            <SkeletonPlaceholder
              backgroundColor={SKELETON_BG}
              highlightColor={SKELETON_HIGHLIGHT}
            >
              <View>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonLineShort} />
              </View>
            </SkeletonPlaceholder>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** How a swipe settles on the next / previous template */
const SETTLE = { duration: 300, easing: Easing.out(Easing.cubic) };

export default function TemplateGalleryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // Photo Reel opens on the Photo tab, AI Auto Reel on the Video tab.
  // sourceMediaAssetId: "Try a different template" on a made reel — its
  // uploaded video goes on with the new template (Video tab only)
  const params = useLocalSearchParams<{
    kind?: string;
    sourceMediaAssetId?: string;
  }>();

  // One cover centred, the neighbours peeking in on both sides
  const sideInset = PEEK + CARD_GAP;
  const cardWidth = width - sideInset * 2;
  // Video tab: tall 9:16 cover filling the space between the heading and
  // the footer; Photo tab: the wide cover with its info under it
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headingHeight, setHeadingHeight] = useState(0);
  const snap = cardWidth + CARD_GAP;

  const [kind, setKind] = useState<TemplateGalleryKind>(
    params.kind === "photo" ? "photo" : "video",
  );
  const [tabs, setTabs] = useState<Record<TemplateGalleryKind, TabState>>({
    video: LOADING_TAB,
    photo: LOADING_TAB,
  });
  const [index, setIndex] = useState(0);
  // The centred template's sample plays on its own; this one was paused
  const [pausedId, setPausedId] = useState<number | null>(null);
  // Samples start muted; the viewer's choice holds while swiping
  const [muted, setMuted] = useState(true);
  // False while another screen is in front (set early by Use This Template)
  const [focused, setFocused] = useState(true);
  // This month's reel credits (Video tab); null = unknown, nothing blocked
  const [credits, setCredits] = useState<ReelCredits | null>(null);
  const [fullItem, setFullItem] = useState<TemplateGalleryItem | null>(null);
  // Swipe position in templates (0 = first); fractional mid-swipe
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const dragging = useSharedValue(false);

  const loadTemplates = useCallback(
    async (which: TemplateGalleryKind) => {
      setTabs((prev) => ({
        ...prev,
        [which]: { ...prev[which], loading: true, error: null },
      }));
      try {
        const items =
          which === "video"
            ? (await listAutoReelTemplates()).map((tpl) =>
                autoReelGalleryItem(tpl, t),
              )
            : (await listReelTemplates())
                .filter((tpl) => tpl.is_active !== false)
                .map((tpl) => photoReelGalleryItem(tpl, t));
        setTabs((prev) => ({
          ...prev,
          [which]: { items, loading: false, error: null },
        }));
      } catch (error: any) {
        Logger.error(`Failed to load ${which} reel templates:`, error);
        setTabs((prev) => ({
          ...prev,
          [which]: {
            items: [],
            loading: false,
            error: error?.message || t("failedToLoadTemplates"),
          },
        }));
      }
    },
    [t],
  );

  // Both tabs load together, so switching tabs doesn't wait again
  useEffect(() => {
    void loadTemplates("video");
    void loadTemplates("photo");
  }, [loadTemplates]);

  // Samples play only while this screen is in front: leaving unmounts the
  // player, so no sound follows onto the next screen
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setPausedId(null);
      return () => setFocused(false);
    }, []),
  );

  // Video tab: credits are read again on every visit — a reel made since
  // may have used one
  useFocusEffect(
    useCallback(() => {
      if (kind !== "video") return;
      let alive = true;
      void getReelCredits().then((next) => {
        if (alive) setCredits(next);
      });
      return () => {
        alive = false;
      };
    }, [kind]),
  );

  const isVideoTab = kind === "video";
  const cardHeight = Math.round(
    !isVideoTab
      ? cardWidth * CARD_RATIO
      : viewportHeight
        ? Math.min(
            cardWidth * VIDEO_CARD_MAX_RATIO,
            Math.max(
              cardWidth * VIDEO_CARD_MIN_RATIO,
              viewportHeight - headingHeight - VIDEO_CAROUSEL_SPACE,
            ),
          )
        : cardWidth * VIDEO_CARD_MIN_RATIO,
  );

  const tab = tabs[kind];
  const templates = tab.items;
  const count = templates.length;
  const current = templates[index] ?? templates[0];
  // Only the centred template's sample is loaded
  const videoId = focused && current?.previewVideoUrl ? current.id : null;
  // Out of credits: one-video designs can't be made (null credits never block)
  const noCredits =
    kind === "video" &&
    credits != null &&
    credits.remaining <= 0 &&
    !!current?.autoBuild;
  const activeKind = KINDS.find((k) => k.kind === kind) ?? KINDS[0];
  const chip = useMemo(
    () => ({ label: t(activeKind.chipKey), icon: activeKind.chipIcon }),
    [activeKind, t],
  );

  /** Straight back to the first template (another tab / kind) */
  const resetPager = useCallback(() => {
    cancelAnimation(progress);
    progress.value = 0;
    setIndex(0);
    setPausedId(null);
  }, [progress]);

  // Opened again with another kind (e.g. a link to this same screen)
  useEffect(() => {
    if (params.kind !== "photo" && params.kind !== "video") return;
    setKind(params.kind);
    resetPager();
  }, [params.kind, resetPager]);

  // Counter, dots and Use This Template follow the swipe once it's past halfway
  useAnimatedReaction(
    () =>
      Math.min(Math.max(Math.round(progress.value), 0), Math.max(count - 1, 0)),
    (now, prev) => {
      if (prev !== null && now !== prev) runOnJS(setIndex)(now);
    },
    [count],
  );

  // Each template that comes in plays, even one that was paused before
  useEffect(() => {
    setPausedId(null);
  }, [index]);

  const selectKind = (next: TemplateGalleryKind) => {
    if (next === kind) return;
    Haptics.selectionAsync().catch(() => {});
    setKind(next);
    resetPager();
  };

  const goTo = (next: number) => {
    progress.value = reduceMotion ? next : withTiming(next, SETTLE);
  };

  // Swipe anywhere under the tabs: covers and info move together
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .enabled(count > 1)
        // Horizontal only; an up/down drag still scrolls the page
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onStart(() => {
          "worklet";
          cancelAnimation(progress);
          dragStart.value = progress.value;
          dragging.value = true;
        })
        .onUpdate((e) => {
          "worklet";
          const max = count - 1;
          const raw = dragStart.value - e.translationX / width;
          // Resists past the first / last template
          progress.value =
            raw < 0 ? raw * 0.25 : raw > max ? max + (raw - max) * 0.25 : raw;
        })
        .onFinalize((e) => {
          "worklet";
          if (!dragging.value) return;
          dragging.value = false;
          const from = Math.round(dragStart.value);
          const flung = progress.value - (e.velocityX / width) * 0.25;
          // One template per swipe
          const step = Math.min(
            from + 1,
            Math.max(from - 1, Math.round(flung)),
          );
          const target = Math.min(count - 1, Math.max(0, step));
          progress.value = reduceMotion ? target : withTiming(target, SETTLE);
        }),
    [count, width, reduceMotion, progress, dragStart, dragging],
  );

  const coverTrack = useAnimatedStyle(
    () => ({ transform: [{ translateX: -progress.value * snap }] }),
    [snap],
  );
  const infoTrack = useAnimatedStyle(
    () => ({ transform: [{ translateX: -progress.value * width }] }),
    [width],
  );

  const showInfo = () =>
    Alert.alert(t("templateGalleryInfoTitle"), t("templateGalleryInfoBody"));

  const handleUseTemplate = () => {
    if (!current || noCredits) return;
    // Stop the sample now, before the next screen opens over it
    setFocused(false);
    const sourceMediaAssetId =
      current.kind === "video" ? params.sourceMediaAssetId : undefined;
    // Step 1 of that reel flow, with this template already picked
    router.push({
      pathname: (current.kind === "photo"
        ? "/(main)/templateReels"
        : "/(main)/reelTemplates") as any,
      params: {
        templateId: String(current.id),
        // The video already uploaded for another reel is used again
        ...(sourceMediaAssetId ? { sourceMediaAssetId } : null),
      },
    });
  };

  /** Only the template on screen is read out; the others sit off to the side */
  const offscreen = (i: number) =>
    i === index
      ? {}
      : {
          accessibilityElementsHidden: true,
          importantForAccessibility: "no-hide-descendants" as const,
        };

  const renderBody = () => {
    if (tab.loading) {
      return (
        <GallerySkeleton
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          sideInset={sideInset}
          withInfo={!isVideoTab}
          styles={styles}
        />
      );
    }
    if (tab.error) {
      return (
        <View style={[styles.padded, styles.empty]} accessibilityRole="alert">
          <View style={styles.emptyIcon}>
            <MaterialIcons
              name="cloud-off"
              size={moderateWidthScale(28)}
              color={theme.lightGreen}
            />
          </View>
          <Text style={styles.emptyText}>{tab.error}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => void loadTemplates(kind)}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!current) {
      return (
        <View style={[styles.padded, styles.empty]}>
          <View style={styles.emptyIcon}>
            <MaterialIcons
              name="dashboard-customize"
              size={moderateWidthScale(28)}
              color={theme.lightGreen}
            />
          </View>
          <Text style={styles.emptyTitle}>{t("noTemplatesYet")}</Text>
          <Text style={styles.emptyText}>{t("noTemplatesSubtitle")}</Text>
        </View>
      );
    }
    return (
      <Animated.View
        key={kind}
        entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      >
        <View
          style={[
            styles.carousel,
            styles.carouselContent,
            isVideoTab && styles.videoCarouselContent,
          ]}
        >
          <Animated.View
            style={[
              styles.coverRow,
              {
                width: sideInset * 2 + count * snap - CARD_GAP,
                paddingHorizontal: sideInset,
              },
              coverTrack,
            ]}
          >
            {templates.map((item, i) => (
              <View key={item.id} {...offscreen(i)}>
                {isVideoTab ? (
                  <VideoTemplateCover
                    item={item}
                    index={i}
                    width={cardWidth}
                    height={cardHeight}
                    progress={progress}
                    reduceMotion={reduceMotion}
                    videoOn={videoId === item.id}
                    centred={i === index}
                    onSelect={() => goTo(i)}
                    styles={styles}
                    theme={theme}
                  />
                ) : (
                  <TemplateCover
                    item={item}
                    index={i}
                    width={cardWidth}
                    height={cardHeight}
                    progress={progress}
                    reduceMotion={reduceMotion}
                    chip={chip}
                    videoOn={videoId === item.id}
                    // Held while the full screen preview plays it with sound
                    playing={
                      videoId === item.id &&
                      pausedId !== item.id &&
                      fullItem == null
                    }
                    muted={muted}
                    onTogglePlay={() => {
                      // A side cover's button brings it to the centre (it plays there)
                      if (i !== index) {
                        goTo(i);
                        return;
                      }
                      setPausedId(pausedId === item.id ? null : item.id);
                    }}
                    onToggleSound={() => setMuted((m) => !m)}
                    onExpand={() => setFullItem(item)}
                    styles={styles}
                    theme={theme}
                  />
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Photo tab: each template's info as a page that slides with the covers */}
        {isVideoTab ? null : (
          <Animated.View
            style={[styles.infoRow, { width: count * width }, infoTrack]}
          >
            {templates.map((item, i) => (
              <View
                key={item.id}
                style={[styles.infoPage, { width }]}
                {...offscreen(i)}
              >
                <View style={styles.featuresCard}>
                  {item.features.map((f, order) => (
                    <SwipeLayer
                      key={f.icon}
                      style={styles.feature}
                      progress={progress}
                      index={i}
                      order={order}
                      distance={width}
                      reduceMotion={reduceMotion}
                    >
                      <MaterialIcons
                        name={f.icon}
                        size={moderateWidthScale(28)}
                        color={theme.darkGreen}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                      <Text style={styles.featureLabel} numberOfLines={3}>
                        {f.label}
                      </Text>
                    </SwipeLayer>
                  ))}
                </View>
                <SwipeLayer
                  style={styles.infoCard}
                  progress={progress}
                  index={i}
                  order={item.features.length}
                  distance={width}
                  reduceMotion={reduceMotion}
                >
                  <Text style={styles.infoTitle} accessibilityRole="header">
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text style={styles.infoDesc}>{item.description}</Text>
                  ) : null}
                  {item.slots?.length ? (
                    <View style={styles.slotList}>
                      <Text style={styles.slotListTitle}>
                        {t("designWhatYouNeed")}
                      </Text>
                      {item.slots.map((slot, n) => (
                        <View key={`${slot.label}-${n}`} style={styles.slotRow}>
                          <View style={styles.slotIcon}>
                            <MaterialIcons
                              name={slot.icon}
                              size={moderateWidthScale(16)}
                              color={theme.darkGreen}
                            />
                          </View>
                          <View style={styles.slotText}>
                            <Text style={styles.slotLabel}>{slot.label}</Text>
                            {slot.detail ? (
                              <Text style={styles.slotDetail}>
                                {slot.detail}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </SwipeLayer>
              </View>
            ))}
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const showCounter = !tab.loading && !tab.error && count > 0;
  // Video tab, once the credits are known: how many are left, or that none
  // are for this one-video design
  const creditsLine =
    kind !== "video" || !credits
      ? null
      : noCredits
        ? t("templateGalleryNoCredits")
        : typeof credits.monthly_limit === "number"
          ? t("templateGalleryCreditsLeft", {
              count: Math.max(0, credits.remaining),
              total: credits.monthly_limit,
            })
          : t("autoBuildCreditsLeft", {
              count: Math.max(0, credits.remaining),
            });

  return (
    <View style={styles.safeArea}>
      <StackHeader
        title={t(activeKind.headerKey)}
        rightIcon={
          <MaterialIcons
            name="info-outline"
            size={iconScale(24)}
            color={theme.white}
          />
        }
        onRightPress={showInfo}
        rightAccessibilityLabel={t("templateGalleryInfoTitle")}
      />

      {/* Tabs stay pinned under the header */}
      <View style={styles.segmentBar}>
        <View style={styles.segment} accessibilityRole="tablist">
          {KINDS.map((k) => {
            const selected = k.kind === kind;
            return (
              <TouchableOpacity
                key={k.kind}
                style={[styles.segmentTab, selected && styles.segmentTabActive]}
                onPress={() => selectKind(k.kind)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={k.icon}
                  size={moderateWidthScale(21)}
                  color={selected ? theme.white : theme.lightGreen}
                />
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextActive,
                  ]}
                >
                  {t(k.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isVideoTab && styles.videoScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      >
        <GestureDetector gesture={swipe}>
          <View style={styles.swipeArea} collapsable={false}>
            <View
              style={styles.padded}
              onLayout={(e) => setHeadingHeight(e.nativeEvent.layout.height)}
            >
              <View style={styles.headingBlock}>
                <View style={styles.headingRow}>
                  <Text style={styles.title} accessibilityRole="header">
                    {t("templateGalleryTitle")}
                  </Text>
                  {tab.loading ? (
                    <SkeletonPlaceholder
                      backgroundColor={SKELETON_BG}
                      highlightColor={SKELETON_HIGHLIGHT}
                    >
                      <View style={styles.skeletonCounter} />
                    </SkeletonPlaceholder>
                  ) : showCounter ? (
                    <View
                      style={styles.counterPill}
                      accessible
                      accessibilityLabel={t("templateGalleryCounter", {
                        current: index + 1,
                        total: count,
                      })}
                    >
                      <Text style={styles.counterNow}>
                        {index + 1}
                        <Text style={styles.counterTotal}>/{count}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.subtitle}>
                  {t("templateGallerySubtitle")}
                </Text>
              </View>
            </View>

            {renderBody()}
          </View>
        </GestureDetector>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, moderateWidthScale(12)) },
        ]}
      >
        {/* Content fades out under the footer instead of a hard cut (the
            Video tab's cover ends just above it, so no fade there) */}
        {isVideoTab ? null : (
          <LinearGradient
            colors={[`${theme.background}00`, theme.background]}
            style={styles.footerFade}
            pointerEvents="none"
          />
        )}
        {tab.loading ? (
          <SkeletonPlaceholder
            backgroundColor={SKELETON_BG}
            highlightColor={SKELETON_HIGHLIGHT}
          >
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.dotHit}>
                  <View
                    style={
                      i === 0 ? styles.skeletonDotActive : styles.skeletonDot
                    }
                  />
                </View>
              ))}
            </View>
          </SkeletonPlaceholder>
        ) : !tab.error && count > 1 ? (
          <View style={styles.dots}>
            {templates.map((tpl, i) => (
              <TouchableOpacity
                key={tpl.id}
                style={styles.dotHit}
                onPress={() => goTo(i)}
                accessibilityRole="button"
                accessibilityLabel={t("templateGalleryCounter", {
                  current: i + 1,
                  total: count,
                })}
                accessibilityState={{ selected: i === index }}
              >
                <View style={[styles.dot, i === index && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {creditsLine ? (
          <View
            style={[styles.credits, noCredits && styles.creditsEmpty]}
            accessible
            accessibilityLabel={creditsLine}
            accessibilityRole={noCredits ? "alert" : undefined}
          >
            <MaterialIcons
              name={noCredits ? "block" : "toll"}
              size={moderateWidthScale(16)}
              color={noCredits ? theme.red : theme.darkGreenLight}
            />
            <Text
              style={[styles.creditsText, noCredits && styles.creditsTextEmpty]}
            >
              {creditsLine}
            </Text>
          </View>
        ) : null}
        <Button
          title={t("templateGalleryUse")}
          onPress={handleUseTemplate}
          disabled={!current || tab.loading || noCredits}
          containerStyle={styles.ctaButton}
          textStyle={styles.ctaText}
        />
      </View>

      <FullPreview item={fullItem} onClose={() => setFullItem(null)} />
    </View>
  );
}
