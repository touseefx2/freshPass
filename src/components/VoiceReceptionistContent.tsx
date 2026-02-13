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
  Platform,
  PermissionsAndroid,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale } from "@/src/theme/dimensions";
import { Audio } from "expo-av";
import { File, Directory, Paths } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import AudioRecord from "react-native-audio-record";
import { Buffer } from "buffer";

export type ChatBoxStyles = Record<string, any>;

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

export type VoiceReceptionistContentProps = {
  theme: Theme;
  styles: ChatBoxStyles;
  websocketUrl: string;
};

export const VoiceReceptionistContent: React.FC<VoiceReceptionistContentProps> = ({
  theme,
  styles,
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
  const FLUSH_SAMPLE_THRESHOLD = 16000 * 0.5;
  const isMicMutedRef = useRef(false);
  const isSpeakerMutedRef = useRef(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const centerIconScale = useRef(new Animated.Value(1)).current;
  const sendQueueRef = useRef<ArrayBuffer[]>([]);
  const drainScheduledRef = useRef(false);
  const conversationScrollRef = useRef<ScrollView | null>(null);

  const drainSendQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const queue = sendQueueRef.current;
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (chunk && chunk.byteLength > 0) {
        try {
          ws.send(chunk);
        } catch (err) {
          console.error("Failed to send audio chunk", err);
        }
      }
    }
    drainScheduledRef.current = false;
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(centerIconScale, {
          toValue: 1.12,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(centerIconScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [centerIconScale]);

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
    sendQueueRef.current = [];
    drainScheduledRef.current = false;
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
    if (conversation.length > 0 && conversationScrollRef.current) {
      setTimeout(
        () => conversationScrollRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [conversation.length]);

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
        { shouldPlay: true, progressUpdateIntervalMillis: 50 },
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
            case "UserTranscript":
            case "user_input":
            case "InputTranscript":
              if (parsed.content || parsed.text) {
                const content = String(parsed.content ?? parsed.text ?? "").trim();
                if (content) {
                  setConversation((prev) => [
                    ...prev,
                    {
                      role: "user",
                      content,
                      timestamp: Date.now(),
                    },
                  ]);
                }
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
      if (Platform.OS === "ios") {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
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
          if (
            !wsRef.current ||
            wsRef.current.readyState !== WebSocket.OPEN ||
            isMicMutedRef.current
          )
            return;
          try {
            const chunk = Buffer.from(data, "base64");
            if (chunk.byteLength === 0) return;
            const arrayBuffer = chunk.buffer.slice(
              chunk.byteOffset,
              chunk.byteOffset + chunk.byteLength,
            );
            sendQueueRef.current.push(arrayBuffer);
            if (!drainScheduledRef.current) {
              drainScheduledRef.current = true;
              setTimeout(drainSendQueue, 0);
            }
          } catch (err) {
            console.error("Failed to queue audio chunk", err);
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

  const centerIconName = isStarting
    ? "hourglass-outline"
    : isAgentSpeaking
      ? "volume-high"
      : isListening
        ? "mic"
        : "mic-outline";

  const isCallActive = isConnected || isListening;
  const showCallButton = isCallActive;

  const centerIconPressable = !isCallActive && !isStarting;

  return (
    <View style={styles.receptionistContainer}>
      <View style={styles.receptionistBody}>
        <View style={styles.receptionistCenter}>
          {centerIconPressable ? (
            <TouchableOpacity
              style={styles.receptionistMicOuter}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Animated.View
                style={[
                  styles.receptionistMicInner,
                  { transform: [{ scale: centerIconScale }] },
                ]}
              >
                <Ionicons
                  name={centerIconName}
                  size={36}
                  color={theme.white}
                />
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <View style={styles.receptionistMicOuter}>
              <Animated.View
                style={[
                  styles.receptionistMicInner,
                  { transform: [{ scale: centerIconScale }] },
                ]}
              >
                <Ionicons
                  name={centerIconName}
                  size={36}
                  color={theme.white}
                />
              </Animated.View>
            </View>
          )}
          <Text style={styles.receptionistStatusTextMedium}>{statusText}</Text>
          <Text style={styles.receptionistTimerText}>{timerText}</Text>
          {error ? (
            <Text style={styles.receptionistErrorText}>{error}</Text>
          ) : null}
        </View>
        {conversation.length > 0 && (
          <View style={styles.receptionistCurrentStatementContainer}>
            <ScrollView
              ref={conversationScrollRef}
              style={styles.receptionistCurrentStatementScroll}
              contentContainerStyle={[
                styles.receptionistCurrentStatementScrollContent,
                { alignItems: "flex-start", justifyContent: "flex-start" },
              ]}
              showsVerticalScrollIndicator={true}
            >
              {conversation.map((msg, index) => (
                <View
                  key={`${msg.timestamp}-${index}`}
                  style={{
                    marginBottom:
                      index < conversation.length - 1
                        ? moderateHeightScale(12)
                        : 0,
                  }}
                >
                  <Text style={styles.receptionistCurrentStatementText}>
                    {msg.role === "user" ? "You: " : "Agent: "}
                    {msg.content}
                  </Text>
                </View>
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
        {showCallButton ? (
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
        ) : (
          <View style={[styles.receptionistControlButton, { opacity: 0 }]} />
        )}
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
