import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google.js';
import { makeRedirectUri } from 'expo-auth-session';
import { Alert, Platform, Pressable, StyleSheet, Text, View, TextInput, ScrollView, Image } from 'react-native';
import Constants from 'expo-constants';
import { authConfig, validateAuthConfig } from '@/constants/AuthConfig';
import { saveSession } from '@/lib/session';
import { signInWithGoogleIdToken, signInSimple } from '@/lib/auth-api';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [loginMethod, setLoginMethod] = useState<'google' | 'simple' | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

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

  async function handleSimpleSignIn() {
    if (!email.trim()) {
      Alert.alert('Error', 'El correo es requerido');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('Iniciando sesion...');
      const session = await signInSimple(email, name);
      await saveSession(session);
      setStatusText('Login OK, redirigiendo a dashboard...');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
      setStatusText(`Error: ${message}`);
      Alert.alert('Error de autenticacion', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>UniConnect</Text>
      </View>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Text style={styles.subtitle}>Usa tu correo para acceder a UniConnect.</Text>

      <View style={[styles.methodSelector, !loginMethod && styles.methodSelectorColumn]}>
        <Pressable
          style={[
            styles.methodButton,
            loginMethod === 'simple' && styles.methodButtonActive,
          ]}
          onPress={() => setLoginMethod('simple')}>
          <Text style={[
            styles.methodButtonText,
            loginMethod === 'simple' && styles.methodButtonTextActive,
          ]}>
            Correo
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.methodButton,
            loginMethod === 'google' && styles.methodButtonActive,
          ]}
          onPress={() => setLoginMethod('google')}>
          <Text style={[
            styles.methodButtonText,
            loginMethod === 'google' && styles.methodButtonTextActive,
          ]}>
            Google
          </Text>
        </Pressable>
      </View>

      {loginMethod === 'simple' && (
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electronico</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
          </View>

          <Pressable
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitButton,
              (pressed || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSimpleSignIn}>
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Iniciando sesion...' : 'Continuar'}
            </Text>
          </Pressable>
        </View>
      )}

      {loginMethod === 'google' && (
        <Pressable
          disabled={!request || isSubmitting}
          style={({ pressed }) => [
            styles.googleButton,
            (pressed || isSubmitting || !request) && styles.googleButtonDisabled,
          ]}
          onPress={handleGoogleSignup}>
          <Image
            source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
            style={{ width: 24, height: 24 }}
          />
          <Text style={styles.googleLabel}>
            {isSubmitting ? 'Validando...' : 'Sign up with Google'}
          </Text>
        </Pressable>
      )}

      {statusText ? <Text style={styles.status}>{statusText}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 16,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 50,
    fontWeight: '800',
    color: '#003e70',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 26,
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  methodSelectorColumn: {
    flexDirection: 'column',
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  methodButtonActive: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  methodButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  methodButtonTextActive: {
    color: '#1d4ed8',
  },
  formContainer: {
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#045389',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
  status: {
    marginTop: 16,
    fontSize: 13,
    color: '#111827',
  },
});
