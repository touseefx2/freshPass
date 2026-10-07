import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

/**
 * The song list as chips: tap to select, hold then drag left / right to
 * change the order songs play in (same gesture as the clips row).
 */
type Song = { id: string; title: string };

type Props = {
  songs: Song[];
  selectedId: string | null;
  canAdd: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (orderedIds: string[]) => void;
};

const CHIP_W = widthScale(132);
const CHIP_H = heightScale(34);
const GAP = moderateWidthScale(8);
const SLOT = CHIP_W + GAP;
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
    row: {
      flexGrow: 0,
      marginBottom: moderateHeightScale(8),
    },
    content: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(2),
    },
    lane: {
      height: CHIP_H,
    },
    chipWrap: {
      position: "absolute",
      left: 0,
      top: 0,
      width: CHIP_W,
      height: CHIP_H,
    },
    chip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: CHIP_H / 2,
      borderWidth: 1,
      borderColor: theme.white15,
      backgroundColor: theme.darkGreen,
    },
    chipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.orangeBrown,
    },
    num: {
      minWidth: widthScale(18),
      height: widthScale(18),
      borderRadius: widthScale(9),
      overflow: "hidden",
      textAlign: "center",
      lineHeight: widthScale(18),
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      backgroundColor: theme.white70,
    },
    numActive: { backgroundColor: theme.orangeBrown },
    text: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    textActive: { color: theme.white, fontFamily: fonts.fontBold },
    add: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      height: CHIP_H,
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: CHIP_H / 2,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.white50,
    },
    addText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

type ChipProps = {
  song: Song;
  index: number;
  count: number;
  active: boolean;
  positions: SharedValue<Positions>;
  draggingId: SharedValue<string>;
  disabled: boolean;
  styles: ReturnType<typeof createStyles>;
  onSelect: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: (orderedIds: string[]) => void;
};

function SongChip({
  song,
  index,
  count,
  active,
  positions,
  draggingId,
  disabled,
  styles,
  onSelect,
  onDragStart,
  onDragEnd,
}: ChipProps) {
  const { t } = useTranslation();
  const dragX = useSharedValue(0);
  const startPos = useSharedValue(index);
  const id = song.id;
  // Number shown = position in the play order (updates live while dragging)
  const [shownNumber, setShownNumber] = useState(index + 1);
  useLayoutEffect(() => setShownNumber(index + 1), [index]);

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
        if (success) runOnJS(onSelect)(id);
      });
    return Gesture.Exclusive(reorder, tap);
  }, [count, disabled, dragX, draggingId, id, index, onDragEnd, onDragStart, onSelect, positions, startPos]);

  const animatedStyle = useAnimatedStyle(() => {
    const dragging = draggingId.value === id;
    const slotX = (positions.value[id] ?? index) * SLOT;
    return {
      zIndex: dragging ? 10 : 1,
      transform: [
        {
          translateX: dragging
            ? dragX.value
            : withSpring(slotX, { damping: 22, stiffness: 260 }),
        },
        { scale: withTiming(dragging ? 1.06 : 1, { duration: 120 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.chipWrap, animatedStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${t("musicSongN", { index: shownNumber })}: ${song.title}`}
        accessibilityHint={count > 1 ? t("musicReorderHint") : undefined}
        accessibilityState={{ selected: active, disabled }}
      >
        <View style={[styles.chip, active && styles.chipActive]}>
          <Text style={[styles.num, active && styles.numActive]}>{shownNumber}</Text>
          <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
            {song.title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function MusicSongChips({
  songs,
  selectedId,
  canAdd,
  disabled,
  onSelect,
  onAdd,
  onReorder,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const idsKey = songs.map((s) => s.id).join("|");
  const positions = useSharedValue<Positions>(toPositions(songs.map((s) => s.id)));
  const draggingId = useSharedValue("");

  // Committed order (add / remove / undo) → chip slots.
  useLayoutEffect(() => {
    positions.value = toPositions(idsKey ? idsKey.split("|") : []);
  }, [idsKey, positions]);

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

  return (
    <ScrollView
      horizontal
      scrollEnabled={scrollEnabled}
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.lane, { width: songs.length * SLOT }]}>
        {songs.map((song, index) => (
          <SongChip
            key={song.id}
            song={song}
            index={index}
            count={songs.length}
            active={song.id === selectedId}
            positions={positions}
            draggingId={draggingId}
            disabled={disabled}
            styles={styles}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </View>
      {canAdd ? (
        <TouchableOpacity
          style={styles.add}
          onPress={onAdd}
          disabled={disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={moderateWidthScale(16)} color={theme.white} />
          <Text style={styles.addText}>{t("musicAddSong")}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}
