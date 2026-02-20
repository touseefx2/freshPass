/**
 * Laravel Echo + Reverb (Pusher) setup for real-time chat.
 * Uses authEndpoint with Bearer token for private channel auth.
 *
 * Env (match backend Reverb):
 * - EXPO_PUBLIC_REVERB_APP_KEY  → same as backend REVERB_APP_KEY
 * - EXPO_PUBLIC_REVERB_WS_HOST  → Reverb host, e.g. 127.0.0.1 (local) or your domain (prod). If missing, derived from API_BASE_URL
 * - EXPO_PUBLIC_REVERB_WS_PORT  → Reverb port, e.g. 8080 (local) or 443 (prod). If missing, derived from scheme
 * - EXPO_PUBLIC_REVERB_SCHEME   → http (local) or https (prod). If missing, derived from API_BASE_URL
 * - EXPO_PUBLIC_API_BASE_URL    → used for authEndpoint; also used to derive ws host/port/scheme when Reverb vars not set
 *
 * Backend may give a Vite config (window.Echo with VITE_REVERB_*). This is the Expo/RN equivalent:
 * same Reverb server, same key; we use EXPO_PUBLIC_* and auth with Bearer token for private channels.
 */

import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher?: typeof Pusher;
  }
}

// Laravel Echo expects Pusher on window (web) or global (React Native)
if (typeof global !== "undefined") {
  (global as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
}
if (typeof window !== "undefined") {
  window.Pusher = Pusher;
}

const REVERB_APP_KEY =
  process.env.EXPO_PUBLIC_REVERB_APP_KEY || process.env.EXPO_PUBLIC_VITE_REVERB_APP_KEY || "";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

function getWsHost(): string {
  const explicit = process.env.EXPO_PUBLIC_REVERB_WS_HOST;
  if (explicit && explicit.trim()) return explicit.trim();
  try {
    const url = new URL(API_BASE_URL || "https://placeholder.com");
    return url.hostname;
  } catch {
    return "";
  }
}

function getAuthEndpoint(): string {
  if (!API_BASE_URL) return "";
  return `${API_BASE_URL}/api/broadcasting/auth`;
}

/** Use https when scheme is explicitly https or when API_BASE_URL is https */
function getForceTLS(): boolean {
  const scheme = (process.env.EXPO_PUBLIC_REVERB_SCHEME || "").toLowerCase();
  if (scheme === "https") return true;
  if (scheme === "http") return false;
  return API_BASE_URL.startsWith("https://");
}

/** wsPort for non-TLS (e.g. 8080 local), wssPort for TLS (443) */
function getWsPorts(): { wsPort: number; wssPort: number } {
  const forceTLS = getForceTLS();
  const portEnv = process.env.EXPO_PUBLIC_REVERB_WS_PORT;
  const port = portEnv ? parseInt(portEnv, 10) : (forceTLS ? 443 : 8080);
  if (Number.isNaN(port)) return { wsPort: 8080, wssPort: 443 };
  return { wsPort: forceTLS ? 443 : port, wssPort: 443 };
}

let echoInstance: Echo<"reverb"> | null = null;
let lastToken: string | null = null;

export interface EchoConfig {
  /** Reverb app key */
  key: string;
  /** WebSocket host (no http/https) */
  wsHost: string;
  wsPort: number;
  wssPort: number;
  forceTLS: boolean;
  authEndpoint: string;
  auth: {
    headers: {
      Authorization: string;
      Accept: string;
    };
  };
}

/**
 * Get Echo config for the given access token. Use this to build Echo instance.
 */
export function getEchoConfig(accessToken: string | null): EchoConfig | null {
  if (!REVERB_APP_KEY || !accessToken || !accessToken.trim()) return null;
  const wsHost = getWsHost();
  const authEndpoint = getAuthEndpoint();
  if (!wsHost || !authEndpoint) return null;

  const { wsPort, wssPort } = getWsPorts();
  return {
    key: REVERB_APP_KEY,
    wsHost,
    wsPort,
    wssPort,
    forceTLS: getForceTLS(),
    authEndpoint,
    auth: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  };
}

/**
 * Get or create Echo instance. Reuses same instance when token unchanged.
 * Pass null token to disconnect and clear.
 */
export function getEcho(accessToken: string | null): Echo<"reverb"> | null {
  if (!accessToken || !accessToken.trim()) {
    if (echoInstance) {
      try {
        (echoInstance as unknown as { connector: { pusher?: { disconnect?: () => void } } }).connector?.pusher?.disconnect?.();
      } catch {
        // ignore
      }
      echoInstance = null;
      lastToken = null;
    }
    return null;
  }

  const config = getEchoConfig(accessToken);
  if (!config) return null;

  if (echoInstance && lastToken === accessToken) {
    return echoInstance;
  }

  if (echoInstance) {
    try {
      (echoInstance as unknown as { connector: { pusher?: { disconnect?: () => void } } }).connector?.pusher?.disconnect?.();
    } catch {
      // ignore
    }
    echoInstance = null;
  }

  try {
    echoInstance = new Echo({
      broadcaster: "reverb",
      key: config.key,
      wsHost: config.wsHost,
      wsPort: config.wsPort,
      wssPort: config.wssPort,
      forceTLS: config.forceTLS,
      authEndpoint: config.authEndpoint,
      auth: config.auth,
      enabledTransports: ["ws", "wss"], // match web (Vite) config; use only ws/wss
      Pusher, // so connector works in React Native when window.Pusher is missing
    });
    lastToken = accessToken;
    return echoInstance;
  } catch (err) {
    return null;
  }
}

/**
 * Private channel name for 1:1 chat (matches web: chat.{id1}.{id2} with sorted ids).
 * Echo.private(thisName) subscribes to private-chat.{id1}.{id2} on Reverb.
 */
export function getPrivateChatChannelName(
  currentUserId: string | number,
  otherUserId: string,
): string {
  const a = Number(currentUserId);
  const b = Number(otherUserId);
  const [id1, id2] = a <= b ? [a, b] : [b, a];
  return `chat.${id1}.${id2}`;
}

/** New message event (matches backend .message.sent) */
export const CHAT_MESSAGE_EVENT = ".message.sent";

/** Read receipts event */
export const CHAT_MESSAGES_READ_EVENT = ".messages.read";

/** Whisper event names for typing indicator */
export const CHAT_WHISPER_TYPING = "typing";
export const CHAT_WHISPER_STOP_TYPING = "stop-typing";
