import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { saveSession } from '@/lib/session';
import apiClient from '@/lib/api-client';

WebBrowser.maybeCompleteAuthSession();

const ALLOWED_DOMAIN = 'ucaldas.edu.co';

export function useGoogleAuth() {
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const iosClientId =
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
    const androidClientId =
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
    const webClientId =
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

    /**
     * Redirect URI por plataforma (sin useProxy, ya deprecado desde SDK 48+).
     *
     * - iOS nativo: reverse client-id de iOS (com.googleusercontent.apps.XXX:/oauthredirect)
     * - Android nativo: scheme del paquete (com.ucaldas.estudiantes:/oauthredirect)
     *
     * NOTA: En Expo Go los custom schemes no funcionan. Se necesita un
     * Development Build (expo-dev-client) para probar OAuth en Android/iOS.
     */
    const googleIosScheme = iosClientId
        ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
        : null;

    const redirectUri = Platform.select({
        ios: googleIosScheme
            ? `${googleIosScheme}:/`
            : AuthSession.makeRedirectUri({ scheme: 'com.ucaldas.estudiantes', path: '' }),
        android: googleIosScheme
            ? `${googleIosScheme}:/`
            : AuthSession.makeRedirectUri({ scheme: 'com.ucaldas.estudiantes', path: '' }),
        default: AuthSession.makeRedirectUri({
            scheme: 'com.ucaldas.estudiantes',
            path: '',
        }),
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId,
        androidClientId: Platform.OS === 'android' ? iosClientId : androidClientId,
        iosClientId,
        redirectUri,
        extraParams: {
            hd: ALLOWED_DOMAIN,
        },
        scopes: ['openid', 'profile', 'email'],
    });

    const signIn = () => {
        if (!webClientId || !androidClientId || !iosClientId) {
            setError('Faltan client IDs de Google en .env');
            return;
        }
        console.log('[GoogleAuth] platform:', Platform.OS);
        console.log('[GoogleAuth] redirectUri:', redirectUri);
        setError(null);
        promptAsync();
    };

    useEffect(() => {
        if (!response) return;

        console.log('[GoogleAuth] response.type:', response.type);

        if (response.type === 'success') {
            const accessToken = response.authentication?.accessToken;
            if (accessToken) {
                fetchUserInfo(accessToken);
            } else {
                setError('No se recibió token de acceso de Google.');
            }
        } else if (response.type === 'error') {
            const oauthError =
                (response?.params as any)?.error_description ||
                (response?.params as any)?.error ||
                'Solicitud OAuth inválida';
            console.error('[GoogleAuth] error params:', response.params);
            setError(`Google OAuth: ${oauthError}`);
        } else if (response.type === 'dismiss' || response.type === 'cancel') {
            setError('Inicio de sesión cancelado.');
        }
    }, [response]);

    const fetchUserInfo = async (accessToken: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();
            console.log('[GoogleAuth] userinfo email:', data.email);

            if (!data.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
                setError('Solo se permiten cuentas @ucaldas.edu.co');
                return;
            }

            try {
                const backendRes = await apiClient.post('/auth/google/mobile', { accessToken });
                const { accessToken: localToken, refreshToken, user: backendUser } = backendRes.data;

                await saveSession({
                    user: {
                        id: backendUser.id,
                        name: backendUser.name,
                        email: backendUser.email,
                        role: backendUser.role || 'student',
                        avatarUrl: backendUser.avatarUrl || null,
                    },
                    accessToken: localToken,
                    refreshToken,
                });

                setUser(backendUser);
            } catch (backendError: any) {
                const msg =
                    backendError?.response?.data?.message ||
                    'Error al autenticar con el servidor de Uniconnect';
                console.error('[GoogleAuth] backend error:', backendError?.response?.data);
                setError(msg);
            }
        } catch (e) {
            console.error('[GoogleAuth] userinfo fetch error:', e);
            setError('Error al obtener información del usuario');
        } finally {
            setLoading(false);
        }
    };

    const signOut = () => setUser(null);

    return { user, error, loading, request, signIn, signOut };
}