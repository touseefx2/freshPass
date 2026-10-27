let activeChatUserId: string | null = null;

export function setActiveChatUserId(userId: string | null) {
  activeChatUserId = userId;
}

export function getActiveChatUserId(): string | null {
  return activeChatUserId;
}
