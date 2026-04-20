import { router, useFocusEffect } from 'expo-router';
import { Image, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useCallback, useEffect } from 'react';
import { loadSession } from '@/lib/session';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function LandingScreen() {
  const { user, error, loading, request, signIn } = useGoogleAuth();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      // Si ya hay sesión guardada, ir directo al dashboard
      loadSession().then(sess => {
        if (sess) router.replace('/dashboard');
      });
    }, [])
  );

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

      <Pressable
        disabled={loading || !request}
        style={({ pressed }) => [
          styles.googleButton,
          (pressed || loading || !request) && styles.googleButtonDisabled,
        ]}
        onPress={signIn}
      >
        <Image
          source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
          style={{ width: 24, height: 24 }}
        />
        <Text style={styles.googleLabel}>
          {loading ? 'Validando...' : 'Continuar con Google'}
        </Text>
        {loading && <ActivityIndicator size="small" color="#5f6368" style={{ marginLeft: 8 }} />}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    marginTop: 8,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 16,
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
  },
});
