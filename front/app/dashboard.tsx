import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { clearSession, loadSession, type SessionData } from '@/lib/session';
import { logoutWithRefreshToken } from '@/lib/auth-api';

export default function DashboardScreen() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function hydrateSession() {
      const stored = await loadSession();
      if (!stored) {
        router.replace('/signup');
        return;
      }
      setSession(stored);
      setIsLoading(false);
    }

    void hydrateSession();
  }, []);

  async function handleLogout() {
    if (!session) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logoutWithRefreshToken(session.refreshToken);
    } catch {
      // Ignore backend logout error to avoid leaving stale local session
    } finally {
      await clearSession();
      setIsLoggingOut(false);
      router.replace('/');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator />
        <Text style={styles.loaderText}>Cargando sesion...</Text>
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Bienvenido a UniConnect.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu cuenta</Text>
        <Text style={styles.cardText}>Correo: {session.user.email}</Text>
        <Text style={styles.cardText}>Nombre: {session.user.name ?? 'Sin nombre'}</Text>
        <Text style={styles.cardText}>Rol: {session.user.role}</Text>
      </View>

      <Pressable style={styles.logoutButton} disabled={isLoggingOut} onPress={handleLogout}>
        <Text style={styles.logoutLabel}>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 36,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  loaderText: {
    fontSize: 14,
    color: '#475569',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: '#334155',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 13,
  },
  logoutLabel: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
});
