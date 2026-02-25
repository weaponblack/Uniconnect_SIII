import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google.js';
import { makeRedirectUri } from 'expo-auth-session';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { authConfig, validateAuthConfig } from '@/constants/AuthConfig';
import { saveSession } from '@/lib/session';
import { signInWithGoogleIdToken } from '@/lib/auth-api';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const missingConfig = useMemo(
    () => validateAuthConfig(Platform.OS as 'web' | 'android' | 'ios'),
    []
  );
  const appOwnership = Constants.appOwnership;
  const isExpoGo = appOwnership === 'expo';
  const redirectUri = useMemo(
    () => {
      if (Platform.OS === 'web') {
        return makeRedirectUri({
          path: 'oauth',
        });
      }

      return makeRedirectUri({
        scheme: authConfig.scheme,
        path: 'oauth',
      });
    },
    []
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: authConfig.googleWebClientId || undefined,
      iosClientId: Platform.OS === 'ios' ? authConfig.googleIosClientId || undefined : undefined,
      androidClientId:
        Platform.OS === 'android' ? authConfig.googleAndroidClientId || undefined : undefined,
      selectAccount: true,
      extraParams: {
        prompt: 'select_account consent',
        ...(authConfig.googleHostedDomain ? { hd: authConfig.googleHostedDomain } : {}),
      },
      redirectUri,
    },
    Platform.OS === 'web' ? {} : { native: redirectUri }
  );

  useEffect(() => {
    async function handleResponse() {
      if (!response) {
        return;
      }

      if (response.type === 'error') {
        const authError =
          typeof response.error?.message === 'string'
            ? response.error.message
            : 'Google devolvio un error de autenticacion.';
        setStatusText(`Google error: ${authError}`);
        Alert.alert('Error de Google', authError);
        return;
      }

      if (response?.type !== 'success') {
        setStatusText(`OAuth response: ${response.type}`);
        return;
      }

      const possibleResponse = response as unknown as {
        params?: { id_token?: string; idToken?: string };
        authentication?: { idToken?: string | null };
      };
      const idToken =
        possibleResponse.params?.id_token ??
        possibleResponse.params?.idToken ??
        possibleResponse.authentication?.idToken ??
        '';

      if (!idToken) {
        setStatusText('Google no devolvio idToken en la respuesta.');
        Alert.alert('Error', 'Google no devolvio idToken.');
        setIsSubmitting(false);
        return;
      }

      try {
        setIsSubmitting(true);
        setStatusText('Validando token con backend...');
        const session = await signInWithGoogleIdToken(idToken);
        await saveSession(session);
        setStatusText('Login OK, redirigiendo a dashboard...');
        router.replace('/dashboard');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
        setStatusText(`Backend error: ${message}`);
        Alert.alert('Error de autenticacion', message);
      } finally {
        setIsSubmitting(false);
      }
    }

    void handleResponse();
  }, [response]);

  function handleGoogleSignup() {
    if (missingConfig.length > 0) {
      Alert.alert(
        'Configuracion incompleta',
        `Faltan variables en front/.env: ${missingConfig.join(', ')}`
      );
      return;
    }

    if (isExpoGo && Platform.OS !== 'web') {
      Alert.alert(
        'Development Build requerido',
        'Para Android/iOS debes probar Google Sign-In en un development build, no en Expo Go.'
      );
      return;
    }

    void promptAsync();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Usa tu correo institucional para acceder a UniConnect.</Text>

      <Pressable
        disabled={!request || isSubmitting}
        style={({ pressed }) => [
          styles.googleButton,
          (pressed || isSubmitting || !request) && styles.googleButtonDisabled,
        ]}
        onPress={handleGoogleSignup}>
        <Text style={styles.googleLogo}>G</Text>
        <Text style={styles.googleLabel}>
          {isSubmitting ? 'Validando...' : 'Sign up with Google'}
        </Text>
      </Pressable>

      <Text style={styles.note}>
        Backend: {authConfig.backendUrl}
      </Text>
      <Text style={styles.note}>
        Google client ({Platform.OS}):{' '}
        {Platform.OS === 'web'
          ? authConfig.googleWebClientId
          : Platform.OS === 'android'
            ? authConfig.googleAndroidClientId
            : authConfig.googleIosClientId}
      </Text>
      <Text style={styles.note}>App ownership: {appOwnership ?? 'unknown'}</Text>
      <Text style={styles.note}>Redirect URI: {request?.redirectUri ?? redirectUri}</Text>
      {authConfig.googleHostedDomain ? (
        <Text style={styles.note}>Hosted domain: {authConfig.googleHostedDomain}</Text>
      ) : null}
      {statusText ? <Text style={styles.status}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 26,
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleLogo: {
    width: 24,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#ea4335',
  },
  googleLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  note: {
    marginTop: 16,
    fontSize: 13,
    color: '#6b7280',
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    color: '#111827',
  },
});
