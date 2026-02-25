import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'session.accessToken';
const REFRESH_TOKEN_KEY = 'session.refreshToken';
const USER_KEY = 'session.user';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
};

export type SessionData = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export async function saveSession(data: SessionData): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
}

export async function loadSession(): Promise<SessionData | null> {
  if (Platform.OS === 'web') {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const userSerialized = localStorage.getItem(USER_KEY);

    if (!accessToken || !refreshToken || !userSerialized) {
      return null;
    }

    const user = JSON.parse(userSerialized) as SessionUser;
    return { accessToken, refreshToken, user };
  }

  const [accessToken, refreshToken, userSerialized] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  if (!accessToken || !refreshToken || !userSerialized) {
    return null;
  }

  const user = JSON.parse(userSerialized) as SessionUser;
  return { accessToken, refreshToken, user };
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
