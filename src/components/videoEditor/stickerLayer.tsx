import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { STICKER_SIZE_RANGE, type EditorSticker } from "./editorModel";

export type StickerTransformPatch = {
  x: number;
  y: number;
  size: number;
  rotation: number;
};

type Frame = { left: number; top: number; width: number; height: number };

type Props = {
  stickers: EditorSticker[];
  selectedId: string | null;
  frame: Frame;
  /** Space taken by the bottom dock + keyboard (layer stops above it). */
  bottomInset: number;
  /** Sticker tool open → pinch/rotate anywhere on the frame, tap empty area to deselect. */
  editing: boolean;
  disabled: boolean;
  selectionColor: string;
  onSelect: (id: string | null) => void;
  onBeginTransform: () => void;
  onCommit: (id: string, patch: StickerTransformPatch) => void;
};

/** Centre may sit near — not past — the frame edge so a sticker can't be lost. */
const POS_MIN = 0.02;
const POS_MAX = 0.98;
const GESTURE_HIT_SLOP = 12;

type Shared = {
  activeId: SharedValue<string>;
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  sRot: SharedValue<number>;
  baseSize: SharedValue<number>;
  sScale: SharedValue<number>;
  sizeMin: SharedValue<number>;
  sizeMax: SharedValue<number>;
  ox: SharedValue<number>;
  oy: SharedValue<number>;
  oScale: SharedValue<number>;
  oRot: SharedValue<number>;
  activeCount: SharedValue<number>;
  frameW: SharedValue<number>;
  frameH: SharedValue<number>;
};

function boxFor(item: EditorSticker, frame: Frame) {
  if (item.kind === "emoji") {
    const fontPx = item.size * frame.height;
    const side = fontPx * 1.25;
    return { width: side, height: side, fontPx };
  }
  const width = item.size * frame.width;
  return { width, height: width / Math.max(0.01, item.aspect), fontPx: 0 };
}

