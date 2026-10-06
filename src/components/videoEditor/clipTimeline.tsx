import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { clipLengthMs, type EditorClip } from "./editorModel";

/**
 * Level 1 of the trim tool (Instagram "Edit clips"): one tile per clip.
 * Tap a tile → edit that clip. Hold + drag → reorder. × → remove.
 */
type Props = {
  clips: EditorClip[];
  thumbs: Record<string, string | null | undefined>;
  totalMs: number;
  maxMs: number;
  canAdd: boolean;
  adding: boolean;
  disabled: boolean;
  formatMs: (ms: number) => string;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReorder: (orderedIds: string[]) => void;
};

const TILE_W = widthScale(56);
const TILE_H = heightScale(74);
const GAP = moderateWidthScale(10);
const SLOT = TILE_W + GAP;
/** Room above the tiles for the × badge that overhangs the corner. */
const BADGE_OVERHANG = moderateHeightScale(8);
const LONG_PRESS_MS = 250;

type Positions = Record<string, number>;

function toPositions(ids: string[]): Positions {
  const out: Positions = {};
  ids.forEach((id, i) => {
    out[id] = i;
  });
  return out;
}

function moveItem(positions: Positions, from: number, to: number): Positions {
  "worklet";
  const next: Positions = {};
  for (const id in positions) {
    const p = positions[id];
    let np = p;
    if (p === from) np = to;
    else if (from < to && p > from && p <= to) np = p - 1;
    else if (from > to && p >= to && p < from) np = p + 1;
    next[id] = np;
  }
  return next;
}

function orderOf(positions: Positions): string[] {
  "worklet";
  return Object.keys(positions).sort((a, b) => positions[a] - positions[b]);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    total: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      fontVariant: ["tabular-nums"],
    },
    totalFull: {
      color: theme.orangeBrown,
    },
    stripContent: {
      paddingTop: BADGE_OVERHANG + moderateHeightScale(2),
      paddingBottom: moderateHeightScale(4),
      paddingRight: moderateWidthScale(8),
      flexDirection: "row",
    },
    tileLane: {
      height: TILE_H,
    },
    tileWrap: {
      position: "absolute",
      left: 0,
      top: 0,
      width: TILE_W,
      height: TILE_H,
    },
    tile: {
      width: TILE_W,
      height: TILE_H,
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.black,
      borderWidth: 1,
      borderColor: theme.white15,
    },
    thumb: {
      ...StyleSheet.absoluteFillObject,
    },
    thumbFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    durationPill: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingVertical: moderateHeightScale(2),
      backgroundColor: theme.borderDark,
      alignItems: "center",
    },
    durationText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    removeBadge: {
      position: "absolute",
      top: -BADGE_OVERHANG,
      right: -moderateWidthScale(6),
      width: widthScale(22),
      height: widthScale(22),
      borderRadius: widthScale(11),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.black,
    },
    addTile: {
      width: TILE_W,
      height: TILE_H,
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.white50,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    addTileDisabled: {
      opacity: 0.4,
    },
    addLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    hint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginTop: moderateHeightScale(4),
    },
  });

type TileProps = {
  clip: EditorClip;
  index: number;
  count: number;
  thumb: string | null | undefined;
  positions: SharedValue<Positions>;
  draggingId: SharedValue<string>;
  disabled: boolean;
  canRemove: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  formatMs: (ms: number) => string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: (orderedIds: string[]) => void;
};

