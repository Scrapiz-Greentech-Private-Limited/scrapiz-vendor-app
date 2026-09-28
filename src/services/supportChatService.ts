/**
 * vendorApp/src/services/supportChatService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade in-app support chat service.
 *
 * Responsibilities:
 *  1. REST API calls (create thread, send message, fetch history, mark read)
 *  2. WebSocket connection to ws/support/vendor/<thread_id>/
 *  3. 30-second fallback polling (in case WS is disconnected)
 *  4. Local message state management with optimistic UI updates
 *
 * Architecture note:
 *  The server Celery Beat task polls the DB queue every 30s and pushes
 *  messages via WebSocket group_send. This service has a matching 30s
 *  HTTP poll as a resilient fallback in case the WS drops.
 */

import { ApiService, API_BASE_URL } from './api';
import { AuthStorageService } from './authStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageSenderType = 'vendor' | 'agent' | 'system';
export type MessageType       = 'text' | 'image' | 'file' | 'system';
export type ThreadStatus      = 'open' | 'pending' | 'active' | 'resolved' | 'closed';
export type ThreadTopic       = 'update_plan' | 'buy_plan' | 'booking_problem' | 'payment' | 'account' | 'other';

export interface SupportMessage {
  id:               string;
  thread:           string;
  sender_type:      MessageSenderType;
  sender_name:      string;
  message_type:     MessageType;
  body:             string;
  attachment_url:   string | null;
  attachment_name:  string | null;
  attachment_mime:  string | null;
  is_deleted:       boolean;
  vendor_read_at:   string | null;
  agent_read_at:    string | null;
  created_at:       string;
  is_mine:          boolean;
  // optimistic UI flag — not from server
  pending?:         boolean;
  failed?:          boolean;
}

export interface SupportThread {
  id:                   string;
  vendor_name:          string;
  agent_name:           string | null;
  status:               ThreadStatus;
  status_display:       string;
  topic:                ThreadTopic;
  topic_display:        string;
  last_message_at:      string | null;
  last_message_preview: string;
  unread_agent_count:   number;
  unread_vendor_count:  number;
  created_at:           string;
  resolved_at:          string | null;
  closed_at:            string | null;
  messages:             SupportMessage[];
}

export interface CreateThreadPayload {
  topic:            ThreadTopic;
  initial_message:  string;
  attachment_url?:  string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  force_new?: boolean;
}

export interface SendMessagePayload {
  body?:            string;
  message_type?:    MessageType;
  attachment_url?:  string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
}

type MessageListener = (messages: SupportMessage[]) => void;
type StatusListener  = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

// ── Service ───────────────────────────────────────────────────────────────────

class SupportChatService {
  private ws:                WebSocket | null = null;
  private currentThreadId:   string | null = null;
  private messages:          SupportMessage[] = [];
  private messageListeners = new Set<MessageListener>();
  private statusListeners  = new Set<StatusListener>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pollInterval:     ReturnType<typeof setInterval> | null = null;
  private isActive = false;
  private lastPollAt: string | null = null;

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Subscribe to message list updates. Returns unsubscribe fn. */
  subscribeMessages(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    listener(this.messages);
    return () => this.messageListeners.delete(listener);
  }

  /** Subscribe to WS connection status. Returns unsubscribe fn. */
  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Create a new thread or return the existing open thread for this topic. */
  async createThread(payload: CreateThreadPayload): Promise<SupportThread> {
    const response = await ApiService.post<SupportThread>('/support/threads/', payload);
    return response;
  }

  /** Load full thread detail (messages included) and start WS + poll. */
  async loadThread(threadId: string): Promise<SupportThread> {
    const thread = await ApiService.get<SupportThread>(`/support/threads/${threadId}/`);

    this.messages = (thread.messages ?? []).map((m) => ({
      ...m,
      is_mine: m.sender_type === 'vendor',
    }));
    this.lastPollAt = thread.messages?.at(-1)?.created_at ?? null;
    this.emitMessages();

    await this.startRealtime(threadId);
    return thread;
  }

  /** List all threads for the current vendor. */
  async listThreads(): Promise<SupportThread[]> {
    const resp = await ApiService.get<{ threads: SupportThread[] }>('/support/threads/');
    return resp.threads ?? [];
  }

  clearLocalConversation(): void {
    this.stop();
    this.messages = [];
    this.lastPollAt = null;
    this.emitMessages();
  }

  /**
   * Send a message with optimistic update.
   * Shows the message immediately in the UI, marks it pending=true,
   * then updates with the server response or marks failed on error.
   */
  async sendMessage(
    threadId: string,
    payload: SendMessagePayload,
  ): Promise<SupportMessage | null> {
    // Optimistic message
    const tempId  = `temp_${Date.now()}`;
    const optimistic: SupportMessage = {
      id:             tempId,
      thread:         threadId,
      sender_type:    'vendor',
      sender_name:    'You',
      message_type:   payload.message_type ?? 'text',
      body:           payload.body ?? '',
      attachment_url: payload.attachment_url ?? null,
      attachment_name: payload.attachment_name ?? null,
      attachment_mime: payload.attachment_mime ?? null,
      is_deleted:     false,
      vendor_read_at: new Date().toISOString(),
      agent_read_at:  null,
      created_at:     new Date().toISOString(),
      is_mine:        true,
      pending:        true,
    };

    this.messages = [...this.messages, optimistic];
    this.emitMessages();

    try {
      const sent = await ApiService.post<SupportMessage>(
        `/support/threads/${threadId}/messages/`,
        payload,
      );

      // Replace optimistic with confirmed server message
      this.messages = this.messages.map((m) =>
        m.id === tempId ? { ...sent, sender_type: 'vendor', is_mine: true } : m,
      );
      this.emitMessages();
      return sent;
    } catch (err) {
      // Mark as failed, keep in list so user can retry
      this.messages = this.messages.map((m) =>
        m.id === tempId ? { ...m, pending: false, failed: true } : m,
      );
      this.emitMessages();
      return null;
    }
  }

