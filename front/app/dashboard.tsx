import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { clearSession, loadSession, type SessionData } from '@/lib/session';
import { logoutWithRefreshToken } from '@/lib/auth-api';
import { getStudentProfile, type StudentProfile } from '@/lib/student-api';

export default function DashboardScreen() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function hydrateSession() {
        const stored = await loadSession();
        if (!stored) {
          router.replace('/signup');
          return;
        }
        setSession(stored);

        try {
          const studentData = await getStudentProfile();
          setProfile(studentData);
        } catch (e) {
          console.error('Error fetching profile', e);
        }

        setIsLoading(false);
      }

      void hydrateSession();
    }, [])
  );

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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Bienvenido a UniConnect.</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Tu Perfil Universitario</Text>
          <Pressable onPress={() => router.push('/profile-edit')} style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar</Text>
          </Pressable>
        </View>

        <Text style={styles.cardText}>Correo: {session.user.email}</Text>
        <Text style={styles.cardText}>Nombre: {session.user.name ?? 'Sin nombre'}</Text>
        <Text style={styles.cardText}>Rol: {session.user.role}</Text>

        {profile && (
          <View style={styles.extraProfileInfo}>
            <View style={styles.divider} />
            <Text style={styles.cardText}>Carrera: {profile.career || 'No especificada'}</Text>
            <Text style={styles.cardText}>Semestre: {profile.currentSemester || 'No especificado'}</Text>

            <Text style={[styles.cardTitle, { marginTop: 12 }]}>Materias inscritas:</Text>
            {profile.subjects.length > 0 ? (
              <View style={styles.subjectTags}>
                {profile.subjects.map(s => (
                  <View key={s.id} style={styles.badge}>
                    <Text style={styles.badgeText}>{s.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.cardText}>Ninguna materia inscrita.</Text>
            )}
          </View>
        )}
      </View>

      <Pressable style={styles.actionButton} onPress={() => router.push('/study-groups')}>
        <Text style={styles.actionButtonLabel}>Mis Grupos de Estudio</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} disabled={isLoggingOut} onPress={handleLogout}>
        <Text style={styles.logoutLabel}>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</Text>
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  extraProfileInfo: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  subjectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actionButton: {
    marginTop: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionButtonLabel: {
    color: '#1d4ed8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
});