function ClipTile({
  clip,
  index,
  count,
  thumb,
  positions,
  draggingId,
  disabled,
  canRemove,
  styles,
  theme,
  formatMs,
  onOpen,
  onRemove,
  onMove,
  onDragStart,
  onDragEnd,
}: TileProps) {
  const { t } = useTranslation();
  const dragX = useSharedValue(0);
  const startPos = useSharedValue(index);
  const id = clip.id;

  const gesture = useMemo(() => {
    const reorder = Gesture.Pan()
      .enabled(!disabled && count > 1)
      .activateAfterLongPress(LONG_PRESS_MS)
      .onStart(() => {
        startPos.value = positions.value[id] ?? index;
        dragX.value = startPos.value * SLOT;
        draggingId.value = id;
        runOnJS(onDragStart)();
      })
      .onUpdate((e) => {
        const maxX = (count - 1) * SLOT;
        dragX.value = Math.min(maxX, Math.max(0, startPos.value * SLOT + e.translationX));
        const target = Math.min(count - 1, Math.max(0, Math.round(dragX.value / SLOT)));
        const current = positions.value[id];
        if (current !== undefined && target !== current) {
          positions.value = moveItem(positions.value, current, target);
        }
      })
      .onEnd(() => {
        const finalX = (positions.value[id] ?? index) * SLOT;
        dragX.value = withTiming(finalX, { duration: 140 }, () => {
          draggingId.value = "";
          runOnJS(onDragEnd)(orderOf(positions.value));
        });
      });
    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onEnd((_e, success) => {
        if (success) runOnJS(onOpen)(id);
      });
    return Gesture.Exclusive(reorder, tap);
  }, [
    count,
    disabled,
    dragX,
    draggingId,
    id,
    index,
    onDragEnd,
    onDragStart,
    onOpen,
    positions,
    startPos,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const active = draggingId.value === id;
    const slotX = (positions.value[id] ?? index) * SLOT;
    return {
      zIndex: active ? 10 : 1,
      transform: [
        {
          translateX: active
            ? dragX.value
            : withSpring(slotX, { damping: 22, stiffness: 260 }),
        },
        { scale: withTiming(active ? 1.08 : 1, { duration: 120 }) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.tileWrap, animatedStyle]}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.tile}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${t("clipLabel", { index: index + 1, count })}, ${formatMs(
            clipLengthMs(clip),
          )}`}
          accessibilityHint={t("clipTileA11yHint")}
          accessibilityActions={[
            { name: "activate" },
            ...(index > 0 ? [{ name: "moveEarlier", label: t("moveClipEarlier") }] : []),
            ...(index < count - 1 ? [{ name: "moveLater", label: t("moveClipLater") }] : []),
            ...(canRemove ? [{ name: "remove", label: t("removeClip") }] : []),
          ]}
          onAccessibilityAction={(e) => {
            switch (e.nativeEvent.actionName) {
              case "activate":
                onOpen(id);
                break;
              case "moveEarlier":
                onMove(id, -1);
                break;
              case "moveLater":
                onMove(id, 1);
                break;
              case "remove":
                onRemove(id);
                break;
            }
          }}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" transition={120} />
          ) : (
            <View style={styles.thumbFallback}>
              <MaterialIcons name="movie" size={moderateWidthScale(20)} color={theme.white50} />
            </View>
          )}
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{formatMs(clipLengthMs(clip))}</Text>
          </View>
        </View>
      </GestureDetector>

      {canRemove ? (
        <Pressable
          style={styles.removeBadge}
          onPress={() => onRemove(id)}
          disabled={disabled}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("removeClip")}
        >
          <MaterialIcons name="close" size={moderateWidthScale(14)} color={theme.black} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default function ClipTimeline({
  clips,
  thumbs,
  totalMs,
  maxMs,
  canAdd,
  adding,
  disabled,
  formatMs,
  onOpen,
  onAdd,
  onRemove,
  onMove,
  onReorder,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const prevCountRef = useRef(clips.length);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const ids = clips.map((c) => c.id);
  const idsKey = ids.join("|");
  const positions = useSharedValue<Positions>(toPositions(ids));
  const draggingId = useSharedValue("");

  // Committed order (add / remove / undo / move buttons) → tile slots.
  useLayoutEffect(() => {
    positions.value = toPositions(idsKey ? idsKey.split("|") : []);
  }, [idsKey, positions]);

  // Newly added clips land at the end — keep them in view.
  useEffect(() => {
    if (clips.length > prevCountRef.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
    prevCountRef.current = clips.length;
  }, [clips.length]);

  const onDragStart = useCallback(() => {
    setScrollEnabled(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const onDragEnd = useCallback(
    (orderedIds: string[]) => {
      setScrollEnabled(true);
      if (orderedIds.join("|") !== idsKey) onReorder(orderedIds);
    },
    [idsKey, onReorder],
  );

  const canRemove = clips.length > 1;
  const addDisabled = disabled || adding || !canAdd;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("trimVideo")}</Text>
        <Text
          style={[styles.total, totalMs >= maxMs - 250 && styles.totalFull]}
          accessibilityLabel={t("clipsTotalA11y", {
            total: formatMs(totalMs),
            max: formatMs(maxMs),
          })}
        >
          {formatMs(totalMs)} / {formatMs(maxMs)}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.tileLane, { width: clips.length * SLOT }]}>
          {clips.map((clip, index) => (
            <ClipTile
              key={clip.id}
              clip={clip}
              index={index}
              count={clips.length}
              thumb={thumbs[clip.id]}
              positions={positions}
              draggingId={draggingId}
              disabled={disabled}
              canRemove={canRemove}
              styles={styles}
              theme={theme}
              formatMs={formatMs}
              onOpen={onOpen}
              onRemove={onRemove}
              onMove={onMove}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addTile, addDisabled && styles.addTileDisabled]}
          onPress={onAdd}
          disabled={addDisabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("addClip")}
          accessibilityState={{ disabled: addDisabled, busy: adding }}
        >
          <MaterialIcons
            name={adding ? "hourglass-empty" : "add"}
            size={moderateWidthScale(24)}
            color={theme.white}
          />
          <Text style={styles.addLabel}>{t("addClipShort")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={styles.hint}>
        {clips.length > 1 ? t("clipsOverviewHint") : t("clipsOverviewHintSingle")}
      </Text>
    </View>
  );
}
