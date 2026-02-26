import { authConfig } from '@/constants/AuthConfig';
import type { SessionData } from '@/lib/session';

type BackendError = {
  message?: string;
};

async function parseOrThrow(response: Response) {
  if (response.ok) {
    return response.json();
  }

  const body = (await response.json().catch(() => ({}))) as BackendError;
  throw new Error(body.message ?? `Request failed with status ${response.status}`);
}

export async function signInWithGoogleIdToken(idToken: string): Promise<SessionData> {
  const response = await fetch(`${authConfig.backendUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  return parseOrThrow(response) as Promise<SessionData>;
}

export async function signInSimple(email: string, name: string): Promise<SessionData> {
  const response = await fetch(`${authConfig.backendUrl}/auth/simple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });

  return parseOrThrow(response) as Promise<SessionData>;
}

export async function logoutWithRefreshToken(refreshToken: string): Promise<void> {
  const response = await fetch(`${authConfig.backendUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.status === 204) {
    return;
  }

  const body = (await response.json().catch(() => ({}))) as BackendError;
  throw new Error(body.message ?? `Logout failed (${response.status})`);
}
