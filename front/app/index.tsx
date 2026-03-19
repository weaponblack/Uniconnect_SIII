import { Link, router, useFocusEffect } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useCallback } from 'react';
import { saveSession } from '@/lib/session';

export default function LandingScreen() {
  const { user, getCredentials } = useAuth0();

  useFocusEffect(
    useCallback(() => {
      // Solo actuar si Auth0 tiene sesión iniciada al ENFOCAR esta pantalla root
      if (user) {
        // En Web, Auth0 hace un redirect de página completa.
        // Por ende, debemos atrapar y guardar la sesión aquí al volver.
        const syncSession = async () => {
          try {
            const credentials = await getCredentials();
            if (credentials?.idToken) {
              // Save temporary session to allow API calls
              await saveSession({
                user: {
                  id: user?.sub || 'temp-id',
                  name: user?.name || null,
                  email: user?.email || '',
                  role: 'student',
                  avatarUrl: user?.picture || null
                },
                accessToken: credentials.idToken,
                refreshToken: credentials.accessToken || ''
              });

              // Fetch real profile from backend to get internal ID and Role
              try {
                const { getStudentProfile } = await import('@/lib/student-api');
                const profile = await getStudentProfile();
                
                await saveSession({
                  user: {
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    role: (profile as any).role || 'student',
                    avatarUrl: profile.avatarUrl
                  },
                  accessToken: credentials.idToken,
                  refreshToken: credentials.accessToken || ''
                });
              } catch (profileError) {
                console.error("No se pudo sincronizar el perfil con el backend", profileError);
              }
            }
          } catch (e) {
            console.error("No se pudo obtener las credenciales web", e);
          } finally {
            setTimeout(() => {
              router.replace('/dashboard');
            }, 100);
          }
        };

        syncSession();
      }
    }, [user, getCredentials])
  );  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/LogoUC.png')} style={styles.logo} />
        <Text style={styles.logoText}>UniConnect</Text>
      </View>
      <Text style={styles.title}>Conecta con tu campus</Text>
      <Text style={styles.subtitle}>
        Red universitaria para conocer estudiantes, compartir recursos y colaborar en proyectos.
      </Text>

      <Link href="/signup" style={styles.primaryButton}>
        Iniciar Sesión
      </Link>
      <Link href="/dashboard" style={styles.secondaryButton}>
        Ir al dashboard demo
      </Link>
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
  primaryButton: {
    backgroundColor: '#003e70',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    fontWeight: '700',
    overflow: 'hidden',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#045389',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
