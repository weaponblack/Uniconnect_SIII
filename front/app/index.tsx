import { Link } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function LandingScreen() {
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
