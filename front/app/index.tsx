import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function LandingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.badge}>UNICONNECT</Text>
      <Text style={styles.title}>Conecta con tu campus</Text>
      <Text style={styles.subtitle}>
        Red universitaria para conocer estudiantes, compartir recursos y colaborar en proyectos.
      </Text>

      <Link href="/signup" style={styles.primaryButton}>
        Crear cuenta
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
    backgroundColor: '#f6f8fb',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#101828',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#475467',
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    fontWeight: '700',
    overflow: 'hidden',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
