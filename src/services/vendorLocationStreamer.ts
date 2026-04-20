import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { ApiService } from './api';
import { AuthStorageService } from './authStorage';
import { VendorCoordinates } from '../types';

type LocationListener = (coords: VendorCoordinates | null) => void;

const LOCATION_HEARTBEAT_MS = 15000;

class VendorLocationStreamer {
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private listeners = new Set<LocationListener>();
  private latestCoords: VendorCoordinates | null = null;
  private isStreaming = false;
  private isOnline = false;
  private isForeground = true;
  private hasBackgroundPermission = false;

  constructor() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  subscribe(listener: LocationListener) {
    this.listeners.add(listener);
    listener(this.latestCoords);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getLatestCoords() {
    return this.latestCoords;
  }

  async setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    if (isOnline) {
      await this.refreshBackgroundPermission();
      await this.start();
      return;
    }

    this.stop();
  }

  async start(token?: string) {
    if (token) {
      this.token = token;
    }

    if (!this.token) {
      this.token = await AuthStorageService.getToken();
    }

    await this.refreshBackgroundPermission();

    const canTrackInCurrentState = this.isForeground || this.hasBackgroundPermission;

    if (!this.token || !this.isOnline || !canTrackInCurrentState || this.isStreaming) {
      return;
    }

    this.isStreaming = true;
    this.connectWebSocket();

    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (position) => {
          const nextCoords: VendorCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          this.latestCoords = nextCoords;
          this.notifyListeners();
          void this.sendLocation(nextCoords.latitude, nextCoords.longitude);
        },
      );

      this.startLocationHeartbeat();
    } catch (error) {
      console.warn('Vendor GPS watch failed', error);
      this.stop();
    }
  }

  stop() {
    this.isStreaming = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.ws?.close();
    this.ws = null;

    this.watchSubscription?.remove();
    this.watchSubscription = null;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  destroy() {
    this.stop();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.listeners.clear();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isForeground = nextAppState === 'active';

    if (this.isForeground && this.isOnline) {
      void this.start();
      return;
    }

    if (!this.isForeground && this.isOnline) {
      void this.syncBackgroundState();
      return;
    }

    this.stop();
  };

  private async syncBackgroundState() {
    await this.refreshBackgroundPermission();
    if (this.hasBackgroundPermission) {
      return;
    }

    this.stop();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.latestCoords));
  }

  private connectWebSocket() {
    if (!this.token || this.ws) {
      return;
    }

    const url = ApiService.getVendorLocationSocketUrl(this.token);
    const socket = new WebSocket(url);

    socket.onopen = () => {
      this.ws = socket;
      if (this.latestCoords) {
        void this.sendLocation(this.latestCoords.latitude, this.latestCoords.longitude);
      }
    };

    socket.onclose = () => {
      if (this.ws === socket) {
        this.ws = null;
      }
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };

    this.ws = socket;
  }

  private scheduleReconnect() {
    const canReconnect = this.isForeground || this.hasBackgroundPermission;
    if (!this.isStreaming || !this.isOnline || !canReconnect || this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connectWebSocket();
    }, 3000);
  }

  private async sendLocation(latitude: number, longitude: number) {
    const payload = JSON.stringify({ latitude, longitude });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return;
    }

    try {
      await ApiService.updateVendorLocation({ latitude, longitude });
    } catch {
      // Ignore fallback failures to keep streaming resilient.
    }
  }

  private startLocationHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.heartbeatInterval = setInterval(() => {
      void this.sendHeartbeatLocation();
    }, LOCATION_HEARTBEAT_MS);
  }

  private async sendHeartbeatLocation() {
    if (!this.isStreaming || !this.isOnline) {
      return;
    }

    if (this.latestCoords) {
      try {
        await ApiService.updateVendorLocation({
          latitude: this.latestCoords.latitude,
          longitude: this.latestCoords.longitude,
        });
      } catch {
        // Ignore heartbeat failures to avoid interrupting live tracking.
      }
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: VendorCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      this.latestCoords = coords;
      this.notifyListeners();

      await ApiService.updateVendorLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch {
      // Ignore heartbeat failures to avoid interrupting live tracking.
    }
  }

  private async refreshBackgroundPermission() {
    try {
      const background = await Location.getBackgroundPermissionsAsync();
      this.hasBackgroundPermission = background.status === 'granted';
    } catch {
      this.hasBackgroundPermission = false;
    }
  }
}

export const vendorLocationStreamer = new VendorLocationStreamer();
