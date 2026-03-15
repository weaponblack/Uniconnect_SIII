import apiClient from './api-client';
import type { SessionData } from '@/lib/session';

export async function signInWithGoogleIdToken(idToken: string): Promise<SessionData> {
  const response = await apiClient.post<SessionData>('/auth/google', { idToken });
  return response.data;
}

export async function signInSimple(email: string, name: string): Promise<SessionData> {
  const response = await apiClient.post<SessionData>('/auth/simple', { email, name });
  return response.data;
}

export async function logoutWithRefreshToken(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}
