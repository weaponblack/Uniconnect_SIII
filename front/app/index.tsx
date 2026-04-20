import { router, useFocusEffect } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useCallback, useEffect } from 'react';
import { loadSession } from '@/lib/session';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function LandingScreen() {
  const { user: googleUser, error: googleError, loading: googleLoading, request, signIn } = useGoogleAuth();

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        try {
          const session = await loadSession();
          if (session?.accessToken) {
            router.replace('/dashboard');
          }
        } catch (e) {
          // No hay sesión guardada, quedarse en index
        }
      };
      checkSession();
    }, [])
  );

  useEffect(() => {
    if (googleUser) {
      router.replace('/dashboard');
    }
  }, [googleUser]);

  useEffect(() => {
    if (googleError) {
      Alert.alert('Error de Google', googleError);
    }
  }, [googleError]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/LogoUC.png')} style={styles.logo} />
        <Text style={styles.logoText}>UniConnect</Text>
      </View>
      <Text style={styles.title}>Conecta con tu campus</Text>
      <Text style={styles.subtitle}>
        Red universitaria para conocer estudiantes, compartir recursos y colaborar en proyectos.
      </Text>

      {googleLoading ? (
        <ActivityIndicator size="large" color="#045389" style={styles.loader} />
      ) : (
        <Pressable
          style={({ pressed }) => [styles.primaryButton, (!request || pressed) && styles.primaryButtonDisabled]}
          onPress={signIn}
          disabled={!request || googleLoading}
        >
          <Image
            source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
            style={styles.googleLogo}
          />
          <Text style={styles.primaryButtonText}>Iniciar Sesión con Google</Text>
        </Pressable>
      )}

      <Text style={styles.hint}>Solo cuentas @ucaldas.edu.co</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f3f3f3ff',
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
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#101828',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#475467',
    marginBottom: 28,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  googleLogo: {
    width: 24,
    height: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hint: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 8,
  },
});

