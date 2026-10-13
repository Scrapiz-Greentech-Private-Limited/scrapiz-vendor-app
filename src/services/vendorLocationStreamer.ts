import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ApiService } from './api';
import { AuthStorageService } from './authStorage';
import { VendorCoordinates } from '../types';

type LocationListener = (coords: VendorCoordinates | null) => void;

const LOCATION_HEARTBEAT_MS = 15000;
const BACKGROUND_LOCATION_TASK = 'scrapiz-vendor-background-location';

type BackgroundLocationTaskData = {
  locations?: Location.LocationObject[];
};

const toVendorCoordinates = (location: Location.LocationObject): VendorCoordinates => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  heading: location.coords.heading,
  speed: location.coords.speed,
  accuracy: location.coords.accuracy,
  timestamp: location.timestamp,
});

/**
 * This task is registered at module load time so Android can invoke it when the
 * app process is not in the foreground. Keep it independent of the React UI.
 */
TaskManager.defineTask<BackgroundLocationTaskData>(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.warn('Background vendor location task failed', error);
      return;
    }

    const location = data?.locations?.[data.locations.length - 1];
    if (!location) {
      return;
    }

    const user = await AuthStorageService.getUser();
    if (!user?.isOnline) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => undefined);
      return;
    }

    const coords = toVendorCoordinates(location);
    try {
      await ApiService.updateVendorLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? null,
        timestamp: coords.timestamp,
      });
    } catch (taskError) {
      // A transient network failure should not unregister the location task.
      console.warn('Unable to upload background vendor location', taskError);
    }
  },
);

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

  recordCoords(coords: VendorCoordinates) {
    this.latestCoords = coords;
    this.notifyListeners();
    void this.sendLocation(coords.latitude, coords.longitude);
  }

  async forceStartJobTracking(token?: string) {
    if (token) {
      this.token = token;
    }

    if (!this.token) {
      this.token = await AuthStorageService.getToken();
    }

    this.connectWebSocket();

    if (this.watchSubscription) {
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      this.isStreaming = true;

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (initial?.coords) {
          const initCoords: VendorCoordinates = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: initial.coords.heading,
            speed: initial.coords.speed,
            accuracy: initial.coords.accuracy,
            timestamp: initial.timestamp,
          };
          this.recordCoords(initCoords);
        }
      } catch {
        // Fallback directly to watchPositionAsync
      }

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
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
          this.recordCoords(nextCoords);
        },
      );

      this.startLocationHeartbeat();
    } catch (error) {
      console.warn('Job tracking GPS watch failed', error);
    }
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

      await this.startBackgroundLocationUpdates();
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

    void this.stopBackgroundLocationUpdates();
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
      await this.startBackgroundLocationUpdates();
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
    const payload = JSON.stringify({
      latitude,
      longitude,
      accuracy: this.latestCoords?.accuracy ?? null,
      timestamp: this.latestCoords?.timestamp ?? null,
    });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return;
    }

    try {
      await ApiService.updateVendorLocation({
        latitude,
        longitude,
        accuracy: this.latestCoords?.accuracy ?? null,
        timestamp: this.latestCoords?.timestamp ?? null,
      });
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
    if (!this.isStreaming) {
      return;
    }

    if (this.latestCoords) {
      try {
        await ApiService.updateVendorLocation({
          latitude: this.latestCoords.latitude,
          longitude: this.latestCoords.longitude,
          accuracy: this.latestCoords.accuracy ?? null,
          timestamp: this.latestCoords.timestamp ?? null,
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
        accuracy: coords.accuracy ?? null,
        timestamp: coords.timestamp ?? null,
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

  private async startBackgroundLocationUpdates() {
    if (!this.isOnline || !this.hasBackgroundPermission) {
      return;
    }

    try {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (alreadyStarted) {
        return;
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
        foregroundService: {
          notificationTitle: 'Scrapiz Partner is Online',
          notificationBody: 'Your location is being shared for pickup coordination.',
          notificationColor: '#16a34a',
          killServiceOnDestroy: false,
        },
      });
    } catch (error) {
      console.warn('Unable to start background vendor location updates', error);
    }
  }

  private async stopBackgroundLocationUpdates() {
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (started) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (error) {
      console.warn('Unable to stop background vendor location updates', error);
    }
  }
}

export const vendorLocationStreamer = new VendorLocationStreamer();
