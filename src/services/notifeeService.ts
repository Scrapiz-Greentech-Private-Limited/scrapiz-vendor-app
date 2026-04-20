import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  Event,
  EventType,
} from '@notifee/react-native';
import { Linking, Platform } from 'react-native';

const DEFAULT_LARGE_ICON = 'https://api.scrapiz.in/static/images/scrapiz-icon.png';

export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'vendor_default',
  LEADS: 'vendor_leads',
  BOOKINGS: 'vendor_bookings',
  PAYMENTS: 'vendor_payments',
  ANNOUNCEMENTS: 'vendor_announcements',
} as const;

export interface VendorNotificationData {
  type?: 'screen' | 'url' | 'lead_detail' | 'booking_detail' | 'order_update' | 'order_quote';
  value?: string;
  leadId?: string;
  bookingId?: string;
  orderId?: string;
  orderNumber?: string;
  category?: string;
  image?: string;
  largeIcon?: string;
}

export async function initializeNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await notifee.createChannel({
    id: NOTIFICATION_CHANNELS.DEFAULT,
    name: 'General',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: NOTIFICATION_CHANNELS.LEADS,
    name: 'Lead Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: NOTIFICATION_CHANNELS.BOOKINGS,
    name: 'Booking Updates',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: NOTIFICATION_CHANNELS.PAYMENTS,
    name: 'Payments',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await notifee.createChannel({
    id: NOTIFICATION_CHANNELS.ANNOUNCEMENTS,
    name: 'Announcements',
    importance: AndroidImportance.DEFAULT,
  });
}

function getChannelId(category?: string): string {
  switch (category) {
    case 'lead_updates':
      return NOTIFICATION_CHANNELS.LEADS;
    case 'booking_updates':
    case 'order_updates':
      return NOTIFICATION_CHANNELS.BOOKINGS;
    case 'payment_alerts':
      return NOTIFICATION_CHANNELS.PAYMENTS;
    case 'announcements':
      return NOTIFICATION_CHANNELS.ANNOUNCEMENTS;
    default:
      return NOTIFICATION_CHANNELS.DEFAULT;
  }
}

export async function displayNotification(
  title: string,
  body: string,
  data?: VendorNotificationData,
  imageUrl?: string,
  largeIconUrl?: string,
): Promise<string | undefined> {
  try {
    const effectiveLargeIcon = largeIconUrl || data?.largeIcon || DEFAULT_LARGE_ICON;
    const effectiveImage = imageUrl || data?.image;

    const android: any = {
      channelId: getChannelId(data?.category),
      smallIcon: 'notification_icon',
      largeIcon: effectiveLargeIcon,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      showTimestamp: true,
      category: AndroidCategory.MESSAGE,
      color: '#16a34a',
    };

    android.style = effectiveImage
      ? {
          type: AndroidStyle.BIGPICTURE,
          picture: effectiveImage,
          largeIcon: effectiveLargeIcon,
        }
      : {
          type: AndroidStyle.BIGTEXT,
          text: body,
        };

    return await notifee.displayNotification({
      title,
      body,
      data: data as Record<string, string> | undefined,
      android,
      ios: { sound: 'default' },
    });
  } catch (error) {
    console.error('Failed to display vendor notification via Notifee:', error);
    return undefined;
  }
}

export function setupNotifeeEventHandler(
  navigate: (data?: VendorNotificationData) => void,
): () => void {
  return notifee.onForegroundEvent(({ type, detail }: Event) => {
    if (type === EventType.PRESS) {
      navigate(detail.notification?.data as VendorNotificationData | undefined);
    }
  });
}

export function registerBackgroundHandler(): void {
  notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
    if (type === EventType.PRESS) {
      const data = detail.notification?.data as VendorNotificationData | undefined;
      if (data?.type === 'url' && data.value) {
        await Linking.openURL(data.value).catch(() => undefined);
      }
    }
  });
}
