/**
 * Shared chat contacts API and transform for dashboard chat list.
 * Used by dashboard (chat) screen and dashboard _layout socket.
 */
import type { ChatContactItem } from "@/src/state/slices/generalSlice";
import { ApiService } from "./api";

export const CHAT_CONTACTS_URL = "/api/chat/contacts";

export type ApiContact = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  unread_count: number;
  latest_message?: {
    id: number;
    message: string | null;
    sender: { id: number; name: string; email: string };
    attachments?: string[];
    created_at: string;
  };
  last_message_at: string | null;
};

export type ContactsResponse = {
  success: boolean;
  message: string;
  data: {
    data: ApiContact[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
};

function getAvatarUrl(avatar: string | null): string {
  if (!avatar || avatar.trim() === "") {
    return process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  }
  const trimmed = avatar.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return path
    ? `${base}/${path}`
    : (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "");
}

function formatTimeLabel(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (dateOnly.getTime() === today.getTime()) {
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min`;
    const diffHrs = Math.floor(diffMins / 60);
    return `${diffHrs} hr`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) return "Yesterday";
  const d = `${date.getDate()}`.padStart(2, "0");
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function contactToChatItem(c: ApiContact): ChatContactItem {
  const createdAt =
    c.last_message_at ?? c.latest_message?.created_at ?? "1970-01-01T00:00:00Z";
  let message = "No message";
  if (c.latest_message) {
    if (c.latest_message.message) message = c.latest_message.message;
    else if (c.latest_message.attachments?.length) message = "Attachment";
    else message = "No message";
  }
  return {
    id: String(c.id),
    name: c.name,
    message,
    timeLabel: formatTimeLabel(createdAt),
    createdAt,
    isHighlighted: (c.unread_count ?? 0) > 0,
    image: getAvatarUrl(c.avatar),
  };
}

const PER_PAGE = 20;

export async function fetchChatContactsApi(
  page: number,
): Promise<{
  list: ChatContactItem[];
  current_page: number;
  last_page: number;
}> {
  const res = await ApiService.get<ContactsResponse>(CHAT_CONTACTS_URL, {
    params: { per_page: PER_PAGE, page },
  });
  const list = (res.data?.data ?? []).map(contactToChatItem);
  return {
    list,
    current_page: res.data?.meta?.current_page ?? page,
    last_page: res.data?.meta?.last_page ?? 1,
  };
}
