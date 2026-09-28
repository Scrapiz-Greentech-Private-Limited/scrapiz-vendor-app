import { ApiService, VendorProfileSocketPayload } from './api';
import { AuthStorageService } from './authStorage';

type ProfileListener = (payload: VendorProfileSocketPayload) => void;

class VendorProfileSocketService {
  private ws: WebSocket | null = null;
  private listeners = new Set<ProfileListener>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: ProfileListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start() {
    if (this.ws || this.isActive) {
      return;
    }

    this.isActive = true;
    const token = await AuthStorageService.getToken();
    if (!token) {
      this.isActive = false;
      return;
    }

    const ws = new WebSocket(ApiService.getVendorProfileSocketUrl(token));
    this.ws = ws;

    ws.onopen = () => {
      console.log('[VendorProfileSocket] Connected for real-time notifications');
      // Clear any pending reconnection
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      // Start heartbeat to keep connection alive
      this.startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as VendorProfileSocketPayload;
        if (payload?.type === 'profile_status' || payload?.type === 'face_reupload_request') {
          console.log('[VendorProfileSocket] Received notification:', payload.type);
          // Emit immediately for <1s notification delivery
          this.emit(payload);
        }
      } catch (error) {
        console.warn('Invalid vendor profile socket payload', error);
      }
    };

    ws.onclose = () => {
      console.log('[VendorProfileSocket] Disconnected, reconnecting...');
      this.stopHeartbeat();
      this.ws = null;
      if (this.isActive && !this.reconnectTimeout) {
        // Fast reconnection for near-instant notifications (5s max)
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.isActive = false;
          void this.start();
        }, 2000); // Reduced from 3000ms to 2000ms for faster reconnection
      }
    };

    ws.onerror = () => {
      console.warn('[VendorProfileSocket] Connection error');
      ws.close();
    };
  }

  stop() {
    this.isActive = false;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private startHeartbeat() {
    // Send ping every 25 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.warn('[VendorProfileSocket] Heartbeat failed', error);
        }
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private emit(payload: VendorProfileSocketPayload) {
    this.listeners.forEach((listener) => listener(payload));
  }
}

export const vendorProfileSocketService = new VendorProfileSocketService();