function StickerItem({
  item,
  frame,
  selected,
  selectionColor,
  disabled,
  shared,
  onSelect,
  onBeginTransform,
  commit,
}: {
  item: EditorSticker;
  frame: Frame;
  selected: boolean;
  selectionColor: string;
  disabled: boolean;
  shared: Shared;
  onSelect: (id: string | null) => void;
  onBeginTransform: () => void;
  commit: (id: string, x: number, y: number, size: number, rotation: number) => void;
}) {
  const { t } = useTranslation();
  const box = boxFor(item, frame);
  const {
    activeId,
    sx,
    sy,
    sRot,
    baseSize,
    sScale,
    sizeMin,
    sizeMax,
    ox,
    oy,
    oScale,
    oRot,
    activeCount,
    frameW,
    frameH,
  } = shared;

  const gesture = useMemo(() => {
    const id = item.id;
    const { x, y, size, rotation } = item;
    const { min, max } = STICKER_SIZE_RANGE[item.kind];

    const claim = () => {
      "worklet";
      if (activeId.value !== id) {
        activeId.value = id;
        sx.value = x;
        sy.value = y;
        sRot.value = rotation;
        baseSize.value = size;
        sScale.value = 1;
        sizeMin.value = min;
        sizeMax.value = max;
      }
    };
    const startTransform = () => {
      "worklet";
      if (activeCount.value === 0) runOnJS(onBeginTransform)();
      activeCount.value += 1;
    };
    const endTransform = () => {
      "worklet";
      activeCount.value = Math.max(0, activeCount.value - 1);
      if (activeCount.value === 0) {
        runOnJS(commit)(
          activeId.value,
          sx.value,
          sy.value,
          baseSize.value * sScale.value,
          sRot.value,
        );
      }
    };

    const pan = Gesture.Pan()
      .enabled(!disabled)
      .minDistance(2)
      .hitSlop(GESTURE_HIT_SLOP)
      .onBegin(() => {
        claim();
        runOnJS(onSelect)(id);
      })
      .onStart(() => {
        ox.value = sx.value;
        oy.value = sy.value;
        startTransform();
      })
      .onUpdate((e) => {
        sx.value = Math.min(
          POS_MAX,
          Math.max(POS_MIN, ox.value + e.translationX / frameW.value),
        );
        sy.value = Math.min(
          POS_MAX,
          Math.max(POS_MIN, oy.value + e.translationY / frameH.value),
        );
      })
      .onEnd(() => endTransform());

    const pinch = Gesture.Pinch()
      .enabled(!disabled)
      .hitSlop(GESTURE_HIT_SLOP)
      .onBegin(() => claim())
      .onStart(() => {
        oScale.value = sScale.value;
        startTransform();
      })
      .onUpdate((e) => {
        const base = Math.max(0.0001, baseSize.value);
        sScale.value = Math.min(
          sizeMax.value / base,
          Math.max(sizeMin.value / base, oScale.value * e.scale),
        );
      })
      .onEnd(() => endTransform());

    const rotate = Gesture.Rotation()
      .enabled(!disabled)
      .hitSlop(GESTURE_HIT_SLOP)
      .onBegin(() => claim())
      .onStart(() => {
        oRot.value = sRot.value;
        startTransform();
      })
      .onUpdate((e) => {
        sRot.value = oRot.value + (e.rotation * 180) / Math.PI;
      })
      .onEnd(() => endTransform());

    return Gesture.Simultaneous(pan, pinch, rotate);
  }, [
    activeCount,
    activeId,
    baseSize,
    commit,
    disabled,
    frameH,
    frameW,
    item,
    onBeginTransform,
    onSelect,
    oRot,
    oScale,
    ox,
    oy,
    sRot,
    sScale,
    sizeMax,
    sizeMin,
    sx,
    sy,
  ]);

  const frameWidth = frame.width;
  const frameHeight = frame.height;
  const animatedStyle = useAnimatedStyle(() => {
    const active = activeId.value === item.id;
    const cx = active ? sx.value : item.x;
    const cy = active ? sy.value : item.y;
    const rot = active ? sRot.value : item.rotation;
    // Committed size is already baked into `box`; only the live delta scales.
    const mul = active ? (baseSize.value * sScale.value) / item.size : 1;
    return {
      transform: [
        { translateX: cx * frameWidth - box.width / 2 },
        { translateY: cy * frameHeight - box.height / 2 },
        { rotate: `${rot}deg` },
        { scale: mul },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.item,
          { width: box.width, height: box.height },
          animatedStyle,
        ]}
        accessible
        accessibilityRole="imagebutton"
        accessibilityLabel={item.kind === "emoji" ? item.emoji : t("stickerPhoto")}
        accessibilityState={{ selected }}
        onAccessibilityTap={() => onSelect(item.id)}
      >
        {item.kind === "emoji" ? (
          <Text
            allowFontScaling={false}
            style={[
              styles.emoji,
              { fontSize: box.fontPx, lineHeight: box.height },
            ]}
          >
            {item.emoji}
          </Text>
        ) : (
          <Image
            source={{ uri: item.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
          />
        )}
        {selected ? (
          <View
            pointerEvents="none"
            style={[styles.selection, { borderColor: selectionColor }]}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function StickerLayer({
  stickers,
  selectedId,
  frame,
  bottomInset,
  editing,
  disabled,
  selectionColor,
  onSelect,
  onBeginTransform,
  onCommit,
}: Props) {
  const shared: Shared = {
    activeId: useSharedValue(""),
    sx: useSharedValue(0.5),
    sy: useSharedValue(0.5),
    sRot: useSharedValue(0),
    baseSize: useSharedValue(0.1),
    sScale: useSharedValue(1),
    sizeMin: useSharedValue(0.01),
    sizeMax: useSharedValue(1),
    ox: useSharedValue(0),
    oy: useSharedValue(0),
    oScale: useSharedValue(1),
    oRot: useSharedValue(0),
    activeCount: useSharedValue(0),
    frameW: useSharedValue(Math.max(1, frame.width)),
    frameH: useSharedValue(Math.max(1, frame.height)),
  };
  // Shared values are stable refs — memo the bag so gestures don't rebuild every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableShared = useMemo(() => shared, []);

  useEffect(() => {
    stableShared.frameW.value = Math.max(1, frame.width);
    stableShared.frameH.value = Math.max(1, frame.height);
  }, [frame.height, frame.width, stableShared]);

  const selected = stickers.find((s) => s.id === selectedId) ?? null;

  // Mirror the committed state of the selected sticker into the gesture
  // values (selection change, panel slider, undo).
  useLayoutEffect(() => {
    if (!selected) {
      stableShared.activeId.value = "";
      return;
    }
    // A live gesture owns these values; it commits (and re-syncs) when it ends.
    if (stableShared.activeCount.value > 0) return;
    stableShared.activeId.value = selected.id;
    stableShared.sx.value = selected.x;
    stableShared.sy.value = selected.y;
    stableShared.sRot.value = selected.rotation;
    stableShared.baseSize.value = selected.size;
    stableShared.sScale.value = 1;
    stableShared.sizeMin.value = STICKER_SIZE_RANGE[selected.kind].min;
    stableShared.sizeMax.value = STICKER_SIZE_RANGE[selected.kind].max;
  }, [selected, stableShared]);

  const commit = useMemo(
    () => (id: string, x: number, y: number, size: number, rotation: number) => {
      if (!id) return;
      onCommit(id, { x, y, size, rotation });
    },
    [onCommit],
  );

  const catcherGesture = useMemo(() => {
    const {
      activeId,
      sRot,
      baseSize,
      sScale,
      sizeMin,
      sizeMax,
      oScale,
      oRot,
      activeCount,
      sx,
      sy,
    } = stableShared;
    const startTransform = () => {
      "worklet";
      if (activeCount.value === 0) runOnJS(onBeginTransform)();
      activeCount.value += 1;
    };
    const endTransform = () => {
      "worklet";
      activeCount.value = Math.max(0, activeCount.value - 1);
      if (activeCount.value === 0 && activeId.value) {
        runOnJS(commit)(
          activeId.value,
          sx.value,
          sy.value,
          baseSize.value * sScale.value,
          sRot.value,
        );
      }
    };
    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onEnd((_e, success) => {
        if (success) runOnJS(onSelect)(null);
      });
    const pinch = Gesture.Pinch()
      .enabled(!disabled)
      .onStart(() => {
        oScale.value = sScale.value;
        startTransform();
      })
      .onUpdate((e) => {
        const base = Math.max(0.0001, baseSize.value);
        sScale.value = Math.min(
          sizeMax.value / base,
          Math.max(sizeMin.value / base, oScale.value * e.scale),
        );
      })
      .onEnd(() => endTransform());
    const rotate = Gesture.Rotation()
      .enabled(!disabled)
      .onStart(() => {
        oRot.value = sRot.value;
        startTransform();
      })
      .onUpdate((e) => {
        sRot.value = oRot.value + (e.rotation * 180) / Math.PI;
      })
      .onEnd(() => endTransform());
    return Gesture.Race(tap, Gesture.Simultaneous(pinch, rotate));
  }, [commit, disabled, onBeginTransform, onSelect, stableShared]);

  if (stickers.length === 0 || frame.width <= 0 || frame.height <= 0) {
    return null;
  }

  return (
    <View
      style={[styles.layer, { bottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.frame,
          {
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
          },
        ]}
        pointerEvents="box-none"
      >
        {editing && selected && !disabled ? (
          <GestureDetector gesture={catcherGesture}>
            <View style={StyleSheet.absoluteFill} />
          </GestureDetector>
        ) : null}
        {stickers.map((item) => (
          <StickerItem
            key={item.id}
            item={item}
            frame={frame}
            selected={item.id === selectedId}
            selectionColor={selectionColor}
            disabled={disabled}
            shared={stableShared}
            onSelect={onSelect}
            onBeginTransform={onBeginTransform}
            commit={commit}
          />
        ))}
      </View>
    </View>
  );
}

export default React.memo(StickerLayer);

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  frame: {
    position: "absolute",
    overflow: "hidden",
  },
  item: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  selection: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: moderateWidthScale(6),
  },
});
