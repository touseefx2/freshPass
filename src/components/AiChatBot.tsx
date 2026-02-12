import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Dimensions,
  Easing,
  Alert,
  PermissionsAndroid,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  widthScale,
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments } from "expo-router";
import { Audio } from "expo-av";
import { File, Directory, Paths } from "expo-file-system";
import {
  SendIcon,
  CloseIcon,
  AiRobotIcon,
  AiReceptionistIcon,
} from "@/assets/icons";
import {
  toggleChat,
  openChat,
  closeChat,
  clearMessages,
  setSessionId,
  sendUserMessage,
  startAiStreamResponse,
  appendTokenToLastMessage,
  completeAiStreamResponse,
  streamError,
  ChatMessage,
} from "@/src/state/slices/chatSlice";
import { checkInternetConnection } from "../services/api";
import { AiToolsService } from "../services/aiToolsService";
import AudioRecord from "react-native-audio-record";
import { Buffer } from "buffer";

const VOICE_AGENT_WS_URL = process.env.EXPO_PUBLIC_WEBHOOK_URL || "";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CHAT_BOX_WIDTH = SCREEN_WIDTH * 0.85;
const CHAT_BOX_HEIGHT = SCREEN_HEIGHT * 0.6;

const CHAT_BOTTOM_OFFSET = 70;
const CHAT_BOTTOM_OFFSET_TRYON = 115; // when isFirstShowTryOn is true

const createStyles = (
  theme: Theme,
  bottomInset: number,
  chatBottomOffset: number = CHAT_BOTTOM_OFFSET,
) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      zIndex: 998,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    floatingButton: {
      position: "absolute",
      bottom: moderateHeightScale(chatBottomOffset) + bottomInset,
      right: moderateWidthScale(16),
      width: widthScale(45),
      height: widthScale(45),
      borderRadius: widthScale(45 / 2),
      backgroundColor: theme.darkGreen,
      borderWidth: 0.5,
      borderColor: theme.white85,
    },
    buttonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: widthScale(27),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    shadowLight: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    aiIconContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    menuOptionsContainer: {
      position: "absolute",
      bottom:
        moderateHeightScale(chatBottomOffset) +
        bottomInset +
        widthScale(45) +
        moderateHeightScale(12),
      right: moderateWidthScale(16),
      alignItems: "flex-end",
      gap: moderateHeightScale(10),
      zIndex: 1000,
    },
    menuOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderTopColor: theme.white85,
      borderLeftColor: theme.white85,
      borderRightColor: theme.shadow,
      borderBottomColor: theme.shadow,
      minWidth: widthScale(140),
      // 3D raised effect – stronger shadow
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(4),
      },
      shadowOpacity: 0.38,
      shadowRadius: moderateWidthScale(6),
      elevation: 8,
    },
    menuOptionIcon: {
      width: widthScale(24),
      height: widthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    menuOptionLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    chatBoxContainer: {
      position: "absolute",
      bottom: moderateHeightScale(chatBottomOffset) + bottomInset,
      right: moderateWidthScale(5),
      width: CHAT_BOX_WIDTH,
      height: CHAT_BOX_HEIGHT,
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(20),
      overflow: "hidden",
      zIndex: 999,
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.darkGreen,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    aiAvatarHeader: {
      width: widthScale(25),
      height: widthScale(25),
      borderRadius: widthScale(25 / 2),
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    headerRightButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    headerButton: {
      width: widthScale(32),
      height: widthScale(32),
      alignItems: "center",
      justifyContent: "center",
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(14),
    },
    messagesContent: {
      paddingVertical: moderateHeightScale(16),
    },
    messageBubble: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(16),
      marginBottom: moderateHeightScale(8),
    },
    userMessage: {
      alignSelf: "flex-end",
      maxWidth: "85%",
      backgroundColor: theme.buttonBack,
      borderBottomRightRadius: moderateWidthScale(4),
    },
    userMessageText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(20),
    },
    aiMessageText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(20),
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateWidthScale(10),
      backgroundColor: theme.background,
    },
    textInputWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      maxHeight: heightScale(100),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    textInput: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      maxHeight: heightScale(80),
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    clearButton: {
      marginLeft: moderateWidthScale(8),
      padding: moderateWidthScale(4),
    },
    sendButton: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(32 / 2),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    inputContainerDisabled: {
      opacity: 0.7,
    },
    inputWrapperDisabled: {
      backgroundColor: theme.borderLight,
    },
    textInputDisabled: {
      color: theme.lightGreen,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      gap: moderateHeightScale(12),
    },
    emptyTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
    },
    typingIndicator: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      borderBottomLeftRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(10),
    },
    typingIconContainer: {
      width: widthScale(20),
      height: widthScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    typingDotsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    typingDot: {
      width: widthScale(8),
      height: widthScale(8),
      borderRadius: widthScale(4),
      backgroundColor: theme.darkGreen,
    },
    aiMessageContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      maxWidth: "85%",
    },
    aiMessageIconContainer: {
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(2),
    },
    aiMessageBubble: {
      flex: 1,
      borderRadius: moderateWidthScale(16),
      borderBottomLeftRadius: moderateWidthScale(4),
      backgroundColor: theme.lightGreen1,
    },
    inlineTypingContainer: {
      paddingVertical: moderateHeightScale(4),
    },
    inlineTypingDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    inlineTypingDot: {
      width: widthScale(8),
      height: widthScale(8),
      borderRadius: widthScale(4),
      backgroundColor: theme.darkGreen,
    },
    receptionistContainer: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "space-between",
    },
    receptionistCenter: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
    },
    receptionistMicOuter: {
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: widthScale(60),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen1,
    },
    receptionistMicInner: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    receptionistStatusText: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    receptionistTimerText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    receptionistErrorText: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      textAlign: "center",
    },
    receptionistControls: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: moderateHeightScale(24),
    },
    receptionistControlButton: {
      minWidth: widthScale(140),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(24),
      backgroundColor: theme.darkGreen,
    },
    receptionistControlButtonSecondary: {
      backgroundColor: theme.lightGreen1,
    },
    receptionistControlLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    receptionistTranscriptContainer: {
      width: "100%",
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(12),
    },
    receptionistTranscriptTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    receptionistTranscriptMessage: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
  });

