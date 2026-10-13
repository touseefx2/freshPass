import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import FlowButton from "@/src/components/reelFlow/flowButton";

/**
 * Move a slot's moment in the uploaded video. Photo slots take a still at
 * `at` (0…video length); video slots play `min_seconds` from `at`
 * (0…video length − min_seconds). Free — the AI isn't asked again.
 */

const STEP_SECONDS = 0.5;

export function formatMoment(seconds: number): string {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const tenths = Math.round((total % 1) * 10) % 10;
  return `${m}:${String(s).padStart(2, "0")}${tenths ? `.${tenths}` : ""}`;
}

type Props = {
  visible: boolean;
  videoUrl: string;
  label: string;
  /** Video slots: clip length played from the moment */
  clipSeconds: number | null;
  /** Video length from the server (falls back to the player's) */
  videoSeconds: number | null;
  initialAt: number | null;
  onCancel: () => void;
  onDone: (at: number) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.black },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(10),
    },
    close: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: "rgba(255, 255, 255, 0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    videoWrap: { flex: 1 },
    video: { flex: 1 },
    center: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    panel: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(18),
      gap: moderateHeightScale(12),
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    time: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    timeSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    roundBtn: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      borderWidth: 1.5,
      borderColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    roundBtnText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sliderLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: -moderateHeightScale(6),
    },
    sliderLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
  });

export default function MomentPickerModal(props: Props) {
  // Mount the player only while open
  return props.visible ? <MomentPicker {...props} /> : null;
}

function MomentPicker({
  visible,
  videoUrl,
  label,
  clipSeconds,
  videoSeconds,
  initialAt,
  onCancel,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 0.1;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const [duration, setDuration] = useState<number | null>(videoSeconds);
  useEffect(() => {
    if (status === "readyToPlay" && player.duration > 0 && !videoSeconds) {
      setDuration(player.duration);
    }
  }, [player, status, videoSeconds]);

  const max = Math.max(0, (duration ?? 0) - (clipSeconds ?? 0));
  const [at, setAt] = useState(() => Math.min(initialAt ?? 0, max || Infinity));
  const atRef = useRef(at);
  atRef.current = at;

  // Clamp once the real length is known
  useEffect(() => {
    if (duration == null) return;
    setAt((prev) => Math.min(Math.max(0, prev), max));
  }, [duration, max]);

  // Show the chosen frame
  useEffect(() => {
    if (status !== "readyToPlay") return;
    player.currentTime = atRef.current;
  }, [player, status]);

  // Video slots: preview stops at the end of the clip
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      const end = atRef.current + (clipSeconds ?? 0);
      if (clipSeconds && currentTime >= end) {
        player.pause();
        player.currentTime = atRef.current;
      }
    });
    return () => sub.remove();
  }, [clipSeconds, player]);

  const seek = (value: number) => {
    const next = Math.min(Math.max(0, value), max);
    setAt(next);
    player.pause();
    player.currentTime = next;
  };

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    player.currentTime = at;
    player.play();
  };

  const ready = status === "readyToPlay" && duration != null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      supportedOrientations={["portrait"]}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View
          style={[styles.header, { paddingTop: insets.top + moderateHeightScale(8) }]}
        >
          <TouchableOpacity
            style={styles.close}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            hitSlop={8}
          >
            <MaterialIcons
              name="close"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View style={styles.videoWrap}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
          {status === "loading" ? (
            <View style={styles.center} pointerEvents="none">
              <ActivityIndicator color={theme.white} />
            </View>
          ) : null}
        </View>
        <View
          style={[
            styles.panel,
            { paddingBottom: insets.bottom + moderateHeightScale(14) },
          ]}
        >
          <View style={styles.timeRow}>
            <View>
              <Text style={styles.time}>
                {clipSeconds
                  ? `${formatMoment(at)} – ${formatMoment(at + clipSeconds)}`
                  : formatMoment(at)}
              </Text>
              <Text style={styles.timeSub}>
                {clipSeconds
                  ? t("designMomentClipSub", { seconds: Math.round(clipSeconds) })
                  : t("designMomentPhotoSub")}
              </Text>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={() => seek(at - 1)}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityLabel={t("designMomentBack")}
              >
                <Text style={styles.roundBtnText}>−1s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={togglePlay}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? t("pause") : t("play")}
              >
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={() => seek(at + 1)}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityLabel={t("designMomentForward")}
              >
                <Text style={styles.roundBtnText}>+1s</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={Math.max(STEP_SECONDS, max)}
            step={STEP_SECONDS}
            value={at}
            onValueChange={seek}
            minimumTrackTintColor={theme.selectCard}
            maximumTrackTintColor={theme.lightGreen2}
            thumbTintColor={theme.selectCard}
            disabled={!ready || max <= 0}
            accessibilityLabel={t("designMomentSlider")}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0:00</Text>
            <Text style={styles.sliderLabel}>{formatMoment(max)}</Text>
          </View>
          <FlowButton
            label={t("designUseMoment")}
            icon="check"
            onPress={() => onDone(Math.round(at * 10) / 10)}
            disabled={!ready}
          />
        </View>
      </View>
    </Modal>
  );
}
