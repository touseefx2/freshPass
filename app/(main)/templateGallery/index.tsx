import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { iconScale, moderateWidthScale } from "@/src/theme/dimensions";
import { TEMPLATE_GALLERY_MOCK } from "@/src/constants/templateGalleryMock";
import type {
  TemplateGalleryItem,
  TemplateGalleryKind,
} from "@/src/types/templateGallery";
import {
  CARD_GAP,
  CARD_RATIO,
  FRAME_GAP,
  FRAMES_VISIBLE,
  GUTTER,
  createStyles,
} from "./styles";

const KINDS: {
  kind: TemplateGalleryKind;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
  headerKey: string;
}[] = [
  {
    kind: "video",
    icon: "videocam",
    labelKey: "templateGalleryVideoTab",
    headerKey: "templateGalleryHeaderVideo",
  },
  {
    kind: "photo",
    icon: "image-outline",
    labelKey: "templateGalleryPhotoTab",
    headerKey: "templateGalleryHeaderPhoto",
  },
];

function useLoopingPlayer(uri: string) {
  return useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
}

/** Inline sample playback; mounted only while a card is playing */
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
  imageUri,
  onClose,
}: {
  item: TemplateGalleryItem | null;
  imageUri: string | null;
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
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.fullMedia}
            contentFit="contain"
            accessibilityLabel={item?.name}
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

