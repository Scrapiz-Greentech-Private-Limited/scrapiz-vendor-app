import { ApiService, VendorProfileSocketPayload } from './api';
import { AuthStorageService } from './authStorage';

type ProfileListener = (payload: VendorProfileSocketPayload) => void;

class VendorProfileSocketService {
  private ws: WebSocket | null = null;
  private listeners = new Set<ProfileListener>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;

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

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as VendorProfileSocketPayload;
        if (payload?.type === 'profile_status' || payload?.type === 'face_reupload_request') {
          this.emit(payload);
        }
      } catch (error) {
        console.warn('Invalid vendor profile socket payload', error);
      }
    };

    ws.onclose = () => {
      this.ws = null;
      if (this.isActive && !this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.isActive = false;
          void this.start();
        }, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  stop() {
    this.isActive = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private emit(payload: VendorProfileSocketPayload) {
    this.listeners.forEach((listener) => listener(payload));
  }
}

export const vendorProfileSocketService = new VendorProfileSocketService();
