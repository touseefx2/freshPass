import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { formatVideoDuration } from "@/src/utils/videoDuration";
import {
  clipLengthMs,
  type EditorClip,
} from "@/src/components/videoEditor/editorModel";

/**
 * Reel Studio Trim step: every clip joined in one strip, each as wide as it
 * is long, with "+" at the end. Above it all clips together and whether that
 * fits (shortest … longest); out of range → the strip and a line under it go
 * red. Tap a clip to trim it below, ✕ on it to remove it (Undo brings it
 * back), hold and drag it left / right to move it.
 */
type Props = {
  clips: EditorClip[];
  thumbs: Record<string, string | null | undefined>;
  totalMs: number;
  /** Shortest total (e.g. the AI reel's length); null = no minimum */
  minMs: number | null;
  maxMs: number;
  selectedId: string | null;
  canAdd: boolean;
  adding: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  /** ✕ on the selected box (when there are several) */
  onRemove: (id: string) => void;
  /** Hold-and-drag result: every clip id in the new order */
  onReorder: (orderedIds: string[]) => void;
  /** Screen readers: move a clip one place (no drag there) */
  onMove: (id: string, direction: -1 | 1) => void;
};

/** Thin clips stay tappable: at least this share of the strip */
const MIN_SHARE = 0.07;
const LONG_PRESS_MS = 350;