export default function TemplateGalleryScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const cardWidth = width - GUTTER * 2;
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  const snap = cardWidth + CARD_GAP;
  const frameWidth = Math.floor(
    (cardWidth - FRAME_GAP * (Math.ceil(FRAMES_VISIBLE) - 1)) / FRAMES_VISIBLE,
  );
  const frameHeight = Math.round(frameWidth * 0.92);

  // TODO: load from the template gallery API once it exists
  const allTemplates = TEMPLATE_GALLERY_MOCK;

  const [kind, setKind] = useState<TemplateGalleryKind>("video");
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [fullItem, setFullItem] = useState<TemplateGalleryItem | null>(null);
  const listRef = useRef<FlatList<TemplateGalleryItem>>(null);

  const templates = useMemo(
    () => allTemplates.filter((tpl) => tpl.kind === kind),
    [allTemplates, kind],
  );
  const current = templates[index] ?? templates[0];
  const activeKind = KINDS.find((k) => k.kind === kind) ?? KINDS[0];

  const selectKind = (next: TemplateGalleryKind) => {
    if (next === kind) return;
    Haptics.selectionAsync().catch(() => {});
    setKind(next);
    setIndex(0);
    setPlayingId(null);
  };

  const goTo = (next: number) => {
    setIndex(next);
    setPlayingId(null);
    listRef.current?.scrollToOffset({ offset: next * snap, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / snap);
    const clamped = Math.max(0, Math.min(templates.length - 1, next));
    if (clamped !== index) {
      setIndex(clamped);
      setPlayingId(null);
    }
  };

  // Strip images open in the app's full image viewer (swipe + zoom)
  const openFrame = (frame: number) => {
    if (!current?.frames.length) return;
    setPlayingId(null);
    dispatch(
      openFullImageModal({ images: current.frames, initialIndex: frame }),
    );
  };

  const showInfo = () =>
    Alert.alert(t("templateGalleryInfoTitle"), t("templateGalleryInfoBody"));

  const handleUseTemplate = () => {
    if (!current) return;
    // Hands off to the existing template reel flow (media slots + generate)
    router.push({
      pathname: "/(main)/templateReels",
      params: { galleryTemplateId: current.id, reelKind: current.kind },
    } as any);
  };

  const renderCard = ({
    item,
    index: i,
  }: {
    item: TemplateGalleryItem;
    index: number;
  }) => {
    const active = i === index;
    const playing = playingId === item.id && !!item.previewVideoUrl;
    const [first, ...rest] = item.headline;
    return (
      <View
        style={[
          styles.card,
          active && styles.cardActive,
          { width: cardWidth, height: cardHeight },
        ]}
      >
        {playing ? (
          <PreviewVideo uri={item.previewVideoUrl!} />
        ) : (
          <>
            <Image
              source={{ uri: item.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="right"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
            {/* Keeps the headline readable on any photo */}
            <LinearGradient
              colors={[
                "rgba(40, 54, 24, 0.9)",
                "rgba(40, 54, 24, 0.45)",
                "transparent",
              ]}
              locations={[0, 0.4, 0.75]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.headlineWrap} pointerEvents="none">
              {first ? <Text style={styles.headlineLine}>{first}</Text> : null}
              {rest.length ? (
                <Text style={[styles.headlineLine, styles.headlineAccent]}>
                  {rest.join(" ")}
                </Text>
              ) : null}
              <Text style={styles.tagline}>{item.tagline}</Text>
              <View style={styles.taglineBar}>
                <View style={styles.taglineBarLine} />
                <View style={styles.taglineBarTick} />
              </View>
            </View>
          </>
        )}

        <View style={styles.counterBadge} pointerEvents="none">
          <Text style={styles.counterText}>
            {t("templateGalleryCounter", {
              current: i + 1,
              total: templates.length,
            })}
          </Text>
        </View>

        {item.previewVideoUrl ? (
          <View style={styles.playLayer} pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.playButton, playing && { opacity: 0.6 }]}
              onPress={() => setPlayingId(playing ? null : item.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                playing ? t("templateGalleryPause") : t("templateGalleryPlay")
              }
            >
              <MaterialIcons
                name={playing ? "pause" : "play-arrow"}
                size={moderateWidthScale(30)}
                color={theme.white}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => {
            setPlayingId(null);
            setFullItem(item);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("templateGalleryFullScreen")}
        >
          <MaterialIcons
            name="fullscreen"
            size={moderateWidthScale(28)}
            color={theme.white}
          />
        </TouchableOpacity>
      </View>
    );
  };

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

      {/* Tabs stay pinned under the header; only the content below scrolls */}
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
        <View style={styles.padded}>
          <View style={styles.headingBlock}>
            <Text style={styles.title} accessibilityRole="header">
              {t("templateGalleryTitle")}
            </Text>
            <Text style={styles.subtitle}>{t("templateGallerySubtitle")}</Text>
          </View>
        </View>

        {current ? (
          <Animated.View
            key={kind}
            entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          >
            <FlatList
              ref={listRef}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
              data={templates}
              keyExtractor={(tpl) => tpl.id}
              renderItem={renderCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={snap}
              decelerationRate="fast"
              disableIntervalMomentum
              ItemSeparatorComponent={() => (
                <View style={{ width: CARD_GAP }} />
              )}
              onMomentumScrollEnd={onMomentumEnd}
              extraData={[index, playingId]}
              getItemLayout={(_, i) => ({
                length: snap,
                offset: snap * i,
                index: i,
              })}
            />

            <ScrollView
              horizontal
              style={styles.frames}
              contentContainerStyle={styles.framesContent}
              showsHorizontalScrollIndicator={false}
            >
              {current.frames.map((uri, i) => {
                return (
                  <TouchableOpacity
                    key={`${current.id}-${i}`}
                    style={[
                      styles.frame,
                      { width: frameWidth, height: frameHeight },
                    ]}
                    onPress={() => openFrame(i)}
                    activeOpacity={0.8}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t("templateGalleryFrame", {
                      index: i + 1,
                    })}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.frameImage}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.padded}>
              <View style={styles.features}>
                {current.features.map((f) => (
                  <View key={f.label} style={styles.feature}>
                    <MaterialIcons
                      name={f.icon}
                      size={moderateWidthScale(30)}
                      color={theme.selectCard}
                    />
                    <Text style={styles.featureLabel} numberOfLines={2}>
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{current.name}</Text>
                <Text style={styles.infoDesc}>{current.description}</Text>
              </View>

              {templates.length > 1 ? (
                <View style={styles.dots}>
                  {templates.map((tpl, i) => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={styles.dotHit}
                      onPress={() => goTo(i)}
                      accessibilityRole="button"
                      accessibilityLabel={t("templateGalleryCounter", {
                        current: i + 1,
                        total: templates.length,
                      })}
                      accessibilityState={{ selected: i === index }}
                    >
                      <View
                        style={[styles.dot, i === index && styles.dotActive]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          </Animated.View>
        ) : (
          <View style={[styles.padded, styles.empty]}>
            <MaterialIcons
              name="dashboard-customize"
              size={moderateWidthScale(36)}
              color={theme.lightGreen5}
            />
            <Text style={styles.emptyText}>{t("templateGalleryEmpty")}</Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, moderateWidthScale(12)) },
        ]}
      >
        <Button
          title={t("templateGalleryUse")}
          onPress={handleUseTemplate}
          disabled={!current}
          containerStyle={styles.ctaButton}
          textStyle={styles.ctaText}
        />
      </View>

      <FullPreview
        item={fullItem}
        imageUri={fullItem?.coverUrl ?? null}
        onClose={() => setFullItem(null)}
      />
    </View>
  );
}
