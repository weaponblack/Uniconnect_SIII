import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'react-native';
import 'react-native-reanimated';
import { Auth0Provider } from 'react-native-auth0';

import { useColorScheme } from '@/hooks/useColorScheme';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.      
    return null;
  }

  return (
    <ErrorBoundary>
      <Auth0Provider
        domain={process.env.EXPO_PUBLIC_AUTH0_DOMAIN || ''}
        clientId={process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || ''}
      >
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#003e70' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              headerRight: () => (
                <Image
                  source={require('../assets/images/LogoUC.png')}
                  style={{ width: 36, height: 36, marginLeft: 12, marginRight: 12, borderRadius: 8 }}
                />
              ),
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
            <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="profile-edit" options={{ title: 'Editar Perfil' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </Auth0Provider>
    </ErrorBoundary>
  );
}