type Layouts = Record<string, { x: number; w: number }>;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(8) },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    totalLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    totalBad: { color: theme.red },
    status: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      flexShrink: 1,
    },
    statusText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flexShrink: 1,
    },
    statusBad: { color: theme.red, fontFamily: fonts.fontBold },
    strip: {
      flexDirection: "row",
      gap: moderateWidthScale(3),
      height: moderateHeightScale(64),
    },
    segments: { flex: 1, flexDirection: "row", gap: moderateWidthScale(3) },
    segment: { borderRadius: moderateWidthScale(10) },
    segmentInner: {
      flex: 1,
      borderRadius: moderateWidthScale(10),
      overflow: "hidden",
      backgroundColor: theme.darkGreen,
      // Same width when selected / in error — only its colour changes
      borderWidth: 2.5,
      borderColor: "transparent",
    },
    segmentOn: { borderColor: theme.selectCard },
    segmentBad: { borderColor: theme.red },
    segmentImage: { ...StyleSheet.absoluteFillObject },
    segmentShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    segmentNumber: {
      position: "absolute",
      top: moderateHeightScale(3),
      left: moderateWidthScale(5),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    segmentLength: {
      position: "absolute",
      bottom: moderateHeightScale(3),
      left: moderateWidthScale(5),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    // ✕ on the selected box: small to see, 44pt to tap (hitSlop)
    segmentRemove: {
      position: "absolute",
      top: moderateHeightScale(5),
      right: moderateWidthScale(5),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    // Where a dragged clip will land
    dropMarker: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 4,
      marginLeft: -2,
      borderRadius: 2,
      backgroundColor: theme.selectCard,
    },
    add: {
      width: moderateWidthScale(52),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
    },
    addOff: { opacity: 0.4 },
    error: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    hint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

type Styles = ReturnType<typeof createStyles>;

/** Index the dragged clip lands at: how many other clips' middles are left of the finger. */
function dropIndexAt(
  layouts: Layouts,
  order: string[],
  dragId: string,
  fingerX: number,
): number {
  "worklet";
  let index = 0;
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    if (id === dragId) continue;
    const l = layouts[id];
    if (l && l.x + l.w / 2 < fingerX) index++;
  }
  return index;
}

/** Left edge of the gap the clip drops into (marker position). */
function dropMarkerX(
  layouts: Layouts,
  order: string[],
  dragId: string,
  index: number,
): number {
  "worklet";
  const others: string[] = [];
  for (let i = 0; i < order.length; i++) {
    if (order[i] !== dragId) others.push(order[i]);
  }
  if (index <= 0) {
    const first = layouts[others[0]];
    return first ? first.x : 0;
  }
  const prev = layouts[others[index - 1]];
  return prev ? prev.x + prev.w + 1.5 : 0;
}

function Segment({
  clip,
  index,
  count,
  order,
  thumb,
  selected,
  bad,
  disabled,
  share,
  layouts,
  draggingId,
  dragX,
  dropIndex,
  styles,
  theme,
  onSelect,
  onRemove,
  onDragStart,
  onDrop,
  onMove,
}: {
  clip: EditorClip;
  index: number;
  count: number;
  order: string[];
  thumb: string | null | undefined;
  selected: boolean;
  bad: boolean;
  disabled: boolean;
  share: number;
  layouts: SharedValue<Layouts>;
  draggingId: SharedValue<string>;
  dragX: SharedValue<number>;
  dropIndex: SharedValue<number>;
  styles: Styles;
  theme: Theme;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDragStart: () => void;
  onDrop: (id: string, index: number) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const id = clip.id;
  const length = formatVideoDuration(clipLengthMs(clip) / 1000);

  const gesture = useMemo(() => {
    const drag = Gesture.Pan()
      .enabled(!disabled && count > 1)
      .activateAfterLongPress(LONG_PRESS_MS)
      .onStart(() => {
        draggingId.value = id;
        dragX.value = 0;
        runOnJS(onDragStart)();
      })
      .onUpdate((e) => {
        dragX.value = e.translationX;
        const l = layouts.value[id];
        if (!l) return;
        dropIndex.value = dropIndexAt(
          layouts.value,
          order,
          id,
          l.x + l.w / 2 + e.translationX,
        );
      })
      .onEnd(() => {
        runOnJS(onDrop)(id, dropIndex.value);
      })
      .onFinalize(() => {
        draggingId.value = "";
        dragX.value = 0;
        dropIndex.value = -1;
      });
    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onEnd((_e, success) => {
        if (success) runOnJS(onSelect)(id);
      });
    return Gesture.Exclusive(drag, tap);
  }, [
    count,
    disabled,
    dragX,
    draggingId,
    dropIndex,
    id,
    layouts,
    onDragStart,
    onDrop,
    onSelect,
    order,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const active = draggingId.value === id;
    return {
      zIndex: active ? 10 : 1,
      opacity: active ? 0.85 : 1,
      transform: [
        { translateX: active ? dragX.value : 0 },
        { scale: withTiming(active ? 1.06 : 1, { duration: 120 }) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.segment, { flex: share }, animatedStyle]}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        layouts.value = { ...layouts.value, [id]: { x, w: width } };
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.segmentInner,
            bad ? styles.segmentBad : selected && styles.segmentOn,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("reelStripClipA11y", { n: index + 1, length })}
          accessibilityHint={count > 1 ? t("reelStripDragHint") : undefined}
          accessibilityState={{ selected, disabled }}
          accessibilityActions={[
            { name: "activate" },
            ...(index > 0
              ? [{ name: "moveEarlier", label: t("reelStripMoveEarlier") }]
              : []),
            ...(index < count - 1
              ? [{ name: "moveLater", label: t("reelStripMoveLater") }]
              : []),
          ]}
          onAccessibilityAction={(e) => {
            const action = e.nativeEvent.actionName;
            if (action === "activate") onSelect(id);
            else if (action === "moveEarlier") onMove(id, -1);
            else if (action === "moveLater") onMove(id, 1);
          }}
        >
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={styles.segmentImage}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.segmentShade} />
          <Text style={styles.segmentNumber}>{index + 1}</Text>
          <Text style={styles.segmentLength} numberOfLines={1}>
            {length}
          </Text>
        </View>
      </GestureDetector>
      {selected && count > 1 ? (
        <Pressable
          onPress={() => onRemove(id)}
          disabled={disabled}
          hitSlop={10}
          style={styles.segmentRemove}
          accessibilityRole="button"
          accessibilityLabel={t("reelStripRemoveA11y", { n: index + 1 })}
        >
          <MaterialIcons
            name="close"
            size={moderateWidthScale(16)}
            color={theme.red}
          />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default function ReelStrip({
  clips,
  thumbs,
  totalMs,
  minMs,
  maxMs,
  selectedId,
  canAdd,
  adding,
  disabled,
  onSelect,
  onAdd,
  onRemove,
  onReorder,
  onMove,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const layouts = useSharedValue<Layouts>({});
  const draggingId = useSharedValue("");
  const dragX = useSharedValue(0);
  const dropIndex = useSharedValue(-1);
  const order = useMemo(() => clips.map((c) => c.id), [clips]);

  const tooShort = minMs != null && totalMs < minMs - 50;
  const tooLong = totalMs > maxMs + 50;
  const bad = tooShort || tooLong;
  const minLabel = minMs != null ? formatVideoDuration(minMs / 1000) : null;
  const maxLabel = formatVideoDuration(maxMs / 1000);
  const statusText = tooShort
    ? t("reelStripShortTag")
    : tooLong
      ? t("reelStripLongTag")
      : minLabel
        ? t("reelStripFits", { min: minLabel, max: maxLabel })
        : t("reelStripFitsMax", { max: maxLabel });
  const errorText =
    tooShort && minMs != null
      ? t("reelStripTooShort", {
          missing: formatVideoDuration(Math.ceil((minMs - totalMs) / 1000)),
          min: minLabel,
        })
      : tooLong
        ? t("reelStripTooLong", {
            over: formatVideoDuration(Math.ceil((totalMs - maxMs) / 1000)),
            max: maxLabel,
          })
        : null;

  const onDragStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  const onDrop = useCallback(
    (id: string, index: number) => {
      if (index < 0) return;
      const rest = order.filter((x) => x !== id);
      const next = [...rest.slice(0, index), id, ...rest.slice(index)];
      if (next.join("|") !== order.join("|")) onReorder(next);
    },
    [onReorder, order],
  );

  const markerStyle = useAnimatedStyle(() => {
    const id = draggingId.value;
    const index = dropIndex.value;
    if (!id || index < 0) return { opacity: 0 };
    return { opacity: 1, left: dropMarkerX(layouts.value, order, id, index) };
  });

  const share = (clip: EditorClip) =>
    Math.max(clipLengthMs(clip), totalMs * MIN_SHARE);

  return (
    <View style={styles.wrap}>
      {/* All clips together and whether that fits */}
      <View style={styles.header}>
        <Text style={styles.totalLabel}>
          {t("reelStripTotalLabel")}{" "}
          <Text style={[styles.totalValue, bad && styles.totalBad]}>
            {formatVideoDuration(totalMs / 1000)}
          </Text>
        </Text>
        <View style={styles.status}>
          <MaterialIcons
            name={bad ? "error-outline" : "check-circle"}
            size={moderateWidthScale(16)}
            color={bad ? theme.red : theme.darkGreen}
          />
          <Text
            style={[styles.statusText, bad && styles.statusBad]}
            numberOfLines={2}
          >
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.strip}>
        <View style={styles.segments}>
          {clips.map((clip, index) => (
            <Segment
              key={clip.id}
              clip={clip}
              index={index}
              count={clips.length}
              order={order}
              thumb={thumbs[clip.id]}
              selected={clip.id === selectedId}
              bad={bad}
              disabled={disabled}
              share={share(clip)}
              layouts={layouts}
              draggingId={draggingId}
              dragX={dragX}
              dropIndex={dropIndex}
              styles={styles}
              theme={theme}
              onSelect={onSelect}
              onRemove={onRemove}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onMove={onMove}
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[styles.dropMarker, markerStyle]}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAdd}
          disabled={disabled || adding || !canAdd}
          style={[styles.add, (disabled || adding || !canAdd) && styles.addOff]}
          accessibilityRole="button"
          accessibilityLabel={t("addClip")}
          accessibilityState={{
            disabled: disabled || adding || !canAdd,
            busy: adding,
          }}
        >
          <MaterialIcons
            name={adding ? "hourglass-empty" : "add"}
            size={moderateWidthScale(26)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </View>

      {errorText ? (
        <View style={styles.error} accessibilityRole="alert">
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(18)}
            color={theme.red}
          />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : clips.length > 1 ? (
        <Text style={styles.hint}>{t("reelStripDragHint")}</Text>
      ) : null}
    </View>
  );
}
