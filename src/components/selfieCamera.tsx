import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, type CameraType } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { handleCameraPermission } from "@/src/services/mediaPermissionService";
import Logger from "@/src/services/logger";

/**
 * Our own selfie camera (try-on, profile photos) on iOS + Android.
 * The system camera shows a mirrored preview but an un-mirrored
 * "Retake / Use Photo" screen, so selfies flip after the shutter. Here the
 * front camera saves mirrored (`mirror`), so preview, review and the final
 * photo all look the same. Work / product / video cameras stay on the
 * system picker.
 *
 * Usage: `const photo = await takeSelfie();` (null when closed).
 * <SelfieCameraHost /> is mounted once in app/_layout.tsx.
 */

export type SelfiePhoto = { uri: string; width: number; height: number };

type Listener = (open: boolean) => void;

// Shared state lives in this object and is only touched by the plain
// functions below, never inside the component: React Compiler (on in
// app.json) rewrote the read + clear of a module `let` inside a hook
// callback, so the waiting promise was never resolved.
const bridge: {
  listener: Listener | null;
  resolve: ((photo: SelfiePhoto | null) => void) | null;
} = { listener: null, resolve: null };

/** Resolves the waiting takeSelfie() call (once). */
function settle(photo: SelfiePhoto | null) {
  const resolve = bridge.resolve;
  bridge.resolve = null;
  resolve?.(photo);
}

function setListener(next: Listener | null, onlyIf?: Listener) {
  if (onlyIf && bridge.listener !== onlyIf) return;
  bridge.listener = next;
}

export async function takeSelfie(): Promise<SelfiePhoto | null> {
  if (!bridge.listener) {
    Logger.error("takeSelfie: SelfieCameraHost is not mounted");
    return null;
  }
  const allowed = await handleCameraPermission();
  if (!allowed) return null;
  // A second call while open closes the first one empty-handed.
  settle(null);
  return new Promise((resolve) => {
    bridge.resolve = resolve;
    bridge.listener?.(true);
  });
}

export function SelfieCameraHost() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const result = useRef<SelfiePhoto | null>(null);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Android back goes to the Modal (not BackHandler); the screen sets this.
  const onBack = useRef<(() => void) | null>(null);

  useEffect(() => {
    const show: Listener = (next) => {
      if (!next) return;
      result.current = null;
      setSession((n) => n + 1);
      setOpen(true);
    };
    setListener(show);
    return () => setListener(null, show);
  }, []);

  // Hand the photo back only once the camera is fully gone: on iOS a screen
  // opened next (crop editor) is dropped if it presents mid-dismiss.
  const deliver = useCallback(() => {
    if (fallback.current) clearTimeout(fallback.current);
    fallback.current = null;
    settle(result.current);
  }, []);

  const finish = useCallback(
    (photo: SelfiePhoto | null) => {
      result.current = photo;
      setOpen(false);
      if (Platform.OS === "ios") {
        // onDismiss normally fires; this is only a safety net.
        fallback.current = setTimeout(deliver, 800);
      } else {
        deliver();
      }
    },
    [deliver],
  );

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onDismiss={deliver}
      onRequestClose={() => (onBack.current ? onBack.current() : finish(null))}
    >
      {open ? (
        <SelfieCameraScreen key={session} onDone={finish} backRef={onBack} />
      ) : null}
    </Modal>
  );
}

type FlashSetting = "off" | "auto" | "on";

// Pinch → expo-camera `zoom` (0..1). iOS maps it exponentially and Android
// linearly to the lens max; ln(scale) * 0.3 feels about the same on both
// (≈1.8x for a 2x pinch). Capped near 5x: past that a selfie is just blur.
const ZOOM_PER_LN_SCALE = 0.3;
const MAX_ZOOM = 0.6;
const FLASH_ICON: Record<
  FlashSetting,
  "flash-off" | "flash-auto" | "flash-on"
> = { off: "flash-off", auto: "flash-auto", on: "flash-on" };
const FLASH_LABEL: Record<FlashSetting, string> = {
  off: "flashOff",
  auto: "flashAuto",
  on: "flashOn",
};
// Android front cameras have no flash and expo-camera has no screen flash
// there, so we light the face with a white screen ourselves (on/off only).
const SCREEN_FLASH_MS = 350;

