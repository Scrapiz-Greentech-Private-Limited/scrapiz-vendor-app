import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiService } from './api';
import { AuthStorageService } from './authStorage';
import {
  displayNotification,
  initializeNotificationChannels,
  registerBackgroundHandler,
  setupNotifeeEventHandler,
  VendorNotificationData,
} from './notifeeService';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    if (Platform.OS === 'android') {
      const { title, body, data } = notification.request.content;
      try {
        await displayNotification(
          title || 'Scrapiz Partner',
          body || '',
          data as VendorNotificationData,
          (data as VendorNotificationData | undefined)?.image,
          (data as VendorNotificationData | undefined)?.largeIcon,
        );

        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      } catch (error) {
        console.error('Vendor Notifee display failed, falling back to Expo:', error);
      }
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

if (Platform.OS === 'android') {
  registerBackgroundHandler();
}

export async function setupVendorNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
    });
  }

  await initializeNotificationChannels();
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined
  );
}

export async function registerVendorPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push permission denied for vendor app');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: getProjectId(),
  });
  const token = tokenData.data;

  try {
    await ApiService.registerPushToken(token, Device.deviceName || `${Platform.OS} vendor device`, 'vendor');
    await AuthStorageService.setPushToken(token);
  } catch (error) {
    console.warn('Failed to register vendor push token with backend:', error);
  }

  return token;
}

export async function unregisterVendorPushToken(token?: string): Promise<void> {
  const tokenToRemove = token || (await AuthStorageService.getPushToken());
  if (!tokenToRemove) {
    return;
  }

  await ApiService.unregisterPushToken(tokenToRemove);
  await AuthStorageService.removePushToken();
}

export function handleVendorNotificationNavigation(
  data: VendorNotificationData | undefined,
  navigate: (target: string, extraData?: any) => void,
): void {
  if (!data?.type) {
    navigate('home');
    return;
  }

  switch (data.type) {
    case 'face_reupload_request':
      navigate('face_reverification', data);
      return;
    case 'screen':
      navigate(data.value || 'home', data);
      return;
    case 'lead_detail':
      navigate('home', data);
      return;
    case 'booking_detail':
      navigate('ongoing', data);
      return;
    case 'order_update':
    case 'order_quote':
      navigate('ongoing', data);
      return;
    case 'url':
      return;
    default:
      navigate('home', data);
  }
}

export function setupVendorNotificationListeners(
  navigate: (target: string, extraData?: any) => void,
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as VendorNotificationData | undefined;
    if (data?.type === 'face_reupload_request') {
      navigate('face_reverification', data);
    }
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleVendorNotificationNavigation(
      response.notification.request.content.data as VendorNotificationData | undefined,
      navigate,
    );
  });

  const notifeeUnsubscribe = Platform.OS === 'android'
    ? setupNotifeeEventHandler((data) => handleVendorNotificationNavigation(data, navigate))
    : () => undefined;

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handleVendorNotificationNavigation(
        response.notification.request.content.data as VendorNotificationData | undefined,
        navigate,
      );
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
    notifeeUnsubscribe();
  };
}
