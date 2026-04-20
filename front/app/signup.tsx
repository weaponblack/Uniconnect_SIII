import { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ScrollView, Image } from 'react-native';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function SignUpScreen() {
  const { user, error, loading, request, signIn } = useGoogleAuth();

  // Cuando el hook reporta usuario autenticado, redirigir al dashboard
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>UniConnect</Text>
      </View>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Text style={styles.subtitle}>
        Inicia sesión con tu cuenta institucional <Text style={styles.domain}>@ucaldas.edu.co</Text>
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
  domain: {
    color: '#003e70',
    fontWeight: '700',
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