function SelfieCameraScreen({
  onDone,
  backRef,
}: {
  onDone: (photo: SelfiePhoto | null) => void;
  backRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("front");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<SelfiePhoto | null>(null);
  const [flash, setFlash] = useState<FlashSetting>("off");
  const [flashHint, setFlashHint] = useState<FlashSetting | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [pinching, setPinching] = useState(false);
  const zoomAtStart = useRef(0);
  // Mirror of `zoom` so the pinch gesture is built once (rebuilding it on
  // every zoom step can drop the gesture mid-pinch).
  const zoomNow = useRef(0);
  const applyZoom = useCallback((value: number) => {
    zoomNow.current = value;
    setZoom(value);
  }, []);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useScreenFlash = Platform.OS === "android" && facing === "front";
  const shownFlash: FlashSetting =
    useScreenFlash && flash === "auto" ? "off" : flash;
  const nativeFlash: FlashSetting = useScreenFlash ? "off" : shownFlash;

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const cycleFlash = useCallback(() => {
    // Screen flash can't sense light, so "auto" isn't offered there.
    const flashCycle: FlashSetting[] = useScreenFlash
      ? ["off", "on"]
      : ["off", "auto", "on"];
    const next =
      flashCycle[(flashCycle.indexOf(shownFlash) + 1) % flashCycle.length];
    setFlash(next);
    setFlashHint(next);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setFlashHint(null), 1200);
  }, [useScreenFlash, shownFlash]);

  const capture = useCallback(async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    const lightFace = useScreenFlash && shownFlash === "on";
    try {
      if (lightFace) {
        setScreenFlash(true);
        // let the sensor adjust to the white light first
        await new Promise((r) => setTimeout(r, SCREEN_FLASH_MS));
      }
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (shot?.uri) {
        setPhoto({ uri: shot.uri, width: shot.width, height: shot.height });
      }
    } catch (e) {
      Logger.error("Selfie capture failed:", e);
    } finally {
      setScreenFlash(false);
      setBusy(false);
    }
  }, [ready, busy, useScreenFlash, shownFlash]);

  const flip = useCallback(() => {
    setReady(false);
    applyZoom(0);
    setFacing((f) => (f === "front" ? "back" : "front"));
  }, [applyZoom]);

  const close = useCallback(() => onDone(null), [onDone]);

  // Android back: leave the review, or close the camera.
  useEffect(() => {
    backRef.current = () => (photo ? setPhoto(null) : close());
    return () => {
      backRef.current = null;
    };
  }, [photo, close, backRef]);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
          zoomAtStart.current = zoomNow.current;
          setPinching(true);
        })
        .onUpdate((e) => {
          const next =
            zoomAtStart.current +
            Math.log(Math.max(e.scale, 0.01)) * ZOOM_PER_LN_SCALE;
          applyZoom(Math.min(MAX_ZOOM, Math.max(0, next)));
        })
        .onFinalize(() => setPinching(false)),
    [applyZoom],
  );

  const zoomed = zoom > 0.005;

  return (
    <GestureHandlerRootView style={styles.root}>
      {photo ? (
        <Image
          source={{ uri: photo.uri }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : (
        <GestureDetector gesture={pinch}>
          <View style={styles.preview} collapsable={false}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mirror
              mode="picture"
              flash={nativeFlash}
              zoom={zoom}
              onCameraReady={() => setReady(true)}
              onMountError={(e) => Logger.error("Selfie camera error:", e)}
            />

            {flashHint ? (
              <View style={styles.hintWrap} pointerEvents="none">
                <View style={styles.hintPill}>
                  <MaterialIcons
                    name={FLASH_ICON[flashHint]}
                    size={iconScale(16)}
                    color={flashHint === "off" ? theme.white : theme.goldenBuy}
                  />
                  <Text style={styles.hintText}>
                    {t(FLASH_LABEL[flashHint])}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.zoomArea} pointerEvents="box-none">
              {pinching ? (
                <View style={styles.zoomTrack} pointerEvents="none">
                  <View
                    style={[
                      styles.zoomFill,
                      { width: `${(zoom / MAX_ZOOM) * 100}%` },
                    ]}
                  />
                </View>
              ) : zoomed ? (
                <TouchableOpacity
                  style={styles.zoomReset}
                  onPress={() => applyZoom(0)}
                  activeOpacity={0.7}
                  accessibilityLabel={t("resetZoom")}
                  hitSlop={10}
                >
                  <Text style={styles.zoomResetText}>1×</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </GestureDetector>
      )}

      {!photo ? (
        <View
          style={[styles.topBar, { top: insets.top + moderateHeightScale(12) }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.roundButton}
            onPress={close}
            activeOpacity={0.7}
            accessibilityLabel={t("close")}
            hitSlop={12}
          >
            <MaterialIcons
              name="close"
              size={iconScale(26)}
              color={theme.white}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={cycleFlash}
            activeOpacity={0.7}
            accessibilityLabel={t(FLASH_LABEL[shownFlash])}
            hitSlop={12}
          >
            <MaterialIcons
              name={FLASH_ICON[shownFlash]}
              size={iconScale(24)}
              color={shownFlash === "off" ? theme.white : theme.goldenBuy}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + moderateHeightScale(20) },
        ]}
      >
        {photo ? (
          <>
            <TouchableOpacity
              style={styles.textButton}
              onPress={() => setPhoto(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.textButtonLabel}>{t("retake")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.textButton, styles.useButton]}
              onPress={() => onDone(photo)}
              activeOpacity={0.7}
            >
              <Text style={[styles.textButtonLabel, styles.useButtonLabel]}>
                {t("usePhoto")}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.sideSlot} />
            <TouchableOpacity
              style={[
                styles.shutter,
                (!ready || busy) && styles.shutterDisabled,
              ]}
              onPress={capture}
              activeOpacity={0.7}
              disabled={!ready || busy}
              accessibilityLabel={t("takePhoto")}
            >
              {busy ? (
                <ActivityIndicator color={theme.darkGreen} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sideSlot, styles.flipButton]}
              onPress={flip}
              activeOpacity={0.7}
              accessibilityLabel={t("switchCamera")}
              hitSlop={12}
            >
              <MaterialIcons
                name="flip-camera-ios"
                size={iconScale(28)}
                color={theme.white}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {screenFlash ? (
        <View style={styles.screenFlash} pointerEvents="none" />
      ) : null}
    </GestureHandlerRootView>
  );
}

const SHUTTER = moderateWidthScale(74);
const SIDE = moderateWidthScale(52);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.black,
    },
    preview: {
      flex: 1,
    },
    topBar: {
      position: "absolute",
      left: moderateWidthScale(16),
      right: moderateWidthScale(16),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    roundButton: {
      width: SIDE,
      height: SIDE,
      borderRadius: SIDE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    hintWrap: {
      position: "absolute",
      top: "18%",
      left: 0,
      right: 0,
      alignItems: "center",
    },
    hintPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(20),
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    hintText: {
      color: theme.white,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
    },
    zoomArea: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: moderateHeightScale(18),
      alignItems: "center",
    },
    zoomTrack: {
      width: moderateWidthScale(150),
      height: moderateHeightScale(4),
      borderRadius: moderateHeightScale(2),
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      overflow: "hidden",
    },
    zoomFill: {
      height: "100%",
      backgroundColor: theme.goldenBuy,
    },
    zoomReset: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    zoomResetText: {
      color: theme.goldenBuy,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
    screenFlash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.white,
    },
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(28),
      paddingTop: moderateHeightScale(20),
      backgroundColor: theme.black,
    },
    sideSlot: {
      width: SIDE,
      height: SIDE,
    },
    flipButton: {
      borderRadius: SIDE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
    },
    shutter: {
      width: SHUTTER,
      height: SHUTTER,
      borderRadius: SHUTTER / 2,
      borderWidth: moderateWidthScale(4),
      borderColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    shutterDisabled: {
      opacity: 0.5,
    },
    shutterInner: {
      width: SHUTTER - moderateWidthScale(16),
      height: SHUTTER - moderateWidthScale(16),
      borderRadius: (SHUTTER - moderateWidthScale(16)) / 2,
      backgroundColor: theme.white,
    },
    textButton: {
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      borderRadius: moderateWidthScale(24),
    },
    textButtonLabel: {
      color: theme.white,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
    },
    useButton: {
      backgroundColor: theme.white,
    },
    useButtonLabel: {
      color: theme.darkGreen,
    },
  });
