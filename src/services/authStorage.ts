import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEYS = {
  USER: '@scrapiz_vendor_auth_user',
  TOKEN: '@scrapiz_vendor_auth_token',
  PUSH_TOKEN: '@scrapiz_vendor_push_token',
} as const;

export const AuthStorageService = {
  async getUser() {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  async setUser(user: unknown) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  },

  async removeUser() {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  },

  async getToken() {
    return AsyncStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  },

  async setToken(token: string) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
  },

  async removeToken() {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  },

  async getPushToken() {
    return AsyncStorage.getItem(AUTH_STORAGE_KEYS.PUSH_TOKEN);
  },

  async setPushToken(token: string) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.PUSH_TOKEN, token);
  },

  async removePushToken() {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.PUSH_TOKEN);
  },

  async clearSession() {
    await Promise.all([this.removeUser(), this.removeToken(), this.removePushToken()]);
  },
};
