export const authConfig = {
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:4000',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleHostedDomain: process.env.EXPO_PUBLIC_GOOGLE_HOSTED_DOMAIN ?? '',
  scheme: 'uniconnect-g5',
};

export function validateAuthConfig(platform: 'web' | 'android' | 'ios'): string[] {
  const missing: string[] = [];

  if (platform === 'web') {
    if (!authConfig.googleWebClientId) {
      missing.push('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    }
    return missing;
  }

  if (platform === 'android' && !authConfig.googleAndroidClientId) {
    missing.push('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
  }

  if (platform === 'ios' && !authConfig.googleIosClientId) {
    missing.push('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
  }

  return missing;
}
