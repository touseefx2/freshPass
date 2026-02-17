import React, { useRef, useEffect, useState, useCallback } from "react";
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

type AgentStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking";

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

export const VoiceReceptionistContent: React.FC<
  VoiceReceptionistContentProps
> = ({ theme, styles, websocketUrl }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasReceivedFirstAgentResponse, setHasReceivedFirstAgentResponse] =
    useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
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
  const isListeningRef = useRef(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const centerIconScale = useRef(new Animated.Value(1)).current;
  const sendQueueRef = useRef<ArrayBuffer[]>([]);
  const drainScheduledRef = useRef(false);
  const isAgentSpeakingRef = useRef(false);
  const pendingAgentTextBufferRef = useRef<{ role: string; content: string }[]>(
    [],
  );
  const pendingAudioBuffersRef = useRef<ArrayBuffer[]>([]);
  const currentTurnTextShownRef = useRef(false);
  const flushPendingAgentTextRef = useRef<() => void>(() => {});
  const agentAudioDoneForTurnRef = useRef(false);
  const agentDoneFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const conversationScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (conversation.length > 0) {
      const t = setTimeout(() => {
        conversationScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [conversation.length]);

  const drainSendQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (sendQueueRef.current.length > 0) {
        console.log(
          "[VoiceReceptionist] drainSendQueue: WS not open, skipping. readyState=",
          ws?.readyState ?? "null",
        );
      }
      return;
    }
    const queue = sendQueueRef.current;
    let sentCount = 0;
    // Send all queued chunks immediately (don't artificially limit)
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (chunk && chunk.byteLength > 0) {
        try {
          ws.send(chunk);
          sentCount += 1;
        } catch (err) {
          console.error(
            "[VoiceReceptionist] Failed to send audio chunk from queue",
            err,
          );
          // If send fails, stop draining to avoid spamming errors
          break;
        }
      }
    }
    if (sentCount > 0) {
      console.log(
        "[VoiceReceptionist] Drained queue: sent",
        sentCount,
        "chunks",
      );
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

  const disconnectDueToError = useCallback(() => {
    console.log("[VoiceReceptionist] disconnectDueToError – tearing down");
    setIsListening(false);
    setIsConnected(false);
    setIsStarting(false);
    setIsAgentSpeaking(false);
    setAgentStatus("idle");
    isPlayingRef.current = false;
    try {
      AudioRecord.stop();
    } catch {}
    wsRef.current = null;
    pendingPcmChunksRef.current = [];
    pendingSamplesRef.current = 0;
    pendingAgentTextBufferRef.current = [];
    pendingAudioBuffersRef.current = [];
    currentTurnTextShownRef.current = true;
    agentAudioDoneForTurnRef.current = false;
    if (agentDoneFallbackTimeoutRef.current) {
      clearTimeout(agentDoneFallbackTimeoutRef.current);
      agentDoneFallbackTimeoutRef.current = null;
    }
    try {
      if (soundRef.current) soundRef.current.unloadAsync();
    } catch {}
    soundRef.current = null;
    audioQueueRef.current = [];
    sendQueueRef.current = [];
    drainScheduledRef.current = false;
  }, []);

  const cleanup = useCallback(() => {
    console.log(
      "[VoiceReceptionist] cleanup – closing connection and resetting",
    );
    setIsListening(false);
    setIsConnected(false);
    setIsStarting(false);
    setIsAgentSpeaking(false);
    setIsMicMuted(false);
    setIsSpeakerMuted(false);
    setError(null);
    setHasReceivedFirstAgentResponse(false);
    setAgentStatus("idle");
    setConversation([]);
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
    pendingAgentTextBufferRef.current = [];
    pendingAudioBuffersRef.current = [];
    currentTurnTextShownRef.current = true;
    agentAudioDoneForTurnRef.current = false;
    if (agentDoneFallbackTimeoutRef.current) {
      clearTimeout(agentDoneFallbackTimeoutRef.current);
      agentDoneFallbackTimeoutRef.current = null;
    }
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
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isAgentSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(isSpeakerMuted ? 0 : 1).catch(() => {});
    }
    if (isSpeakerMuted) {
      // When speaker is muted, aggressively stop any queued/playing TTS so we mirror web behavior
      audioQueueRef.current = [];
      pendingPcmChunksRef.current = [];
      pendingSamplesRef.current = 0;
      isPlayingRef.current = false;
      try {
        if (soundRef.current) soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
      setIsAgentSpeaking(false);
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
  // User mic is only sent to the server; we never play it back. Only agent TTS is played.

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    const nextUri = audioQueueRef.current.shift();
    if (!nextUri) {
      await flushPendingAudio();
      if (isPlayingRef.current || audioQueueRef.current.length > 0) {
        return;
      }
      if (!agentAudioDoneForTurnRef.current) {
        if (agentDoneFallbackTimeoutRef.current)
          clearTimeout(agentDoneFallbackTimeoutRef.current);
        agentDoneFallbackTimeoutRef.current = setTimeout(() => {
          agentDoneFallbackTimeoutRef.current = null;
          if (
            !isPlayingRef.current &&
            audioQueueRef.current.length === 0 &&
            pendingSamplesRef.current === 0
          ) {
            agentAudioDoneForTurnRef.current = true;
            playNextInQueue().catch(() => {});
          }
        }, 2000);
        return;
      }
      isPlayingRef.current = false;
      setIsAgentSpeaking(false);
      flushPendingAgentTextRef.current();
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
          playNextInQueue().catch(() => {});
        }
      });
    } catch {
      isPlayingRef.current = false;
      try {
        const file = new File(nextUri);
        file.delete();
      } catch {}
      playNextInQueue().catch(() => {});
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
      if (agentDoneFallbackTimeoutRef.current) {
        clearTimeout(agentDoneFallbackTimeoutRef.current);
        agentDoneFallbackTimeoutRef.current = null;
      }
      audioQueueRef.current.push(file.uri);
      currentTurnTextShownRef.current = false;
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

  const flushPendingAgentText = useCallback(() => {
    currentTurnTextShownRef.current = true;
    const audioBufs = pendingAudioBuffersRef.current;
    pendingAudioBuffersRef.current = [];
    for (const arr of audioBufs) {
      enqueuePcmChunk(arr);
    }
  }, [enqueuePcmChunk]);

  useEffect(() => {
    flushPendingAgentTextRef.current = flushPendingAgentText;
  }, [flushPendingAgentText]);

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
          const contentPreview = parsed.content ?? parsed.text ?? "";
          const previewStr =
            typeof contentPreview === "string"
              ? contentPreview.slice(0, 80)
              : JSON.stringify(contentPreview).slice(0, 80);
          console.log(
            "[VoiceReceptionist] Server message type:",
            parsed.type,
            previewStr
              ? "| " +
                  previewStr +
                  (String(contentPreview).length > 80 ? "..." : "")
              : "",
          );
          switch (parsed.type) {
            case "Welcome":
            case "SettingsApplied":
              // No-op, but we mirror web widget logs / types
              break;
            case "ConversationText":
              if (parsed.content) {
                agentAudioDoneForTurnRef.current = false;
                setHasReceivedFirstAgentResponse(true);
                const role =
                  typeof parsed.role === "string" ? parsed.role : "assistant";
                const content = String(parsed.content);
                setConversation((prev) => [
                  ...prev,
                  { role, content, timestamp: Date.now() },
                ]);
                currentTurnTextShownRef.current = true;
                const audioBufs = pendingAudioBuffersRef.current;
                pendingAudioBuffersRef.current = [];
                for (const arr of audioBufs) enqueuePcmChunk(arr);
              }
              break;
            case "UserStartedSpeaking":
            case "user_started_speaking":
              // User started talking – stop any remaining TTS so we don't talk over them
              setAgentStatus("listening");
              setIsAgentSpeaking(false);
              audioQueueRef.current = [];
              pendingPcmChunksRef.current = [];
              pendingSamplesRef.current = 0;
              isPlayingRef.current = false;
              try {
                if (soundRef.current) soundRef.current.unloadAsync();
              } catch {}
              soundRef.current = null;
              break;
            case "AgentThinking":
            case "agent_thinking":
              setAgentStatus("thinking");
              break;
            case "AgentStartedSpeaking":
            case "agent_started_speaking":
              setAgentStatus("speaking");
              setIsAgentSpeaking(true);
              break;
            case "UserTranscript":
            case "user_input":
            case "InputTranscript":
            case "user_transcript":
            case "input_transcript":
            case "Transcript":
            case "transcript":
              if (parsed.content || parsed.text) {
                const content = String(
                  parsed.content ?? parsed.text ?? "",
                ).trim();
                if (content) {
                  console.log(
                    "[VoiceReceptionist] User said (transcript):",
                    content,
                  );
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
              agentAudioDoneForTurnRef.current = true;
              flushPendingAudio().catch(() => {});
              setTimeout(() => {
                setAgentStatus(isListeningRef.current ? "listening" : "idle");
              }, 800);
              break;
            case "Error": {
              const errorMsg =
                parsed.description ||
                parsed.message ||
                "Unknown error from agent.";
              console.error("[VoiceReceptionist] Agent Error:", errorMsg);
              setError(errorMsg);
              break;
            }
            default:
              console.log(
                "[VoiceReceptionist] Server message (unhandled type):",
                parsed.type,
                "keys:",
                Object.keys(parsed),
              );
              break;
          }
          return;
        }
        try {
          const buf = Buffer.from(trimmed, "base64");
          if (buf.byteLength > 0) {
            setHasReceivedFirstAgentResponse(true);
            const arr = buf.buffer.slice(
              buf.byteOffset,
              buf.byteOffset + buf.byteLength,
            );
            if (!currentTurnTextShownRef.current) {
              pendingAudioBuffersRef.current.push(arr);
            } else {
              enqueuePcmChunk(arr);
            }
          }
        } catch (err) {
          console.error("Failed to decode voice agent audio string", err);
        }
      } else if (data instanceof ArrayBuffer) {
        setHasReceivedFirstAgentResponse(true);
        if (!currentTurnTextShownRef.current) {
          pendingAudioBuffersRef.current.push(data);
        } else {
          enqueuePcmChunk(data);
        }
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
    setAgentStatus("connecting");
    console.log("[VoiceReceptionist] Connecting to WebSocket:", websocketUrl);
    await new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;
        ws.onopen = () => {
          console.log("[VoiceReceptionist] WebSocket OPEN – connected");
          setIsConnected(true);
          setAgentStatus("idle");
          resolve();
        };
        ws.onerror = (event: any) => {
          console.error(
            "[VoiceReceptionist] WebSocket ERROR",
            event?.message ?? event,
          );
          setError("Unable to connect to voice agent.");
          reject(event);
        };
        ws.onclose = (event: any) => {
          console.log(
            "[VoiceReceptionist] WebSocket CLOSED – code=",
            event?.code,
            "reason=",
            event?.reason ?? "none",
            "clean=",
            event?.wasClean,
          );
          // More specific error handling based on close code
          if (event.code === 1008) {
            setError("Voice agent authentication failed.");
          } else if (event.code === 1001) {
            // Stream end – Deepgram closes when audio is not continuous (guide fix)
            setError(
              "Connection ended unexpectedly. This may happen if audio stream was interrupted. Please try again.",
            );
          } else if (event.code === 1006) {
            setError(
              "Connection error. Voice agent disconnected. Please try again.",
            );
          } else if (event.code !== 1000) {
            setError(
              `Connection error (code: ${event.code ?? "unknown"}). Please try again.`,
            );
          }
          disconnectDueToError();
        };
        ws.onmessage = handleServerMessage;
      } catch (err) {
        console.error("[VoiceReceptionist] WebSocket connect failed", err);
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
            isMicMutedRef.current ||
            isAgentSpeakingRef.current
          ) {
            if (sendQueueRef.current.length === 0 && data?.length > 0) {
              console.log(
                "[VoiceReceptionist] User voice skipped: wsOpen=",
                !!wsRef.current && wsRef.current.readyState === WebSocket.OPEN,
                "micMuted=",
                isMicMutedRef.current,
                "agentSpeaking=",
                isAgentSpeakingRef.current,
              );
            }
            return;
          }
          try {
            const chunk = Buffer.from(data, "base64");
            if (chunk.byteLength === 0) return;
            const arrayBuffer = chunk.buffer.slice(
              chunk.byteOffset,
              chunk.byteOffset + chunk.byteLength,
            );
            // CRITICAL FIX: send audio immediately to maintain continuous stream.
            // Only fall back to the queue if direct send fails or WS not ready.
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(arrayBuffer);
                // Log occasionally so we know chunks are flowing without spamming logs.
                if (Math.random() < 0.01) {
                  console.log(
                    "[VoiceReceptionist] Audio chunk sent directly:",
                    arrayBuffer.byteLength,
                    "bytes",
                  );
                }
              } catch (err) {
                console.error(
                  "[VoiceReceptionist] Failed to send audio chunk directly",
                  err,
                );
                // Fallback: queue and let drainSendQueue handle it.
                sendQueueRef.current.push(arrayBuffer);
                drainSendQueue();
              }
            } else {
              // Fallback: queue if WebSocket not ready
              sendQueueRef.current.push(arrayBuffer);
              drainSendQueue();
            }
          } catch (err) {
            console.error(
              "[VoiceReceptionist] Failed to process audio chunk",
              err,
            );
          }
        });
        recorderInitializedRef.current = true;
      }
      console.log(
        "[VoiceReceptionist] Recorder started – user voice will be sent to server",
      );
      setIsMicMuted(false);
      isMicMutedRef.current = false;
      setIsListening(true);
      setAgentStatus("listening");
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
    console.log("[VoiceReceptionist] handleStart – user tapped start");
    setIsStarting(true);
    try {
      await connectWebSocket();
      await startRecorder();
      console.log("[VoiceReceptionist] handleStart – connected and recording");
    } catch {
      console.log("[VoiceReceptionist] handleStart – failed");
    } finally {
      setIsStarting(false);
    }
  }, [connectWebSocket, isListening, isStarting, startRecorder]);

  const handleStop = useCallback(() => {
    console.log("[VoiceReceptionist] handleStop – user ended call");
    cleanup();
  }, [cleanup]);

  const handleRetry = useCallback(async () => {
    if (isStarting || isListening) return;
    setError(null);
    setConversation([]);
    setHasReceivedFirstAgentResponse(false);
    setIsStarting(true);
    try {
      await connectWebSocket();
      await startRecorder();
    } catch {
      // Error already set by connectWebSocket
    } finally {
      setIsStarting(false);
    }
  }, [connectWebSocket, isListening, isStarting, startRecorder]);

  const statusText = (() => {
    if (isStarting) return "Connecting...";
    if (isConnected && !hasReceivedFirstAgentResponse) return "Connecting...";
    switch (agentStatus) {
      case "connecting":
        return "Connecting...";
      case "listening":
        return "Listening...";
      case "thinking":
        return "Processing...";
      case "speaking":
        return "Agent is speaking...";
      case "idle":
      default:
        if (isListening) return "Now you can speak";
        if (isConnected) return "Tap the button to speak";
        return "Tap the button to start";
    }
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
  const centerIconOnPress = error ? handleRetry : handleStart;

  return (
    <View style={styles.receptionistContainer}>
      <View style={styles.receptionistBody}>
        <View style={styles.receptionistCenter}>
          {centerIconPressable ? (
            <TouchableOpacity
              style={styles.receptionistMicOuter}
              onPress={centerIconOnPress}
              activeOpacity={0.85}
            >
              <Animated.View
                style={[
                  styles.receptionistMicInner,
                  { transform: [{ scale: centerIconScale }] },
                ]}
              >
                <Ionicons name={centerIconName} size={36} color={theme.white} />
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
                <Ionicons name={centerIconName} size={36} color={theme.white} />
              </Animated.View>
            </View>
          )}
          <Text style={styles.receptionistStatusTextMedium}>{statusText}</Text>
          <Text style={styles.receptionistTimerText}>{timerText}</Text>
          {error ? (
            <View style={styles.receptionistErrorContainer}>
              <Text style={styles.receptionistErrorText}>{error}</Text>
              <TouchableOpacity
                onPress={handleRetry}
                activeOpacity={0.8}
                style={styles.receptionistRetryTouchable}
              >
                <Text style={styles.receptionistRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        {conversation.length > 0 && (
          <View style={styles.receptionistCurrentStatementContainer}>
            <ScrollView
              ref={conversationScrollRef}
              style={styles.receptionistCurrentStatementScroll}
              contentContainerStyle={
                styles.receptionistCurrentStatementScrollContent
              }
              showsVerticalScrollIndicator={false}
            >
              {conversation.map((msg, index) => (
                <Text
                  key={`${msg.timestamp}-${index}`}
                  style={[
                    styles.receptionistCurrentStatementText,
                    index < conversation.length - 1 &&
                      styles.receptionistCurrentStatementTextMargin,
                  ]}
                >
                  {msg.role === "user" ? "You: " : "Agent: "}
                  {msg.content}
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
