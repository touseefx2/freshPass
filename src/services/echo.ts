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

import EchoImport from "laravel-echo";
// React Native build — avoids Node WS/http deps that break Metro
import PusherImport from "pusher-js/react-native";

type EchoConstructor = typeof import("laravel-echo").default;
type PusherConstructor = typeof import("pusher-js").default;

/** Metro/CJS interop: default import may be module namespace, not the class. */
function resolveConstructor<T>(mod: unknown, namedKey?: string): T {
  if (typeof mod === "function") return mod as T;
  if (mod && typeof mod === "object") {
    const obj = mod as Record<string, unknown>;
    if (typeof obj.default === "function") return obj.default as T;
    if (namedKey && typeof obj[namedKey] === "function") {
      return obj[namedKey] as T;
    }
  }
  throw new TypeError(
    `[Echo] Could not resolve constructor${namedKey ? ` (${namedKey})` : ""}`,
  );
}

const Echo = resolveConstructor<EchoConstructor>(EchoImport);
const Pusher = resolveConstructor<PusherConstructor>(PusherImport, "Pusher");

declare global {
  interface Window {
    Pusher?: PusherConstructor;
  }
}

// Laravel Echo expects Pusher on window (web) or global (React Native)
if (typeof global !== "undefined") {
  (global as unknown as { Pusher: PusherConstructor }).Pusher = Pusher;
}
if (typeof window !== "undefined") {
  window.Pusher = Pusher;
}

const REVERB_APP_KEY =
  process.env.EXPO_PUBLIC_REVERB_APP_KEY ||
  process.env.EXPO_PUBLIC_VITE_REVERB_APP_KEY ||
  "";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

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
  const port = portEnv ? parseInt(portEnv, 10) : forceTLS ? 443 : 8080;
  if (Number.isNaN(port)) return { wsPort: 8080, wssPort: 443 };
  return { wsPort: forceTLS ? 443 : port, wssPort: 443 };
}

let echoInstance: InstanceType<EchoConstructor> | null = null;
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
  if (!REVERB_APP_KEY || !accessToken || !accessToken.trim()) {
    if (__DEV__) {
      console.log("[Echo] getEchoConfig null:", {
        hasKey: Boolean(REVERB_APP_KEY),
        keyLength: REVERB_APP_KEY?.length ?? 0,
        hasToken: Boolean(accessToken?.trim()),
      });
    }
    return null;
  }
  const wsHost = getWsHost();
  const authEndpoint = getAuthEndpoint();
  if (!wsHost || !authEndpoint) {
    if (__DEV__) {
      console.log("[Echo] getEchoConfig null: missing host/auth", {
        wsHost,
        authEndpoint,
      });
    }
    return null;
  }

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
export function getEcho(
  accessToken: string | null,
): InstanceType<EchoConstructor> | null {
  if (!accessToken || !accessToken.trim()) {
    if (echoInstance) {
      try {
        (
          echoInstance as unknown as {
            connector: { pusher?: { disconnect?: () => void } };
          }
        ).connector?.pusher?.disconnect?.();
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
      (
        echoInstance as unknown as {
          connector: { pusher?: { disconnect?: () => void } };
        }
      ).connector?.pusher?.disconnect?.();
    } catch {
      // ignore
    }
    echoInstance = null;
  }

  try {
    if (__DEV__) {
      console.log("[Echo] config", {
        key: config.key ? `${config.key.slice(0, 6)}…` : "(empty)",
        keyLength: config.key?.length ?? 0,
        wsHost: config.wsHost,
        wsPort: config.wsPort,
        wssPort: config.wssPort,
        forceTLS: config.forceTLS,
        authEndpoint: config.authEndpoint,
      });
      (Pusher as unknown as { logToConsole?: boolean }).logToConsole = true;
    }

    echoInstance = new Echo({
      broadcaster: "reverb",
      key: config.key,
      wsHost: config.wsHost,
      wsPort: config.wsPort,
      wssPort: config.wssPort,
      forceTLS: config.forceTLS,
      authEndpoint: config.authEndpoint,
      auth: config.auth,
      enabledTransports: ["ws", "wss"],
      // Must be the Pusher class — module namespace causes "constructor is not callable"
      Pusher,
    });
    lastToken = accessToken;
    if (__DEV__) console.log("[Echo] instance created OK");
    return echoInstance;
  } catch (err) {
    if (__DEV__) console.log("[Echo] new Echo() FAILED", err);
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
