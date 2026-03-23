export const CHAT_SESSION_ID_KEY = 'kai-session-id';
export const CHAT_MESSAGES_KEY = 'kai-messages';
export const CHAT_STATE_EVENT = 'kai-chat-state-changed';

type ChatMessageLike = {
  id?: string;
  role?: string;
  timestamp?: string;
};

function dispatchChatStateChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(CHAT_STATE_EVENT));
}

export function createChatSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getStoredChatSessionId() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(CHAT_SESSION_ID_KEY);
}

export function setStoredChatSessionId(sessionId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CHAT_SESSION_ID_KEY, sessionId);
  dispatchChatStateChanged();
}

export function setStoredChatMessages(messages: unknown[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
  dispatchChatStateChanged();
}

export function clearStoredChatMessages() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(CHAT_MESSAGES_KEY);
  dispatchChatStateChanged();
}

function getAdminReadMarkerKey(sessionId: string) {
  return `kai-last-read-admin-id:${sessionId}`;
}

export function getLatestAdminMessageId(messages: ChatMessageLike[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'admin' && message.id) {
      return message.id;
    }
  }

  return null;
}

export function markLatestAdminMessageRead(sessionId: string, messages: ChatMessageLike[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const latestAdminMessageId = getLatestAdminMessageId(messages);
  if (!latestAdminMessageId) {
    return;
  }

  const storageKey = getAdminReadMarkerKey(sessionId);
  const currentReadMarker = window.localStorage.getItem(storageKey);

  if (currentReadMarker !== latestAdminMessageId) {
    window.localStorage.setItem(storageKey, latestAdminMessageId);
    dispatchChatStateChanged();
  }
}

export function clearAdminReadMarker(sessionId: string | null) {
  if (typeof window === 'undefined' || !sessionId) {
    return;
  }

  window.localStorage.removeItem(getAdminReadMarkerKey(sessionId));
  dispatchChatStateChanged();
}

export function hasUnreadAdminMessages(sessionId: string, messages: ChatMessageLike[]) {
  if (typeof window === 'undefined') {
    return false;
  }

  const latestAdminMessageId = getLatestAdminMessageId(messages);
  if (!latestAdminMessageId) {
    return false;
  }

  return window.localStorage.getItem(getAdminReadMarkerKey(sessionId)) !== latestAdminMessageId;
}

export function notifyChatStateChanged() {
  dispatchChatStateChanged();
}
