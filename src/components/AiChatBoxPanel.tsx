import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Keyboard,
  PermissionsAndroid,
  ScrollView,
} from "react-native";
import { Theme } from "@/src/theme/colors";
import {
  widthScale,
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import { Audio } from "expo-av";
import { File, Directory, Paths } from "expo-file-system";
import {
  CloseIcon,
  SendIcon,
  AiReceptionistIcon,
  AiRobotIcon,
} from "@/assets/icons";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "@/src/state/slices/chatSlice";
import AudioRecord from "react-native-audio-record";
import { Buffer } from "buffer";

export type ChatBoxStyles = Record<string, any>;

const TypingIndicator: React.FC<{
  theme: Theme;
  styles: ChatBoxStyles;
}> = ({ theme, styles }) => {
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
            { opacity: dot1Anim, transform: [{ scale: dot1Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { opacity: dot2Anim, transform: [{ scale: dot2Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { opacity: dot3Anim, transform: [{ scale: dot3Anim }] },
          ]}
        />
      </View>
    </View>
  );
};

const InlineTypingIndicator: React.FC<{ theme: Theme; styles: ChatBoxStyles }> = ({
  theme,
  styles,
}) => {
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.inlineTypingContainer}>
      <View style={styles.inlineTypingDots}>
        <Animated.View
          style={[
            styles.inlineTypingDot,
            { opacity: dot1Anim, transform: [{ scale: dot1Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            { opacity: dot2Anim, transform: [{ scale: dot2Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            { opacity: dot3Anim, transform: [{ scale: dot3Anim }] },
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

const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

type VoiceReceptionistProps = {
  theme: Theme;
  styles: ChatBoxStyles;
  statusLabel: string;
  websocketUrl: string;
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
  const FLUSH_SAMPLE_THRESHOLD = 16000 * 1;
  const isMicMutedRef = useRef(false);
  const isSpeakerMutedRef = useRef(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isListening) {
      intervalId = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isListening]);

  const cleanup = useCallback(() => {
    setIsListening(false);
    setIsConnected(false);
    setIsStarting(false);
    setIsAgentSpeaking(false);
    setIsMicMuted(false);
    setIsSpeakerMuted(false);
    isMicMutedRef.current = false;
    isSpeakerMutedRef.current = false;
    isPlayingRef.current = false;
    try {
      AudioRecord.stop();
    } catch {}
    try {
      if (wsRef.current) wsRef.current.close();
    } catch {}
    wsRef.current = null;
    pendingPcmChunksRef.current = [];
    pendingSamplesRef.current = 0;
    try {
      if (soundRef.current) soundRef.current.unloadAsync();
    } catch {}
    soundRef.current = null;
    audioQueueRef.current = [];
  }, []);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(isSpeakerMuted ? 0 : 1).catch(() => {});
    }
  }, [isSpeakerMuted]);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    const nextUri = audioQueueRef.current.shift();
    if (!nextUri) {
      isPlayingRef.current = false;
      setIsAgentSpeaking(false);
      return;
    }
    try {
      isPlayingRef.current = true;
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextUri },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      await sound.setVolumeAsync(isSpeakerMutedRef.current ? 0 : 1);
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch {}
          soundRef.current = null;
          isPlayingRef.current = false;
          try {
            const file = new File(nextUri);
            file.delete();
          } catch {}
          if (audioQueueRef.current.length === 0) setIsAgentSpeaking(false);
          playNextInQueue().catch(() => {});
        }
      });
    } catch {
      isPlayingRef.current = false;
      setIsAgentSpeaking(false);
      try {
        const file = new File(nextUri);
        file.delete();
      } catch {}
    }
  }, []);

  const flushPendingAudio = useCallback(async () => {
    const totalSamples = pendingSamplesRef.current;
    if (!totalSamples || pendingPcmChunksRef.current.length === 0) return;
    try {
      const merged = new Int16Array(totalSamples);
      let offset = 0;
      for (const chunk of pendingPcmChunksRef.current) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      pendingPcmChunksRef.current = [];
      pendingSamplesRef.current = 0;
      const wavHeaderSize = 44;
      const dataLength = merged.length * 2;
      const totalSize = wavHeaderSize + dataLength;
      const wavBuffer = new ArrayBuffer(totalSize);
      const view = new DataView(wavBuffer);
      const u8 = new Uint8Array(wavBuffer);
      view.setUint32(0, 0x52494646, false);
      view.setUint32(4, 36 + dataLength, true);
      view.setUint32(8, 0x57415645, false);
      view.setUint32(12, 0x666d7420, false);
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 16000, true);
      view.setUint32(28, 16000 * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      view.setUint32(36, 0x64617461, false);
      view.setUint32(40, dataLength, true);
      u8.set(new Uint8Array(merged.buffer), wavHeaderSize);
      const base64 = Buffer.from(wavBuffer).toString("base64");
      const cacheDir = new Directory(Paths.cache, "voice-agent");
      try {
        cacheDir.create({ intermediates: true, idempotent: true });
      } catch {}
      const fileName = `voice-agent-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
      const file = cacheDir.createFile(fileName, "audio/wav");
      file.write(base64, { encoding: "base64" as any });
      audioQueueRef.current.push(file.uri);
      setIsAgentSpeaking(true);
      playNextInQueue().catch(() => {});
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
        if (!pcm.length) return;
        pendingPcmChunksRef.current.push(pcm);
        pendingSamplesRef.current += pcm.length;
        if (pendingSamplesRef.current >= FLUSH_SAMPLE_THRESHOLD) {
          flushPendingAudio().catch(() => {});
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
              flushPendingAudio().catch(() => {});
              break;
            default:
              break;
          }
          return;
        }
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
          console.error("Failed to decode voice agent audio string", err);
        }
      } else if (data instanceof ArrayBuffer) {
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
    if (wsRef.current && isConnected) return;
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
          setError("Unable to connect to voice agent.");
          reject(event);
        };
        ws.onclose = (event: any) => {
          if (event.code === 1008) setError("Voice agent authentication failed.");
          else if (event.code === 1006)
            setError("Voice agent connection closed unexpectedly. Please try again.");
          cleanup();
        };
        ws.onmessage = handleServerMessage;
      } catch (err) {
        setError("Failed to open voice agent connection.");
        reject(err);
      }
    });
  }, [cleanup, handleServerMessage, isConnected, websocketUrl]);

  const startRecorder = useCallback(async () => {
    try {
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
          if (
            !ws ||
            ws.readyState !== WebSocket.OPEN ||
            isPlayingRef.current ||
            isMicMutedRef.current
          )
            return;
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
      setError(
        "Unable to access the microphone. Please check app microphone permissions in your device settings.",
      );
      cleanup();
    }
  }, [cleanup]);

  const handleStart = useCallback(async () => {
    if (isStarting || isListening) return;
    setIsStarting(true);
    try {
      await connectWebSocket();
      await startRecorder();
    } catch {
    } finally {
      setIsStarting(false);
    }
  }, [connectWebSocket, isListening, isStarting, startRecorder]);

  const handleStop = useCallback(() => cleanup(), [cleanup]);

  const statusText = (() => {
    if (isStarting) return "Connecting...";
    if (isAgentSpeaking) return "Agent is speaking...";
    if (isListening) return "Now you can speak";
    if (isConnected) return "Tap the button to speak";
    return "Tap the button to start";
  })();

  const timerText =
    isListening || elapsedSeconds > 0
      ? formatElapsedTime(elapsedSeconds)
      : "00:00";

  const handlePrimaryPress = () => {
    if (isListening) handleStop();
    else handleStart();
  };

  return (
    <View style={styles.receptionistContainer}>
      <View style={styles.receptionistBody}>
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
        {conversation.length > 0 && (
          <View style={styles.receptionistTranscriptContainer}>
            <Text style={styles.receptionistTranscriptTitle}>
              Recent conversation
            </Text>
            <ScrollView
              style={styles.receptionistTranscriptScroll}
              contentContainerStyle={styles.receptionistTranscriptScrollContent}
              showsVerticalScrollIndicator
            >
              {conversation.map((msg) => (
                <Text
                  key={msg.timestamp.toString()}
                  style={styles.receptionistTranscriptMessage}
                >
                  {`${msg.role}: ${msg.content}`}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      <View style={styles.receptionistControls}>
        <TouchableOpacity
          style={[
            styles.receptionistIconButton,
            isMicMuted && styles.receptionistIconButtonActive,
          ]}
          onPress={() => setIsMicMuted((prev) => !prev)}
          disabled={isStarting}
          activeOpacity={0.9}
        >
          <Ionicons
            name={isMicMuted ? "mic-off" : "mic"}
            size={22}
            color={isMicMuted ? theme.white : theme.darkGreen}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.receptionistControlButton,
            isListening
              ? styles.receptionistControlButtonEnd
              : styles.receptionistControlButtonStart,
          ]}
          onPress={handlePrimaryPress}
          disabled={isStarting}
          activeOpacity={0.9}
        >
          <Ionicons name="call" size={24} color={theme.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.receptionistIconButton,
            isSpeakerMuted && styles.receptionistIconButtonActive,
          ]}
          onPress={() => setIsSpeakerMuted((prev) => !prev)}
          disabled={isStarting}
          activeOpacity={0.9}
        >
          <Ionicons
            name={isSpeakerMuted ? "volume-mute" : "volume-high"}
            size={22}
            color={isSpeakerMuted ? theme.white : theme.darkGreen}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export type AiChatBoxPanelProps = {
  theme: Theme;
  styles: ChatBoxStyles;
  chatMode: "ai_chat_bot" | "ai_receptionist";
  messages: ChatMessage[];
  inputText: string;
  setInputText: (v: string) => void;
  isInputDisabled: boolean;
  handleSendMessage: () => void;
  handleCloseChat: () => void;
  handleDeleteChat: () => void;
  flatListRef: React.RefObject<FlatList<ChatMessage> | null>;
  bottomInset: number;
  isLoading: boolean;
  isStreaming: boolean;
  websocketUrl: string;
  chatBoxAnimStyle: object;
  headerTitleChat: string;
  headerTitleTalk: string;
};

export const AiChatBoxPanel: React.FC<AiChatBoxPanelProps> = ({
  theme,
  styles,
  chatMode,
  messages,
  inputText,
  setInputText,
  isInputDisabled,
  handleSendMessage,
  handleCloseChat,
  handleDeleteChat,
  flatListRef,
  bottomInset,
  isLoading,
  isStreaming,
  websocketUrl,
  chatBoxAnimStyle,
  headerTitleChat,
  headerTitleTalk,
}) => {
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === "user";
      if (isUser) {
        return (
          <View style={[styles.messageBubble, styles.userMessage]}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
        );
      }
      const isEmptyAndStreaming = !item.text && item.isStreaming;
      return (
        <View style={styles.aiMessageContainer}>
          <View style={styles.aiMessageIconContainer}>
            <AiRobotIcon width={16} height={16} color={theme.darkGreen} />
          </View>
          <View style={[styles.aiMessageBubble, styles.messageBubble]}>
            {isEmptyAndStreaming ? (
              <InlineTypingIndicator theme={theme} styles={styles} />
            ) : (
              <Text style={styles.aiMessageText}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    },
    [styles, theme],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const renderEmptyState = () => (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.emptyContainer}>
        <AiRobotIcon width={50} height={50} color={theme.darkGreen} />
        <Text style={styles.emptyTitle}>AI Assistant</Text>
        <Text style={styles.emptySubtitle}>
          Ask me anything! I'm here to help you with questions, information, and
          assistance.
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );

  const headerTitle =
    chatMode === "ai_chat_bot" ? headerTitleChat : headerTitleTalk;

  return (
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
        <View style={styles.chatHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatarHeader}>
              {chatMode === "ai_chat_bot" ? (
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={theme.white}
                />
              ) : (
                <Ionicons
                  name="mic-outline"
                  size={20}
                  color={theme.white}
                />
              )}
            </View>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          </View>
          <View style={styles.headerRightButtons}>
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
                  const lastMessage = messages[messages.length - 1];
                  const hasEmptyStreamingMessage =
                    lastMessage &&
                    lastMessage.sender === "ai" &&
                    !lastMessage.text &&
                    lastMessage.isStreaming;
                  if (hasEmptyStreamingMessage) return null;
                  return isLoading || isStreaming ? (
                    <TypingIndicator theme={theme} styles={styles} />
                  ) : null;
                })()}
              />
            )}
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                disabled={inputText.trim().length === 0 || isInputDisabled}
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
            statusLabel={headerTitleTalk}
            websocketUrl={websocketUrl}
          />
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
};
