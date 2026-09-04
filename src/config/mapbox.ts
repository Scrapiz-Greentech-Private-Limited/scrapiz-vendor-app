import Constants from 'expo-constants';
import Mapbox from '@rnmapbox/maps';

const FALLBACK_PUBLIC_MAPBOX_TOKEN =
  'pk.eyJ1IjoiYXlhYW5hbWphZCIsImEiOiJjbWhxbW1veHcwdnB2MmpzNDA2emo1aWp3In0.Mc5kN89_lqGeagn5jWvvzA';

const expoExtraToken =
  (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ||
  (Constants.manifest2?.extra?.expoClient?.extra?.mapboxAccessToken as string | undefined);

export const MAPBOX_PUBLIC_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_API_KEY || expoExtraToken || FALLBACK_PUBLIC_MAPBOX_TOKEN;

let isMapboxConfigured = false;

export const ensureMapboxConfigured = (): boolean => {
  if (isMapboxConfigured) {
    return true;
  }

  if (!MAPBOX_PUBLIC_TOKEN) {
    console.warn('[Mapbox] Missing EXPO_PUBLIC_MAPBOX_API_KEY / extra.mapboxAccessToken');
    return false;
  }

  Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  isMapboxConfigured = true;
  return true;
};