const TypingIndicator: React.FC<{ theme: Theme; bottomInset: number }> = ({
  theme,
  bottomInset,
}) => {
  const styles = useMemo(
    () => createStyles(theme, bottomInset),
    [theme, bottomInset],
  );
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate typing dots with smooth wave effect
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot1Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot2Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot3Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
        ]),
      ).start();
    };

    // Animate icon pulse
    const animateIcon = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(iconPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
      ).start();
    };

    animateDots();
    animateIcon();
  }, [dot1Anim, dot2Anim, dot3Anim, iconPulseAnim]);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View
        style={[
          styles.typingIconContainer,
          { transform: [{ scale: iconPulseAnim }] },
        ]}
      >
        <AiRobotIcon width={18} height={18} color={theme.darkGreen} />
      </Animated.View>
      <View style={styles.typingDotsContainer}>
        <Animated.View
          style={[
            styles.typingDot,
            {
              opacity: dot1Anim,
              transform: [{ scale: dot1Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            {
              opacity: dot2Anim,
              transform: [{ scale: dot2Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            {
              opacity: dot3Anim,
              transform: [{ scale: dot3Anim }],
            },
          ]}
        />
      </View>
    </View>
  );
};

// Inline typing indicator for empty streaming messages
const InlineTypingIndicator: React.FC<{ theme: Theme }> = ({ theme }) => {
  const styles = useMemo(() => createStyles(theme, 0), [theme]);
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Animate typing dots with smooth wave effect
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot1Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot2Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot3Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
        ]),
      ).start();
    };

    animateDots();
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.inlineTypingContainer}>
      <View style={styles.inlineTypingDots}>
        <Animated.View
          style={[
            styles.inlineTypingDot,
            {
              opacity: dot1Anim,
              transform: [{ scale: dot1Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            {
              opacity: dot2Anim,
              transform: [{ scale: dot2Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            {
              opacity: dot3Anim,
              transform: [{ scale: dot3Anim }],
            },
          ]}
        />
      </View>
    </View>
  );
};

type VoiceConversationMessage = {
  role: string;
  content: string;
  timestamp: number;
};
type VoiceReceptionistProps = {
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  statusLabel: string;
  websocketUrl: string;
};

const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const VoiceReceptionistContent: React.FC<VoiceReceptionistProps> = ({
  theme,
  styles,
  statusLabel,
  websocketUrl,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<VoiceConversationMessage[]>(
    [],
  );

  const wsRef = useRef<WebSocket | null>(null);
  const recorderInitializedRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const pendingPcmChunksRef = useRef<Int16Array[]>([]);
  const pendingSamplesRef = useRef(0);
  const FLUSH_SAMPLE_THRESHOLD = 16000 * 8; // ~8 seconds of audio per segment

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isListening) {
      intervalId = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isListening]);

  const cleanup = useCallback(() => {
    setIsListening(false);
    setIsConnected(false);
    setIsStarting(false);
    try {
      AudioRecord.stop();
    } catch {
      // ignore
    }
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
    } catch {
      // ignore
    }
    wsRef.current = null;
    pendingPcmChunksRef.current = [];
    pendingSamplesRef.current = 0;
    try {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    } catch {
      // ignore
    }
    soundRef.current = null;
    audioQueueRef.current = [];
  }, []);

  useEffect(
    () => () => {
      cleanup();
    },
    [cleanup],
  );

  useEffect(() => {
    // Ensure audio can play even in silent mode on iOS
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // ignore audio mode errors
    });
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    const nextUri = audioQueueRef.current.shift();
    if (!nextUri) return;

    try {
      isPlayingRef.current = true;
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextUri },
        { shouldPlay: true },
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) {
          return;
        }
        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch {
            // ignore
          }
          soundRef.current = null;
          isPlayingRef.current = false;

          // Clean up the file
          try {
            const file = new File(nextUri);
            file.delete();
          } catch {
            // ignore
          }

          // Play next chunk if queued
          playNextInQueue().catch(() => {
            // ignore
          });
        }
      });
    } catch {
      isPlayingRef.current = false;
      try {
        const file = new File(nextUri);
        file.delete();
      } catch {
        // ignore
      }
    }
  }, []);

  const flushPendingAudio = useCallback(async () => {
    const totalSamples = pendingSamplesRef.current;
    if (!totalSamples || pendingPcmChunksRef.current.length === 0) {
      return;
    }

    try {
      const merged = new Int16Array(totalSamples);
      let offset = 0;
      for (const chunk of pendingPcmChunksRef.current) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // reset buffers
      pendingPcmChunksRef.current = [];
      pendingSamplesRef.current = 0;

      const wavHeaderSize = 44;
      const dataLength = merged.length * 2;
      const totalSize = wavHeaderSize + dataLength;

      const wavBuffer = new ArrayBuffer(totalSize);
      const view = new DataView(wavBuffer);
      const u8 = new Uint8Array(wavBuffer);

      // RIFF header
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + dataLength, true); // chunkSize
      view.setUint32(8, 0x57415645, false); // "WAVE"

      // fmt subchunk
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
      view.setUint16(22, 1, true); // NumChannels (mono)
      view.setUint32(24, 16000, true); // SampleRate
      const byteRate = 16000 * 1 * 2;
      view.setUint32(28, byteRate, true); // ByteRate
      const blockAlign = 1 * 2;
      view.setUint16(32, blockAlign, true); // BlockAlign
      view.setUint16(34, 16, true); // BitsPerSample

      // data subchunk
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, dataLength, true); // Subchunk2Size

      // PCM data
      const pcmBytes = new Uint8Array(merged.buffer);
      u8.set(pcmBytes, wavHeaderSize);

      const base64 = Buffer.from(wavBuffer).toString("base64");
      const cacheDir = new Directory(Paths.cache, "voice-agent");
      try {
        cacheDir.create({ intermediates: true, idempotent: true });
      } catch {
        // ignore
      }

      const fileName = `voice-agent-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.wav`;
      const file = cacheDir.createFile(fileName, "audio/wav");
      file.write(base64, { encoding: "base64" as any });

      audioQueueRef.current.push(file.uri);
      playNextInQueue().catch(() => {
        // ignore
      });
    } catch (err) {
      console.error("Failed to flush voice agent audio buffer", err);
      pendingPcmChunksRef.current = [];
      pendingSamplesRef.current = 0;
    }
  }, [playNextInQueue]);

  const enqueuePcmChunk = useCallback(
    (buffer: ArrayBuffer) => {
      try {
        const pcm = new Int16Array(buffer);
        if (!pcm.length) {
          return;
        }
        pendingPcmChunksRef.current.push(pcm);
        pendingSamplesRef.current += pcm.length;

        // If we have accumulated enough samples (~8s), flush a segment
        if (pendingSamplesRef.current >= FLUSH_SAMPLE_THRESHOLD) {
          flushPendingAudio().catch(() => {
            // ignore
          });
        }
      } catch (err) {
        console.error("Failed to buffer voice agent audio chunk", err);
      }
    },
    [flushPendingAudio],
  );

  const handleServerMessage = useCallback(
    (event: any) => {
      const { data } = event;
      if (typeof data === "string") {
        // Try to parse JSON text message first
        const trimmed = data.trim();
        let parsed: any | null = null;
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            parsed = null;
          }
        }

        if (parsed && typeof parsed === "object" && parsed.type) {
          switch (parsed.type) {
            case "ConversationText":
              if (parsed.content) {
                const role =
                  typeof parsed.role === "string" ? parsed.role : "assistant";
                setConversation((prev) => [
                  ...prev,
                  {
                    role,
                    content: String(parsed.content),
                    timestamp: Date.now(),
                  },
                ]);
              }
              break;
            case "AgentAudioDone":
              // Flush whatever audio we've buffered for this utterance
              flushPendingAudio().catch(() => {
                // ignore
              });
              break;
            case "UserStartedSpeaking":
            case "FunctionCallRequest":
            case "FunctionCallResponse":
              // Not used in UI yet, but could be logged
              break;
            default:
              break;
          }
          return;
        }

        // Otherwise, likely non-JSON text – try to treat as base64-encoded PCM audio
        try {
          const buf = Buffer.from(trimmed, "base64");
          if (buf.byteLength > 0) {
            const arr = buf.buffer.slice(
              buf.byteOffset,
              buf.byteOffset + buf.byteLength,
            );
            enqueuePcmChunk(arr);
          }
        } catch (err) {
          // If it's not valid base64 audio, ignore silently
          console.error("Failed to decode voice agent audio string", err);
        }
      } else if (data instanceof ArrayBuffer) {
        // Binary audio data from the voice agent – enqueue for playback
        enqueuePcmChunk(data);
      }
    },
    [enqueuePcmChunk, flushPendingAudio],
  );

  const connectWebSocket = useCallback(async () => {
    if (!websocketUrl) {
      setError("Voice agent URL is not configured.");
      throw new Error("Voice agent URL is not configured.");
    }

    if (wsRef.current && isConnected) {
      return;
    }

    setError(null);

    await new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          resolve();
        };

        ws.onerror = (event: any) => {
          console.error("Voice agent WebSocket error", event);
          setError("Unable to connect to voice agent.");
          reject(event);
        };

        ws.onclose = (event: any) => {
          console.log(
            "Voice agent WebSocket closed",
            event.code,
            event.reason,
          );
          if (event.code === 1008) {
            setError("Voice agent authentication failed.");
          } else if (event.code === 1006) {
            setError(
              "Voice agent connection closed unexpectedly. Please try again.",
            );
          }
          cleanup();
        };

        ws.onmessage = handleServerMessage;
      } catch (err) {
        console.error("Failed to open voice agent WebSocket", err);
        setError("Failed to open voice agent connection.");
        reject(err);
      }
    });
  }, [cleanup, handleServerMessage, isConnected, websocketUrl]);

  const startRecorder = useCallback(async () => {
    try {
      // Android runtime permission check
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message:
              "Fresh Pass needs access to your microphone so the AI Receptionist can talk with you.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError(
            "Microphone permission was denied. Please enable it in Settings to use the AI Receptionist.",
          );
          return;
        }
      }

      if (!recorderInitializedRef.current) {
        AudioRecord.init({
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6,
          wavFile: "freshpass_voice_agent.wav",
        });
        AudioRecord.on("data", (data: string) => {
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            return;
          }
          try {
            const chunk = Buffer.from(data, "base64");
            ws.send(chunk);
          } catch (err) {
            console.error("Failed to send audio chunk to voice agent", err);
          }
        });
        recorderInitializedRef.current = true;
      }

      setIsListening(true);
      setElapsedSeconds(0);
      setError(null);

      AudioRecord.start();
    } catch (err) {
      console.error("Failed to start microphone recording", err);
      setError(
        "Unable to access the microphone. Please check app microphone permissions in your device settings.",
      );
      cleanup();
    }
  }, [cleanup]);

  const handleStart = useCallback(async () => {
    if (isStarting || isListening) {
      return;
    }

    setIsStarting(true);
    try {
      await connectWebSocket();
      await startRecorder();
    } catch {
      // Errors already handled and shown via setError
    } finally {
      setIsStarting(false);
    }
  }, [connectWebSocket, isListening, isStarting, startRecorder]);

  const handleStop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const statusText = (() => {
    if (isStarting) return "Connecting...";
    if (isListening) return "Listening...";
    if (isConnected) return "Tap the button to speak";
    return "Tap the button to start";
  })();

  const timerText =
    isListening || elapsedSeconds > 0
      ? formatElapsedTime(elapsedSeconds)
      : "00:00";

  const latestMessages = conversation.slice(-3);

  const handlePrimaryPress = () => {
    if (isListening) {
      handleStop();
    } else {
      handleStart();
    }
  };

  return (
    <View style={styles.receptionistContainer}>
      <View style={styles.receptionistCenter}>
        <View style={styles.receptionistMicOuter}>
          <View style={styles.receptionistMicInner}>
            <AiReceptionistIcon width={36} height={36} />
          </View>
        </View>
        <Text style={styles.receptionistStatusText}>{statusLabel}</Text>
        <Text style={styles.receptionistTimerText}>{statusText}</Text>
        <Text style={styles.receptionistTimerText}>{timerText}</Text>
        {error ? (
          <Text style={styles.receptionistErrorText}>{error}</Text>
        ) : null}
      </View>

      {latestMessages.length > 0 && (
        <View style={styles.receptionistTranscriptContainer}>
          <Text style={styles.receptionistTranscriptTitle}>
            Recent conversation
          </Text>
          {latestMessages.map((msg) => (
            <Text
              key={msg.timestamp.toString()}
              style={styles.receptionistTranscriptMessage}
            >
              {`${msg.role}: ${msg.content}`}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.receptionistControls}>
        <TouchableOpacity
          style={[
            styles.receptionistControlButton,
            !isListening && styles.receptionistControlButtonSecondary,
          ]}
          onPress={handlePrimaryPress}
          disabled={isStarting}
          activeOpacity={0.9}
        >
          <Text style={styles.receptionistControlLabel}>
            {isListening ? "End conversation" : "Start conversation"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AiChatBot: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const segments = useSegments() as string[];
  const isOnExploreScreen =
    Array.isArray(segments) && segments.includes("(explore)");
  const isFirstTryon = useAppSelector(
    (state) => state.general.isFirstShowTryOn,
  );
  const { userRole, isGuest } = useAppSelector((state) => state.user);
  const chatBottomOffset =
    isFirstTryon && isOnExploreScreen
      ? CHAT_BOTTOM_OFFSET_TRYON
      : CHAT_BOTTOM_OFFSET;
  const styles = useMemo(
    () => createStyles(theme, bottomInset, chatBottomOffset),
    [theme, bottomInset, chatBottomOffset],
  );

  const { isOpen, messages, isLoading, isStreaming, sessionId } =
    useAppSelector((state) => state.chat);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const canShowMenu = userRole === "customer" || isGuest;
  const [chatMode, setChatMode] = useState<"ai_chat_bot" | "ai_receptionist">(
    "ai_chat_bot",
  );

  // Check if input should be disabled (loading or streaming)
  const isInputDisabled = isLoading || isStreaming;

  // Animation refs - only spin in place (no bounce, no scale)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const chatBoxAnim = useRef(new Animated.Value(0)).current;

  // Continuous 360° spin in place when menu is not expanded
  useEffect(() => {
    if (menuExpanded) {
      rotateAnim.setValue(0);
      return;
    }
    const spinAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [rotateAnim, menuExpanded]);

  // Animate chat box open/close
  useEffect(() => {
    Animated.spring(chatBoxAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOpen, chatBoxAnim]);

  const handleFloatingButtonPress = useCallback(() => {
    if (menuExpanded) return;

    // Only show menu for customer or guest users
    if (canShowMenu) {
      setMenuExpanded(true);
    } else {
      // For other roles, open AI chat bot directly
      setChatMode("ai_chat_bot");
      dispatch(openChat());
    }
  }, [menuExpanded, canShowMenu, dispatch]);

  const handleCloseMenu = useCallback(() => {
    setMenuExpanded(false);
  }, []);

  const handleSelectOption = useCallback(
    (mode: "ai_chat_bot" | "ai_receptionist") => {
      setChatMode(mode);
      dispatch(openChat());
      setMenuExpanded(false);
    },
    [dispatch],
  );

  const handleCloseChat = useCallback(() => {
    Keyboard.dismiss();
    dispatch(closeChat());
  }, [dispatch]);

  const handleDeleteChat = useCallback(() => {
    Alert.alert(t("clearChat"), t("clearChatConfirm"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("clear"),
        style: "destructive",
        onPress: () => {
          dispatch(clearMessages());
          dispatch(setSessionId("0"));
        },
      },
    ]);
  }, [dispatch]);

  const handleSendMessage = async () => {
    if (inputText.trim().length === 0 || isInputDisabled) return;

    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      Alert.alert(
        t("noInternetConnection"),
        t("pleaseCheckInternetConnection"),
      );
      return;
    }

    const messageText = inputText.trim();
    setInputText("");

    // Add user message
    dispatch(sendUserMessage(messageText));

    // Start streaming response
    dispatch(startAiStreamResponse());

    // Call API with streaming
    await AiToolsService.streamChat(
      sessionId,
      messageText,
      null, // business_id is optional
      // onToken callback - append each token to the message
      (token: string) => {
        dispatch(appendTokenToLastMessage(token));
      },
      // onComplete callback - finalize the message
      (fullResponse: string, newSessionId: string) => {
        dispatch(
          completeAiStreamResponse({ fullResponse, sessionId: newSessionId }),
        );
      },
      // onError callback - handle errors
      (error: Error) => {
        dispatch(streamError());
        Alert.alert(t("error"), error.message || t("failedToGetAiResponse"));
      },
    );
  };

  // Scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading, isStreaming]);

  // Also scroll when the last message text changes (for streaming)
  const lastMessageText =
    messages.length > 0 ? messages[messages.length - 1].text : "";
  useEffect(() => {
    if (isStreaming && flatListRef.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [lastMessageText, isStreaming]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === "user";

      if (isUser) {
        // User message - no icon needed
        return (
          <View style={[styles.messageBubble, styles.userMessage]}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
        );
      }

      // AI message - with icon on left
      const isEmptyAndStreaming = !item.text && item.isStreaming;

      return (
        <View style={styles.aiMessageContainer}>
          <View style={styles.aiMessageIconContainer}>
            <AiRobotIcon width={16} height={16} color={theme.darkGreen} />
          </View>
          <View style={[styles.aiMessageBubble, styles.messageBubble]}>
            {isEmptyAndStreaming ? (
              <InlineTypingIndicator theme={theme} />
            ) : (
              <Text style={styles.aiMessageText}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    },
    [styles, theme],
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const renderEmptyState = () => {
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.emptyContainer}>
          <AiRobotIcon width={50} height={50} color={theme.darkGreen} />
          <Text style={styles.emptyTitle}>AI Assistant</Text>
          <Text style={styles.emptySubtitle}>
            Ask me anything! I'm here to help you with questions, information,
            and assistance.
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const chatBoxAnimStyle = {
    opacity: chatBoxAnim,
    transform: [
      {
        scale: chatBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        translateY: chatBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
    ],
  };

  return (
    <>
      {/* Overlay when chat is open - clicking anywhere closes the chat */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={handleCloseChat}>
          <View style={styles.container}>
            <View style={styles.overlay} />
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Chat Box - positioned above the button */}
      {isOpen && (
        <Animated.View
          style={[styles.chatBoxContainer, chatBoxAnimStyle, styles.shadow]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={
              Platform.OS === "ios" ? moderateHeightScale(100) : 0
            }
          >
            {/* Header with AI Assistant title and action buttons */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.aiAvatarHeader}>
                  {chatMode === "ai_chat_bot" ? (
                    <AiRobotIcon width={24} height={24} color={theme.white} />
                  ) : (
                    <AiReceptionistIcon width={24} height={24} />
                  )}
                </View>
                <Text style={styles.headerTitle}>
                  {chatMode === "ai_chat_bot"
                    ? t("aiChatBot")
                    : t("aiReceptionist")}
                </Text>
              </View>
              <View style={styles.headerRightButtons}>
                {/* Delete button - clears all messages (only show when messages exist) */}
                {chatMode === "ai_chat_bot" && messages.length > 0 && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleDeleteChat}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: widthScale(18),
                        height: widthScale(18),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* Trash can icon */}
                      <View
                        style={{
                          width: widthScale(14),
                          height: widthScale(12),
                          borderWidth: 1.5,
                          borderColor: theme.white,
                          borderRadius: moderateWidthScale(1),
                          borderTopWidth: 0,
                          position: "relative",
                        }}
                      >
                        {/* Trash lid */}
                        <View
                          style={{
                            width: widthScale(16),
                            height: widthScale(2),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(-2),
                            left: moderateWidthScale(-1),
                          }}
                        />
                        {/* Trash handle */}
                        <View
                          style={{
                            width: widthScale(4),
                            height: widthScale(2),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(-4),
                            left: moderateWidthScale(5),
                          }}
                        />
                        {/* Trash lines */}
                        <View
                          style={{
                            width: widthScale(1),
                            height: widthScale(6),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(2),
                            left: moderateWidthScale(3),
                          }}
                        />
                        <View
                          style={{
                            width: widthScale(1),
                            height: widthScale(6),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(2),
                            left: moderateWidthScale(6.5),
                          }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {/* Minimize button - closes chat */}
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleCloseChat}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: widthScale(18),
                      height: widthScale(18),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Minimize icon - horizontal line */}
                    <View
                      style={{
                        width: widthScale(14),
                        height: widthScale(2),
                        backgroundColor: theme.white,
                        borderRadius: moderateWidthScale(1),
                      }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages List / Voice Receptionist */}
            {chatMode === "ai_chat_bot" ? (
              <>
                {messages.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <FlatList
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={dismissKeyboard}
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={keyExtractor}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={(() => {
                      // Check if last message is empty and streaming (shows inline typing indicator)
                      const lastMessage = messages[messages.length - 1];
                      const hasEmptyStreamingMessage =
                        lastMessage &&
                        lastMessage.sender === "ai" &&
                        !lastMessage.text &&
                        lastMessage.isStreaming;

                      // Only show bottom indicator if not showing inline indicator
                      if (hasEmptyStreamingMessage) {
                        return null;
                      }

                      // Show bottom indicator when loading or streaming (but no empty message)
                      return isLoading || isStreaming ? (
                        <TypingIndicator
                          theme={theme}
                          bottomInset={bottomInset}
                        />
                      ) : null;
                    })()}
                  />
                )}

                {/* Input Area */}
                <View
                  style={[
                    styles.inputContainer,
                    isInputDisabled && styles.inputContainerDisabled,
                  ]}
                >
                  <View
                    style={[
                      styles.textInputWrapper,
                      styles.shadowLight,
                      isInputDisabled && styles.inputWrapperDisabled,
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.textInput,
                        isInputDisabled && styles.textInputDisabled,
                      ]}
                      placeholder={
                        isInputDisabled
                          ? "AI is responding..."
                          : "Ask me anything..."
                      }
                      placeholderTextColor={theme.lightGreen2}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      maxLength={5000}
                      returnKeyType="send"
                      onSubmitEditing={handleSendMessage}
                      editable={!isInputDisabled}
                    />
                    {inputText.length > 0 && !isInputDisabled && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => setInputText("")}
                        hitSlop={{
                          top: 8,
                          bottom: 8,
                          left: 8,
                          right: 8,
                        }}
                      >
                        <CloseIcon
                          width={16}
                          height={16}
                          color={theme.darkGreen}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (inputText.trim().length === 0 || isInputDisabled) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={
                      inputText.trim().length === 0 || isInputDisabled
                    }
                    activeOpacity={0.8}
                  >
                    <SendIcon width={16} height={16} color={theme.white} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <VoiceReceptionistContent
                theme={theme}
                styles={styles}
                statusLabel="AI Receptionist"
                websocketUrl={VOICE_AGENT_WS_URL}
              />
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Expanded menu - two options above the button (only for customer/guest) */}
      {canShowMenu && menuExpanded && !isOpen && (
        <>
          <TouchableWithoutFeedback onPress={handleCloseMenu}>
            <View style={[StyleSheet.absoluteFill, { zIndex: 997 }]} />
          </TouchableWithoutFeedback>
          <View style={styles.menuOptionsContainer}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectOption("ai_chat_bot")}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <AiRobotIcon width={22} height={22} color={theme.white} />
              </View>
              <Text style={styles.menuOptionLabel}>{t("aiChatBot")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectOption("ai_receptionist")}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <AiReceptionistIcon width={22} height={22} />
              </View>
              <Text style={styles.menuOptionLabel}>{t("aiReceptionist")}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Floating AI Button - robot icon or cross when menu expanded */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.floatingButton,
            styles.shadow,
            {
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.buttonInner}
            onPress={menuExpanded ? handleCloseMenu : handleFloatingButtonPress}
            activeOpacity={0.9}
          >
            <View style={styles.aiIconContainer}>
              {menuExpanded ? (
                <CloseIcon width={22} height={22} color={theme.white} />
              ) : (
                <AiRobotIcon width={22} height={22} color={theme.white} />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
};

export default AiChatBot;
