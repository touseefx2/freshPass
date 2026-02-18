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
import {
  cacheDirectory,
  makeDirectoryAsync,
  writeAsStringAsync,
  deleteAsync,
  EncodingType,
} from "expo-file-system/legacy";
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

/**
 * Standard flow: Connect → Agent speaks first (greeting + TTS) → User speaks →
 * Agent responds (text + TTS) → repeat. Mic is sent only when not muted and not
 * during agent TTS so we don't talk over the agent.
 */
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
  const preloadedNextRef = useRef<{ sound: Audio.Sound; uri: string } | null>(
    null,
  );
  const isPlayingRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const pendingPcmChunksRef = useRef<Int16Array[]>([]);
  const pendingSamplesRef = useRef(0);
  const FLUSH_SAMPLE_THRESHOLD = 16000 * 4;
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
  const pendingAudioBuffersRef = useRef<ArrayBuffer[]>([]);
  const currentTurnTextShownRef = useRef(false);
  const flushPendingAgentTextRef = useRef<() => void>(() => {});
  const agentAudioDoneForTurnRef = useRef(false);
  const agentDoneFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const conversationScrollRef = useRef<ScrollView>(null);
  const lastAgentContentRef = useRef<string | null>(null);
  const lastUserTranscriptRef = useRef<string | null>(null);
  const userMicUnblockAfterRef = useRef(0);
  const ECHO_GUARD_MS = 1000;
  // Silence buffer to send when mic is blocked (agent speaking) so server does not timeout.
  const silenceChunkRef = useRef<ArrayBuffer | null>(null);

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
      drainScheduledRef.current = false;
      return;
    }
    const queue = sendQueueRef.current;
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (chunk && chunk.byteLength > 0) {
        try {
          ws.send(chunk);
        } catch {
          break;
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

  const disconnectDueToError = useCallback(() => {
    setIsListening(false);
    setIsConnected(false);
    setIsStarting(false);
    isAgentSpeakingRef.current = false;
    setIsAgentSpeaking(false);
    setAgentStatus("idle");
    isPlayingRef.current = false;
    try {
      AudioRecord.stop();
    } catch {}
    wsRef.current = null;
    pendingPcmChunksRef.current = [];
    pendingSamplesRef.current = 0;
    pendingAudioBuffersRef.current = [];
    currentTurnTextShownRef.current = true;
    agentAudioDoneForTurnRef.current = false;
    lastAgentContentRef.current = null;
    lastUserTranscriptRef.current = null;
    userMicUnblockAfterRef.current = 0;
    if (agentDoneFallbackTimeoutRef.current) {
      clearTimeout(agentDoneFallbackTimeoutRef.current);
      agentDoneFallbackTimeoutRef.current = null;
    }
    try {
      if (soundRef.current) soundRef.current.unloadAsync();
    } catch {}
    soundRef.current = null;
    try {
      if (preloadedNextRef.current) {
        preloadedNextRef.current.sound.unloadAsync().catch(() => {});
      }
    } catch {}
    preloadedNextRef.current = null;
    audioQueueRef.current = [];
    sendQueueRef.current = [];
    drainScheduledRef.current = false;
  }, []);

  const cleanup = useCallback(() => {
    setIsListening(false);
    setIsConnected(false);
    setIsStarting(false);
    isAgentSpeakingRef.current = false;
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
    pendingAudioBuffersRef.current = [];
    currentTurnTextShownRef.current = true;
    agentAudioDoneForTurnRef.current = false;
    lastAgentContentRef.current = null;
    lastUserTranscriptRef.current = null;
    userMicUnblockAfterRef.current = 0;
    if (agentDoneFallbackTimeoutRef.current) {
      clearTimeout(agentDoneFallbackTimeoutRef.current);
      agentDoneFallbackTimeoutRef.current = null;
    }
    try {
      if (soundRef.current) soundRef.current.unloadAsync();
    } catch {}
    soundRef.current = null;
    try {
      if (preloadedNextRef.current) {
        preloadedNextRef.current.sound.unloadAsync().catch(() => {});
      }
    } catch {}
    preloadedNextRef.current = null;
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
      isAgentSpeakingRef.current = false;
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
    let sound: Audio.Sound;
    let nextUri: string | null = null;
    let wasPreloaded = false;

    if (preloadedNextRef.current) {
      const pre = preloadedNextRef.current;
      preloadedNextRef.current = null;
      if (
        audioQueueRef.current.length > 0 &&
        audioQueueRef.current[0] === pre.uri
      ) {
        audioQueueRef.current.shift();
      }
      sound = pre.sound;
      nextUri = pre.uri;
      wasPreloaded = true;
    } else {
      nextUri = audioQueueRef.current.shift() ?? null;
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
        isAgentSpeakingRef.current = false;
        setIsAgentSpeaking(false);
        userMicUnblockAfterRef.current = Date.now() + ECHO_GUARD_MS;
        flushPendingAgentTextRef.current();
        return;
      }
      isPlayingRef.current = true;
      try {
        const result = await Audio.Sound.createAsync(
          { uri: nextUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 100 },
        );
        // Log when we successfully create a sound instance for debugging real-device issues
        console.log(
          "[VoiceReceptionist] Created Audio.Sound from URI",
          nextUri,
        );
        sound = result.sound;
      } catch (err) {
        console.error(
          "[VoiceReceptionist] Failed to create Audio.Sound from URI",
          nextUri,
          err,
        );
        isPlayingRef.current = false;
        try {
          await deleteAsync(nextUri, { idempotent: true });
        } catch {}
        playNextInQueue().catch(() => {});
        return;
      }
    }

    const uriToPlay = nextUri!;
    try {
      isPlayingRef.current = true;
      soundRef.current = sound;
      await sound.setVolumeAsync(isSpeakerMutedRef.current ? 0 : 1);
      if (wasPreloaded) {
        try {
          await sound.playAsync();
        } catch {}
      }
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) return;
        const pos = status.positionMillis ?? 0;
        const dur = status.durationMillis ?? 1;
        const remaining = dur - pos;
        if (
          remaining > 0 &&
          remaining < 500 &&
          audioQueueRef.current.length > 0 &&
          !preloadedNextRef.current
        ) {
          const nextUriToPreload = audioQueueRef.current[0];
          Audio.Sound.createAsync(
            { uri: nextUriToPreload },
            { shouldPlay: false },
          )
            .then(({ sound: s }) => {
              if (!preloadedNextRef.current) {
                preloadedNextRef.current = { sound: s, uri: nextUriToPreload };
              } else {
                s.unloadAsync().catch(() => {});
              }
            })
            .catch(() => {});
        }
        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch {}
          soundRef.current = null;
          isPlayingRef.current = false;
          try {
            await deleteAsync(uriToPlay, { idempotent: true });
          } catch {}
          console.log(
            "[VoiceReceptionist] Finished playback and deleted file",
            uriToPlay,
          );
          playNextInQueue().catch(() => {});
        }
      });
    } catch (err) {
      console.error(
        "[VoiceReceptionist] Unexpected error during playback",
        uriToPlay,
        err,
      );
      isPlayingRef.current = false;
      soundRef.current = null;
      try {
        await deleteAsync(uriToPlay, { idempotent: true });
      } catch {}
      playNextInQueue().catch(() => {});
    }
  }, []);

  const flushChunksToWavAndQueue = useCallback(
    async (chunks: Int16Array[], totalSamples: number) => {
      if (!totalSamples || chunks.length === 0) return;
      try {
        const merged = new Int16Array(totalSamples);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        // Apply a simple gain to boost agent audio loudness on devices where it is too quiet.
        const GAIN = 44;
        for (let i = 0; i < merged.length; i++) {
          let sample = merged[i] * GAIN;
          if (sample > 32767) sample = 32767;
          if (sample < -32768) sample = -32768;
          merged[i] = sample;
        }

        const wavHeaderSize = 44;
        const dataLength = merged.length * 2;
        const totalSize = wavHeaderSize + dataLength;
        const wavBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(wavBuffer);
        const u8 = new Uint8Array(wavBuffer);

        // WAV RIFF header
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

        // PCM data
        u8.set(new Uint8Array(merged.buffer), wavHeaderSize);
        const base64 = Buffer.from(wavBuffer).toString("base64");

        const baseDir = cacheDirectory ?? "";
        const dir = `${baseDir}voice-agent/`;
        await makeDirectoryAsync(dir, { intermediates: true });
        const fileName = `voice-agent-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.wav`;
        const uri = dir + fileName;

        console.log(
          "[VoiceReceptionist] Writing agent WAV file",
          uri,
          "samples=",
          totalSamples,
          "bytes=",
          dataLength,
        );

        await writeAsStringAsync(uri, base64, {
          encoding: EncodingType.Base64,
        });

        if (agentDoneFallbackTimeoutRef.current) {
          clearTimeout(agentDoneFallbackTimeoutRef.current);
          agentDoneFallbackTimeoutRef.current = null;
        }
        audioQueueRef.current.push(uri);
        currentTurnTextShownRef.current = false;
        isAgentSpeakingRef.current = true;
        setIsAgentSpeaking(true);
        playNextInQueue().catch(() => {});
      } catch (err) {
        console.error("Failed to flush voice agent audio buffer", err);
      }
    },
    [playNextInQueue],
  );

  const flushPendingAudio = useCallback(async () => {
    const chunks = pendingPcmChunksRef.current;
    const totalSamples = pendingSamplesRef.current;
    if (!totalSamples || chunks.length === 0) return;
    pendingPcmChunksRef.current = [];
    pendingSamplesRef.current = 0;
    flushChunksToWavAndQueue(chunks, totalSamples);
  }, [flushChunksToWavAndQueue]);

  const enqueuePcmChunk = useCallback(
    (buffer: ArrayBuffer) => {
      try {
        const pcm = new Int16Array(buffer);
        if (!pcm.length) return;
        console.log(
          "[VoiceReceptionist] Enqueue agent PCM chunk, samples=",
          pcm.length,
        );
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
          switch (parsed.type) {
            case "Welcome":
            case "SettingsApplied":
              break;
            case "History":
              break;
            case "ConversationText":
              if (parsed.content) {
                const role =
                  typeof parsed.role === "string" ? parsed.role : "assistant";
                const content = String(parsed.content).trim();
                if (!content) break;
                if (lastAgentContentRef.current === content) break;
                lastAgentContentRef.current = content;
                lastUserTranscriptRef.current = null;
                agentAudioDoneForTurnRef.current = false;
                isAgentSpeakingRef.current = true;
                setIsAgentSpeaking(true);
                setHasReceivedFirstAgentResponse(true);
                setConversation((prev) => [
                  ...prev,
                  { role, content, timestamp: Date.now() },
                ]);
                console.log("[VoiceReceptionist] Agent text message:", content);
                currentTurnTextShownRef.current = true;
                const audioBufs = pendingAudioBuffersRef.current;
                pendingAudioBuffersRef.current = [];
                // Snapshot and clear refs immediately so back-to-back ConversationText messages
                // don't merge into one WAV (pehle 1 suna, phir 2).
                const prevChunks = pendingPcmChunksRef.current;
                const prevSamples = pendingSamplesRef.current;
                pendingPcmChunksRef.current = [];
                pendingSamplesRef.current = 0;
                flushChunksToWavAndQueue(prevChunks, prevSamples);
                for (const arr of audioBufs) enqueuePcmChunk(arr);
              }
              break;
            case "UserStartedSpeaking":
            case "user_started_speaking":
              setAgentStatus("listening");
              isAgentSpeakingRef.current = false;
              setIsAgentSpeaking(false);
              userMicUnblockAfterRef.current = 0;
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
              isAgentSpeakingRef.current = true;
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
                if (content && lastUserTranscriptRef.current !== content) {
                  lastUserTranscriptRef.current = content;
                  lastAgentContentRef.current = null;
                  setConversation((prev) => [
                    ...prev,
                    {
                      role: "user",
                      content,
                      timestamp: Date.now(),
                    },
                  ]);
                  console.log(
                    "[VoiceReceptionist] User transcript from agent:",
                    content,
                  );
                }
              }
              break;
            case "AgentAudioDone":
              agentAudioDoneForTurnRef.current = true;
              isAgentSpeakingRef.current = false;
              setIsAgentSpeaking(false);
              userMicUnblockAfterRef.current = Date.now() + ECHO_GUARD_MS;
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
              const isTimeout = /timeout|did not receive audio/i.test(errorMsg);
              if (!isTimeout) setError(errorMsg);
              break;
            }
            default:
              break;
          }
          return;
        }
        try {
          const buf = Buffer.from(trimmed, "base64");
          if (buf.byteLength > 0) {
            setHasReceivedFirstAgentResponse(true);
            if (!isAgentSpeakingRef.current) {
              isAgentSpeakingRef.current = true;
              setIsAgentSpeaking(true);
            }
            const arr = buf.buffer.slice(
              buf.byteOffset,
              buf.byteOffset + buf.byteLength,
            );
            console.log(
              "[VoiceReceptionist] Received agent audio chunk (base64)",
              "bytes=",
              buf.byteLength,
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
        if (!isAgentSpeakingRef.current) {
          isAgentSpeakingRef.current = true;
          setIsAgentSpeaking(true);
        }
        console.log(
          "[VoiceReceptionist] Received agent audio chunk (binary)",
          "bytes=",
          data.byteLength,
        );
        if (!currentTurnTextShownRef.current) {
          pendingAudioBuffersRef.current.push(data);
        } else {
          enqueuePcmChunk(data);
        }
      }
    },
    [enqueuePcmChunk, flushChunksToWavAndQueue, flushPendingAudio],
  );

  const connectWebSocket = useCallback(async () => {
    if (!websocketUrl) {
      setError("Voice agent URL is not configured.");
      throw new Error("Voice agent URL is not configured.");
    }
    if (wsRef.current && isConnected) return;
    setError(null);
    setAgentStatus("connecting");
    await new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;
        ws.onopen = () => {
          console.log(
            "[VoiceReceptionist] WebSocket connected to voice agent",
            websocketUrl,
          );
          setIsConnected(true);
          setAgentStatus("idle");
          isAgentSpeakingRef.current = false;
          setIsAgentSpeaking(false);
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
            "[VoiceReceptionist] WebSocket closed",
            "code=",
            event?.code,
            "reason=",
            event?.reason,
          );
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
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN) return;

          const blocked =
            isAgentSpeakingRef.current ||
            Date.now() < userMicUnblockAfterRef.current;
          const muted = isMicMutedRef.current;

          if (blocked || muted) {
            if (silenceChunkRef.current == null)
              silenceChunkRef.current = new ArrayBuffer(2048);
            try {
              ws.send(silenceChunkRef.current);
            } catch {}
            return;
          }

          try {
            const chunk = Buffer.from(data, "base64");
            if (chunk.byteLength === 0) return;
            const arrayBuffer = chunk.buffer.slice(
              chunk.byteOffset,
              chunk.byteOffset + chunk.byteLength,
            );
            console.log(
              "[VoiceReceptionist] Mic audio chunk ready to send",
              "bytes=",
              arrayBuffer.byteLength,
            );
            try {
              ws.send(arrayBuffer);
            } catch (err) {
              console.error(
                "[VoiceReceptionist] Failed to send audio chunk directly",
                err,
              );
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
    setIsStarting(true);
    try {
      await connectWebSocket();
      await startRecorder();
    } catch {
      // Error set by connectWebSocket or startRecorder
    } finally {
      setIsStarting(false);
    }
  }, [connectWebSocket, isListening, isStarting, startRecorder]);

  const handleStop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const handleRetry = useCallback(async () => {
    if (isStarting) return;
    // End current call first (disconnect, stop recorder, reset state)
    cleanup();
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
  }, [cleanup, connectWebSocket, isStarting, startRecorder]);

  const statusText = (() => {
    if (isStarting) return "Connecting...";
    if (isConnected && !hasReceivedFirstAgentResponse) return "Connecting...";
    if (isAgentSpeaking) return "Agent is speaking...";
    switch (agentStatus) {
      case "connecting":
        return "Connecting...";
      case "listening":
        return "Now you can speak";
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
