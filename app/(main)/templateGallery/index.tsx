import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import {
  listAutoReelTemplates,
  listReelTemplates,
} from "@/src/services/reelsService";
import { Theme } from "@/src/theme/colors";
import { iconScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fontSize } from "@/src/theme/fonts";
import type {
  TemplateGalleryItem,
  TemplateGalleryKind,
} from "@/src/types/templateGallery";
import {
  autoReelGalleryItem,
  photoReelGalleryItem,
} from "@/src/utils/templateGallery";
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

/** Rings around the cover medallion: radius (share of cover height) + opacity */
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
    total > 16 ? fontSize.size24 : total > 10 ? fontSize.size28 : fontSize.size34;
  return Math.floor(Math.min(base, maxWidth / (longest * 0.68)));
}

function useLoopingPlayer(uri: string) {
  return useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
}

/** Inline sample playback; mounted only while a cover is playing */
function PreviewVideo({ uri }: { uri: string }) {
  const player = useLoopingPlayer(uri);
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
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
}: {
  id: string;
  width: number;
  height: number;
  theme: Theme;
}) {
  const cx = width * ART_CENTER;
  const cy = height / 2;
  const glowR = height * 0.62;
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
          r={height * ring.r}
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
  playing,
  onTogglePlay,
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
  playing: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useTranslation();

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
  const layer = (order: number, children: React.ReactNode) => (
    <SwipeLayer
      progress={progress}
      index={index}
      order={order}
      distance={width}
      reduceMotion={reduceMotion}
    >
      {children}
    </SwipeLayer>
  );

  return (
    <Animated.View style={[styles.cardShadow, { width, height }, motion]}>
      <View style={styles.card}>
        {playing ? (
          <PreviewVideo uri={item.previewVideoUrl!} />
        ) : item.coverUrl ? (
          <>
            <Image
              source={{ uri: item.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
            {/* Keeps the title readable on any photo */}
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
          </>
        ) : (
          <CoverArt
            id={`${item.kind}-${item.id}`}
            width={width}
            height={height}
            theme={theme}
          />
        )}

        {!playing ? (
          <View style={styles.cardInner} pointerEvents="none">
            <View style={styles.cardTop}>
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
              )}
            </View>
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
              {layer(3, <View style={styles.accentBar} />)}
              {item.tagline
                ? layer(
                    4,
                    <View style={styles.metaRow}>
                      <MaterialIcons
                        name={item.taglineIcon}
                        size={moderateWidthScale(15)}
                        color={theme.orangeBrown}
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.tagline}
                      </Text>
                    </View>,
                  )
                : null}
            </View>
          </View>
        ) : null}

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
 * Loading placeholder in the shape of the covers, info row and info card.
 * Leaf shapes take one style object — SkeletonPlaceholder reads width /
 * height / borderRadius straight off it (a style array loses them).
 */
function GallerySkeleton({
  cardWidth,
  cardHeight,
  sideInset,
  styles,
}: {
  cardWidth: number;
  cardHeight: number;
  sideInset: number;
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
  // Photo Reel opens on the Photo tab, AI Auto Reel on the Video tab
  const params = useLocalSearchParams<{ kind?: string }>();

  // One cover centred, the neighbours peeking in on both sides
  const sideInset = PEEK + CARD_GAP;
  const cardWidth = width - sideInset * 2;
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  const snap = cardWidth + CARD_GAP;

  const [kind, setKind] = useState<TemplateGalleryKind>(
    params.kind === "photo" ? "photo" : "video",
  );
  const [tabs, setTabs] = useState<Record<TemplateGalleryKind, TabState>>({
    video: LOADING_TAB,
    photo: LOADING_TAB,
  });
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
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

  const tab = tabs[kind];
  const templates = tab.items;
  const count = templates.length;
  const current = templates[index] ?? templates[0];
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
    setPlayingId(null);
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

  // A sample video stops when another template comes in
  useEffect(() => {
    setPlayingId(null);
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
          const step = Math.min(from + 1, Math.max(from - 1, Math.round(flung)));
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
    if (!current) return;
    setPlayingId(null);
    // Step 1 of that reel flow, with this template already picked
    router.push({
      pathname: (current.kind === "photo"
        ? "/(main)/templateReels"
        : "/(main)/reelTemplates") as any,
      params: { templateId: String(current.id) },
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
        <View style={[styles.carousel, styles.carouselContent]}>
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
                <TemplateCover
                  item={item}
                  index={i}
                  width={cardWidth}
                  height={cardHeight}
                  progress={progress}
                  reduceMotion={reduceMotion}
                  chip={chip}
                  playing={playingId === item.id && !!item.previewVideoUrl}
                  onTogglePlay={() =>
                    setPlayingId(playingId === item.id ? null : item.id)
                  }
                  onExpand={() => {
                    setPlayingId(null);
                    setFullItem(item);
                  }}
                  styles={styles}
                  theme={theme}
                />
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Each template's info as a page that slides with the covers */}
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
              </SwipeLayer>
            </View>
          ))}
        </Animated.View>
      </Animated.View>
    );
  };

  const showCounter = !tab.loading && !tab.error && count > 0;

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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GestureDetector gesture={swipe}>
          <View style={styles.swipeArea} collapsable={false}>
            <View style={styles.padded}>
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
        {/* Content fades out under the footer instead of a hard cut */}
        <LinearGradient
          colors={[`${theme.background}00`, theme.background]}
          style={styles.footerFade}
          pointerEvents="none"
        />
        {tab.loading ? (
          <SkeletonPlaceholder
            backgroundColor={SKELETON_BG}
            highlightColor={SKELETON_HIGHLIGHT}
          >
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.dotHit}>
                  <View
                    style={i === 0 ? styles.skeletonDotActive : styles.skeletonDot}
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
        <Button
          title={t("templateGalleryUse")}
          onPress={handleUseTemplate}
          disabled={!current || tab.loading}
          containerStyle={styles.ctaButton}
          textStyle={styles.ctaText}
        />
      </View>

      <FullPreview item={fullItem} onClose={() => setFullItem(null)} />
    </View>
  );
}