  /** Mark all messages in thread as read (vendor side). */
  async markRead(threadId: string): Promise<void> {
    try {
      await ApiService.post(`/support/threads/${threadId}/read/`);
    } catch {
      // Non-fatal
    }
  }

  /** Stop WebSocket + polling and clean up state. */
  stop(): void {
    this.isActive = false;
    this._clearReconnect();
    this._clearPoll();
    this.ws?.close();
    this.ws              = null;
    this.currentThreadId = null;
  }

  // ── Real-time: WebSocket ──────────────────────────────────────────────────

  private async startRealtime(threadId: string): Promise<void> {
    this.stop();
    this.isActive        = true;
    this.currentThreadId = threadId;

    await this._connectWs(threadId);
    this._startFallbackPoll(threadId);
  }

  private async _connectWs(threadId: string): Promise<void> {
    const token = await AuthStorageService.getToken();
    if (!token) return;

    this.emitStatus('connecting');
    const wsBase = API_BASE_URL.replace(/\/api\/?$/, '');
    const proto  = wsBase.startsWith('https://') ? 'wss' : 'ws';
    const host   = wsBase.replace(/^https?:\/\//, '');
    const url    = `${proto}://${host}/ws/support/vendor/${threadId}/?token=${encodeURIComponent(
      token.replace(/^Bearer\s+/i, ''),
    )}`;

    const ws = new WebSocket(url);
    this.ws  = ws;

    ws.onopen = () => {
      this.emitStatus('connected');
      // Heartbeat ping every 25s to keep connection alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(ping);
        }
      }, 25_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._handleWsEvent(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      this.emitStatus('disconnected');
      if (this.isActive && this.currentThreadId === threadId) {
        this._scheduleReconnect(threadId);
      }
    };

    ws.onerror = () => {
      this.emitStatus('error');
      ws.close();
    };
  }

  private _handleWsEvent(data: any): void {
    if (data.type === 'chat_message') {
      const isVendorMsg = data.sender_type === 'vendor';
      const incoming: SupportMessage = {
        id:             data.message_id,
        thread:         data.thread_id,
        sender_type:    data.sender_type,
        sender_name:    data.sender_name ?? (isVendorMsg ? 'You' : 'Support Agent'),
        message_type:   data.message_type ?? 'text',
        body:           data.body ?? '',
        attachment_url: data.attachment_url ?? null,
        attachment_name: data.attachment_name ?? null,
        attachment_mime: null,
        is_deleted:     false,
        vendor_read_at: null,
        agent_read_at:  null,
        created_at:     data.created_at,
        is_mine:        isVendorMsg,
      };

      // Deduplicate — server may send the same message via both WS and poll
      const alreadyExists = this.messages.some((m) => m.id === incoming.id);
      if (!alreadyExists) {
        this.messages = [...this.messages, incoming];
        this.emitMessages();
        this.lastPollAt = incoming.created_at;
      }
    }

    if (data.type === 'thread_resolved') {
      // Notify listeners — UI can show "This thread has been resolved" banner
      this.emitMessages();
    }
  }

  private _scheduleReconnect(threadId: string): void {
    this._clearReconnect();
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      void this._connectWs(threadId);
    }, 4_000);
  }

  private _clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // ── Fallback: 2-second HTTP polling ────────────────────────────────────────
  // Matches fast sync cycle. Fetches only messages newer than lastPollAt.

  private _startFallbackPoll(threadId: string): void {
    this._clearPoll();
    this.pollInterval = setInterval(() => {
      void this._pollNewMessages(threadId);
    }, 2_000);
  }

  private _clearPoll(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async _pollNewMessages(threadId: string): Promise<void> {
    // Only poll if WS is not connected (WS is preferred delivery path)
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      const url = this.lastPollAt
        ? `/support/threads/${threadId}/?since=${encodeURIComponent(this.lastPollAt)}`
        : `/support/threads/${threadId}/`;

      const thread = await ApiService.get<SupportThread>(url);
      const rawNew = (thread.messages ?? []).filter(
        (m) => !this.messages.some((existing) => existing.id === m.id),
      );
      const newMessages = rawNew.map((m) => ({
        ...m,
        is_mine: m.sender_type === 'vendor',
      }));

      if (newMessages.length > 0) {
        this.messages   = [...this.messages, ...newMessages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        this.lastPollAt = newMessages.at(-1)?.created_at ?? this.lastPollAt;
        this.emitMessages();
      }
    } catch {
      // Non-fatal — next poll will try again
    }
  }

  // ── Emitters ──────────────────────────────────────────────────────────────

  private emitMessages(): void {
    this.messageListeners.forEach((l) => l(this.messages));
  }

  private emitStatus(s: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.statusListeners.forEach((l) => l(s));
  }
}

// Singleton — one connection per app session
export const supportChatService = new SupportChatService();
